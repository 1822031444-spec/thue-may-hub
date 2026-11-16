/**
 * Kiểm thử tranh chấp trên các thao tác tiền.
 *
 * Vì sao cần bài này: các endpoint tiền đọc số dư, kiểm tra, rồi mới ghi — mà
 * phần đọc và phần ghi KHÔNG nằm trong cùng một transaction. Hiện nay việc đó
 * vẫn an toàn vì `node:sqlite` là API đồng bộ và giữa đọc với ghi không có
 * `await` nào, nên Node chạy trọn cả đoạn không bị chen ngang.
 *
 * Đó là một ràng buộc ẩn. Nếu sau này đổi sang PostgreSQL hoặc bất kỳ client
 * bất đồng bộ nào, mỗi `await` chen vào giữa sẽ mở ra khe tranh chấp và hệ
 * thống bắt đầu thu vượt tiền hoặc cho ví âm — âm thầm, không báo lỗi.
 *
 * Bài kiểm thử này bắn nhiều yêu cầu song song vào cùng một đơn. Đúng thì chỉ
 * một yêu cầu được chấp nhận. Ngày nào nó đỏ, nghĩa là ràng buộc trên đã bị phá
 * và phải bọc đọc–kiểm tra–ghi vào transaction trước khi chạy tiền thật.
 *
 * Cần server đang chạy tại cổng 8788. Chỉ chạy trên database thử nghiệm.
 */
const BASE = 'http://localhost:8788/api';
let cookie = '';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const failures = [];
function check(label, condition, detail) {
  console.log(`${condition ? '  OK  ' : ' LOI  '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures.push(label);
}

const login = await call('POST', '/auth/login', { email: 'admin@thuemay.local', password: 'Admin@123' });
if (login.status !== 200) {
  console.error('Khong dang nhap duoc, server da chay chua?');
  process.exit(1);
}

const stamp = Date.now();

/* ---- 1. Thu tiền đơn thuê ---- */

const customer = (await call('POST', '/customers', { name: `Khach race ${stamp}`, phone: '0900000111' })).data;
await call('POST', `/customers/${customer.id}/deposit`, { amount: 20_000_000, paymentMethod: 'CASH' });

const device = (await call('POST', '/devices', {
  name: `PC race ${stamp}`, type: 'PC', hourlyRate: 1000, monthlyRate: 1_000_000,
})).data;

const rental = (await call('POST', '/rentals', {
  customerId: customer.id,
  deviceId: device.id,
  startAt: new Date().toISOString(),
  endAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  baseAmount: 1_000_000,
  status: 'ACTIVE',
})).data;

const payments = await Promise.all(
  Array.from({ length: 8 }, () => call('POST', `/rentals/${rental.id}/payment`, { amount: 1_000_000, source: 'CASH' })),
);
const okPayments = payments.filter((r) => r.status === 201).length;
const rentalAfter = (await call('GET', '/rentals')).data.find((r) => r.id === rental.id);

console.log(`\nThu tien: ${okPayments}/8 duoc chap nhan, da thu ${rentalAfter.paid_amount}/${rentalAfter.total_amount}`);
check('Chi mot yeu cau thu tien duoc chap nhan', okPayments === 1, `nhan ${okPayments}`);
check('Khong thu vuot tong don', rentalAfter.paid_amount <= rentalAfter.total_amount,
  `${rentalAfter.paid_amount}/${rentalAfter.total_amount}`);

/* ---- 2. Hoàn tiền ---- */

const refunds = await Promise.all(
  Array.from({ length: 8 }, () => call('POST', `/rentals/${rental.id}/refund`, {
    amount: rentalAfter.paid_amount || 1, destination: 'CASH', notes: 'kiem thu tranh chap',
  })),
);
const okRefunds = refunds.filter((r) => r.status === 201).length;
const afterRefund = (await call('GET', '/rentals')).data.find((r) => r.id === rental.id);

console.log(`\nHoan tien: ${okRefunds}/8 duoc chap nhan, con lai ${afterRefund.paid_amount}`);
check('Chi mot yeu cau hoan tien duoc chap nhan', okRefunds === 1, `nhan ${okRefunds}`);
check('Khong hoan qua so da thu', afterRefund.paid_amount >= 0, `con ${afterRefund.paid_amount}`);

/* ---- 3. Trừ ví vượt số dư ---- */

const walletCustomer = (await call('POST', '/customers', { name: `Khach vi ${stamp}`, phone: '0900000222' })).data;
await call('POST', `/customers/${walletCustomer.id}/deposit`, { amount: 1_000_000, paymentMethod: 'CASH' });

const walletDevice = (await call('POST', '/devices', {
  name: `PC vi ${stamp}`, type: 'PC', hourlyRate: 1000, monthlyRate: 5_000_000,
})).data;
const walletRental = (await call('POST', '/rentals', {
  customerId: walletCustomer.id,
  deviceId: walletDevice.id,
  startAt: new Date().toISOString(),
  endAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  baseAmount: 5_000_000,
  status: 'ACTIVE',
})).data;

const walletPays = await Promise.all(
  Array.from({ length: 6 }, () => call('POST', `/rentals/${walletRental.id}/payment`, { amount: 1_000_000, source: 'WALLET' })),
);
const okWallet = walletPays.filter((r) => r.status === 201).length;
const walletAfter = (await call('GET', '/customers')).data.find((c) => c.id === walletCustomer.id);

console.log(`\nTru vi: ${okWallet}/6 duoc chap nhan, so du con ${walletAfter.wallet_balance}`);
check('Chi mot lenh tru vi duoc chap nhan', okWallet === 1, `nhan ${okWallet}`);
check('So du vi khong bao gio am', walletAfter.wallet_balance >= 0, `con ${walletAfter.wallet_balance}`);

/* ---- 4. Sổ tiền khớp với số hiển thị ---- */

// Lấy hẳn một trang lớn: sổ tiền nay có phân trang, mặc định chỉ 100 dòng đầu.
const ledger = (await call('GET', '/finance/transactions?limit=500')).data;
const rentalLedger = ledger.rows.filter((t) => t.rental_code === rentalAfter.code);
const rentalNet = rentalLedger.reduce((sum, t) => sum + t.revenue_change, 0);
console.log(`\nSo tien: ${rentalLedger.length} but toan cho don ${rentalAfter.code}, cong lai = ${rentalNet}`);
check('Tong but toan khop voi so da thu hien thi', rentalNet === afterRefund.paid_amount,
  `but toan ${rentalNet} vs hien thi ${afterRefund.paid_amount}`);

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

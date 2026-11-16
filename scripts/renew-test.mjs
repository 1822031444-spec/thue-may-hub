/**
 * Kiểm tra gia hạn đơn thuê.
 *
 * Hai chỗ dễ sai âm thầm:
 *   1. Cộng tháng vào ngày 31 — JavaScript tự nhảy sang tháng sau nữa.
 *   2. Gia hạn xong mà tiền chưa ghi, hoặc ghi rồi mà hạn chưa đẩy.
 *
 * Cần một server đang chạy: PORT=8788 npx tsx server/index.ts
 */

import { addPeriod } from '../server/rental-period.ts';

const BASE = process.env.API_BASE || 'http://127.0.0.1:8788/api';
const failures = [];
let cookie = '';

function check(label, ok, detail = '') {
  if (ok) console.log(`  OK   ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
  }
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const ngay = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/* ---- 1. Phép cộng kỳ hạn ---- */

console.log('\n1. Cong ky han (khong can server)');

const casesThang = [
  // [tu ngay, so thang, mong doi]
  [new Date(2026, 6, 27), 2, new Date(2026, 8, 27), '27/7 + 2 thang = 27/9 (giong du lieu that cua tiem)'],
  [new Date(2026, 0, 31), 1, new Date(2026, 1, 28), '31/1 + 1 thang = 28/2, KHONG phai 3/3'],
  [new Date(2028, 0, 31), 1, new Date(2028, 1, 29), '31/1/2028 + 1 thang = 29/2 (nam nhuan)'],
  [new Date(2026, 4, 31), 1, new Date(2026, 5, 30), '31/5 + 1 thang = 30/6'],
  [new Date(2026, 11, 15), 1, new Date(2027, 0, 15), '15/12 + 1 thang = 15/1 nam sau'],
  [new Date(2026, 0, 31), 12, new Date(2027, 0, 31), '31/1 + 12 thang = 31/1 nam sau'],
];

for (const [from, qty, expect, label] of casesThang) {
  const got = addPeriod(from, 'MONTH', qty);
  check(label, got.getTime() === expect.getTime(), `nhan ${ngay(got)}, cho ${ngay(expect)}`);
}

const tuan = addPeriod(new Date(2026, 6, 27), 'WEEK', 2);
check('27/7 + 2 tuan = 10/8', tuan.getTime() === new Date(2026, 7, 10).getTime(), ngay(tuan));

const ngayCong = addPeriod(new Date(2026, 6, 27), 'DAY', 10);
check('27/7 + 10 ngay = 6/8', ngayCong.getTime() === new Date(2026, 7, 6).getTime(), ngay(ngayCong));

const gio = addPeriod(new Date(2026, 6, 27, 22, 0), 'HOUR', 5);
check('22h ngay 27/7 + 5 gio = 3h ngay 28/7',
  gio.getTime() === new Date(2026, 6, 28, 3, 0).getTime(), gio.toISOString());

/* ---- 2. Gia hạn thật qua API ---- */

console.log('\n2. Gia han that');

const login = await call('POST', '/auth/login', {
  email: process.env.ADMIN_EMAIL || 'admin@thuemay.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
});
if (login.status !== 200) {
  console.error(`Khong dang nhap duoc (${login.status}). Server da chay chua?`);
  process.exit(1);
}

const stamp = Date.now();
const customer = (await call('POST', '/customers', { name: `Khach gia han ${stamp}`, phone: '0900000111' })).data;
const device = (await call('POST', '/devices', {
  name: `May gia han ${stamp}`, type: 'PC', hourlyRate: 10000,
  dailyRate: 100000, weeklyRate: 500000, monthlyRate: 1800000,
})).data;

const start = new Date(2026, 6, 27, 10, 0);
const firstEnd = new Date(2026, 7, 27, 10, 0);
const rental = (await call('POST', '/rentals', {
  customerId: customer.id, deviceId: device.id,
  startAt: start.toISOString(), endAt: firstEnd.toISOString(),
  baseAmount: 1800000,
})).data;
check('Tao duoc don thue', Boolean(rental?.id), rental?.code);

// Gia hạn 2 tháng, thu tiền luôn.
const renew = await call('POST', `/rentals/${rental.id}/renew`, {
  unit: 'MONTH', quantity: 2, amount: 3600000,
  collect: { source: 'BANK', reference: 'CK thang 9+10' },
});
check('Gia han thanh cong', renew.status === 201, `HTTP ${renew.status}`);
check('Da thu tien trong cung lan goi', renew.data?.collected === true);

const sauGiaHan = (await call('GET', '/rentals')).data.find((r) => r.id === rental.id);
const endSau = new Date(sauGiaHan.end_at);
check('Han moi = han cu + 2 thang',
  endSau.getTime() === new Date(2026, 9, 27, 10, 0).getTime(),
  `nhan ${ngay(endSau)}, cho 27/10/2026`);
check('Tong tien cong don dung', sauGiaHan.total_amount === 5400000,
  `${sauGiaHan.total_amount}, cho 5400000`);
check('Tien da thu ghi nhan dung', sauGiaHan.paid_amount === 3600000,
  `${sauGiaHan.paid_amount}, cho 3600000`);

/* ---- 3. Gia hạn ghi nợ (không thu tiền) ---- */

console.log('\n3. Gia han ghi no');

const no = await call('POST', `/rentals/${rental.id}/renew`, {
  unit: 'MONTH', quantity: 1, amount: 1800000,
});
check('Gia han khong thu tien van duoc', no.status === 201);
check('Danh dau la chua thu', no.data?.collected === false);

const sauNo = (await call('GET', '/rentals')).data.find((r) => r.id === rental.id);
check('Tong tang nhung tien thu khong tang',
  sauNo.total_amount === 7200000 && sauNo.paid_amount === 3600000,
  `tong ${sauNo.total_amount}, da thu ${sauNo.paid_amount}`);
check('Con no dung bang ky vua ghi', sauNo.total_amount - sauNo.paid_amount === 3600000);

/* ---- 4. Lịch sử kỳ thuê ---- */

console.log('\n4. Lich su ky thue');

const periods = (await call('GET', `/rentals/${rental.id}/periods`)).data;
check('Ghi lai du so lan gia han', periods.length === 2, `${periods.length} ky`);
check('Ky sau noi tiep ngay ky truoc',
  periods.length === 2 && periods[0].end_at === periods[1].start_at,
  periods.length === 2 ? `${periods[0].end_at} -> ${periods[1].start_at}` : '');
check('Tong tien cac ky khop tong don',
  periods.reduce((s, p) => s + p.amount, 0) + 1800000 === sauNo.total_amount);

/* ---- 5. Trả trễ thì tính từ hôm nay ---- */

console.log('\n5. Tra tre: tinh tu hom nay');

// Máy đầu đang bận nên phải dùng máy khác: app chỉ cho thuê thiết bị đang sẵn sàng.
const device2 = (await call('POST', '/devices', {
  name: `May tra tre ${stamp}`, type: 'PC', dailyRate: 100000, monthlyRate: 1800000,
})).data;

const tre = (await call('POST', '/rentals', {
  customerId: customer.id, deviceId: device2.id,
  startAt: new Date(2020, 0, 1).toISOString(), endAt: new Date(2020, 1, 1).toISOString(),
  baseAmount: 100000,
})).data;
check('Tao duoc don da het han tu lau', Boolean(tre?.id), tre?.code || JSON.stringify(tre));

const tuHomNay = await call('POST', `/rentals/${tre.id}/renew`, {
  unit: 'DAY', quantity: 7, amount: 700000, from: 'NOW',
});
check('Gia han don qua han thanh cong', tuHomNay.status === 201, `HTTP ${tuHomNay.status}`);
const batDau = new Date(tuHomNay.data?.startAt ?? NaN);
check('Ky moi bat dau tu hom nay chu khong phai 2020',
  Number.isFinite(batDau.getTime()) && Math.abs(batDau.getTime() - Date.now()) < 120_000,
  Number.isFinite(batDau.getTime()) ? `bat dau ${ngay(batDau)}` : 'khong doc duoc ngay bat dau');

/* ---- 6. Đơn đã huỷ thì không gia hạn ---- */

console.log('\n6. Don da huy');

await call('PATCH', `/rentals/${tre.id}/status`, { status: 'CANCELLED' });
const chan = await call('POST', `/rentals/${tre.id}/renew`, { unit: 'DAY', quantity: 1, amount: 1000 });
check('Tu choi gia han don da huy', chan.status === 409, `HTTP ${chan.status}`);

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

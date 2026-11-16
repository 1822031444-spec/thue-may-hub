/**
 * Kiểm tra danh sách "sắp hết hạn".
 *
 * Đây là màn hình người dùng nhìn đầu tiên mỗi sáng để biết cần gọi cho ai, nên
 * sai ở đây là bỏ sót khách. Ba thứ phải đúng: lọc đúng khoảng thời gian, phân
 * nhóm đúng mức gấp, và số tiền còn nợ tính đúng.
 *
 * Cần một server đang chạy: PORT=8788 npx tsx server/index.ts
 */

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

const login = await call('POST', '/auth/login', {
  email: process.env.ADMIN_EMAIL || 'admin@thuemay.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
});
if (login.status !== 200) {
  console.error(`Khong dang nhap duoc (${login.status}). Server da chay chua?`);
  process.exit(1);
}

const stamp = Date.now();
const gio = (h) => new Date(Date.now() + h * 3600_000).toISOString();

/* ---- Dựng 4 đơn ở 4 mức gấp khác nhau ---- */

console.log('\nDung 4 don o 4 muc gap');

const customer = (await call('POST', '/customers', {
  name: `Khach het han ${stamp}`, phone: '0911222333',
})).data;

/** Tạo một đơn hết hạn sau `sauGio` giờ (số âm = đã quá hạn). */
async function taoDon(ten, sauGio, tong, daTra) {
  const device = (await call('POST', '/devices', {
    name: `${ten} ${stamp}`, type: 'PC', monthlyRate: 1000000,
  })).data;
  const rental = (await call('POST', '/rentals', {
    customerId: customer.id, deviceId: device.id,
    startAt: gio(-24 * 40), endAt: gio(sauGio),
    baseAmount: tong, status: 'ACTIVE',
  })).data;
  if (daTra > 0) {
    await call('POST', `/rentals/${rental.id}/payment`, { amount: daTra, source: 'BANK' });
  }
  return rental;
}

// Nhóm "hôm nay" tính tới nửa đêm chứ không phải 24 giờ tới, nên đơn này hết hạn ở
// giữa khoảng còn lại của ngày; ghi cứng "6 giờ nữa" thì chạy sau 18h là rơi sang mai.
const nuaDem = new Date();
nuaDem.setHours(24, 0, 0, 0);
const gioConLaiHomNay = (nuaDem.getTime() - Date.now()) / 3600_000;

const quaHan = await taoDon('May qua han', -48, 1000000, 0);
const homNay = await taoDon('May hom nay', gioConLaiHomNay / 2, 2000000, 500000);
const trong3 = await taoDon('May 3 ngay', 48, 1000000, 1000000);
const trong7 = await taoDon('May 7 ngay', 24 * 6, 1000000, 0);
const conXa = await taoDon('May con xa', 24 * 45, 1000000, 0);

const ids = new Set([quaHan.id, homNay.id, trong3.id, trong7.id].filter(Boolean));
check('Tao du 5 don thu nghiem',
  [quaHan, homNay, trong3, trong7, conXa].every((r) => r?.id),
  [quaHan, homNay, trong3, trong7, conXa].map((r) => r?.code ?? 'LOI').join(', '));

/* ---- 1. Lọc đúng khoảng thời gian ---- */

console.log('\n1. Loc dung khoang thoi gian');

const bay = (await call('GET', '/rentals/expiring?days=7')).data;
const bayIds = new Set(bay.rows.map((r) => r.id));

check('Co du 4 don trong 7 ngay', [...ids].every((id) => bayIds.has(id)),
  `thieu ${[...ids].filter((id) => !bayIds.has(id)).length} don`);
check('Khong lay don con xa 45 ngay', !bayIds.has(conXa.id));
check('Bao lai dung so ngay da hoi', bay.days === 7, String(bay.days));

const ba = (await call('GET', '/rentals/expiring?days=3')).data;
const baIds = new Set(ba.rows.map((r) => r.id));
check('Khoang 3 ngay khong lay don con 6 ngay', !baIds.has(trong7.id));
check('Khoang 3 ngay van lay don qua han', baIds.has(quaHan.id));

/* ---- 2. Phân nhóm mức gấp ---- */

console.log('\n2. Phan nhom muc gap');

const cua = (id) => bay.rows.find((r) => r.id === id);
check('Don qua han nam trong danh sach', Boolean(cua(quaHan.id)));
check('Dem it nhat 1 don qua han', bay.counts.overdue >= 1, `dem ${bay.counts.overdue}`);
check('Dem it nhat 1 don het han trong hom nay', bay.counts.today >= 1, `dem ${bay.counts.today}`);
check('Tong cac nhom bang so dong tra ve',
  bay.counts.overdue + bay.counts.today + bay.counts.within3 + bay.counts.later === bay.rows.length,
  `${bay.counts.overdue}+${bay.counts.today}+${bay.counts.within3}+${bay.counts.later} vs ${bay.rows.length}`);

const dauTien = bay.rows[0];
check('Don gap nhat xep len dau',
  new Date(dauTien.end_at).getTime() <= new Date(bay.rows[bay.rows.length - 1].end_at).getTime());

/* ---- 3. Thông tin để liên hệ và đòi tiền ---- */

console.log('\n3. Thong tin lien he va cong no');

const donHomNay = cua(homNay.id);
check('Co so dien thoai khach', donHomNay?.customer_phone === '0911222333', donHomNay?.customer_phone);
check('Co ten khach va ten may',
  Boolean(donHomNay?.customer_name && donHomNay?.device_name),
  `${donHomNay?.customer_name} / ${donHomNay?.device_name}`);
check('Con no tinh dung (2.000.000 - 500.000)',
  donHomNay.total_amount - donHomNay.paid_amount === 1500000,
  `${donHomNay.total_amount} - ${donHomNay.paid_amount}`);

const donDaTraDu = cua(trong3.id);
check('Don da tra du thi con no bang 0',
  donDaTraDu.total_amount - donDaTraDu.paid_amount === 0);

const tongNoThuNghiem = 1000000 + 1500000 + 0 + 1000000;
check('Tong chua thu gom du cac don thu nghiem',
  bay.unpaidTotal >= tongNoThuNghiem,
  `${bay.unpaidTotal} >= ${tongNoThuNghiem}`);

/* ---- 4. Đơn đã huỷ và hoàn tất không lọt vào ---- */

console.log('\n4. Don da dong khong lot vao');

await call('PATCH', `/rentals/${trong7.id}/status`, { status: 'COMPLETED' });
const sauKhiDong = (await call('GET', '/rentals/expiring?days=7')).data;
check('Don da hoan tat bi loai khoi danh sach',
  !sauKhiDong.rows.some((r) => r.id === trong7.id));

/* ---- Dọn ---- */

for (const r of [quaHan, homNay, trong3, conXa]) {
  if (r?.id) await call('PATCH', `/rentals/${r.id}/status`, { status: 'COMPLETED' });
}

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

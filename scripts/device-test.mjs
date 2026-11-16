/**
 * Kiểm tra xoá thiết bị và sửa loại thiết bị.
 *
 * Chỗ nguy hiểm là xoá: máy đã từng cho thuê mà xoá được thì mất luôn lịch sử
 * tiền của khách gắn với máy đó. Bài này chốt lại app phải từ chối đúng những
 * trường hợp ấy, và chỉ cho xoá máy thật sự chưa dùng vào việc gì.
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
const taoMay = async (ten, extra = {}) => (await call('POST', '/devices', {
  name: `${ten} ${stamp}`, type: 'PC', monthlyRate: 1000000, ...extra,
})).data;

/* ---- 1. Sửa loại thiết bị ---- */

console.log('\n1. Sua loai thiet bi');

const doiLoai = await taoMay('May doi loai');
check('Tao may mac dinh la PC', true, 'PC');

const sua = await call('PATCH', `/devices/${doiLoai.id}`, {
  name: `May doi loai ${stamp}`, type: 'BOXPHONE', status: 'AVAILABLE',
  hourlyRate: 0, dailyRate: 0, weeklyRate: 0, monthlyRate: 1000000, purchasePrice: 0,
});
check('Doi loai thanh cong', sua.status === 200, `HTTP ${sua.status}`);

const sauKhiDoi = (await call('GET', '/devices')).data.find((d) => d.id === doiLoai.id);
check('Loai da doi thanh BOXPHONE', sauKhiDoi.type === 'BOXPHONE', sauKhiDoi.type);

// Không truyền type thì giữ nguyên loại cũ, không bị reset về PC.
await call('PATCH', `/devices/${doiLoai.id}`, {
  name: `May doi loai ${stamp}`, status: 'AVAILABLE',
  hourlyRate: 0, dailyRate: 0, weeklyRate: 0, monthlyRate: 1000000, purchasePrice: 0,
});
const giuNguyen = (await call('GET', '/devices')).data.find((d) => d.id === doiLoai.id);
check('Khong truyen loai thi giu nguyen loai cu', giuNguyen.type === 'BOXPHONE', giuNguyen.type);

/* ---- 2. Xoá máy chưa dùng vào việc gì ---- */

console.log('\n2. Xoa may chua dung');

const mayTrong = await taoMay('May xoa duoc');
const xoa = await call('DELETE', `/devices/${mayTrong.id}`);
check('Xoa duoc may chua co lich su', xoa.status === 200, `HTTP ${xoa.status}`);

const conTrongKho = (await call('GET', '/devices')).data.some((d) => d.id === mayTrong.id);
check('May da bien khoi kho', !conTrongKho);

const xoaLai = await call('DELETE', `/devices/${mayTrong.id}`);
check('Xoa lan hai bao khong tim thay', xoaLai.status === 404, `HTTP ${xoaLai.status}`);

/* ---- 3. Chặn xoá máy đã có đơn thuê ---- */

console.log('\n3. Chan xoa may da co lich su');

const khach = (await call('POST', '/customers', { name: `Khach xoa may ${stamp}` })).data;
const mayCoDon = await taoMay('May co don');
const don = (await call('POST', '/rentals', {
  customerId: khach.id, deviceId: mayCoDon.id,
  startAt: new Date().toISOString(),
  endAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  baseAmount: 1000000, status: 'ACTIVE',
})).data;

const chanDangThue = await call('DELETE', `/devices/${mayCoDon.id}`);
check('Chan xoa may dang co nguoi thue', chanDangThue.status === 409, `HTTP ${chanDangThue.status}`);
check('Bao ly do la dang thue',
  String(chanDangThue.data?.message).includes('đang có người thuê'),
  chanDangThue.data?.message);

// Đóng đơn: máy về AVAILABLE nhưng lịch sử đơn thuê vẫn còn.
await call('PATCH', `/rentals/${don.id}/status`, { status: 'COMPLETED' });
const chanCoLichSu = await call('DELETE', `/devices/${mayCoDon.id}`);
check('Van chan xoa sau khi da dong don', chanCoLichSu.status === 409, `HTTP ${chanCoLichSu.status}`);
check('Bao ro so don thue dang vuong',
  String(chanCoLichSu.data?.message).includes('1 đơn thuê'),
  chanCoLichSu.data?.message);
check('Goi y dung cach thay the', chanCoLichSu.data?.canRetire === true);

const vanCon = (await call('GET', '/devices')).data.some((d) => d.id === mayCoDon.id);
check('May bi tu choi van con nguyen trong kho', vanCon);

/* ---- 4. Chặn xoá máy đã có phiếu sửa ---- */

console.log('\n4. Chan xoa may da co phieu sua');

const mayCoSua = await taoMay('May co phieu sua');
await call('POST', '/repairs', {
  deviceId: mayCoSua.id, title: 'Thay quat', symptom: 'On', startNow: false,
});
const chanCoSua = await call('DELETE', `/devices/${mayCoSua.id}`);
check('Chan xoa may co phieu sua', chanCoSua.status === 409, `HTTP ${chanCoSua.status}`);
check('Bao ro so phieu sua dang vuong',
  String(chanCoSua.data?.message).includes('1 phiếu sửa'),
  chanCoSua.data?.message);

/* ---- 5. Ngừng dùng là đường thay thế ---- */

console.log('\n5. Ngung dung thay cho xoa');

const ngungDung = await call('PATCH', `/devices/${mayCoDon.id}`, {
  name: `May co don ${stamp}`, status: 'RETIRED',
  hourlyRate: 0, dailyRate: 0, weeklyRate: 0, monthlyRate: 1000000, purchasePrice: 0,
});
check('Doi sang Ngung dung thanh cong', ngungDung.status === 200, `HTTP ${ngungDung.status}`);

const sauNgung = (await call('GET', '/devices')).data.find((d) => d.id === mayCoDon.id);
check('May o trang thai RETIRED', sauNgung.status === 'RETIRED', sauNgung.status);
check('Lich su don thue van con', sauNgung.rental_count >= 1, `${sauNgung.rental_count} don`);

/* ---- Dọn ---- */

await call('PATCH', `/devices/${doiLoai.id}`, {
  name: `May doi loai ${stamp}`, status: 'RETIRED',
  hourlyRate: 0, dailyRate: 0, weeklyRate: 0, monthlyRate: 0, purchasePrice: 0,
});
await call('PATCH', `/devices/${mayCoSua.id}`, {
  name: `May co phieu sua ${stamp}`, status: 'RETIRED',
  hourlyRate: 0, dailyRate: 0, weeklyRate: 0, monthlyRate: 0, purchasePrice: 0,
});

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

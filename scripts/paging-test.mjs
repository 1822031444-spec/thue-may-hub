/**
 * Kiểm tra phân trang của các danh sách còn lại.
 *
 * Trước đây phiếu sửa chặn 300 dòng, lịch sử kho 100, yêu cầu/ticket 200 — quá
 * ngưỡng là dữ liệu cũ biến mất mà giao diện không báo gì.
 *
 * Ca quan trọng nhất ở mục 4: huy hiệu việc chờ trên menu từng đếm từ mảng đã bị
 * cắt, nên quá ngưỡng là báo thiếu việc. Người dùng tin vào con số đó để biết còn
 * bao nhiêu yêu cầu phải xử lý, nên sai ở đây nguy hiểm hơn là mất một dòng bảng.
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

/** Lật hết các trang của một endpoint, trả về id đã gom và các tổng đọc được. */
async function pageThrough(path, expected, size = 3) {
  const ids = [];
  const totals = [];
  const joiner = path.includes('?') ? '&' : '?';
  for (let offset = 0; offset < expected; offset += size) {
    const page = (await call('GET', `${path}${joiner}limit=${size}&offset=${offset}`)).data;
    totals.push(page.total);
    ids.push(...page.rows.map((r) => r.id));
  }
  return { ids, totals };
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

/* ---- 1. Phiếu sửa chữa ---- */

console.log('\n1. Phieu sua chua');

const device = (await call('POST', '/devices', {
  name: `PC Paging ${stamp}`, type: 'PC', specs: 'test phan trang',
  ipAddress: '10.88.0.9', hourlyRate: 10000, monthlyRate: 1000000,
})).data;

const NEW_REPAIRS = 7;
for (let i = 0; i < NEW_REPAIRS; i += 1) {
  await call('POST', '/repairs', {
    deviceId: device.id, title: `Phieu paging ${i}`, symptom: 'test', startNow: false,
  });
}

const byDevice = (await call('GET', `/repairs?deviceId=${device.id}&limit=500`)).data;
check('Loc theo thiet bi dung so phieu', byDevice.total === NEW_REPAIRS,
  `nhan ${byDevice.total}, cho ${NEW_REPAIRS}`);
check('Tra ve dang { rows, total }', Array.isArray(byDevice.rows) && typeof byDevice.total === 'number');

const paged = await pageThrough(`/repairs?deviceId=${device.id}`, NEW_REPAIRS);
check('Phan trang khong tra trung phieu', new Set(paged.ids).size === paged.ids.length,
  `${paged.ids.length} dong, ${new Set(paged.ids).size} id khac nhau`);
check('Phan trang lay du toan bo phieu', paged.ids.length === NEW_REPAIRS,
  `gom duoc ${paged.ids.length}/${NEW_REPAIRS}`);
check('Tong khong doi giua cac trang', paged.totals.every((t) => t === NEW_REPAIRS), paged.totals.join(', '));

const all = (await call('GET', '/repairs?limit=1')).data;
check('Danh sach tong dem ca phieu cua may khac', all.total >= NEW_REPAIRS, `tong ${all.total}`);
check('Xin 1 dong thi chi tra 1 dong', all.rows.length === 1, `nhan ${all.rows.length}`);

/* ---- 2. Lịch sử kho linh kiện ---- */

console.log('\n2. Lich su kho linh kien');

const part = (await call('POST', '/parts', {
  name: `RAM Paging ${stamp}`, category: 'RAM', unit: 'thanh', minQuantity: 0, location: 'Ke Z',
})).data;

const NEW_MOVES = 6;
for (let i = 0; i < NEW_MOVES; i += 1) {
  await call('POST', `/parts/${part.id}/movements`, {
    kind: 'PURCHASE', quantity: 1, unitCost: 100000 + i,
    occurredAt: new Date().toISOString(), notes: `lan ${i}`,
  });
}

const moves = (await call('GET', `/parts/${part.id}/movements?limit=500`)).data;
check('Dung so dong xuat nhap', moves.total === NEW_MOVES, `nhan ${moves.total}, cho ${NEW_MOVES}`);

const movePages = await pageThrough(`/parts/${part.id}/movements`, NEW_MOVES);
check('Phan trang kho khong tra trung dong', new Set(movePages.ids).size === movePages.ids.length);
check('Phan trang kho lay du toan bo', movePages.ids.length === NEW_MOVES,
  `gom duoc ${movePages.ids.length}/${NEW_MOVES}`);

/* ---- 3. Nhật ký thao tác ---- */

console.log('\n3. Nhat ky thao tac');

const logs = (await call('GET', '/audit-logs?limit=5')).data;
check('Nhat ky tra ve dang { rows, total }', Array.isArray(logs.rows) && typeof logs.total === 'number');
check('Chi tra dung so dong da xin', logs.rows.length === 5, `nhan ${logs.rows.length}`);
check('Tong lon hon so dong tra ve', logs.total > 5, `tong ${logs.total}`);

const logPage2 = (await call('GET', '/audit-logs?limit=5&offset=5')).data;
const overlap = logs.rows.filter((a) => logPage2.rows.some((b) => b.id === a.id));
check('Trang 2 khong lap lai trang 1', overlap.length === 0, `trung ${overlap.length} dong`);

/* ---- 4. Huy hiệu việc chờ không phụ thuộc số dòng tải về ---- */

console.log('\n4. So viec cho khong bi cat cut lam sai');

const tiny = (await call('GET', '/service-desk/overview?limit=1')).data;
const full = (await call('GET', '/service-desk/overview?limit=500')).data;

check('Overview tra ve dang phan trang', Array.isArray(tiny.bookings?.rows) && typeof tiny.bookings?.total === 'number');
check('Co khoi dem viec cho rieng', Boolean(tiny.pending), JSON.stringify(tiny.pending));

check('So viec cho giong nhau du xin 1 dong hay 500 dong',
  tiny.pending.bookings === full.pending.bookings
  && tiny.pending.extensions === full.pending.extensions
  && tiny.pending.tickets === full.pending.tickets,
  `limit=1 -> ${JSON.stringify(tiny.pending)} / limit=500 -> ${JSON.stringify(full.pending)}`);

check('Tong cung khong doi theo so dong xin',
  tiny.bookings.total === full.bookings.total
  && tiny.tickets.total === full.tickets.total,
  `${tiny.bookings.total}/${full.bookings.total} va ${tiny.tickets.total}/${full.tickets.total}`);

check('Xin 1 dong thi chi tra toi da 1 dong moi danh sach',
  tiny.bookings.rows.length <= 1 && tiny.extensions.rows.length <= 1 && tiny.tickets.rows.length <= 1);

// Số server đếm phải khớp với số đếm tay trên danh sách đầy đủ.
const dem = (arr, fn) => arr.filter(fn).length;
check('So viec cho khop voi dem tay tren danh sach day du',
  full.pending.bookings === dem(full.bookings.rows, (b) => b.status === 'PENDING')
  && full.pending.tickets === dem(full.tickets.rows, (t) => !['RESOLVED', 'CLOSED'].includes(t.status)),
  `server ${full.pending.bookings}/${full.pending.tickets}`);

/* ---- Dọn ---- */

await call('PATCH', `/devices/${device.id}`, { status: 'RETIRED' });

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

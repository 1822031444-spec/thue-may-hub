/**
 * Kiểm tra cấu hình nhắc khách qua Telegram.
 *
 * Không gọi ra internet thật: bài này chốt phần logic mà app tự quyết — che token,
 * giữ token cũ khi để trống, chặn bật khi thiếu thông tin, và chặn nhân viên.
 * Việc gửi được hay không thì phải bấm "Gửi thử ngay" trên giao diện với token thật.
 *
 * Cần một server đang chạy: PORT=8788 npx tsx server/index.ts
 */

const BASE = process.env.API_BASE || 'http://127.0.0.1:8788/api';
const failures = [];

function check(label, ok, detail = '') {
  if (ok) console.log(`  OK   ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
  }
}

async function call(method, path, body, jar) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(jar?.value ? { Cookie: jar.value } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length && jar) jar.value = set.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const owner = { value: '' };
const login = await call('POST', '/auth/login', {
  email: process.env.ADMIN_EMAIL || 'admin@thuemay.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
}, owner);
if (login.status !== 200) {
  console.error(`Khong dang nhap duoc (${login.status}). Server da chay chua?`);
  process.exit(1);
}

const banDau = (await call('GET', '/telegram', null, owner)).data;

/* ---- 1. Trạng thái ban đầu ---- */

console.log('\n1. Doc trang thai');
check('Doc duoc cau hinh', typeof banDau?.settings?.enabled === 'boolean');
check('Co day du truong can thiet',
  ['enabled', 'token', 'chatId', 'hour', 'days'].every((k) => k in banDau.settings));

/* ---- 2. Không bật được khi thiếu thông tin ---- */

console.log('\n2. Chan bat khi thieu thong tin');

const thieu = await call('PUT', '/telegram/settings', {
  enabled: true, token: '', chatId: '', hour: 8, days: 7,
}, owner);
// Chỉ đúng khi trước đó chưa có token; nếu máy đang có token thật thì bỏ qua ca này.
if (!banDau.hasToken) {
  check('Tu choi bat khi chua co token va chat id', thieu.status === 400, `HTTP ${thieu.status}`);
} else {
  console.log('  (bo qua: may nay dang co token that)');
}

/* ---- 3. Lưu và che token ---- */

console.log('\n3. Luu va che token');

const TOKEN_GIA = '1234567890:AAEabcdefghijklmnopqrstuvwxyz12345';
const luu = await call('PUT', '/telegram/settings', {
  enabled: false, token: TOKEN_GIA, chatId: '987654321', hour: 9, days: 5,
}, owner);
check('Luu cau hinh thanh cong', luu.status === 200, `HTTP ${luu.status}`);
check('Token tra ve da bi che',
  luu.data.settings.token !== TOKEN_GIA && luu.data.settings.token.includes('•'),
  luu.data.settings.token);
check('Bao la da co token', luu.data.hasToken === true);
check('Luu dung gio va so ngay',
  luu.data.settings.hour === 9 && luu.data.settings.days === 5,
  `${luu.data.settings.hour}h / ${luu.data.settings.days} ngay`);

/* ---- 4. Để trống token thì giữ nguyên token cũ ---- */

console.log('\n4. De trong token thi giu nguyen');

const giuToken = await call('PUT', '/telegram/settings', {
  enabled: true, token: '', chatId: '987654321', hour: 7, days: 10,
}, owner);
check('Bat duoc khi da co token san', giuToken.status === 200, `HTTP ${giuToken.status}`);
check('Van con token sau khi luu ma khong nhap lai', giuToken.data.hasToken === true);
check('Doi duoc gio khi khong dong toi token', giuToken.data.settings.hour === 7);

/* ---- 5. Nhân viên không đụng được ---- */

console.log('\n5. Nhan vien khong dung duoc');

const stamp = Date.now();
const email = `nv.notify.${stamp}@thuemay.local`;
const pass = 'NhanVien@12345';
const tao = await call('POST', '/admins', {
  name: 'Nhan vien test notify', email, password: pass, role: 'STAFF',
}, owner);

if (tao.status === 201) {
  const staff = { value: '' };
  await call('POST', '/auth/login', { email, password: pass }, staff);
  const doc = await call('GET', '/telegram', null, staff);
  const ghi = await call('PUT', '/telegram/settings', {
    enabled: false, token: '', chatId: '', hour: 8, days: 7,
  }, staff);
  const thu = await call('POST', '/telegram/test', {}, staff);
  check('Nhan vien khong xem duoc cau hinh', doc.status === 403, `HTTP ${doc.status}`);
  check('Nhan vien khong sua duoc cau hinh', ghi.status === 403, `HTTP ${ghi.status}`);
  check('Nhan vien khong gui thu duoc', thu.status === 403, `HTTP ${thu.status}`);
  await call('PATCH', `/admins/${tao.data.id}`, { status: 'DISABLED' }, owner);
} else {
  check('Tao duoc tai khoan nhan vien de kiem tra', false, `HTTP ${tao.status}`);
}

/* ---- Trả lại như cũ ---- */

await call('PUT', '/telegram/settings', {
  enabled: false, token: '', chatId: banDau.settings.chatId, hour: banDau.settings.hour, days: banDau.settings.days,
}, owner);

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

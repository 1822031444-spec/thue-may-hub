/**
 * Kiểm tra cơ chế sao lưu cơ sở dữ liệu.
 *
 * Bản sao lưu hỏng mà im lặng là kiểu hỏng tệ nhất: tưởng có bản sao, tới lúc
 * cần phục hồi mới biết là không có. Bài này chốt bốn điều: bản sao mở lại được
 * và đủ dữ liệu, số bản cũ bị dọn đúng, nhân viên không đụng được, và thư mục
 * không ghi được thì bị từ chối ngay lúc lưu cấu hình chứ không phải lúc chạy.
 *
 * Cần một server đang chạy: PORT=8788 npx tsx server/index.ts
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

async function call(method, path, body, jar) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(jar ? { Cookie: jar.value } : {}) },
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

/* ---- 1. Tạo bản sao lưu và mở lại ---- */

console.log('\n1. Tao ban sao luu');

const before = (await call('GET', '/backups', null, owner)).data;
check('Doc duoc trang thai sao luu', Array.isArray(before.files), `dang co ${before.files?.length} ban`);

// Đặt số bản cần giữ đủ lớn để bước này không bị vòng dọn cắt mất.
await call('PUT', '/backups/settings', {
  enabled: true, dir: '', intervalHours: 24, keep: 20,
}, owner);

const made = await call('POST', '/backups', {}, owner);
check('Tao ban sao luu thanh cong', made.status === 201, `HTTP ${made.status}`);
check('Ban sao luu co dung luong thuc', made.data?.size > 0, `${made.data?.size} byte`);

const after = (await call('GET', '/backups', null, owner)).data;
const file = after.files.find((f) => f.name === made.data?.name);
check('Ban vua tao co trong danh sach', Boolean(file));
check('Ghi nhan thoi diem sao luu gan nhat', Boolean(after.lastAt));
check('Khong con loi sao luu nao', after.lastError === '', after.lastError);

/* ---- 2. Bản sao mở lại được và đủ dữ liệu ---- */

console.log('\n2. Ban sao mo lai duoc');

const path = join(after.activeDir, made.data.name);
check('File ban sao ton tai tren dia', existsSync(path), path);
check('Ban sao la mot file duy nhat (khong kem -wal)', !existsSync(`${path}-wal`));

let opened = false;
let tables = 0;
let admins = 0;
try {
  const copy = new DatabaseSync(path);
  tables = copy.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get().n;
  admins = copy.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  copy.close();
  opened = true;
} catch (error) {
  console.log(`       loi mo ban sao: ${error.message}`);
}
check('Mo lai ban sao bang SQLite', opened);
check('Ban sao co du bang du lieu', tables >= 20, `${tables} bang`);
check('Ban sao co du lieu that ben trong', admins >= 1, `${admins} tai khoan quan tri`);

/* ---- 3. Dọn bản cũ theo số bản cần giữ ---- */

console.log('\n3. Don ban cu');

await call('PUT', '/backups/settings', {
  enabled: true, dir: '', intervalHours: 24, keep: 2,
}, owner);

// Tạo thêm vài bản; mỗi bản cách nhau 1 giây vì tên file tính theo giây.
for (let i = 0; i < 3; i += 1) {
  await call('POST', '/backups', {}, owner);
  await new Promise((r) => setTimeout(r, 1100));
}

const rotated = (await call('GET', '/backups', null, owner)).data;
check('Chi giu dung so ban da cau hinh', rotated.files.length === 2, `con ${rotated.files.length} ban, cho 2`);
check('Ban giu lai la ban moi nhat',
  rotated.files[0].createdAt >= rotated.files[1].createdAt,
  `${rotated.files[0].name} / ${rotated.files[1].name}`);

/* ---- 4. Thư mục không ghi được bị từ chối ---- */

console.log('\n4. Tu choi thu muc khong ghi duoc');

const badDir = join('Z:', 'khong-ton-tai', 'sao-luu');
const rejected = await call('PUT', '/backups/settings', {
  enabled: true, dir: badDir, intervalHours: 24, keep: 5,
}, owner);
check('Tu choi ngay luc luu cau hinh', rejected.status === 400, `HTTP ${rejected.status}`);

const stillOk = (await call('GET', '/backups', null, owner)).data;
check('Cau hinh cu khong bi ghi de boi thu muc hong',
  stillOk.settings.dir !== badDir, `dang la "${stillOk.settings.dir}"`);

/* ---- 5. Đổi sang thư mục khác thì dùng đúng thư mục đó ---- */

console.log('\n5. Doi sang thu muc khac');

const altDir = join(tmpdir(), `thuemay-backup-test-${Date.now()}`);
const moved = await call('PUT', '/backups/settings', {
  enabled: true, dir: altDir, intervalHours: 24, keep: 5,
}, owner);
check('Chap nhan thu muc ghi duoc', moved.status === 200, `HTTP ${moved.status}`);

const madeThere = await call('POST', '/backups', {}, owner);
check('Tao duoc ban sao o thu muc moi', madeThere.status === 201);
check('File nam dung thu muc moi', existsSync(join(altDir, madeThere.data?.name ?? '')), altDir);

/* ---- 6. Nhân viên không đụng được ---- */

console.log('\n6. Nhan vien khong dung duoc');

const stamp = Date.now();
const staffEmail = `nv.backup.${stamp}@thuemay.local`;
const staffPass = 'NhanVien@12345';
const created = await call('POST', '/admins', {
  name: 'Nhan vien test backup', email: staffEmail, password: staffPass, role: 'STAFF',
}, owner);

if (created.status === 201) {
  const staff = { value: '' };
  await call('POST', '/auth/login', { email: staffEmail, password: staffPass }, staff);
  const read = await call('GET', '/backups', null, staff);
  const write = await call('POST', '/backups', {}, staff);
  const config = await call('PUT', '/backups/settings', { enabled: false, dir: '', intervalHours: 24, keep: 5 }, staff);
  check('Nhan vien khong xem duoc danh sach sao luu', read.status === 403, `HTTP ${read.status}`);
  check('Nhan vien khong tao duoc ban sao luu', write.status === 403, `HTTP ${write.status}`);
  check('Nhan vien khong sua duoc cau hinh sao luu', config.status === 403, `HTTP ${config.status}`);
  await call('PATCH', `/admins/${created.data.id}`, { status: 'DISABLED' }, owner);
} else {
  check('Tao duoc tai khoan nhan vien de kiem tra', false, `HTTP ${created.status}`);
}

/* ---- Dọn ---- */

await call('PUT', '/backups/settings', { enabled: true, dir: '', intervalHours: 24, keep: 14 }, owner);
rmSync(altDir, { recursive: true, force: true });

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

/**
 * Thêm nhiều máy cùng lúc vào kho thiết bị.
 *
 * Chạy lại được nhiều lần: máy nào đã có tên trùng thì bỏ qua, không tạo trùng.
 * Sửa phần cấu hình ngay dưới rồi chạy: node scripts/them-may-hang-loat.mjs
 */

const BASE = process.env.API_BASE || 'http://127.0.0.1:8788/api';

/* ---- Cấu hình ---- */

const TU = 1;
const DEN = 38;
/** Không tạo những số này (đã có sẵn, hoặc chưa mua). */
const BO_QUA = [10, 27, 36];
const GIA_THANG = 1_800_000;
const LOAI = 'PC';

/* ---- Chạy ---- */

let cookie = '';
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
  console.error(`Khong dang nhap duoc (${login.status}).`);
  process.exit(1);
}

const dangCo = new Set((await call('GET', '/devices')).data.map((d) => d.name));

const canTao = [];
for (let i = TU; i <= DEN; i += 1) {
  if (BO_QUA.includes(i)) continue;
  canTao.push(`Máy ${i}`);
}

console.log(`Khoang: May ${TU} -> May ${DEN}, bo qua ${BO_QUA.join(', ')}`);
console.log(`Can tao: ${canTao.length} may, gia ${GIA_THANG.toLocaleString('vi-VN')} d/thang\n`);

let daTao = 0;
let daCo = 0;
const loi = [];

for (const ten of canTao) {
  if (dangCo.has(ten)) {
    daCo += 1;
    console.log(`  bo qua   ${ten} (da co trong kho)`);
    continue;
  }
  const res = await call('POST', '/devices', {
    name: ten,
    type: LOAI,
    monthlyRate: GIA_THANG,
    notes: 'Thêm hàng loạt',
  });
  if (res.status !== 201) {
    loi.push(`${ten}: ${JSON.stringify(res.data)}`);
    console.log(`  LOI      ${ten}`);
    continue;
  }
  daTao += 1;
  console.log(`  da tao   ${ten.padEnd(8)} ${res.data.code}`);
}

console.log(`\nDa tao ${daTao} may moi, bo qua ${daCo} may da co.`);
if (loi.length) {
  console.log(`Co ${loi.length} may loi:`);
  for (const l of loi) console.log(`  ${l}`);
}

/* ---- Kiểm lại toàn kho ---- */

const tatCa = (await call('GET', '/devices')).data;
const soMay = tatCa
  .map((d) => Number(String(d.name).replace(/\D/g, '')))
  .filter((n) => Number.isFinite(n) && n > 0)
  .sort((a, b) => a - b);

console.log(`\nKho hien co ${tatCa.length} thiet bi.`);
console.log(`So may: ${soMay.join(', ')}`);

const thieu = [];
for (let i = TU; i <= DEN; i += 1) {
  if (BO_QUA.includes(i)) continue;
  if (!soMay.includes(i)) thieu.push(i);
}
console.log(thieu.length ? `THIEU: May ${thieu.join(', May ')}` : 'Khong thieu may nao trong khoang da yeu cau.');

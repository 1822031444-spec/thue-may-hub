/**
 * Kiểm tra thứ tự sắp xếp tên thiết bị.
 *
 * Sắp chuỗi thuần cho ra "Máy 1, Máy 10, Máy 11, Máy 2" — với tiệm 38 máy thì
 * danh sách đó gần như không tra được. Bài này chốt lại thứ tự số, kể cả khi tên
 * có dấu tiếng Việt hoặc số nhiều chữ số.
 *
 * Phần đầu chạy được không cần server; phần sau kiểm tra API thật nếu có.
 */

import { compareNames, sortByName } from '../server/sort.ts';

const failures = [];
function check(label, ok, detail = '') {
  if (ok) console.log(`  OK   ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
  }
}

/* ---- 1. Thứ tự số trong tên ---- */

console.log('\n1. Thu tu so trong ten');

const xao = ['Máy 10', 'Máy 2', 'Máy 1', 'Máy 21', 'Máy 3', 'Máy 100', 'Máy 20'];
const dung = ['Máy 1', 'Máy 2', 'Máy 3', 'Máy 10', 'Máy 20', 'Máy 21', 'Máy 100'];
const sapXep = [...xao].sort(compareNames);
check('Sap dung thu tu so', sapXep.join(' < ') === dung.join(' < '), sapXep.join(', '));

check('May 2 dung truoc May 10', compareNames('Máy 2', 'Máy 10') < 0);
check('May 9 dung truoc May 10', compareNames('Máy 9', 'Máy 10') < 0);
check('May 38 dung sau May 9', compareNames('Máy 38', 'Máy 9') > 0);

/* ---- 2. Không vỡ với tên khác kiểu ---- */

console.log('\n2. Ten khac kieu');

const honHop = ['Box 2', 'Máy 1', 'Box 10', 'PC-A', 'Máy 10', 'Box 1'];
const ketQua = [...honHop].sort(compareNames);
check('Ten khong co so van xep duoc', ketQua.length === honHop.length, ketQua.join(', '));
check('Cung tien to thi van dung so',
  ketQua.indexOf('Box 1') < ketQua.indexOf('Box 2')
  && ketQua.indexOf('Box 2') < ketQua.indexOf('Box 10'));
check('Ten rong khong lam vo ham', typeof compareNames('', 'Máy 1') === 'number');

const banGhi = sortByName([{ name: 'Máy 10' }, { name: 'Máy 2' }]);
check('sortByName sap dung tren ban ghi', banGhi[0].name === 'Máy 2', banGhi.map((x) => x.name).join(', '));

/* ---- 3. API thật (bỏ qua nếu server chưa chạy) ---- */

console.log('\n3. API that');

const BASE = process.env.API_BASE || 'http://127.0.0.1:8788/api';
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

let coServer = true;
try {
  await call('GET', '/health');
} catch {
  coServer = false;
}

if (!coServer) {
  console.log('  (bo qua: server chua chay)');
} else {
  const login = await call('POST', '/auth/login', {
    email: process.env.ADMIN_EMAIL || 'admin@thuemay.local',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  });
  if (login.status !== 200) {
    console.log('  (bo qua: khong dang nhap duoc)');
  } else {
    const devices = (await call('GET', '/devices')).data;
    const ten = devices.map((d) => d.name);
    const daSap = [...ten].sort(compareNames);
    check('API tra ve dung thu tu', ten.join('|') === daSap.join('|'),
      `${ten.slice(0, 6).join(', ')}${ten.length > 6 ? ' ...' : ''}`);
  }
}

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

/**
 * Kiểm tra lọc theo kỳ và phân trang của sổ tiền.
 *
 * Trước đây sổ tiền chặn cứng 300 dòng, quá ngưỡng là dữ liệu cũ biến mất mà
 * không báo gì — với số liệu tiền thì đó là kiểu hỏng tệ nhất. Bài này chốt lại
 * ba điều: lọc kỳ đúng biên, phân trang không trùng không sót, và số dư ví không
 * bị kỳ lọc làm sai.
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
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const iso = (year, month, day) => new Date(Date.UTC(year, month - 1, day, 6, 0, 0)).toISOString();

/* ---- Đăng nhập ---- */

const login = await call('POST', '/auth/login', {
  email: process.env.ADMIN_EMAIL || 'admin@thuemay.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
});
if (login.status !== 200) {
  console.error(`Khong dang nhap duoc (${login.status}). Server da chay chua?`);
  process.exit(1);
}

/* ---- Dựng dữ liệu ở hai kỳ tách biệt ---- */

// Dùng năm 2020 để không đụng dữ liệu thật và không lẫn vào "tháng này".
const MARK = `KY-TEST-${Date.now()}`;
const OLD_MONTH = { year: 2020, month: 3 };
const NEW_MONTH = { year: 2020, month: 4 };
const OLD_COUNT = 7;
const NEW_COUNT = 5;

const monthRange = (year, month) => ({
  from: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString(),
  to: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString(),
});

const oldRange = monthRange(OLD_MONTH.year, OLD_MONTH.month);
const newRange = monthRange(NEW_MONTH.year, NEW_MONTH.month);

const totalIn = async (range) =>
  (await call('GET', `/finance/expenses?from=${range.from}&to=${range.to}&limit=1`)).data.total;

// Đo mức tăng chứ không đo số tuyệt đối: chạy lại bài test trên cùng database
// thì dữ liệu cũ vẫn còn, khẳng định "đúng 7 khoản" sẽ sai ngay từ lần thứ hai.
const beforeOld = await totalIn(oldRange);
const beforeNew = await totalIn(newRange);

console.log(`\nDung du lieu: them ${OLD_COUNT} khoan thang 3/2020 va ${NEW_COUNT} khoan thang 4/2020`);
console.log(`(dang co san: ${beforeOld} va ${beforeNew} khoan)`);

for (let i = 0; i < OLD_COUNT; i += 1) {
  await call('POST', '/finance/expenses', {
    category: 'OTHER', amount: 1000 + i, reference: MARK,
    occurredAt: iso(OLD_MONTH.year, OLD_MONTH.month, 5 + i),
  });
}
// Đúng ngày cuối tháng, để bắt lỗi cắt mất ngày cuối kỳ.
await call('POST', '/finance/expenses', {
  category: 'OTHER', amount: 9999, reference: `${MARK}-CUOI-THANG`,
  occurredAt: iso(NEW_MONTH.year, NEW_MONTH.month, 30),
});
for (let i = 0; i < NEW_COUNT - 1; i += 1) {
  await call('POST', '/finance/expenses', {
    category: 'OTHER', amount: 2000 + i, reference: MARK,
    occurredAt: iso(NEW_MONTH.year, NEW_MONTH.month, 2 + i),
  });
}

/* ---- 1. Lọc theo kỳ ---- */

console.log('\n1. Loc theo ky');

const oldPage = (await call('GET', `/finance/expenses?from=${oldRange.from}&to=${oldRange.to}&limit=500`)).data;
check('Thang 3/2020 tang dung so khoan vua them', oldPage.total === beforeOld + OLD_COUNT,
  `nhan ${oldPage.total}, cho ${beforeOld + OLD_COUNT}`);

const newPage = (await call('GET', `/finance/expenses?from=${newRange.from}&to=${newRange.to}&limit=500`)).data;
check('Thang 4/2020 tang dung so khoan vua them', newPage.total === beforeNew + NEW_COUNT,
  `nhan ${newPage.total}, cho ${beforeNew + NEW_COUNT}`);

check('Chua vuot mot trang 500 dong (neu vuot phai doi bai test)',
  oldPage.total <= 500 && newPage.total <= 500, `${oldPage.total} / ${newPage.total}`);

const hasLastDay = newPage.rows.some((r) => r.reference === `${MARK}-CUOI-THANG`);
check('Khong cat mat khoan chi dung ngay cuoi ky', hasLastDay);

const leaked = oldPage.rows.filter((r) => r.occurred_at >= newRange.from);
check('Ky thang 3 khong lan sang thang 4', leaked.length === 0, `lan ${leaked.length} dong`);

/* ---- 2. Phân trang ---- */

console.log('\n2. Phan trang');

// Lật hết các trang của kỳ tháng 3, mỗi trang 3 dòng.
const PAGE = 3;
const expected = oldPage.total;
const ids = [];
const totals = [];
for (let offset = 0; offset < expected; offset += PAGE) {
  const page = (await call('GET', `/finance/expenses?from=${oldRange.from}&to=${oldRange.to}&limit=${PAGE}&offset=${offset}`)).data;
  totals.push(page.total);
  ids.push(...page.rows.map((r) => r.id));
  const conLai = expected - offset;
  check(`Trang o vi tri ${offset} dung so dong`, page.rows.length === Math.min(PAGE, conLai),
    `nhan ${page.rows.length}, cho ${Math.min(PAGE, conLai)}`);
}

check('Tong khong doi giua cac trang', totals.every((t) => t === expected), totals.join(', '));
check('Phan trang khong tra trung dong', new Set(ids).size === ids.length,
  `${ids.length} dong, ${new Set(ids).size} id khac nhau`);
check('Phan trang lay du toan bo ky', ids.length === expected, `gom duoc ${ids.length}/${expected}`);

/* ---- 3. Dashboard theo kỳ ---- */

console.log('\n3. Dashboard theo ky');

const oldBoard = (await call('GET', `/dashboard?from=${oldRange.from}&to=${oldRange.to}`)).data;
const newBoard = (await call('GET', `/dashboard?from=${newRange.from}&to=${newRange.to}`)).data;

const oldSum = oldPage.rows.reduce((s, r) => s + r.amount, 0);
const newSum = newPage.rows.reduce((s, r) => s + r.amount, 0);
check('Chi phi thang 3 khop so cong tay', oldBoard.monthExpenses === oldSum,
  `dashboard ${oldBoard.monthExpenses} vs cong tay ${oldSum}`);
check('Chi phi thang 4 khop so cong tay', newBoard.monthExpenses === newSum,
  `dashboard ${newBoard.monthExpenses} vs cong tay ${newSum}`);
check('Hai ky cho ra hai con so khac nhau', oldBoard.monthExpenses !== newBoard.monthExpenses);

// Số dư ví là số đang nợ khách tại thời điểm này, đổi kỳ không được làm nó đổi.
check('So du vi khong bi ky loc lam sai',
  oldBoard.walletLiability === newBoard.walletLiability,
  `${oldBoard.walletLiability} vs ${newBoard.walletLiability}`);
check('Dashboard bao lai dung ky dang tinh', oldBoard.period?.from === oldRange.from,
  `${oldBoard.period?.from}`);

/* ---- 4. Không truyền gì thì giữ nguyên nếp cũ ---- */

console.log('\n4. Goi khong tham so');

const plain = (await call('GET', '/finance/expenses')).data;
check('Van tra ve dang { rows, total }', Array.isArray(plain.rows) && typeof plain.total === 'number');
check('Mac dinh khong gioi han ngay', plain.total >= oldPage.total + newPage.total,
  `tong ${plain.total}`);
check('Mac dinh lay 100 dong dau', plain.rows.length <= 100, `nhan ${plain.rows.length}`);

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);

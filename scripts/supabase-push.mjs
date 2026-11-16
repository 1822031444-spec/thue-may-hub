// Chép cấu trúc database và dữ liệu mẫu của Thuê Máy Hub lên Supabase (PostgreSQL)
// để trình bày trong báo cáo: xem bảng trong Table Editor, sơ đồ quan hệ trong
// Schema Visualizer, chạy thử câu truy vấn trong SQL Editor.
//
// App vẫn chạy bằng SQLite như cũ. Đây là bản chụp một lần: thao tác trong app sau đó
// không tự lên Supabase. Chạy lại lệnh này thì các bảng của app trên Supabase được làm lại từ
// dữ liệu mẫu ban đầu (chỉ đụng tới đúng các bảng của app, bảng khác giữ nguyên).
//
//   npm run supabase:push            tạo dữ liệu mẫu mới, ghi file SQL, đẩy lên Supabase
//   npm run supabase:push -- --sql   chỉ ghi file SQL (tự dán vào SQL Editor của Supabase)
//
// Chuỗi kết nối lấy từ biến DATABASE_URL, đặt trong file .env ở thư mục gốc
// (xem .env.example). File .env đã bị git bỏ qua, không bao giờ lên GitHub.
//
// Luôn dùng dữ liệu mẫu tạo mới, không đọc database đang chạy: database đó có thể
// chứa thao tác thử nghiệm, và không bao giờ được đẩy dữ liệu thật của cửa hàng lên.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(root, 'release', 'supabase', 'thue-may-hub.sql');
const sqlOnly = process.argv.includes('--sql');

// Chỉ lấy DATABASE_URL từ .env, không nạp cả file vào process.env: các biến khác trong đó
// (ADMIN_INITIAL_PASSWORD, DATABASE_PATH…) sẽ lọt vào bước tạo dữ liệu mẫu bên dưới.
const envFile = join(root, '.env');
const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};

/** Mô tả từng bảng, hiện trong Table Editor của Supabase và trong file SQL. */
const TABLE_NOTES = {
  admins: 'Tài khoản chủ cửa hàng và nhân viên',
  sessions: 'Phiên đăng nhập của chủ cửa hàng và nhân viên',
  customers: 'Khách thuê máy: mã khách, liên hệ, CCCD, hạn mức nợ, trạng thái',
  devices: 'Máy cho thuê (PC, boxphone): cấu hình, giá theo giờ/ngày/tuần/tháng, trạng thái máy và mạng',
  rentals: 'Đơn thuê: khách, máy, thời gian, tiền, số liên hệ và cách giao máy',
  rental_periods: 'Từng lần thuê và gia hạn của một đơn; tổng tiền đơn cộng từ bảng này',
  financial_transactions: 'Sổ tiền: thu tiền đơn, nạp ví, trả bằng ví, hoàn tiền; mỗi dòng ghi thay đổi tiền mặt, ví và doanh thu',
  expenses: 'Khoản chi của cửa hàng: sửa máy, mua linh kiện, chi phí khác',
  audit_logs: 'Nhật ký thao tác của chủ cửa hàng và nhân viên',
  customer_accounts: 'Tài khoản đăng nhập cổng khách hàng, mỗi khách tối đa một tài khoản',
  customer_sessions: 'Phiên đăng nhập của khách hàng',
  booking_requests: 'Yêu cầu thuê khách gửi từ cổng khách, chờ cửa hàng duyệt',
  extension_requests: 'Yêu cầu gia hạn khách gửi, chờ cửa hàng duyệt',
  support_tickets: 'Yêu cầu hỗ trợ của khách',
  ticket_messages: 'Tin nhắn qua lại trong một yêu cầu hỗ trợ',
  customer_notifications: 'Thông báo gửi tới khách: duyệt đơn, nạp ví, cửa hàng trả lời hỗ trợ',
  app_settings: 'Cài đặt dạng khoá - giá trị: thông tin cửa hàng, tài khoản nhận chuyển khoản, khoá mạng',
  network_lock_events: 'Nhật ký khoá/mở mạng máy thuê, kể cả lần thất bại',
  repairs: 'Phiếu sửa chữa máy',
  parts: 'Danh mục linh kiện trong kho',
  part_movements: 'Nhập xuất linh kiện; tồn kho và giá vốn tính lại từ bảng này',
  wallet_topups: 'Yêu cầu nạp ví bằng chuyển khoản VietQR, tiền vào ví khi chủ xác nhận đã nhận',
};

const REGIONS = {
  'ap-southeast-1': 'Singapore', 'ap-southeast-2': 'Sydney', 'ap-northeast-1': 'Tokyo',
  'ap-northeast-2': 'Seoul', 'ap-south-1': 'Mumbai', 'us-east-1': 'Mỹ - N. Virginia',
  'us-east-2': 'Mỹ - Ohio', 'us-west-1': 'Mỹ - N. California', 'us-west-2': 'Mỹ - Oregon',
  'ca-central-1': 'Canada', 'sa-east-1': 'São Paulo', 'eu-central-1': 'Frankfurt',
  'eu-central-2': 'Zurich', 'eu-west-1': 'Ireland', 'eu-west-2': 'London',
  'eu-west-3': 'Paris', 'eu-north-1': 'Stockholm',
};

function fail(message) {
  console.error(`\n[LỖI] ${message}`);
  process.exit(1);
}

// ---- 1. Tạo dữ liệu mẫu mới trong thư mục tạm ---------------------------------
const workDir = mkdtempSync(join(tmpdir(), 'tmh-supabase-'));
const seedDb = join(workDir, 'hub-demo.db');
process.on('exit', () => {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    // Thoát giữa chừng lúc file còn mở thì Windows không cho xoá; để hệ điều hành tự dọn thư mục tạm.
  }
});

console.log('1/4 Tạo dữ liệu mẫu mới…');
const seed = spawnSync(process.execPath, [join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'server/seed-hub.ts'], {
  cwd: root,
  env: { ...process.env, DATABASE_PATH: seedDb, NODE_NO_WARNINGS: '1' },
  encoding: 'utf8',
});
if (seed.status !== 0) fail(`Không tạo được dữ liệu mẫu:\n${seed.stdout}\n${seed.stderr}`);

// ---- 2. Đọc cấu trúc và dữ liệu, dịch sang PostgreSQL -------------------------
console.log('2/4 Đọc cấu trúc và chuyển sang PostgreSQL…');
const lite = new DatabaseSync(seedDb, { readOnly: true });
const tableNames = lite
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
  .all()
  .map((row) => row.name);
const unknown = tableNames.filter((name) => !TABLE_NOTES[name]);
if (unknown.length) fail(`Có bảng mới chưa có mô tả trong TABLE_NOTES: ${unknown.join(', ')}`);

// Thời điểm trong app lưu dạng chữ ISO 8601. Bên Postgres đổi sang TIMESTAMPTZ để
// Supabase hiện và sắp xếp đúng kiểu ngày giờ; cột nào có giá trị lạ thì giữ dạng chữ.
const ISO_TIME = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const keptAsText = [];

/**
 * Tách phần trong ngoặc của CREATE TABLE thành từng định nghĩa cột. Dấu phẩy nằm trong
 * ngoặc (CHECK(... IN ('A', 'B'))) hoặc trong chuỗi không phải chỗ ngắt. Cột thêm sau
 * bằng ALTER TABLE bị SQLite dồn lên một dòng ở cuối; tách ra để mỗi cột một dòng.
 */
function splitDefinitions(body) {
  const items = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "'") quoted = !quoted;
    else if (!quoted && ch === '(') depth += 1;
    else if (!quoted && ch === ')') depth -= 1;
    else if (!quoted && depth === 0 && ch === ',') {
      items.push(body.slice(start, i));
      start = i + 1;
    }
  }
  items.push(body.slice(start));
  return items.map((item) => item.trim()).filter(Boolean);
}

const tables = tableNames.map((name) => {
  const columns = new Map(lite.prepare(`PRAGMA table_info("${name}")`).all().map((c) => [c.name, c]));
  const rows = lite.prepare(`SELECT * FROM "${name}"`).all();
  const parents = lite.prepare(`PRAGMA foreign_key_list("${name}")`).all().map((fk) => fk.table).filter((t) => t !== name);
  const source = lite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(name).sql;
  const definitions = splitDefinitions(source.slice(source.indexOf('(') + 1, source.lastIndexOf(')'))).map((definition) => {
    const out = definition.replace(/\bINTEGER\b/g, 'BIGINT');
    const column = columns.get(definition.split(/\s/)[0]);
    if (!column || !column.name.endsWith('_at') || column.type.toUpperCase() !== 'TEXT') return out;
    if (rows.every((row) => row[column.name] === null || ISO_TIME.test(row[column.name]))) {
      return out.replace(/^(\w+)\s+TEXT\b/, '$1 TIMESTAMPTZ');
    }
    keptAsText.push(`${name}.${column.name}`);
    return out;
  });
  const ddl = `CREATE TABLE public.${name} (\n  ${definitions.join(',\n  ')}\n)`;
  return { name, columns: [...columns.keys()], rows, parents, ddl };
});

// Tạo và chép bảng cha trước bảng con để khoá ngoại luôn trỏ tới dòng đã có.
const ordered = [];
const placed = new Set();
while (ordered.length < tables.length) {
  const next = tables.find((t) => !placed.has(t.name) && t.parents.every((p) => placed.has(p)));
  if (!next) fail('Khoá ngoại giữa các bảng bị vòng, không xếp được thứ tự tạo bảng.');
  ordered.push(next);
  placed.add(next.name);
}

const indexes = lite
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY rowid")
  .all()
  .map((row) => `${row.sql.replace(/\bON\s+"?(\w+)"?/, 'ON public.$1')};`);
lite.close();

function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  fail(`Gặp kiểu dữ liệu chưa hỗ trợ: ${Object.prototype.toString.call(value)}`);
}

const parts = [
  '-- Thuê Máy Hub: cấu trúc database và dữ liệu mẫu cho PostgreSQL / Supabase.',
  `-- Sinh bởi scripts/supabase-push.mjs lúc ${new Date().toISOString()}.`,
  `-- Chạy lại cả file thì ${tables.length} bảng của app được làm lại từ đầu; bảng khác không bị đụng tới.`,
  '',
  'BEGIN;',
  '',
  `DROP TABLE IF EXISTS ${tables.map((t) => `public.${t.name}`).join(', ')} CASCADE;`,
  '',
];
for (const table of ordered) parts.push(`${table.ddl.trim()};`, '');
parts.push(...indexes, '');
for (const table of ordered) parts.push(`COMMENT ON TABLE public.${table.name} IS ${literal(TABLE_NOTES[table.name])};`);
parts.push('');
for (const table of ordered) {
  if (!table.rows.length) continue;
  const values = table.rows.map((row) => `  (${table.columns.map((c) => literal(row[c])).join(', ')})`);
  parts.push(`INSERT INTO public.${table.name} (${table.columns.join(', ')}) VALUES\n${values.join(',\n')};`, '');
}
// Supabase mở schema public ra API công khai (ai có publishable key là gọi được).
// Bật RLS mà không tạo policy nào thì API bị chặn hết, chỉ Dashboard và kết nối
// bằng mật khẩu database mới xem được, nên mật khẩu đã băm trong admins không lộ ra.
parts.push('-- Chặn API công khai của Supabase đọc ghi các bảng này (không có policy nào = không ai qua API).');
for (const table of ordered) parts.push(`ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;`);
parts.push('', 'COMMIT;', '');

const sqlText = parts.join('\n');
mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, sqlText, 'utf8');

const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0);
console.log(`3/4 Đã ghi ${relative(root, OUT_FILE)} (${tables.length} bảng, ${indexes.length} chỉ mục, ${totalRows} dòng dữ liệu, ${(Buffer.byteLength(sqlText) / 1024).toFixed(0)} KB)`);
if (keptAsText.length) console.log(`    Giữ dạng chữ vì có giá trị không phải ngày giờ: ${keptAsText.join(', ')}`);

// ---- 3. Đẩy lên Supabase -------------------------------------------------------
const rawUrl = (process.env.DATABASE_URL || fileEnv.DATABASE_URL || '').trim();
if (sqlOnly || !rawUrl) {
  if (!sqlOnly) console.log('\nChưa có DATABASE_URL trong file .env nên chưa đẩy lên Supabase.');
  console.log('Cách khác: mở Supabase → SQL Editor → dán toàn bộ nội dung file trên → Run.');
  process.exit(0);
}

if (rawUrl.includes('[YOUR-PASSWORD]')) fail('Trong DATABASE_URL vẫn còn chữ [YOUR-PASSWORD]: thay bằng mật khẩu database của project (bỏ cả dấu ngoặc vuông).');
const SPECIAL_CHARS = 'Mật khẩu có ký tự đặc biệt như @ # / ? làm hỏng chuỗi kết nối: vào Project Settings → Database → Reset database password, đặt mật khẩu chỉ gồm chữ và số rồi sửa lại trong .env.';
// "postgresql://postgres:ab@c#d@host" vẫn là URL hợp lệ nhưng sai máy chủ (thành "c"),
// nên phải bắt trước khi phân tích, không thì lỗi báo ra sẽ chỉ sai hướng.
if (rawUrl.split('@').length > 2 || rawUrl.includes('#')) fail(SPECIAL_CHARS);
let url;
try {
  url = new URL(rawUrl);
} catch {
  fail(`DATABASE_URL không đúng dạng postgresql://... ${SPECIAL_CHARS}`);
}
if (!/^postgres(ql)?:$/.test(url.protocol)) fail('DATABASE_URL phải bắt đầu bằng postgresql://');
const host = url.hostname;
const region = host.match(/^aws-\d+-([a-z]+-[a-z]+-\d)\.pooler\.supabase\.com$/)?.[1];
const sslMode = url.searchParams.get('sslmode');
url.searchParams.delete('sslmode');

console.log(`4/4 Đẩy lên ${host}${region ? ` (vùng ${region}${REGIONS[region] ? ` - ${REGIONS[region]}` : ''})` : ''}…`);
const { default: pg } = await import('pg');
// Chứng chỉ của Supabase do CA riêng của Supabase ký, Node không có sẵn nên không
// kiểm tra chuỗi chứng chỉ; kết nối vẫn được mã hoá.
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: sslMode === 'disable' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

function explain(error) {
  const text = `${error.code ?? ''} ${error.message ?? ''}`;
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host) && /ENOTFOUND|ENETUNREACH|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN/.test(text)) {
    return 'Đang dùng chuỗi "Direct connection" (chỉ chạy qua IPv6, mạng nhà thường không có). Vào Supabase → Connect → Direct → chọn "Session pooler" rồi copy lại chuỗi.';
  }
  if (/password authentication failed/i.test(text)) return 'Sai mật khẩu database. Vào Project Settings → Database → Reset database password, rồi sửa lại trong .env.';
  if (/Tenant or user not found/i.test(text)) return 'Supabase không nhận ra project: copy lại nguyên chuỗi Session pooler, đừng sửa phần tên người dùng postgres.xxxx hay địa chỉ máy chủ.';
  if (/ENOTFOUND|EAI_AGAIN/.test(text)) return `Không tìm thấy máy chủ ${host}: kiểm tra mạng internet và chuỗi kết nối.`;
  if (/ECONNREFUSED/.test(text)) return `Máy chủ ${host} từ chối kết nối: kiểm tra số cổng trong chuỗi kết nối (Session pooler dùng 5432).`;
  if (/ETIMEDOUT|timeout/i.test(text)) return 'Hết thời gian chờ kết nối: kiểm tra mạng, hoặc project Supabase đang tạm dừng (vào Dashboard bấm Restore project).';
  return error.message;
}

try {
  await client.connect();
  await client.query(sqlText);

  const counts = await client.query(
    `SELECT c.relname AS name, c.relrowsecurity AS rls, obj_description(c.oid, 'pg_class') AS note
       FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relname = ANY($1)`,
    [tableNames],
  );
  const info = new Map(counts.rows.map((row) => [row.name, row]));
  const problems = [];
  console.log('\n  Bảng                      Dòng  RLS');
  for (const table of ordered) {
    const remote = Number((await client.query(`SELECT count(*) AS n FROM public.${table.name}`)).rows[0].n);
    const meta = info.get(table.name);
    if (!meta) problems.push(`thiếu bảng ${table.name}`);
    else if (remote !== table.rows.length) problems.push(`${table.name}: ${remote}/${table.rows.length} dòng`);
    else if (!meta.rls) problems.push(`${table.name}: chưa bật RLS`);
    console.log(`  ${table.name.padEnd(24)} ${String(remote).padStart(5)}  ${meta?.rls ? 'bật' : 'TẮT'}`);
  }
  if (problems.length) fail(`Dữ liệu trên Supabase chưa khớp: ${problems.join('; ')}`);
  console.log(`\nXONG: ${tables.length} bảng, ${totalRows} dòng đã lên Supabase và khớp với dữ liệu mẫu.`);
  console.log('Xem trong Supabase: Table Editor (bảng và dữ liệu), Database → Schema Visualizer (sơ đồ quan hệ).');
} catch (error) {
  fail(explain(error));
} finally {
  await client.end().catch(() => {});
}

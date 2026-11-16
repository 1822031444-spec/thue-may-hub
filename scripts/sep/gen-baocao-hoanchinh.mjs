/**
 * Báo cáo hoàn chỉnh (báo cáo tổng kết) của dự án Thuê Máy Hub.
 *
 * Gom toàn bộ dự án vào một file Word: tổng quan, quản lý dự án, yêu cầu, thiết
 * kế, hiện thực, kiểm thử, triển khai và kết luận. Không viết lại số liệu bằng tay:
 *   - user story, việc, điểm, rủi ro, lỗi lấy từ plan.mjs, tasks.mjs, sprints.mjs;
 *   - chức năng, quy tắc nghiệp vụ lấy từ domain.mjs;
 *   - kiến trúc từ gen-arch.mjs, sơ đồ lớp từ gen-class.mjs, phân tích use case
 *     từ gen-baocao.mjs (báo cáo tiến độ), nên hai báo cáo không lệch nhau;
 *   - lược đồ database đọc thẳng từ server/database.ts, danh sách API từ
 *     ThueMayHub-FE/BACKEND.md, số file và số dòng mã nguồn đếm lúc sinh;
 *   - kết quả kiểm thử cuối lấy từ final-run.mjs.
 */

import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AlignmentType, HeadingLevel, Paragraph, TextRun } from 'docx';
import { PRODUCT_OWNER, PROJECT, roleLabel, SCRUM_MASTER, SPRINTS, TEAM, TESTER } from './data.mjs';
import { BUSINESS_RULES, DB_TABLES, FRS, MODULES } from './domain.mjs';
import { ARCH_DECISIONS, PHYSICAL_COMPONENTS, QA_SCENARIOS, QUALITY_ATTRIBUTES, STATIC_LAYERS } from './gen-arch.mjs';
import {
  AREAS, BUSINESS_FLOW_PROGRESS, documents, HIGHLIGHTS, RISK_NOW, USE_CASE_ANALYSIS, USE_CASE_CLASS_TRACE,
} from './gen-baocao.mjs';
import { GROUPS, LEGEND } from './gen-class.mjs';
import { FINAL_RUN_DATE, FINAL_TESTS, POST_DEFECTS, POST_SPRINT } from './final-run.mjs';
import { ISSUES, RISKS } from './plan.mjs';
import { sourceFiles, sprintNow, STORIES } from './progress.mjs';
import { DEFECT_LOG, SPRINT_DOCS } from './sprints.mjs';
import { TASKS } from './tasks.mjs';
import { SUITES } from './tests.mjs';
import {
  caption, h2, item, para, pngFigure, rich, svgFigure, table, toc, writeDocxSections,
} from './docx-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const UML = join(ROOT, 'design', 'uml');
const UI = join(ROOT, 'design', 'ui');
const CLASS = join(ROOT, 'design', 'class-diagram');

const FONT = 'Times New Roman';
const GREEN = '2E7D32';
const NAVY = '1F3864';

const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0);
const done = (list) => list.filter((t) => t.status === 'Done');
const vnd = (n) => n.toLocaleString('vi-VN');
const STATUS_VI = { Done: 'Hoàn thành', 'In Progress': 'Đang làm', 'To Do': 'Chưa làm' };

/* ---- Đánh số chương, hình, bảng ------------------------------------------- */

let chap = 0;
let figN = 0;
let tabN = 0;

function chapter(n, text) {
  chap = n;
  figN = 0;
  tabN = 0;
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { after: 200 },
    children: [new TextRun({ text: `CHƯƠNG ${n}. ${text}`, bold: true, size: 32, font: FONT, color: GREEN })],
  });
}

/** Tiêu đề mức 1 không đánh số chương (lời cảm ơn, tài liệu tham khảo, phụ lục). */
function part(text) {
  chap = 0;
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: FONT, color: GREEN })],
  });
}

/** Heading 2 bắt đầu trang mới (trang ngang của sơ đồ). */
function h2p(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    pageBreakBefore: true,
    keepNext: true,
    spacing: { after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, font: FONT })],
  });
}

/** Mức 3: in đậm, có trong bookmark PDF nhưng không vào mục lục. */
function h3(text, { page = false } = {}) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    pageBreakBefore: page,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, italics: true, size: 26, font: FONT })],
  });
}

const figCap = (text) => caption(`**Hình ${chap}.${++figN}.** ${text}`);
const tabCap = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  keepNext: true,
  spacing: { before: 160, after: 80 },
  children: rich(`**Bảng ${chap}.${++tabN}.** ${text}`, { size: 12, italics: true }),
});
/** Bảng kèm tên bảng phía trên (tên bảng cũng ngăn Word gộp hai bảng đứng liền). */
const tbl = (name, headers, rows, widths, opts) => [tabCap(name), table(headers, rows, widths, opts)];

const uml = (name, maxW, maxH) => svgFigure(join(UML, `${name}.svg`), join(UML, 'png', `${name}.png`), maxW, maxH, { rasterOnly: true });
const classFig = (name, maxW, maxH) => svgFigure(join(CLASS, `${name}.svg`), join(CLASS, 'png', `${name}.png`), maxW, maxH, { rasterOnly: true });

function center(text, { size = 13, bold = false, italics = false, before = 0, after = 100, color } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before, after },
    children: [new TextRun({ text, size: size * 2, bold, italics, font: FONT, color })],
  });
}

/* ---- Số liệu đọc từ mã nguồn ---------------------------------------------- */

/** Bảng và cột thật trong server/database.ts, gồm cả cột thêm sau bằng ensureColumn. */
function parseSchema() {
  const src = readFileSync(join(ROOT, 'server', 'database.ts'), 'utf8');
  const tables = [];
  for (const m of src.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n {2}\);/g)) {
    const cols = [];
    for (const raw of m[2].split('\n')) {
      const c = raw.trim().replace(/,$/, '').match(/^(\w+)\s+([A-Z]+)\b(.*)$/);
      if (!c || ['CHECK', 'UNIQUE', 'PRIMARY', 'FOREIGN'].includes(c[1])) continue;
      cols.push({ name: c[1], type: c[2], rest: c[3].trim(), added: false });
    }
    tables.push({ name: m[1], cols });
  }
  for (const e of src.matchAll(/ensureColumn\('(\w+)', '(\w+)', (["'])(.*?)\3\);/g)) {
    const t = tables.find((x) => x.name === e[1]);
    const [type, ...rest] = e[4].split(' ');
    if (t && !t.cols.some((c) => c.name === e[2])) t.cols.push({ name: e[2], type, rest: rest.join(' '), added: true });
  }
  const indexes = [...src.matchAll(/CREATE INDEX IF NOT EXISTS/g)].length;
  return { tables, indexes };
}

function constraintText(c) {
  const out = [];
  if (/PRIMARY KEY/.test(c.rest)) out.push('Khoá chính');
  else if (/NOT NULL/.test(c.rest)) out.push('Bắt buộc');
  if (/UNIQUE/.test(c.rest)) out.push('Không trùng');
  const ref = c.rest.match(/REFERENCES (\w+)\(id\)(?: ON DELETE (CASCADE|SET NULL))?/);
  if (ref) out.push(`FK → ${ref[1]}${ref[2] === 'CASCADE' ? ' (xoá theo)' : ref[2] ? ' (đặt NULL)' : ''}`);
  const check = c.rest.match(/CHECK\(\w+ IN \(([^)]*)\)\)/);
  if (check) out.push(check[1].replaceAll("'", '').split(', ').join(' / '));
  const def = c.rest.match(/DEFAULT ('[^']*'|-?\d+)/);
  if (def && !check) out.push(`Mặc định ${def[1] === "''" ? 'rỗng' : def[1].replaceAll("'", '')}`);
  if (c.added) out.push('Thêm sau');
  return out.join('; ');
}

/** Mô tả cột: `bảng.cột` cụ thể trước, rồi tới tên cột dùng chung. */
const COL = {
  id: 'Khoá chính (chuỗi ngẫu nhiên)',
  name: 'Tên',
  email: 'Email',
  'admins.email': 'Email đăng nhập quản trị',
  'customer_accounts.email': 'Email đăng nhập cổng khách',
  password_hash: 'Mật khẩu đã băm bằng scrypt kèm muối',
  role: 'Vai trò: OWNER (chủ) / STAFF (nhân viên)',
  username: 'Tên đăng nhập dùng ở giao diện mới',
  created_at: 'Thời điểm tạo',
  updated_at: 'Thời điểm cập nhật gần nhất',
  admin_id: 'Tài khoản quản trị liên quan',
  expires_at: 'Thời điểm phiên hết hạn',
  code: 'Mã nghiệp vụ hiển thị cho người dùng',
  phone: 'Số điện thoại',
  company: 'Tên công ty (nếu có)',
  credit_limit: 'Hạn mức công nợ cho phép',
  address: 'Địa chỉ',
  identity_number: 'Số CCCD (9–12 chữ số)',
  notes: 'Ghi chú',
  'admins.status': 'ACTIVE / DISABLED',
  'customers.status': 'ACTIVE / LIMITED / BLOCKED',
  'devices.status': 'AVAILABLE / RESERVED / RENTED / MAINTENANCE / OFFLINE / RETIRED',
  'rentals.status': 'RESERVED / ACTIVE / EXPIRED / COMPLETED / CANCELLED',
  'customer_accounts.status': 'ACTIVE / BLOCKED',
  'booking_requests.status': 'PENDING / APPROVED / REJECTED / CANCELLED',
  'extension_requests.status': 'PENDING / APPROVED / REJECTED',
  'support_tickets.status': 'OPEN / WAITING_CUSTOMER / RESOLVED / CLOSED',
  'network_lock_events.status': 'Kết quả chạy lệnh',
  'repairs.status': 'REPORTED / IN_PROGRESS / DONE / UNREPAIRABLE / CANCELLED',
  type: 'Loại máy',
  specs: 'Cấu hình máy',
  ip_address: 'Địa chỉ IP, thay vào chỗ {ip} của lệnh khoá mạng',
  'devices.access_note': 'Thông tin truy cập mặc định của máy',
  'rentals.access_note': 'Thông tin truy cập giao cho khách của đơn',
  hourly_rate: 'Giá thuê theo giờ',
  daily_rate: 'Giá thuê theo ngày',
  weekly_rate: 'Giá thuê theo tuần',
  monthly_rate: 'Giá thuê theo tháng',
  purchase_price: 'Giá mua máy, dùng tính lãi/lỗ của máy',
  purchased_at: 'Ngày mua máy',
  'devices.category': 'Phân nhóm hiển thị (Gaming, Văn phòng, Đồ hoạ…)',
  'devices.location': 'Vị trí đặt máy (tầng, khu, kệ)',
  network_status: 'Trạng thái mạng: OPEN / LOCKED',
  network_locked_at: 'Thời điểm khoá mạng gần nhất',
  customer_id: 'Khách hàng liên quan',
  device_id: 'Thiết bị liên quan',
  rental_id: 'Đơn thuê liên quan',
  start_at: 'Thời điểm bắt đầu',
  end_at: 'Thời điểm kết thúc',
  base_amount: 'Tiền thuê gốc',
  surcharge: 'Phụ thu',
  discount: 'Giảm giá',
  total_amount: 'Tổng phải thu, bằng tổng các kỳ thuê',
  'rental_periods.unit': 'Đơn vị của kỳ thuê',
  'parts.unit': 'Đơn vị tính (cái, thanh, sợi…)',
  'rental_periods.quantity': 'Số đơn vị của kỳ thuê',
  'part_movements.quantity': 'Số lượng: dương là nhập, âm là xuất',
  'rental_periods.amount': 'Tiền của kỳ thuê',
  'expenses.amount': 'Số tiền chi',
  created_by: 'Tài khoản quản trị đã tạo bản ghi',
  'financial_transactions.kind': 'DEPOSIT / RENTAL_PAYMENT / REFUND / ADJUSTMENT',
  'customer_notifications.kind': 'Loại thông báo (sắp hết hạn, duyệt yêu cầu, trả lời hỗ trợ…)',
  'part_movements.kind': 'PURCHASE nhập · CONSUME lắp · RETURN trả kho · ADJUST điều chỉnh',
  payment_method: 'CASH / BANK / WALLET / OTHER',
  cash_change: 'Biến động tiền thực (+ thu vào, − chi ra)',
  wallet_change: 'Biến động số dư ví khách',
  revenue_change: 'Biến động doanh thu ghi nhận',
  reference: 'Số tham chiếu (mã chuyển khoản, hoá đơn…)',
  occurred_at: 'Thời điểm phát sinh',
  'expenses.category': 'ELECTRICITY / INTERNET / RENT / SALARY / MAINTENANCE / PARTS / …',
  'support_tickets.category': 'TECHNICAL / PAYMENT / RENTAL / GENERAL',
  'parts.category': 'RAM / STORAGE / GPU / CPU / PSU / CABLE / … / OTHER',
  vendor: 'Nhà cung cấp hoặc thợ sửa',
  'audit_logs.action': 'Hành động (LOGIN, CREATE, UPDATE, PAYMENT, REFUND…)',
  'network_lock_events.action': 'Hành động khoá hoặc mở',
  entity_type: 'Loại đối tượng bị tác động',
  entity_id: 'Mã đối tượng bị tác động',
  detail: 'Mô tả chi tiết thao tác',
  email_verified_at: 'Thời điểm xác minh email',
  last_login_at: 'Lần đăng nhập gần nhất',
  account_id: 'Tài khoản khách của phiên',
  billing_mode: 'Cách tính tiền theo giờ hoặc theo tháng',
  requested_start_at: 'Thời điểm bắt đầu khách mong muốn',
  requested_end_at: 'Thời điểm kết thúc khách mong muốn',
  estimated_amount: 'Tiền tạm tính lúc khách gửi',
  quoted_amount: 'Giá tiệm chốt khi duyệt',
  customer_note: 'Ghi chú của khách',
  admin_note: 'Ghi chú của tiệm khi duyệt hoặc từ chối',
  reviewed_by: 'Người duyệt',
  reviewed_at: 'Thời điểm duyệt',
  current_end_at: 'Hạn của đơn lúc khách xin gia hạn',
  additional_amount: 'Tiền gia hạn tiệm báo giá',
  subject: 'Tiêu đề yêu cầu hỗ trợ',
  'support_tickets.priority': 'NORMAL / HIGH',
  'repairs.priority': 'LOW / MEDIUM / HIGH',
  last_message_at: 'Thời điểm tin nhắn gần nhất',
  ticket_id: 'Ticket chứa tin nhắn',
  author_type: 'Người gửi',
  author_id: 'Mã người gửi',
  body: 'Nội dung',
  'customer_notifications.title': 'Tiêu đề thông báo',
  'repairs.title': 'Tóm tắt hỏng hóc',
  link: 'Đường dẫn mở khi bấm thông báo',
  dedupe_key: 'Khoá chống tạo trùng một thông báo',
  read_at: 'Thời điểm khách đã đọc',
  key: 'Tên thiết lập (khoá chính)',
  value: 'Giá trị thiết lập',
  source: 'Bộ quét tự động hoặc bấm tay',
  command: 'Câu lệnh thực tế đã chạy',
  output: 'Kết quả lệnh trả về',
  symptom: 'Triệu chứng chi tiết',
  service_cost: 'Tiền công sửa',
  expense_id: 'Khoản chi sinh ra (tiền công hoặc mua linh kiện)',
  device_status_before: 'Trạng thái máy trước khi sửa, trả lại khi đóng phiếu',
  resolution: 'Kết quả xử lý',
  reported_at: 'Thời điểm báo hỏng',
  started_at: 'Thời điểm bắt đầu sửa',
  closed_at: 'Thời điểm đóng phiếu',
  min_quantity: 'Mức tồn tối thiểu để cảnh báo',
  'parts.location': 'Vị trí cất trong kho',
  part_id: 'Linh kiện',
  repair_id: 'Phiếu sửa nhận linh kiện (nếu có)',
  unit_cost: 'Giá vốn đơn vị',
};

/** Mô tả bảng; bảng nào domain.mjs có mô tả thì dùng mô tả đó. */
const TABLE_DESC = {
  rental_periods: 'Từng kỳ thuê của đơn; mỗi lần gia hạn thêm một dòng, tổng tiền đơn là tổng các kỳ',
  customer_sessions: 'Phiên đăng nhập cổng khách hàng, tách riêng với phiên quản trị',
  extension_requests: 'Yêu cầu gia hạn khách gửi từ cổng, chờ tiệm báo giá và duyệt',
  ticket_messages: 'Tin nhắn trong một ticket hỗ trợ, của khách hoặc của tiệm',
  customer_notifications: 'Thông báo gửi tới khách trên cổng (sắp hết hạn, duyệt yêu cầu, trả lời hỗ trợ)',
  app_settings: 'Cấu hình dạng khoá–giá trị: khoá mạng, sao lưu, Telegram, thông tin cửa hàng',
};
const tableDesc = (name) => TABLE_DESC[name] ?? DB_TABLES.find((t) => t.name === name)?.desc ?? '';

function colDesc(table, col) {
  const d = COL[`${table}.${col}`] ?? COL[col];
  if (!d) throw new Error(`Thiếu mô tả cột ${table}.${col} trong gen-baocao-hoanchinh.mjs`);
  return d;
}

/** Số file và số dòng mã nguồn theo thư mục. */
function sourceStats() {
  const TEXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs', '.css', '.ps1', '.html', '.json']);
  const AREA = {
    server: 'Backend Express + SQLite',
    'ThueMayHub-FE': 'Giao diện mới theo Figma (TanStack Start)',
    src: 'Giao diện thế hệ đầu (Vite), dùng cho bản desktop',
    electron: 'Vỏ ứng dụng desktop Electron',
    scripts: 'Bài test tự động, đóng gói, công cụ',
    public: 'Tài nguyên tĩnh của giao diện thế hệ đầu',
  };
  const rows = new Map();
  for (const f of sourceFiles(ROOT)) {
    const area = f.startsWith('ThueMayHub-FE/') ? 'ThueMayHub-FE' : f.includes('/') ? f.split('/')[0] : '(thư mục gốc)';
    const lines = TEXT.has(extname(f)) ? readFileSync(join(ROOT, f), 'utf8').split('\n').length : 0;
    const r = rows.get(area) ?? { files: 0, lines: 0 };
    rows.set(area, { files: r.files + 1, lines: r.lines + lines });
  }
  const list = [...rows].map(([area, r]) => [area, AREA[area] ?? 'Cấu hình dự án (package.json, tsconfig, vite)', r.files, r.lines]);
  return { list, files: sum(list, (r) => r[2]), lines: sum(list, (r) => r[3]) };
}

/** Số endpoint REST đếm theo từng file server. */
function endpointStats() {
  const files = [
    ['server/index.ts', 'Khu quản trị: khách, máy, đơn, tiền, sửa chữa, kho, cài đặt'],
    ['server/customer.ts', 'Cổng khách hàng (/api/customer)'],
    ['server/hub.ts', 'Giao diện mới (/api/hub): đăng nhập chung, đăng ký, hồ sơ, ví, cửa hàng'],
  ];
  const rows = files.map(([file, role]) => {
    const n = [...readFileSync(join(ROOT, file), 'utf8').matchAll(/\b(?:app|router)\.(?:get|post|put|patch|delete)\(/g)].length;
    return [`\`${file}\``, role, n];
  });
  return { rows, total: sum(rows, (r) => r[2]) };
}

/** Bảng "API mỗi màn hình gọi" trong ThueMayHub-FE/BACKEND.md. */
function apiByScreen() {
  const md = readFileSync(join(ROOT, 'ThueMayHub-FE', 'BACKEND.md'), 'utf8');
  const section = md.split('## API mỗi màn hình gọi')[1].split('\n## ')[0];
  return section.split('\n')
    .filter((l) => l.startsWith('| ') && !l.startsWith('| ---') && !l.includes('Màn hình / thao tác'))
    .map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
}

/** "US.01–US.08, US.12" có chứa story `code` không. */
function covers(field, code) {
  const n = Number(code.slice(3));
  return field.split(',').some((tok) => {
    const [a, b] = tok.trim().split('–');
    return b ? n >= Number(a.slice(3)) && n <= Number(b.slice(3)) : a === code;
  });
}

/* ---- Nội dung viết tay ---------------------------------------------------- */

const ABBREVIATIONS = [
  ['API', 'Application Programming Interface — giao diện lập trình, ở đây là các endpoint REST của server'],
  ['BR', 'Business Rule — quy tắc nghiệp vụ'],
  ['CCCD', 'Căn cước công dân'],
  ['CSDL', 'Cơ sở dữ liệu'],
  ['CSV', 'Comma-Separated Values — file bảng tính dạng văn bản'],
  ['DF', 'Defect — lỗi phát hiện khi kiểm thử'],
  ['FE / BE', 'Frontend (giao diện) / Backend (máy chủ)'],
  ['FK', 'Foreign Key — khoá ngoại'],
  ['FR', 'Functional Requirement — yêu cầu chức năng'],
  ['PO / SM', 'Product Owner / Scrum Master'],
  ['SPA', 'Single-Page Application — ứng dụng một trang chạy trong trình duyệt'],
  ['UAT', 'User Acceptance Test — kiểm thử chấp nhận của khách hàng'],
  ['UC', 'Use Case — ca sử dụng'],
  ['UI / UX', 'User Interface / User Experience — giao diện / trải nghiệm người dùng'],
  ['US', 'User Story — câu chuyện người dùng trong Product Backlog'],
  ['WAL', 'Write-Ahead Logging — chế độ ghi nhật ký của SQLite cho phép đọc và ghi song song'],
];

const ACTORS = [
  ['Khách hàng', 'Tự phục vụ trước và trong thời gian thuê', 'Đăng ký, xem máy, gửi/theo dõi yêu cầu, trả bằng ví, xin gia hạn, gửi ticket, nhận thông báo'],
  ['Nhân viên', 'Vận hành giao dịch tại quầy', 'Quản lý khách và máy, tạo/duyệt đơn, giao máy, thu tiền, xử lý sửa chữa và hỗ trợ'],
  ['Chủ hệ thống', 'Kiểm soát tiền, quyền và cấu hình', 'Kế thừa Nhân viên; thêm tài chính, nhân sự, khoá mạng, nhật ký, sao lưu và báo cáo'],
  ['Bộ hẹn giờ', 'Tự động hoá theo thời gian', 'Quét đơn quá hạn, khoá/mở mạng, tạo nhắc hạn và chạy lịch sao lưu'],
  ['Telegram', 'Kênh thông báo ngoài hệ thống', 'Nhận bản tóm tắt đơn sắp hết hạn cho chủ tiệm'],
];

const SPRINT_GOALS = {
  0: 'Lập kế hoạch, thu thập yêu cầu, thiết kế kiến trúc và cơ sở dữ liệu, lập Test Plan',
  1: 'Nền tảng nghiệp vụ: đăng nhập, khách hàng, thiết bị, đơn thuê, thu tiền (US.01–US.08)',
};

const RENTAL_STATES = [
  ['Giữ chỗ · RESERVED', 'RESERVED', 'Duyệt yêu cầu thuê hoặc tạo đơn tại quầy chưa giao máy', 'Giao máy → ACTIVE; huỷ khi chưa thu đồng nào → CANCELLED (BR.05)'],
  ['Đang thuê · ACTIVE', 'RENTED', 'Giao máy, hoặc tạo đơn tại quầy giao máy ngay', 'Gia hạn thêm kỳ (vẫn ACTIVE); nhận lại máy → COMPLETED; đánh dấu hết hạn → EXPIRED'],
  ['Hoàn tất · COMPLETED', 'AVAILABLE', 'Nhận lại máy', 'Trạng thái cuối'],
  ['Hết hạn · EXPIRED', 'AVAILABLE', 'Đánh dấu hết hạn', 'Trạng thái cuối'],
  ['Đã huỷ · CANCELLED', 'AVAILABLE', 'Huỷ đơn giữ chỗ chưa thu tiền', 'Trạng thái cuối'],
];

const SCREENS = {
  'Đăng nhập': [
    ['1-dang-nhap', 'Một màn đăng nhập chung: hệ thống tự nhận ra chủ, nhân viên hay khách theo username, email hoặc số điện thoại.'],
  ],
  'Chủ cửa hàng': [
    ['2-admin-tong-quan', 'Dashboard của chủ: số liệu trong ngày, việc cần xử lý, đơn sắp hết hạn và quá hạn.'],
    ['3-admin-don-thue', 'Đơn thuê: lọc theo trạng thái, yêu cầu thuê và yêu cầu gia hạn đang chờ duyệt.'],
    ['4-admin-duyet', 'Duyệt yêu cầu thuê khách gửi từ cổng: nhập giá chốt, hệ thống tạo đơn giữ chỗ.'],
    ['13-admin-duyet-gia-han', 'Duyệt yêu cầu gia hạn khách gửi (GH-1001).'],
    ['14-admin-gia-han', 'Gia hạn đơn tại quầy: chọn đơn vị, số lượng, hệ thống gợi ý số tiền và cho thu ngay.'],
    ['15-admin-may', 'Máy: cột doanh thu và tiền sửa của từng máy, thao tác theo trạng thái.'],
    ['16-admin-chi-tiet-khach', 'Chi tiết khách hàng: hồ sơ, các đơn thuê và lịch sử ví.'],
    ['5-admin-vi', 'Ví khách sau khi nạp tiền.'],
    ['6-admin-linh-kien', 'Kho linh kiện: tồn kho, nhập kho, lịch sử nhập xuất.'],
    ['7-admin-bao-cao', 'Báo cáo doanh thu và thực thu.'],
    ['17-admin-ho-tro', 'Hỗ trợ khách: hội thoại ticket HT-1001 giữa khách và cửa hàng.'],
    ['18-admin-cai-dat', 'Cài đặt: thông tin cửa hàng.'],
    ['19-admin-nhat-ky', 'Cài đặt: nhật ký thao tác của mọi tài khoản quản trị.'],
  ],
  'Nhân viên': [
    ['8-nhanvien-thanh-toan', 'Tài khoản nhân viên: menu không có Ví khách, Linh kiện, Nhân viên, Báo cáo, Cài đặt; vẫn thu tiền được.'],
  ],
  'Khách hàng': [
    ['12-ho-so', 'Khách mới đăng ký: bắt buộc hoàn thiện hồ sơ trước khi dùng cổng.'],
    ['9-khach-may-trong', 'Cổng khách: máy trống, lọc PC / Boxphone, gửi yêu cầu thuê.'],
    ['10-khach-don', 'Cổng khách: đơn và yêu cầu của tôi, trả bằng ví, xin gia hạn.'],
    ['11-khach-vi', 'Cổng khách: số dư ví và lịch sử biến động.'],
    ['20-khach-ho-tro', 'Cổng khách: gửi yêu cầu hỗ trợ và nhắn qua lại với cửa hàng.'],
    ['21-khach-ho-so', 'Cổng khách: hồ sơ và đổi mật khẩu.'],
  ],
};

const UI_PAGES = [
  ['Chủ cửa hàng', 'Dashboard, Máy, Khách hàng, Đơn thuê', 'Không gian làm việc hằng ngày: số liệu, kho máy, hồ sơ khách, vòng đời đơn thuê, duyệt yêu cầu'],
  ['Chủ cửa hàng', 'Thanh toán, Sửa chữa, Hỗ trợ khách', 'Vận hành: phiếu thu và phiếu hoàn, phiếu sửa và linh kiện lắp vào, hội thoại với khách'],
  ['Chủ cửa hàng', 'Ví khách, Linh kiện', 'Tài chính: nạp ví, lịch sử ví, kho linh kiện và nhập kho'],
  ['Chủ cửa hàng', 'Nhân viên, Báo cáo, Cài đặt', 'Hệ thống: tài khoản và vai trò, doanh thu, cửa hàng, khoá mạng, sao lưu, Telegram, nhật ký'],
  ['Nhân viên', 'Dashboard, Máy, Khách hàng, Đơn thuê, Thanh toán, Sửa chữa, Hỗ trợ khách', 'Như chủ nhưng không có trang Tài chính và Hệ thống; Dashboard ẩn số tiền'],
  ['Khách hàng', 'Máy trống, Đơn của tôi, Ví tiền, Hỗ trợ, Hồ sơ', 'Tự phục vụ: gửi yêu cầu thuê, trả bằng ví, xin gia hạn, ticket, đổi mật khẩu'],
];

const TECH_POINTS = [
  ['Sổ bút toán ba giá trị', 'Mỗi giao dịch tiền ghi một dòng bất biến trong `financial_transactions` với ba giá trị: tiền thực (`cash_change`), biến động ví (`wallet_change`) và doanh thu (`revenue_change`). Số dư ví, số đã thu của đơn và doanh thu đều là tổng cộng từ sổ, không lưu thành cột riêng nên không thể lệch với lịch sử (BR.11, BR.12).'],
  ['Chống thu trùng và ví âm', 'node:sqlite có API đồng bộ: bước đọc số đã thu, kiểm tra và ghi bút toán chạy liền một mạch, các thao tác nhiều bước bọc trong `BEGIN IMMEDIATE`. Bài `race-test` bắn nhiều yêu cầu song song vào cùng một đơn: chỉ một yêu cầu được nhận, ví không bao giờ âm (BR.03, BR.06).'],
  ['Phân quyền ngay tại server', '`server/permissions.ts` liệt kê quyền của nhân viên chứ không liệt kê quyền của chủ; quyền mới quên khai báo thì mặc định nhân viên không có. Gọi thẳng API tài chính, nạp ví, hoàn tiền, cài đặt bằng tài khoản nhân viên đều nhận 403, không chỉ ẩn menu (BR.14).'],
  ['Xác thực và phiên', 'Mật khẩu băm bằng scrypt kèm muối, so sánh bằng `timingSafeEqual`. Phiên lưu trong cookie HttpOnly: `session_id` cho quản trị, `customer_session_id` cho khách. Đổi mật khẩu hoặc bị khoá thì các phiên khác bị cắt (BR.07).'],
  ['Khoá mạng an toàn', 'Chủ tiệm tự khai báo lệnh khoá/mở theo router của mình; app chỉ thay hai chỗ trống `{ip}` và `{code}` sau khi kiểm tra đúng khuôn bằng biểu thức chính quy, sai khuôn thì từ chối chạy. Mọi lần chạy, kể cả thất bại, ghi vào `network_lock_events`; lệnh lỗi không bao giờ báo "đã khoá" (BR.15, BR.16).'],
  ['Sao lưu nhất quán', 'Bản sao chụp bằng `VACUUM INTO` nên nhất quán kể cả khi đang có người thao tác; chạy theo lịch, giữ số bản gần nhất do chủ chọn. Bài `backup-test` diễn tập phục hồi từ bản sao.'],
  ['Phân trang mọi danh sách dài', 'Sau lỗi DF.04 và DF.06, mọi danh sách có thể dài ra theo thời gian (sổ tiền, phiếu sửa, lịch sử kho, yêu cầu, ticket) đều phân trang; số việc chờ trên menu đếm ở server chứ không đếm trên trang đã tải.'],
  ['Giao diện mới một cổng với API', 'ThueMayHub-FE build thành SPA tĩnh, Express phục vụ chung cổng với API nên cookie HttpOnly hoạt động mà không cần CORS. Khi phát triển, route `src/routes/api/$.ts` của TanStack Start chuyển tiếp `/api` sang backend. Toàn bộ lời gọi API và trạng thái nằm ở một chỗ: `src/lib/tmh-store.ts` (zustand).'],
  ['Sửa từng phần', '`PATCH` khách hàng và thiết bị chỉ đổi trường được gửi lên, gộp với bản ghi hiện có; nhờ vậy giao diện có thể đổi riêng trạng thái, vị trí hay khoá khách mà không làm mất dữ liệu khác (DF.14).'],
];

const REFERENCES = [
  'K. Schwaber, J. Sutherland, *The Scrum Guide*, 2020. https://scrumguides.org',
  'I. Sommerville, *Software Engineering*, 10th ed., Pearson, 2016.',
  'Object Management Group, *Unified Modeling Language (UML) Specification* v2.5.1, 2017. https://www.omg.org/spec/UML/2.5.1',
  'React — tài liệu chính thức. https://react.dev',
  'TanStack Start, TanStack Router — tài liệu chính thức. https://tanstack.com',
  'Express 5 — tài liệu chính thức. https://expressjs.com',
  'Node.js — module `node:sqlite`. https://nodejs.org/api/sqlite.html',
  'SQLite — Write-Ahead Logging, VACUUM INTO. https://www.sqlite.org/docs.html',
  'Zod — thư viện kiểm tra dữ liệu. https://zod.dev',
  'Tailwind CSS — tài liệu chính thức. https://tailwindcss.com',
  'Playwright — kiểm thử trên trình duyệt thật. https://playwright.dev',
  'Electron — đóng gói ứng dụng desktop. https://www.electronjs.org',
];

/* ---- Dựng tài liệu -------------------------------------------------------- */

export async function buildFinalReport(root) {
  const stories = STORIES;
  const doneStories = stories.filter((s) => s.status === 'Done');
  const doneTasks = done(TASKS);
  const totalPoints = sum(TASKS, (t) => t.points);
  const donePoints = sum(doneTasks, (t) => t.points);
  const functions = sum(MODULES, (m) => m.functions.length);
  const { tables, indexes } = parseSchema();
  const columns = sum(tables, (t) => t.cols.length);
  const src = sourceStats();
  const api = endpointStats();
  const checks = sum(FINAL_TESTS, (t) => t[4]);
  const defects = [...DEFECT_LOG.map((d) => [d.id, d.module, d.summary, d.severity, `Sprint ${d.release}`]),
    ...POST_DEFECTS.map(([id, module, summary, severity]) => [id, module, summary, severity, 'Sau Sprint 3'])];
  const screenCount = sum(Object.values(SCREENS), (l) => l.length);
  const docs = documents(root);
  const docCount = sum(docs, ([, list]) => list.length);
  const ui = (file) => pngFigure(join(UI, `${file}.png`), 600, 330);

  /* ---- Bìa ---- */
  const cover = [
    center('[TÊN TRƯỜNG]', { size: 14, bold: true, before: 200 }),
    center('[TÊN KHOA]', { size: 14, bold: true }),
    center('───────────  ✦  ───────────', { size: 12, color: NAVY, after: 900 }),
    center('BÁO CÁO TỔNG KẾT DỰ ÁN', { size: 24, bold: true, color: NAVY, after: 60 }),
    center('MÔN HỌC SEP', { size: 15, bold: true, after: 700 }),
    center('ĐỀ TÀI', { size: 13, bold: true, after: 60 }),
    center('HỆ THỐNG QUẢN LÝ CHO THUÊ MÁY TÍNH & BOXPHONE', { size: 18, bold: true, color: GREEN, after: 40 }),
    center(`– ${PROJECT.shortName.toUpperCase()} –`, { size: 18, bold: true, color: GREEN, after: 700 }),
    center(`Giảng viên hướng dẫn: ${PROJECT.mentor}`, { size: 13, after: 60 }),
    center(`Nhóm thực hiện: ${PROJECT.org}`, { size: 13, after: 240 }),
    table(['STT', 'Họ và tên', 'MSSV', 'Vai trò'],
      TEAM.map((m) => [String(m.no), m.name, m.mssv, roleLabel(m)]), [8, 36, 22, 34]),
    center(`TP. Hồ Chí Minh, tháng 11 năm 2026`, { size: 13, italics: true, before: 900 }),
  ];

  /* ---- Phần mở đầu ---- */
  const front = [
    part('LỜI CẢM ƠN'),
    para(`${PROJECT.org} xin chân thành cảm ơn ${PROJECT.mentor} đã hướng dẫn, góp ý cho nhóm trong suốt ${PROJECT.weeks} tuần thực hiện dự án, từ khâu lập kế hoạch, phân tích yêu cầu đến thiết kế, kiểm thử và hoàn thiện tài liệu.`),
    para(`Nhóm cũng cảm ơn ${PROJECT.customer} đã dành thời gian mô tả cách tiệm đang vận hành, cung cấp yêu cầu nghiệp vụ thực tế và tham gia các buổi nghiệm thu cuối mỗi sprint. Những phản hồi đó giúp hệ thống bám sát nhu cầu thật thay vì chỉ là một bài tập trên giấy.`),
    para('Cuối cùng, cảm ơn các thành viên trong nhóm đã cùng nhau giữ nhịp Scrum, viết test song song lúc code và hỗ trợ nhau khi gặp công nghệ mới. Dù đã cố gắng, báo cáo khó tránh khỏi thiếu sót; nhóm rất mong nhận được góp ý của thầy cô để hoàn thiện hơn.'),
    para('Trân trọng.', { italics: true }),
    part('NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN'),
    ...Array.from({ length: 16 }, () => para('.......................................................................................................................................')),
    para(' '),
    para('Điểm: ................          TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026'),
    para('                                                                 Giảng viên hướng dẫn (ký, ghi rõ họ tên)', { italics: true }),
    ...toc(),
    part('DANH MỤC TỪ VIẾT TẮT'),
    table(['Viết tắt', 'Ý nghĩa'], ABBREVIATIONS, [18, 82]),
  ];

  /* ---- Chương 1 ---- */
  const c1 = [
    chapter(1, 'TỔNG QUAN DỰ ÁN'),
    h2('1.1. Bối cảnh và vấn đề'),
    para('Cho thuê máy tính và boxphone là hình thức tiệm mua sẵn máy cấu hình cao rồi cho khách thuê theo giờ hoặc theo tháng. Khách không cần mua máy đắt tiền mà vẫn có máy mạnh để làm việc, chơi game hoặc chạy ứng dụng Android thật trên boxphone; tiệm thu tiền theo thời hạn thuê và chịu trách nhiệm bảo trì, sửa chữa máy. Mỗi máy là một tài sản có giá trị, nên tiệm cần biết chính xác máy đang cho ai thuê, đến khi nào, đã thu về bao nhiêu và đã tốn bao nhiêu tiền sửa.'),
    para('Trước dự án, tiệm vận hành hoàn toàn thủ công:'),
    item('Khách gọi điện hoặc nhắn tin hỏi máy trống; chủ tiệm tra sổ tay rồi báo giá miệng.'),
    item('Tên khách, máy, ngày bắt đầu và hết hạn ghi vào sổ; tiền khách trả ghi ở một file Excel khác.'),
    item('Khi hết hạn, chủ tiệm phải tự nhớ để nhắc khách gia hạn hoặc thu hồi máy.'),
    item('Máy hỏng thì sửa và ghi chi phí vào sổ, không quy được về từng máy.'),
    para('Cách làm đó dẫn tới bốn khó khăn chính: không biết máy nào sắp hết hạn; không tách bạch được tiền thực thu, doanh thu và tiền khách nạp trước; không biết máy nào đang lỗ vì tiền sửa vượt doanh thu; và mọi việc phụ thuộc vào trí nhớ của chủ tiệm.'),
    h2('1.2. Mục tiêu'),
    para('**Mục tiêu sản phẩm:**'),
    item('Quản lý tập trung kho máy PC/Boxphone, khách hàng và đơn thuê ở một nơi duy nhất.'),
    item('Tạo đơn và thu tiền chính xác: không thu vượt số còn nợ, ví khách không bao giờ âm.'),
    item('Tách bạch tiền thực thu, doanh thu ghi nhận và số dư ví khách nạp trước.'),
    item('Quy chi phí sửa chữa về đúng từng máy để biết máy nào đang lỗ.'),
    item('Cho khách tự đặt thuê, trả tiền bằng ví, xin gia hạn và nhắn hỗ trợ qua cổng khách hàng.'),
    item('Tự động khoá mạng máy khi khách quá hạn mà chưa gia hạn; nhắc hạn qua Telegram.'),
    para('**Mục tiêu đối với nhóm:**'),
    item('Áp dụng Scrum vào phát triển và quản lý một dự án phần mềm thật trong 12 tuần.'),
    item('Thu thập, phân tích, đặc tả yêu cầu; nhận diện và quản lý rủi ro trong suốt dự án.'),
    item('Thiết kế kiến trúc, cơ sở dữ liệu và mô hình UML; hiện thực bằng React, Node.js và SQLite.'),
    item('Áp dụng kiểm thử: thiết kế test case, viết test tự động, quản lý lỗi và báo cáo kết quả.'),
    h2('1.3. Phạm vi'),
    para(`Hệ thống gồm ${functions} chức năng chia ${MODULES.length} nhóm (chi tiết ở mục 3.2):`),
    ...tbl('Các nhóm chức năng trong phạm vi', ['STT', 'Nhóm chức năng', 'Tác nhân', 'Số chức năng'],
      MODULES.map((m) => [String(m.no), m.name, m.actor, String(m.functions.length)]), [8, 34, 42, 16]),
    para('**Ngoài phạm vi** của dự án:'),
    item('Thanh toán trực tuyến qua cổng ngân hàng hoặc ví điện tử: khách nạp ví tại quầy rồi tự trả đơn bằng ví.'),
    item('Nhiều chi nhánh dùng chung dữ liệu; hệ thống phục vụ một tiệm, một máy chủ.'),
    item('Ứng dụng di động riêng: cổng khách chạy trên trình duyệt điện thoại.'),
    item('Tự điều khiển router của từng hãng: hệ thống chỉ chạy câu lệnh do chủ tiệm khai báo.'),
    item('Kế toán, thuế: hệ thống xuất CSV để đối chiếu, không thay phần mềm kế toán.'),
    h2('1.4. Đối tượng sử dụng'),
    ...tbl('Tác nhân của hệ thống', ['Tác nhân', 'Mục tiêu', 'Phạm vi trách nhiệm'], ACTORS, [18, 30, 52]),
    h2('1.5. Công nghệ và công cụ'),
    ...tbl('Công nghệ sử dụng', ['Hạng mục', 'Công nghệ', 'Vai trò trong hệ thống'], [
      ['Giao diện chính', 'React 19, TypeScript, TanStack Start (SPA), Tailwind CSS 4, zustand', 'Thư mục `ThueMayHub-FE`, dựng theo thiết kế Figma; một giao diện cho cả ba vai trò'],
      ['Giao diện thế hệ đầu', 'React, TypeScript, Vite', 'Thư mục `src`, vẫn dùng cho bản cài Windows'],
      ['Backend', 'Node.js 22, Express 5, zod', 'REST API, quy tắc nghiệp vụ, phân quyền, tác vụ nền'],
      ['Cơ sở dữ liệu', 'SQLite qua module `node:sqlite`, chế độ WAL', 'Một file dữ liệu duy nhất, sao lưu bằng `VACUUM INTO`'],
      ['Ứng dụng desktop', 'Electron', 'Đóng gói thành bản cài Windows, server chạy nội bộ'],
      ['Kiểm thử', 'Script Node.js và PowerShell, Playwright + Microsoft Edge', '17 bài test tự động trong `scripts/`'],
      ['Thiết kế', 'Figma; sơ đồ UML vẽ bằng script SVG', 'Giao diện, use case, tuần tự, trạng thái, hoạt động, lớp'],
      ['Quản lý', 'Jira, Visual Studio Code, Microsoft Word / Excel', 'Backlog, sprint, phân công; tài liệu SEP sinh bằng script từ một nguồn dữ liệu'],
    ], [18, 38, 44]),
    h2('1.6. Thành viên nhóm'),
    ...tbl('Thành viên và phần phụ trách', ['Họ và tên', 'MSSV', 'Vai trò', 'Phần phụ trách chính'],
      TEAM.map((m) => [m.name, m.mssv, roleLabel(m), AREAS[m.alias]]), [20, 14, 20, 46]),
    h2('1.7. Bố cục báo cáo'),
    item('**Chương 2** — Quản lý dự án: Scrum, kế hoạch, backlog, kết quả từng sprint, phân công, rủi ro.'),
    item('**Chương 3** — Phân tích yêu cầu: chức năng, quy tắc nghiệp vụ, yêu cầu phi chức năng, use case.'),
    item('**Chương 4** — Thiết kế: kiến trúc, sơ đồ tuần tự, trạng thái, hoạt động, lớp, cơ sở dữ liệu, giao diện.'),
    item('**Chương 5** — Hiện thực: cấu trúc mã nguồn, API, giải pháp kỹ thuật, giao diện kết quả.'),
    item('**Chương 6** — Kiểm thử: chiến lược, test case, kiểm thử tự động, quản lý lỗi, nghiệm thu.'),
    item('**Chương 7** — Triển khai và hướng dẫn sử dụng. **Chương 8** — Kết luận và hướng phát triển.'),
  ];

  /* ---- Chương 2 ---- */
  const perSprint = [1, 2, 3].map((n) => {
    const list = TASKS.filter((t) => sprintNow(t) === n);
    return { n, list, st: stories.filter((s) => s.sprint === n), doneList: done(list) };
  });
  const riskOutcome = (r) => {
    const issue = ISSUES.filter((i) => i[2] === r[0]);
    if (RISK_NOW[r[0]]) return RISK_NOW[r[0]][0];
    if (issue.length) return `Xảy ra (${issue.map((i) => i[0]).join(', ')}), đã xử lý`;
    return 'Chưa xảy ra';
  };
  const retro = (s) => [
    h3(`Sprint ${s.no}${s.draft ? ' (bản nháp)' : ''}`),
    para('**Làm tốt:**', { size: 12 }),
    ...s.retro.good.map(([k, v]) => item(`${k}: ${v}`, { size: 12 })),
    para('**Cần cải thiện:**', { size: 12 }),
    ...s.retro.improve.map(([k, v]) => item(`${k}: ${v}`, { size: 12 })),
  ];

  const c2 = [
    chapter(2, 'QUẢN LÝ DỰ ÁN'),
    h2('2.1. Phương pháp Scrum'),
    para(`Nhóm áp dụng Scrum với ${SPRINTS.length} sprint, mỗi sprint 3 tuần. Product Backlog và Sprint Backlog quản lý trên Jira; mỗi việc có loại (Backend, Database, UX/UI, Frontend, Tester, Quản lý dự án), người thực hiện và story point.`),
    ...tbl('Các hoạt động lặp lại mỗi sprint', ['Hoạt động', 'Nội dung'], [
      ['Sprint Planning', 'Chọn user story từ Product Backlog, chia thành việc, ước lượng story point, giao người'],
      ['Daily / họp tuần', 'Cập nhật tiến độ trên Jira, nêu vướng mắc; biên bản họp lưu ở thư mục 1.3 MEETING'],
      ['Sprint Review', 'Demo phần tăng trưởng cho khách hàng, khách nghiệm thu theo biên bản 4.7'],
      ['Sprint Retrospective', 'Rút kinh nghiệm: làm tốt, cần cải thiện, bài học; đưa cam kết vào sprint sau'],
    ], [26, 74]),
    ...tbl('Vai trò trong Scrum', ['Vai trò', 'Thành viên', 'Trách nhiệm'], [
      ['Scrum Master', SCRUM_MASTER, 'Giữ quy trình Scrum, theo dõi tiến độ và rủi ro; kiêm Backend và UX/UI'],
      ['Product Owner', PRODUCT_OWNER, 'Kết nối với khách hàng, sắp ưu tiên Product Backlog; kiêm Backend'],
      ['Developer Team', TEAM.filter((m) => m.role !== 'Tester').map((m) => `${m.name} (${m.role})`).join('; '), 'Thực hiện các việc trong Sprint Backlog'],
      ['Tester', TESTER, 'Thiết kế, thực thi test case, viết test tự động, báo cáo lỗi và kết quả'],
    ], [18, 40, 42]),
    h2('2.2. Kế hoạch và mốc thời gian'),
    ...tbl('Lịch sprint và mục tiêu', ['Giai đoạn', 'Thời gian', 'Tuần', 'Mục tiêu'], [
      ...SPRINTS.map((s) => [s.name, `${s.from} – ${s.to}`, `${s.weekFrom}–${s.weekTo}`,
        SPRINT_GOALS[s.no] ?? SPRINT_DOCS.find((d) => d.no === s.no).goal]),
      ['Hoàn thiện', `${POST_SPRINT.from} – ${POST_SPRINT.to}`, '—', 'Nối đủ mọi màn của giao diện Figma vào backend, kiểm thử lại toàn bộ, đóng gói bản demo cho tester'],
    ], [14, 24, 10, 52]),
    h2('2.3. Product Backlog'),
    para(`Product Backlog có ${stories.length} user story, tổng ${sum(stories, (s) => s.points)} điểm ước lượng ở mức story. US.22–US.26 được bổ sung khi rà backlog giữa Sprint 2 (phần đã có code nhưng chưa thuộc story nào); US.27 — giao diện mới theo Figma — thêm giữa Sprint 3.`),
    ...tbl('Product Backlog', ['Mã', 'User story', 'Nhóm chức năng', 'Điểm', 'Ưu tiên', 'Sprint', 'Trạng thái'],
      stories.map((s) => [s.code, s.story, s.module, String(s.points), s.priority, String(s.sprint), STATUS_VI[s.status]]),
      [8, 40, 17, 7, 9, 8, 11]),
    h2('2.4. Kết quả từng sprint'),
    ...tbl('Tiến độ theo sprint (điểm tính ở từng việc)', ['Sprint', 'Thời gian', 'User story', 'Việc xong', 'Điểm xong'], [
      ['Sprint 0', `${SPRINTS[0].from} – ${SPRINTS[0].to}`, '—', '—', '—'],
      ...perSprint.map(({ n, list, st, doneList }) => [`Sprint ${n}`, `${SPRINTS[n].from} – ${SPRINTS[n].to}`,
        `${st.length} (${st[0].code}–${st[st.length - 1].code})`, `${doneList.length}/${list.length}`,
        `${sum(doneList, (t) => t.points)}/${sum(list, (t) => t.points)}`]),
      ['Tổng', `${SPRINTS[0].from} – ${SPRINTS[3].to}`, `${stories.length}`, `${doneTasks.length}/${TASKS.length}`, `${donePoints}/${totalPoints}`],
    ], [14, 26, 22, 18, 20]),
    para(`Tốc độ (velocity) tăng dần qua các sprint: ${perSprint.map(({ n, doneList }) => `Sprint ${n} ${sum(doneList, (t) => t.points)} điểm`).join(', ')}. Sprint 1 còn một việc dở (T.13) chuyển sang Sprint 2; Sprint 3 nhận thêm US.27 (13 điểm) giữa chừng.`),
    ...[0, 1, 2, 3].flatMap((n) => [h3(`Sprint ${n}`), ...HIGHLIGHTS[n].map((x) => item(x))]),
    h3('Giai đoạn hoàn thiện sau Sprint 3'),
    para(`Từ ${POST_SPRINT.from} đến ${POST_SPRINT.to}, nhóm ưu tiên hoàn thiện ứng dụng theo thiết kế Figma: mọi màn của giao diện mới đều gọi API thật (chi tiết ở mục 5.4 và 6.3).`),
    h2('2.5. Phân công và đóng góp'),
    ...tbl('Khối lượng của từng thành viên', ['Thành viên', 'Vai trò', 'Số việc', 'Điểm', 'Sprint 1', 'Sprint 2', 'Sprint 3'],
      TEAM.map((m) => {
        const mine = TASKS.filter((t) => t.who === m.alias);
        const by = [1, 2, 3].map((n) => sum(mine.filter((t) => sprintNow(t) === n), (t) => t.points));
        return [m.name, roleLabel(m), String(mine.length), String(sum(mine, (t) => t.points)), ...by.map(String)];
      }), [24, 24, 10, 10, 10, 11, 11]),
    para('Tổng điểm mỗi người chênh nhau khoảng 10%: việc quy trình (Retrospective, cập nhật backlog, nghiệm thu) được giao cho người đang ít điểm hơn.'),
    h2('2.6. Quản lý rủi ro'),
    para('Rủi ro được nhận diện từ Sprint 0, đánh giá bằng mức phơi nhiễm = xác suất (XS, 0–1) × mức ảnh hưởng (AH, thang 1–5), xử lý theo hướng giảm thiểu (Mitigate) và theo dõi lại sau mỗi sprint. Vấn đề phát sinh ghi vào Issue Log.'),
    ...tbl('Danh sách rủi ro và kết quả theo dõi', ['Mã', 'Rủi ro', 'XS', 'AH', 'Mức', 'Cách xử lý', 'Kết quả'],
      RISKS.map((r) => [r[0], r[1], String(r[6]), String(r[7]), String(r[8]), r[10], riskOutcome(r)]),
      [7, 21, 6, 6, 7, 31, 22]),
    ...tbl('Issue Log', ['Mã', 'Vấn đề', 'Rủi ro', 'Cách xử lý', 'Trạng thái'],
      ISSUES.map((i) => [i[0], i[1], i[2], i[7], i[8]]), [9, 36, 9, 36, 10]),
    h2('2.7. Quản lý cấu hình và tài liệu'),
    item('Tài liệu xếp theo bộ SEP: 1. Project Management, 2. Context and System Requirement, 3. Software Architecture & Design, 4. Testing; tên file theo quy ước `SEP_Nhom11_<Tên tài liệu>_ver<x.y>`.'),
    item('Mọi tài liệu Word/Excel sinh bằng script trong `scripts/sep/` từ một nguồn dữ liệu duy nhất, nên tên chức năng, mã story, số lỗi, số bài test khớp nhau giữa các tài liệu.'),
    item(`Mã nguồn có ${src.files} file; mỗi file thuộc ít nhất một việc trên Jira (script kiểm tra tự động).`),
    item('Dữ liệu demo (`data/hub-demo.db`) tách riêng khỏi dữ liệu kinh doanh thật; bài test chạy trên database tạm.'),
    h2('2.8. Đánh giá sau các sprint (Retrospective)'),
    para('Retrospective Sprint 1 lưu ở thư mục 1.2 PROJECT TRACKING. Hai sprint sau:'),
    ...SPRINT_DOCS.flatMap(retro),
  ];

  /* ---- Chương 3 (phần văn bản, trang dọc) ---- */
  const c3 = [
    chapter(3, 'PHÂN TÍCH YÊU CẦU'),
    h2('3.1. Tác nhân và luồng nghiệp vụ'),
    para('Hệ thống có ba tác nhân người dùng (Khách hàng, Nhân viên, Chủ hệ thống) và hai tác nhân hệ thống (Bộ hẹn giờ, Telegram), mô tả ở Bảng 1.2. Chủ hệ thống kế thừa toàn bộ nghiệp vụ của Nhân viên. Các chức năng gom thành sáu luồng nghiệp vụ đầu-cuối:'),
    ...tbl('Sáu luồng nghiệp vụ chính', ['Luồng nghiệp vụ', 'Tác nhân', 'Chuỗi xử lý', 'Trạng thái', 'Bằng chứng'],
      BUSINESS_FLOW_PROGRESS, [17, 17, 30, 11, 25]),
    h2('3.2. Danh sách chức năng'),
    para(`${functions} chức năng, chia ${MODULES.length} nhóm. Cột Sprint là sprint đưa chức năng vào sản phẩm; tất cả đã hoàn thành.`),
    ...MODULES.flatMap((m) => [
      h3(`3.2.${m.no}. ${m.name} — ${m.actor}`),
      table(['Mã', 'Chức năng', 'Mô tả', 'Ưu tiên', 'Sprint'],
        m.functions.map(([id, release, feature, priority, desc]) => [id, feature, desc, priority, String(release)]),
        [9, 25, 50, 8, 8]),
    ]),
    h2('3.3. Yêu cầu chức năng mức cao'),
    ...tbl('Yêu cầu chức năng (FR) và nơi thiết kế, kiểm thử', ['ID', 'Yêu cầu', 'Mô tả', 'Sprint', 'Trạng thái'],
      FRS.map((fr) => [fr.id, fr.name, fr.desc, String(fr.sprint), 'Hoàn thành']), [8, 22, 50, 8, 12]),
    h2('3.4. Quy tắc nghiệp vụ'),
    para('Các quy tắc dưới đây được kiểm tra ở server, không chỉ ở giao diện; mỗi quy tắc quan trọng có bài test tự động canh giữ.'),
    ...tbl('Quy tắc nghiệp vụ', ['Mã', 'Nhóm', 'Quy tắc'], BUSINESS_RULES, [9, 22, 69]),
    h2('3.5. Yêu cầu phi chức năng'),
    ...tbl('Thuộc tính chất lượng', ['STT', 'Thuộc tính', 'Mô tả', 'Ưu tiên'], QUALITY_ATTRIBUTES, [7, 24, 55, 14]),
    ...tbl('Kịch bản chất lượng QAs1 — Toàn vẹn dữ liệu tiền', ['Trường', 'Nội dung'], QA_SCENARIOS[0], [26, 74]),
    ...tbl('Kịch bản chất lượng QAs2 — Bảo mật số liệu tiền', ['Trường', 'Nội dung'], QA_SCENARIOS[1], [26, 74]),
    para('**Ràng buộc:** nhóm 5 người, 12 tuần; một tiệm, một máy vận hành tại một thời điểm; công nghệ React + Node.js + SQLite, đóng gói được thành ứng dụng Windows.'),
  ];

  /* ---- Trang ngang: use case (chương 3) và sơ đồ thiết kế (chương 4) ---- */
  const landscape = [
    h2p('3.6. Mô hình use case'),
    h3('3.6.1. Use case tổng quát — U0'),
    uml('u0-tong-quat', 1000, 520),
    figCap('Use case tổng quát: ba tác nhân người dùng, hai tác nhân hệ thống và các cụm năng lực chính.'),
    para('U0 là sơ đồ mức phạm vi: mỗi elip là một cụm chức năng, được mở rộng chi tiết ở U1 (Khách hàng), U2 (Nhân viên) và U3 (Chủ hệ thống). Mũi tên tam giác từ Chủ hệ thống tới Nhân viên là quan hệ kế thừa tác nhân. `«include»` là bước bắt buộc được tái sử dụng; `«extend»` là hành vi chỉ phát sinh khi người dùng chọn hoặc khi đủ điều kiện.', { size: 12 }),
    h3('3.6.2. Use case Khách hàng — U1', { page: true }),
    uml('u1-khach-hang', 1000, 540),
    figCap('Use case của Khách hàng trên cổng khách.'),
    ...tbl('Phân tích use case Khách hàng', ['Use case', 'Tiền điều kiện', 'Luồng chính', 'Ngoại lệ / quy tắc', 'Kết quả'], USE_CASE_ANALYSIS.customer, [16, 18, 27, 23, 16]),
    h3('3.6.3. Use case Nhân viên — U2', { page: true }),
    uml('u2-nhan-vien', 1000, 540),
    figCap('Use case của Nhân viên tại quầy.'),
    ...tbl('Phân tích use case Nhân viên', ['Use case', 'Tiền điều kiện', 'Luồng chính', 'Ngoại lệ / quy tắc', 'Kết quả'], USE_CASE_ANALYSIS.staff, [16, 18, 27, 23, 16]),
    h3('3.6.4. Use case Chủ hệ thống — U3', { page: true }),
    uml('u3-chu-he-thong', 1000, 540),
    figCap('Use case riêng của Chủ hệ thống: kế thừa Nhân viên và thêm tài chính, nhân sự, cấu hình, khoá mạng.'),
    ...tbl('Phân tích use case Chủ hệ thống', ['Use case', 'Tiền điều kiện', 'Luồng chính', 'Ngoại lệ / quy tắc', 'Kết quả'], USE_CASE_ANALYSIS.owner, [16, 18, 27, 23, 16]),
    ...tbl('Quan hệ include, extend và kế thừa', ['Quan hệ', 'Ví dụ trong hệ thống', 'Ý nghĩa nghiệp vụ'], [
      ['`«include»`', 'Đăng ký → Hoàn thiện hồ sơ; Thu tiền → Kiểm tra số còn nợ/số dư; Duyệt yêu cầu → Tạo đơn giữ chỗ', 'Bước con luôn xảy ra; bỏ bước này thì use case chính không hợp lệ.'],
      ['`«extend»`', 'Gửi yêu cầu thuê mở rộng Xem máy trống; Trả bằng ví/Gia hạn/Huỷ mở rộng Theo dõi đơn', 'Hành vi tuỳ chọn hoặc có điều kiện.'],
      ['Kế thừa tác nhân', 'Chủ hệ thống → Nhân viên', 'Chủ dùng được mọi use case của nhân viên, sau đó có thêm use case riêng.'],
    ], [18, 46, 36]),

    chapter(4, 'THIẾT KẾ HỆ THỐNG'),
    h2('4.1. Kiến trúc tổng thể'),
    uml('ar1-kien-truc', 1000, 470),
    figCap('Kiến trúc triển khai: ba giao diện dùng chung một backend Express, một file SQLite và các tác vụ nền.'),
    para('Kiến trúc client–server ba lớp. Giao diện (trình duyệt hoặc cửa sổ Electron) chỉ gọi REST API; mọi quy tắc tiền, trạng thái máy và phân quyền nằm ở server; dữ liệu trong một file SQLite. Hai tác vụ nền chạy trong cùng tiến trình server: bộ quét khoá mạng (mỗi 60 giây) và lịch sao lưu; nhắc hạn gửi ra Telegram.', { size: 12 }),
    ...tbl('Góc nhìn vật lý', ['Thành phần', 'Trách nhiệm'], PHYSICAL_COMPONENTS, [30, 70]),
    ...tbl('Góc nhìn tĩnh — các lớp xử lý một yêu cầu', ['Thành phần', 'Trách nhiệm'], STATIC_LAYERS, [30, 70]),
    ...tbl('Quyết định kiến trúc đáng chú ý', ['Quyết định', 'Lý do'], ARCH_DECISIONS, [36, 64]),

    h2p('4.2. Sơ đồ tuần tự'),
    h3('4.2.1. Đăng nhập chung cho ba vai trò — S1'),
    uml('s1-dang-nhap', 1000, 540),
    figCap('Đăng nhập chung: tìm tài khoản quản trị theo email hoặc username trước, không có mới tìm khách theo email hoặc số điện thoại; phiên lưu bằng cookie HttpOnly.'),
    h3('4.2.2. Từ yêu cầu thuê tới lúc duyệt — S2', { page: true }),
    uml('s2-yeu-cau-thue', 1000, 540),
    figCap('Khách gửi yêu cầu (PENDING kèm giá tạm tính); nhân viên duyệt trong một transaction: tạo đơn, đóng yêu cầu, giữ máy. Nếu máy vừa bận hoặc đã có người duyệt thì từ chối.'),
    h3('4.2.3. Giao máy và thu tiền — S3', { page: true }),
    uml('s3-giao-may-thu-tien', 1000, 540),
    figCap('Giao máy chuyển đơn sang ACTIVE và máy sang RENTED trong một transaction; thu tiền bị chặn nếu vượt phần còn nợ (BR.03) hoặc trả bằng ví mà ví không đủ (BR.06).'),

    h2p('4.3. Sơ đồ trạng thái — vòng đời đơn thuê'),
    uml('st1-don-thue', 1000, 330),
    figCap('Vòng đời đơn thuê (ST1) và tác động sang trạng thái máy; trạng thái mạng của máy chạy song song.'),
    ...tbl('Trạng thái đơn thuê', ['Trạng thái đơn', 'Máy', 'Vào trạng thái khi', 'Đi tiếp'], RENTAL_STATES, [20, 12, 32, 36]),
    para('Trạng thái mạng chạy song song: đơn ACTIVE quá hạn cộng thời gian ân hạn thì bộ quét khoá mạng (LOCKED); gia hạn xong thì tự mở lại (OPEN).', { size: 12 }),

    h2p('4.4. Sơ đồ hoạt động'),
    h3('4.4.1. Quy trình thuê máy — A1'),
    uml('a1-quy-trinh-thue', 1000, 540),
    figCap('Quy trình thuê máy qua ba làn Khách hàng – Nhân viên/Chủ – Hệ thống, từ gửi yêu cầu tới hoàn tất đơn. Đơn tạo tại quầy bỏ qua bước yêu cầu và duyệt.'),
    h3('4.4.2. Bộ quét khoá mạng — A2', { page: true }),
    uml('a2-khoa-mang', 1000, 540),
    figCap('Bộ quét chạy mỗi 60 giây: chỉ chạy lệnh khi IP và mã máy đúng khuôn; lệnh lỗi ghi FAILED và máy vẫn OPEN, không báo khoá giả.'),

    h2p('4.5. Sơ đồ lớp'),
    para(`Hệ thống có 21 lớp phân tích/thiết kế chia ${GROUPS.length} nhóm nghiệp vụ, ánh xạ vào ${tables.length} bảng SQLite. \`Account\` là lớp trừu tượng nên không có bảng riêng; \`Session\` bao quát hai bảng phiên. Phương thức trên sơ đồ ánh xạ tới endpoint hoặc hàm nghiệp vụ đang chạy. Sơ đồ bản 1.0 lập trước giao diện mới nên chưa vẽ 6 cột thêm sau (\`admins.username\`, \`customers.address\`, \`customers.identity_number\`, \`devices.category\`, \`devices.location\`, \`repairs.priority\`); Phụ lục A liệt kê đầy đủ.`, { size: 12 }),
    classFig('0-tong-quan', 1000, 400),
    figCap('Sáu nhóm lớp và phụ thuộc giữa các nhóm; nhóm D (đơn thuê & tài chính) là lõi.'),
    h3('Ký hiệu và truy vết từ use case', { page: true }),
    table(['Ký hiệu', 'Ý nghĩa'], LEGEND, [32, 68], { compact: true }),
    ...tbl('Từ luồng use case tới các lớp hiện thực', ['Luồng use case', 'Nhóm lớp', 'Lớp chính', 'Cách phối hợp'], USE_CASE_CLASS_TRACE, [19, 23, 26, 32], { compact: true }),
    // Gộp bảng ánh xạ của 6 nhóm vào một bảng: mỗi trang nhóm lớp chỉ còn sơ đồ và
    // ghi chú nên vừa một trang ngang, không còn vài dòng bảng tràn sang trang trống.
    ...tbl('Lớp, bảng dữ liệu và nơi hiện thực', ['Nhóm', 'Lớp', 'Bảng dữ liệu', 'Nơi hiện thực / trách nhiệm'],
      GROUPS.flatMap((g) => g.map.map((r) => [g.key, ...r])), [8, 22, 25, 45], { compact: true }),
    ...GROUPS.flatMap((g) => [
      h3(`Nhóm ${g.key} — ${g.name}`, { page: true }),
      classFig(g.file, 1000, 430),
      figCap(g.caption.replace(/^Hình \d+\.\s*/, '')),
      ...g.points.map((x) => item(x, { size: 12 })),
    ]),
  ];

  /* ---- Chương 4 (phần trang dọc), chương 5–8 ---- */
  const relations = (t) => [...new Set(t.cols.map((c) => c.rest.match(/REFERENCES (\w+)/)?.[1]).filter(Boolean))].join(', ') || '—';
  const c4b = [
    h2p('4.6. Thiết kế cơ sở dữ liệu'),
    para(`Cơ sở dữ liệu SQLite gồm **${tables.length} bảng, ${columns} cột, ${indexes} chỉ mục**, khai báo trong \`server/database.ts\`. Ba thiết lập bật ngay khi mở kết nối: \`foreign_keys\` để chặn dữ liệu mồ côi, \`journal_mode = WAL\` để đọc và ghi không chặn nhau, \`busy_timeout = 5000\` để thao tác đến sau chờ thay vì báo lỗi.`),
    para('**Nguyên tắc thiết kế:**'),
    item('Sổ tiền và lịch sử kho chỉ thêm, không sửa, không xoá; số dư ví, số đã thu, tồn kho và giá vốn là giá trị dẫn xuất, luôn tính lại từ sổ.'),
    item('Mỗi lần gia hạn là một dòng `rental_periods`; tổng tiền của đơn là tổng các kỳ, nên luôn giải thích được con số tổng.'),
    item('Phiên quản trị và phiên khách tách hai bảng; xoá tài khoản thì phiên bị xoá theo (`ON DELETE CASCADE`).'),
    item('Cột thêm sau (giao diện mới) dùng `ensureColumn` khi server khởi động, nên database cũ vẫn chạy được.'),
    ...tbl('Danh sách bảng', ['Bảng', 'Mô tả', 'Số cột', 'Tham chiếu tới'],
      tables.map((t) => [`\`${t.name}\``, tableDesc(t.name), String(t.cols.length), relations(t)]), [24, 50, 9, 17], { compact: true }),
    para('Chi tiết từng cột (kiểu, ràng buộc, mô tả) ở **Phụ lục A**.', { size: 12 }),
    h2('4.7. Thiết kế giao diện'),
    para('Giao diện mới (US.27) dựng theo bản thiết kế Figma của nhóm, thay cho giao diện thế hệ đầu. Nguyên tắc:'),
    item('Một màn đăng nhập chung: người dùng nhập username, email hoặc số điện thoại, hệ thống tự nhận ra vai trò.'),
    item('Khu quản trị có thanh bên chia nhóm (Không gian làm việc, Vận hành, Tài chính, Hệ thống) kèm số việc chờ; thanh trên có chuông việc cần làm và menu tài khoản.'),
    item('Cổng khách dạng tab, dùng tốt trên điện thoại, tự làm mới mỗi 30 giây.'),
    item('Mọi danh sách có trạng thái đang tải, lỗi và rỗng; thao tác tiền có hộp thoại xác nhận và thông báo kết quả.'),
    item('Menu theo vai trò chỉ là lớp ngoài; quyền thật kiểm tra ở server.'),
    ...tbl('Màn hình theo vai trò', ['Vai trò', 'Màn hình', 'Chức năng chính'], UI_PAGES, [16, 36, 48], { compact: true }),
  ];

  const c5 = [
    chapter(5, 'HIỆN THỰC HỆ THỐNG'),
    h2('5.1. Cấu trúc mã nguồn'),
    para(`Mã nguồn gồm **${src.files} file, khoảng ${vnd(src.lines)} dòng** (không tính thư viện và mã sinh tự động):`),
    ...tbl('Mã nguồn theo thư mục', ['Thư mục', 'Nội dung', 'Số file', 'Số dòng'],
      src.list.map(([a, d, f, l]) => [`\`${a}\``, d, String(f), vnd(l)]), [22, 50, 12, 16]),
    para('Các module chính phía server: `index.ts` (khởi động, khu quản trị), `customer.ts` (cổng khách), `hub.ts` (API giao diện mới), `database.ts` (lược đồ, giao dịch), `permissions.ts` (phân quyền), `network-lock.ts` (khoá mạng), `backup.ts` (sao lưu), `telegram.ts` và `expiring.ts` (nhắc hạn), `rental-period.ts` (kỳ thuê). Phía giao diện mới: `src/lib/tmh-store.ts` (gọi API, trạng thái), `src/components/admin/` (khu quản trị), `src/components/customer/` (cổng khách), `src/components/support/` (hội thoại hỗ trợ dùng chung).', { size: 12 }),
    h2('5.2. REST API'),
    para(`Server có **${api.total} endpoint REST**. Danh sách API mà từng màn hình gọi ở **Phụ lục B**.`),
    ...tbl('Endpoint theo file', ['File', 'Phục vụ', 'Số endpoint'], api.rows.map((r) => [r[0], r[1], String(r[2])]), [26, 60, 14]),
    h2('5.3. Giải pháp kỹ thuật chính'),
    ...TECH_POINTS.flatMap(([k, v]) => [h3(k), para(v)]),
    h2('5.4. Giao diện kết quả'),
    para(`Các ảnh dưới đây do bài test trình duyệt (\`npm run test:hub-ui\`) tự chụp trên Microsoft Edge ở lần chạy ngày ${FINAL_RUN_DATE}, với dữ liệu mẫu của bản demo.`),
    ...Object.entries(SCREENS).flatMap(([role, list]) => [
      h3(role),
      ...list.flatMap(([file, text]) => [ui(file), figCap(text)]),
    ]),
  ];

  const byType = (s, type) => s.requirements.filter((r) => r[2] === type).length;
  const c6 = [
    chapter(6, 'KIỂM THỬ'),
    h2('6.1. Chiến lược kiểm thử'),
    ...tbl('Các mức kiểm thử', ['Mức', 'Người thực hiện', 'Cách làm'], [
      ['Unit / tích hợp API', 'Developer', 'Script gọi API thật trên server thử và database tạm, kiểm tra từng quy tắc'],
      ['Chức năng (functional)', 'Tester', 'Test case viết tay theo Function List, thực thi và ghi Test Execute'],
      ['Hệ thống qua trình duyệt', 'Tester', 'Playwright điều khiển Microsoft Edge, đăng nhập bốn vai trò và bấm qua các màn'],
      ['Chấp nhận (UAT)', 'Khách hàng, tester', 'Thao tác theo kịch bản nghiệp vụ thật; biên bản nghiệm thu mỗi sprint'],
    ], [22, 18, 60]),
    para('Chức năng liên quan tới tiền (tạo đơn, thu tiền, hoàn tiền, nạp ví) bắt buộc có đủ ca thuận, ca nghịch, ca biên và ca bấm nút hai lần liên tiếp, vì đây là nguồn lỗi đã từng xảy ra thật (DF.01).'),
    h2('6.2. Test case thủ công'),
    ...tbl('Test case theo chức năng (tài liệu 4.3, 4.4)', ['Chức năng', 'Yêu cầu', 'Thuận', 'Nghịch', 'Biên', 'Số ca'],
      SUITES.map((s) => [s.fn, String(s.requirements.length), String(byType(s, 'Positive')), String(byType(s, 'Negative')), String(byType(s, 'Boundary')), String(s.cases.length)]),
      [34, 14, 13, 13, 12, 14]),
    para('Test Report từng sprint (tài liệu 4.6) tổng hợp số ca đạt/lỗi theo từng chức năng; Defect Report (4.5) ghi lỗi kèm bước tái hiện.'),
    h2('6.3. Kiểm thử tự động'),
    para(`Từ Sprint 2, mỗi user story có ít nhất một bài test tự động trong \`scripts/\`, chạy bằng một lệnh \`npm run test:…\`. Lần chạy toàn bộ cuối cùng ngày **${FINAL_RUN_DATE}** trên database tạm: **${FINAL_TESTS.length}/${FINAL_TESTS.length} bài đạt, ${checks} điểm kiểm tra**, không có lỗi giao diện hay lỗi console.`),
    ...tbl(`Kết quả lần chạy ngày ${FINAL_RUN_DATE}`, ['Bài test', 'Nội dung kiểm tra', 'User story', 'Điểm KT', 'Kết quả'],
      [...FINAL_TESTS.map(([file, , what, us, n]) => [`\`${file}\``, what, us, String(n), 'Đạt']),
        ['**Tổng**', `${FINAL_TESTS.length} bài`, '', `**${checks}**`, '**Đạt 100%**']],
      [24, 42, 14, 9, 11]),
    para('Bài `.mjs` đếm số dòng OK in ra; bài `.ps1` đếm số lệnh kiểm tra trong file; bài trình duyệt đếm số màn hình đã bấm qua và chụp lại. So với lần chạy cuối Sprint 3 (303 điểm), bài API giao diện mới tăng từ 40 lên 64 điểm và bài trình duyệt từ 12 lên 21 màn hình sau giai đoạn hoàn thiện.', { size: 12 }),
    h2('6.4. Quản lý lỗi'),
    para(`Cả dự án phát hiện **${defects.length} lỗi**, tất cả đã sửa; mỗi lỗi có bài test canh giữ để không tái phát. Mức độ: ${['High', 'Medium', 'Low'].map((s) => `${s} ${defects.filter((d) => d[3] === s).length}`).join(', ')}.`),
    ...tbl('Danh sách lỗi', ['Mã', 'Chức năng', 'Tóm tắt', 'Mức độ', 'Phát hiện', 'Trạng thái'],
      defects.map((d) => [...d, 'Đã sửa']), [8, 18, 44, 10, 12, 8]),
    para('Ba lỗi phát hiện sau Sprint 3:', { size: 12 }),
    ...POST_DEFECTS.map(([id, , , , fix]) => item(`**${id}:** ${fix}`, { size: 12 })),
    h2('6.5. Kiểm thử chấp nhận'),
    item('Cuối mỗi sprint khách hàng thao tác trên hệ thống theo kịch bản nghiệp vụ và xác nhận theo biên bản User Acceptance (tài liệu 4.7, Sprint 1–3).'),
    item('Để tester ngoài nhóm kiểm thử độc lập, nhóm đóng gói bản demo chạy bằng double-click (mục 7.2), kèm hướng dẫn và danh sách 25 mục kiểm tra cho ba vai trò, cách ghi lỗi theo mẫu Defect Report.'),
  ];

  const c7 = [
    chapter(7, 'TRIỂN KHAI VÀ HƯỚNG DẪN SỬ DỤNG'),
    h2('7.1. Môi trường'),
    item('Máy chủ: Windows 10/11 (64-bit) hoặc máy có Node.js 22.13 trở lên (`node:sqlite` không cần cờ).'),
    item('Người dùng: trình duyệt Chrome, Edge hoặc Cốc Cốc; cổng khách dùng được trên điện thoại.'),
    item('Không cần cài hệ quản trị cơ sở dữ liệu: SQLite chạy ngay trong tiến trình server.'),
    h2('7.2. Cách chạy'),
    ...tbl('Các cách chạy hệ thống', ['Mục đích', 'Lệnh / thao tác', 'Mở tại'], [
      ['Phát triển (sửa code tự tải lại)', '`npm run hub`', 'http://localhost:5274 (API ở cổng 8789)'],
      ['Chạy thật một cổng', '`npm run hub:start` (build giao diện nếu chưa có)', 'http://localhost:8789'],
      ['Đưa dữ liệu mẫu về ban đầu', '`npm run hub:reset` (tắt server trước)', '—'],
      ['Gói demo cho tester', '`npm run hub:pack` → giải nén `ThueMayHub-Demo-Tester.zip`, double-click `CHAY-DEMO.bat`', 'http://localhost:8790'],
      ['Bản cài Windows (giao diện thế hệ đầu)', '`npm run desktop:package`', 'Ứng dụng desktop'],
      ['Chạy lại bài test', '`npm run test:hub`, `npm run test:hub-ui`, `npm run test:smoke`…', 'Server thử, database tạm'],
    ], [26, 46, 28]),
    para('Gói demo cho tester mang theo Node.js, server đã gộp thành một file và giao diện đã build, nên máy tester không cần cài gì. Gói không chứa dữ liệu thật; database mẫu được tạo mới ở lần chạy đầu, có file `LAM-MOI-DU-LIEU.bat` để làm lại từ đầu.'),
    h2('7.3. Tài khoản và dữ liệu mẫu'),
    ...tbl('Tài khoản demo (mật khẩu đều là demo123)', ['Vai trò', 'Tên đăng nhập'], [
      ['Chủ cửa hàng', '`admin`'],
      ['Nhân viên', '`phat`, `thanh`, `vinh`, `anh`'],
      ['Khách hàng', '`minhanh@email.com` hoặc số điện thoại `0902345678`'],
    ], [30, 70]),
    para('Dữ liệu mẫu: 7 máy (PC-001 → PC-005, BP-008, BP-012), 5 khách (KH-005 bị khoá), 5 đơn thuê đủ các trạng thái, 4 linh kiện, 3 phiếu sửa, một yêu cầu thuê (TMH-1023), một yêu cầu gia hạn (GH-1001) và một ticket hỗ trợ (HT-1001) đang chờ xử lý.'),
    h2('7.4. Hướng dẫn nhanh theo vai trò'),
    h3('Chủ cửa hàng'),
    item('Dashboard → bấm vào việc cần xử lý để tới đúng trang.'),
    item('Đơn thuê → duyệt yêu cầu (nhập giá chốt) → giao máy → thu tiền → nhận lại máy để hoàn tất; gia hạn hoặc hoàn tiền ngay trên dòng đơn.'),
    item('Ví khách → nạp tiền; Linh kiện → nhập kho; Nhân viên → tạo tài khoản; Cài đặt → cửa hàng, khoá mạng, sao lưu, Telegram, nhật ký.'),
    h3('Nhân viên'),
    item('Làm việc ở quầy: tạo đơn, giao máy, thu tiền, lập phiếu sửa, trả lời hỗ trợ khách. Không xem được tài chính, không nạp ví, không hoàn tiền.'),
    h3('Khách hàng'),
    item('Đăng ký → hoàn thiện hồ sơ → Máy trống → gửi yêu cầu thuê → theo dõi ở Đơn của tôi → trả bằng ví, xin gia hạn → Hỗ trợ để nhắn với cửa hàng.'),
    h2('7.5. Sao lưu và phục hồi'),
    para('Server tự sao lưu theo lịch vào thư mục `backups` cạnh file dữ liệu, giữ số bản gần nhất do chủ chọn; chủ cũng có thể bấm sao lưu ngay trong Cài đặt. Phục hồi: tắt server, chép bản sao lưu đè lên file dữ liệu rồi chạy lại. Bản sao lưu chứa toàn bộ dữ liệu tiền nên chỉ chủ được xem và cấu hình.'),
  ];

  const c8 = [
    chapter(8, 'KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN'),
    h2('8.1. Kết quả đạt được'),
    ...tbl('Kết quả tổng hợp', ['Hạng mục', 'Kết quả'], [
      ['User story', `${doneStories.length}/${stories.length} hoàn thành`],
      ['Việc trên Jira', `${doneTasks.length}/${TASKS.length} xong (${donePoints}/${totalPoints} điểm)`],
      ['Chức năng', `${functions} chức năng, ${MODULES.length} nhóm; ${BUSINESS_RULES.length} quy tắc nghiệp vụ kiểm tra ở server`],
      ['Cơ sở dữ liệu', `${tables.length} bảng, ${columns} cột, ${indexes} chỉ mục`],
      ['Mã nguồn', `${src.files} file, khoảng ${vnd(src.lines)} dòng; ${api.total} endpoint REST`],
      ['Giao diện', `Giao diện mới theo Figma cho 3 vai trò, ${screenCount} màn hình được chụp kiểm thử`],
      ['Kiểm thử', `${FINAL_TESTS.length} bài test tự động, ${checks} điểm kiểm tra, đạt 100% (${FINAL_RUN_DATE})`],
      ['Lỗi', `${defects.length} lỗi phát hiện, ${defects.length} đã sửa`],
      ['Tài liệu SEP', `${docCount} tài liệu cho cả 4 sprint, cùng báo cáo tiến độ và hướng dẫn thuyết trình`],
    ], [26, 74]),
    para(`Hệ thống đáp ứng các mục tiêu đặt ra ở mục 1.2: tiệm quản lý tập trung máy, khách, đơn và dòng tiền; ba con số tiền thực thu, doanh thu và số dư ví tách bạch; chi phí sửa quy về từng máy; khách tự phục vụ qua cổng; máy quá hạn tự khoá mạng. Về quy trình, nhóm duy trì được nhịp Scrum qua 4 sprint, có Retrospective và nghiệm thu cuối mỗi sprint, test viết song song lúc code.`),
    h2('8.2. Hạn chế'),
    item('Bản cài Windows (Electron) vẫn đóng gói giao diện thế hệ đầu; giao diện mới hiện chạy trên trình duyệt.'),
    item('Chưa có thanh toán trực tuyến: khách nạp ví tại quầy rồi tự trả đơn bằng ví trên cổng khách.'),
    item('Hệ thống chạy trên một máy chủ của tiệm với SQLite; chưa hỗ trợ nhiều chi nhánh dùng chung dữ liệu.'),
    item('Database Design và Class Diagram bản 1.0 chưa vẽ 6 cột thêm cho giao diện mới (Phụ lục A đã liệt kê đủ).'),
    item('Bộ test case viết tay (4.3) mới phủ 3 chức năng đại diện của Sprint 1 và dùng dữ liệu của giao diện thế hệ đầu; các chức năng còn lại được phủ bằng test tự động.'),
    h2('8.3. Hướng phát triển'),
    item('Chuyển sang hệ quản trị cơ sở dữ liệu máy chủ (PostgreSQL, MySQL hoặc SQL Server) khi triển khai thật: viết lại tầng truy cập dữ liệu sang gọi bất đồng bộ và bọc các thao tác tiền trong transaction, rồi chạy lại toàn bộ bài test.'),
    item('Đưa giao diện mới vào bản cài Windows thay cho giao diện thế hệ đầu.'),
    item('Thanh toán trực tuyến (mã QR chuyển khoản, ví điện tử) để khách nạp ví từ xa.'),
    item('Nhắc hạn cho khách qua Zalo/SMS ngoài thông báo trên cổng; báo cáo lãi/lỗ theo từng máy theo thời gian.'),
    item('Viết lại bộ test case thủ công theo giao diện mới để tester ngoài nhóm dùng trực tiếp.'),
    h2('8.4. Bài học kinh nghiệm'),
    ...SPRINT_DOCS.flatMap((s) => s.retro.lessons.map(([k, v]) => item(`**${k}** (Sprint ${s.no}): ${v}`))),
    item('**Kiểm thử:** bài test trên trình duyệt thật bắt được những lỗi mà test API không thấy (DF.15, DF.16); nên có từ màn hình đầu tiên.'),
    h2('8.5. Việc cần hoàn tất trước khi nộp'),
    item('Điền tên trường, khoa, giảng viên hướng dẫn, tên khách hàng, email và số điện thoại thành viên (đang để trong ngoặc vuông).'),
    item('Khách hàng ký biên bản nghiệm thu Sprint 2 và Sprint 3; chốt Retrospective Sprint 3 (đang là bản nháp).'),
    para(`Tester: ${TESTER} · Product Owner: ${PRODUCT_OWNER} · Scrum Master: ${SCRUM_MASTER}`, { italics: true }),
  ];

  const refs = [
    part('TÀI LIỆU THAM KHẢO'),
    ...REFERENCES.map((r, i) => new Paragraph({
      spacing: { after: 100 },
      indent: { left: 567, hanging: 567 },
      children: rich(`[${i + 1}]\t${r.replace(/\*([^*]+)\*/g, '$1')}`, { size: 13 }),
    })),
  ];

  /* ---- Phụ lục ---- */
  const traceRows = stories.map((s) => {
    const tests = FINAL_TESTS.filter((t) => covers(t[3], s.code)).map((t) => t[0].replace(/\.(mjs|ps1)$/, ''));
    return [s.code, s.module, String(s.sprint), STATUS_VI[s.status], tests.join(', ') || '— (test case thủ công 4.3)'];
  });
  const appendix = [
    part('PHỤ LỤC A. TỪ ĐIỂN DỮ LIỆU'),
    para(`Liệt kê đủ ${tables.length} bảng, ${columns} cột đọc trực tiếp từ \`server/database.ts\`. "Thêm sau" là cột được thêm bằng \`ensureColumn\` khi server khởi động. Mọi thời điểm lưu dạng chuỗi ISO 8601; mọi số tiền là số nguyên (đồng).`, { size: 12 }),
    ...tables.flatMap((t, i) => [
      h3(`A.${i + 1}. ${t.name} — ${tableDesc(t.name)}`),
      table(['Cột', 'Kiểu', 'Ràng buộc', 'Mô tả'],
        t.cols.map((c) => [`\`${c.name}\``, c.type, constraintText(c), colDesc(t.name, c.name)]), [24, 10, 30, 36]),
    ]),
    part('PHỤ LỤC B. API THEO MÀN HÌNH'),
    para('Trích từ `ThueMayHub-FE/BACKEND.md`: mỗi màn hình hoặc thao tác của giao diện mới gọi API nào.', { size: 12 }),
    table(['Màn hình / thao tác', 'API'], apiByScreen(), [45, 55]),
    part('PHỤ LỤC C. TRUY VẾT USER STORY → KIỂM THỬ'),
    para('Mỗi user story được canh giữ bởi bài test tự động nào (theo lần chạy cuối). Story của Sprint 1 còn được phủ bởi test case thủ công trong tài liệu 4.3.', { size: 12 }),
    table(['Story', 'Nhóm chức năng', 'Sprint', 'Trạng thái', 'Bài test tự động'], traceRows, [10, 24, 9, 13, 44]),
    part('PHỤ LỤC D. DANH SÁCH TÀI LIỆU SEP'),
    ...docs.flatMap(([folder, list]) => [h3(folder), ...list.map((name) => item(name, { size: 12 }))]),
  ];

  await writeDocxSections(join(root, '00_BAO-CAO-HOAN-CHINH.docx'), [
    { cover: true, children: cover },
    { footer: true, pageStart: 1, pageFormat: 'roman', children: front },
    { footer: true, pageStart: 1, pageFormat: 'decimal', children: [...c1, ...c2, ...c3] },
    { footer: true, landscape: true, children: landscape },
    { footer: true, children: [...c4b, ...c5, ...c6, ...c7, ...c8, ...refs, ...appendix] },
  ]);
  return 1;
}

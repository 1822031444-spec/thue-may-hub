/**
 * Báo cáo tiến độ dự án gửi giảng viên hướng dẫn, tính đến ngày lập báo cáo.
 *
 * Mọi con số (story, việc, điểm, lỗi, kiểm thử, số file mã nguồn) tính từ
 * tasks.mjs, progress.mjs và sprints.mjs, nên khớp với Jira, Sprint Backlog Items
 * và Test Report. Hình lấy từ design/uml (sơ đồ) và design/ui (ảnh chụp giao diện
 * mới do bài test trình duyệt chụp).
 */

import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  member, PRODUCT_OWNER, PROJECT, projectDay, roleLabel, SCRUM_MASTER, SPRINTS, TEAM, TESTER,
} from './data.mjs';
import { BUSINESS_RULES, MODULES } from './domain.mjs';
import { FINAL_RUN_DATE, FINAL_TESTS, POST_DEFECTS, POST_SPRINT } from './final-run.mjs';
import { GROUPS, LEGEND } from './gen-class.mjs';
import { RISKS } from './plan.mjs';
import { sourceFiles, sprintNow, STORIES } from './progress.mjs';
import { DEFECT_LOG, SPRINT_DOCS } from './sprints.mjs';
import { TASKS } from './tasks.mjs';
import {
  caption, h1, h1Page, h2, h2Page, item, para, pngFigure, revisionHistory, subtitle, svgFigure, table, title, writeDocxSections,
} from './docx-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const UML = join(ROOT, 'design', 'uml');
const UI = join(ROOT, 'design', 'ui');

/** Ngày lập báo cáo: ngày thứ 80 của dự án, còn ba ngày trước khi đóng Sprint 3. */
export const REPORT_DATE = projectDay(80);

const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0);
const done = (list) => list.filter((t) => t.status === 'Done');
const pct = (a, b) => `${Math.round((a / b) * 100)}%`;
const uml = (name, maxW, maxH) => svgFigure(join(UML, `${name}.svg`), join(UML, 'png', `${name}.png`), maxW, maxH, { rasterOnly: true });
const CLASS = join(ROOT, 'design', 'class-diagram');
const classFig = (name, maxW, maxH) => svgFigure(join(CLASS, `${name}.svg`), join(CLASS, 'png', `${name}.png`), maxW, maxH, { rasterOnly: true });

/** Phần việc từng người nắm — khớp mục 3.1 của KE-HOACH-NOP-VA-JIRA.md. */
export const AREAS = {
  Phu: 'API khoá khách, sửa chữa & kho linh kiện, cổng khách, khoá mạng, Telegram, Tổng quan; UX/UI: prototype, CSS, thiết kế Figma',
  Thanh: 'API đăng nhập, khách hàng, đơn thuê, luồng tiền, chi phí, duyệt yêu cầu, phân quyền, gia hạn; API giao diện mới (server/hub.ts)',
  VietAnh: 'Khung React, trang Khách hàng, Thiết bị, Đơn thuê, Sửa chữa, Yêu cầu & hỗ trợ; giao diện mới: khung quản trị, 6 màn, nối API',
  Vinh: 'Test case, 17 bài test tự động, dữ liệu test, Defect Report và Test Report từng sprint',
  Phat: 'Toàn bộ database (bảng, truy vấn, sao lưu); trang Tài chính, Cài đặt, nhắc hạn, bản desktop; giao diện mới: đăng nhập chung, cổng khách, 5 màn',
};

export const HIGHLIGHTS = {
  0: [
    'Lập Project Plan, Team Charter, Risk Management Plan, Risk List, Milestone và Product Backlog.',
    `Thu thập yêu cầu: Concept of Operations, Function List (${MODULES.reduce((s, m) => s + m.functions.length, 0)} chức năng), Business Rule (${BUSINESS_RULES.length} quy tắc).`,
    'Thiết kế: Architecture Driver, Architecture Design, Database Design; Test Plan.',
  ],
  1: [
    'Đăng nhập/đăng xuất, phiên cookie HttpOnly, mật khẩu băm scrypt (US.01).',
    'Khách hàng: xem, tìm, thêm, sửa, khoá (US.02, US.03).',
    'Thiết bị: kho máy, doanh thu và tiền sửa của từng máy (US.04, US.05).',
    'Đơn thuê: tạo đơn tự tính tiền, thu tiền không cho thu vượt (US.06, US.07).',
    'Kích hoạt và hoàn tất đơn (US.08) còn dở một việc (T.13), chuyển sang Sprint 2.',
  ],
  2: [
    'Ví khách: nạp, trừ ví, hoàn tiền; ví không bao giờ âm (US.09).',
    'Sổ giao dịch, sổ chi phí theo kỳ, chi phí vận hành (US.10, US.11).',
    'Phiếu sửa và kho linh kiện, giá vốn tính từ lịch sử nhập xuất (US.12, US.13).',
    'Cổng khách hàng: danh mục máy, gửi yêu cầu, trả bằng ví, xin gia hạn, ticket (US.14–US.16).',
    'Quản trị duyệt yêu cầu thuê và gia hạn (US.17).',
  ],
  3: [
    'Tự khoá mạng máy khi hết hạn, chặn lệnh sai khuôn (US.18).',
    'Phân quyền Chủ / Nhân viên, tài khoản nhân viên, nhật ký thao tác (US.19, US.20).',
    'Xuất CSV, trang Tổng quan, nhắc hạn qua Telegram, gia hạn tại quầy (US.21–US.24).',
    'Sao lưu tự động, bản cài Windows (US.25, US.26).',
    'Giao diện mới theo Figma, một màn đăng nhập cho ba vai trò, nối với API thật (US.27, thêm giữa sprint).',
  ],
};

export const RISK_NOW = {
  'R.01': ['Đã kiểm soát', 'Cả nhóm đã dùng được React/TypeScript; giao diện mới dùng thêm TanStack Start, học trong Sprint 3'],
  'R.02': ['Xảy ra 2 lần, đã sửa (DF.01, DF.04)', 'Sổ bút toán 3 giá trị chỉ thêm, không sửa; race-test và finance-period-test chạy sau mỗi lần sửa phần tiền'],
  'R.03': ['Chưa xảy ra', 'race-test bắn 8 yêu cầu song song vào một đơn: chỉ 1 yêu cầu được nhận'],
  'R.04': ['Đã xảy ra: thêm US.27 giữa Sprint 3', 'Đưa vào Product Backlog, chia 6 việc cho cả 5 người, thêm 2 bài kiểm thử riêng'],
  'R.06': ['Chưa xảy ra', 'Sao lưu tự động bằng VACUUM INTO, đã diễn tập phục hồi (backup-test 21 điểm kiểm tra)'],
  'R.07': ['Chưa xảy ra', 'Lệnh chỉ thay {ip}, {code} đúng khuôn; bài test chèn lệnh lạ bị chặn'],
  'R.08': ['Có nguy cơ cuối Sprint 3', 'Mọi việc có code đã xong ngày 22/10; còn 2 việc quy trình chốt ngày 25/10'],
  'R.10': ['Đã kiểm soát', '17 bài test tự động, 303 điểm kiểm tra, đạt hết ở lần chạy 22/10'],
};

export const REMAINING = [
  ['T.88 Viết Retrospective Sprint 3 (đang có bản nháp)', member('Thanh').name, '25/10/2026'],
  ['T.89 Demo nghiệm thu với khách hàng, chốt Traceability Matrix', member('Thanh').name, '25/10/2026'],
  ['Khách ký biên bản nghiệm thu Sprint 2 và Sprint 3', `${SCRUM_MASTER} (đại diện nhóm)`, '25/10/2026'],
  ['Kéo trạng thái trên Jira, nhập file việc bổ sung, đóng Sprint 3', member('Thanh').name, '25/10/2026'],
  ['Điền email, số điện thoại, tên giảng viên, tên khách hàng vào tài liệu', 'Cả nhóm', 'Trước khi nộp'],
];

export const LIMITS = [
  'Bản cài Windows (Electron) vẫn đóng gói giao diện thế hệ đầu; giao diện mới hiện chạy trên trình duyệt.',
  'Database Design và Class Diagram bản 1.0 lập trước US.27 nên chưa có 6 cột thêm cho giao diện mới: `admins.username`, `customers.address`, `customers.identity_number`, `devices.category`, `devices.location`, `repairs.priority`. Sẽ cập nhật ở bản 1.1.',
  'Chưa có thanh toán trực tuyến: khách nạp ví tại quầy, rồi tự trả đơn bằng ví trên cổng khách.',
  'Hệ thống chạy trên một máy chủ của tiệm; mở nhiều chi nhánh thì cần chuyển sang cơ sở dữ liệu máy chủ (PostgreSQL) và bọc các thao tác tiền vào transaction.',
];

export const SCREENS = [
  ['1-dang-nhap', 'Một màn đăng nhập chung: hệ thống tự nhận ra chủ, nhân viên hay khách theo username, email hoặc số điện thoại.'],
  ['2-admin-tong-quan', 'Dashboard của chủ hệ thống: máy còn trống, đơn cần chú ý, số tiền đã thu thực tế.'],
  ['4-admin-duyet', 'Duyệt yêu cầu thuê khách gửi từ cổng: nhập giá chốt, hệ thống tạo đơn giữ chỗ.'],
  ['8-nhanvien-thanh-toan', 'Tài khoản nhân viên: menu không có Ví khách, Nhân viên, Báo cáo, Cài đặt; vẫn thu tiền được.'],
  ['9-khach-may-trong', 'Cổng khách hàng trên cùng giao diện: xem máy trống và gửi yêu cầu thuê.'],
  ['7-admin-bao-cao', 'Báo cáo doanh thu, chỉ tính các đơn thuê thật.'],
];

/** Phân tích tiến độ theo luồng nghiệp vụ thay vì chỉ liệt kê chức năng rời. */
export const BUSINESS_FLOW_PROGRESS = [
  ['Đăng nhập và phân quyền', 'Chủ hệ thống, Nhân viên, Khách hàng', 'Đăng nhập chung → nhận diện vai trò → tạo phiên → giới hạn menu và API', 'Hoàn thành', 'Cookie HttpOnly; mật khẩu scrypt; API trả 403 khi sai quyền'],
  ['Thuê máy đầu-cuối', 'Khách hàng, Nhân viên', 'Xem máy trống → gửi yêu cầu → duyệt → giữ máy → giao máy → thu tiền → hoàn tất', 'Hoàn thành', 'BookingRequest, Rental, RentalPeriod và bài test `hub-flow-test.mjs`'],
  ['Ví và tài chính', 'Chủ hệ thống, Nhân viên, Khách hàng', 'Nạp ví/thu tiền/hoàn tiền → ghi bút toán → tổng hợp doanh thu và công nợ', 'Hoàn thành', 'Sổ bút toán chỉ thêm; race-test chặn thu trùng và ví âm'],
  ['Sửa chữa và linh kiện', 'Chủ hệ thống, Nhân viên', 'Báo hỏng → bảo trì → nhập/lắp/trả linh kiện → đóng phiếu → ghi chi phí', 'Hoàn thành', 'Tồn kho tính từ PartMovement; chi phí quy về đúng thiết bị'],
  ['Gia hạn và hỗ trợ', 'Khách hàng, Nhân viên', 'Khách gửi yêu cầu/ticket → tiệm báo giá, duyệt hoặc trả lời → khách nhận thông báo', 'Hoàn thành', 'ExtensionRequest, SupportTicket, TicketMessage, CustomerNotification'],
  ['Vận hành tự động', 'Chủ hệ thống, Bộ hẹn giờ, Telegram', 'Quét quá hạn → kiểm tra thời gian ân hạn → khoá mạng → ghi log; nhắc hạn và sao lưu', 'Hoàn thành', 'Lệnh được kiểm tra khuôn; thất bại ghi FAILED, không báo khoá giả'],
];

/** Giải thích bốn sơ đồ use case theo cùng một khuôn để người đọc theo dõi được đầu-cuối. */
export const USE_CASE_ANALYSIS = {
  customer: [
    ['Đăng ký và hoàn thiện hồ sơ', 'Khách chưa có tài khoản; số điện thoại/email chưa trùng', 'Nhập thông tin đăng ký → hệ thống tạo Customer và CustomerAccount → bắt buộc hoàn thiện CCCD, địa chỉ', 'Dữ liệu sai khuôn hoặc trùng thì từ chối; khách bị BLOCKED không đăng nhập được', 'Tài khoản và hồ sơ khách sẵn sàng sử dụng cổng'],
    ['Xem máy trống và gửi yêu cầu thuê', 'Khách đã đăng nhập; thiết bị AVAILABLE', 'Chọn máy, kỳ thuê → xem giá tạm tính → gửi BookingRequest', 'Máy vừa được người khác giữ thì hệ thống yêu cầu chọn lại', 'Yêu cầu ở trạng thái PENDING, chờ tiệm duyệt'],
    ['Theo dõi đơn và thanh toán bằng ví', 'Có đơn của chính khách; ví đủ tiền khi chọn trả bằng ví', 'Mở đơn → xem số còn nợ → xác nhận trả → server ghi FinancialTransaction', 'Không cho trả vượt nợ hoặc làm ví âm (BR.03, BR.06)', 'Số đã thu và số dư ví được tính lại từ sổ bút toán'],
    ['Xin gia hạn, huỷ yêu cầu và gửi hỗ trợ', 'Yêu cầu chưa duyệt hoặc đơn đang thuê', 'Chọn thao tác → nhập nội dung/thời gian → gửi → theo dõi phản hồi', 'Chỉ huỷ BookingRequest đang PENDING; gia hạn cần tiệm báo giá và duyệt', 'ExtensionRequest hoặc SupportTicket được tạo và có thông báo trạng thái'],
  ],
  staff: [
    ['Quản lý khách hàng và thiết bị', 'Nhân viên đăng nhập, có quyền tương ứng', 'Tìm/lọc → xem chi tiết → thêm hoặc cập nhật hồ sơ, trạng thái', 'Không cho thuê máy đang RENTED/MAINTENANCE; nhân viên không được nạp ví', 'Dữ liệu kho và khách được cập nhật, thao tác quan trọng có AuditLog'],
    ['Tạo hoặc duyệt đơn thuê', 'Khách hợp lệ; máy còn trống', 'Chọn khách, máy, kỳ thuê hoặc mở BookingRequest → xác nhận giá → tạo Rental RESERVED', 'Duyệt thất bại nếu máy không còn trống; toàn bộ thao tác được hoàn tác', 'Đơn giữ chỗ được tạo và máy chuyển RESERVED'],
    ['Giao máy, thu tiền và hoàn tất', 'Đơn RESERVED/ACTIVE', 'Kích hoạt → máy RENTED → thu tiền mặt/chuyển khoản/ví → hoàn tất → máy AVAILABLE', 'Không thu vượt nợ; chỉ huỷ đơn RESERVED chưa thu tiền', 'Vòng đời đơn và trạng thái máy luôn đồng bộ'],
    ['Xử lý sửa chữa và hỗ trợ', 'Máy hỏng hoặc ticket đang mở', 'Mở phiếu sửa/trả lời ticket → cập nhật tiến độ → đóng phiếu/ticket', 'Không lắp quá tồn kho; máy có phiếu sửa mở không được cho thuê', 'Chi phí, linh kiện và lịch sử trao đổi được lưu để truy vết'],
  ],
  owner: [
    ['Kế thừa toàn bộ nghiệp vụ nhân viên', 'Tài khoản OWNER đang hoạt động', 'Thực hiện các use case tại quầy như Nhân viên', 'Hệ thống phải luôn còn ít nhất một OWNER hoạt động (BR.13)', 'Chủ có toàn bộ quyền vận hành tại quầy'],
    ['Quản lý tài chính và báo cáo', 'Đã đăng nhập vai OWNER', 'Chọn kỳ → xem giao dịch/chi phí/doanh thu → xuất CSV', 'Số dư hiện tại không đổi theo kỳ lọc; bút toán không sửa/xoá', 'Có số liệu đối chiếu và file CSV phục vụ sổ sách'],
    ['Quản lý nhân viên và phân quyền', 'Đã đăng nhập vai OWNER', 'Tạo/khoá/đặt lại mật khẩu nhân viên → gán OWNER hoặc STAFF', 'STAFF bị chặn tài chính, nạp ví, hoàn tiền cả ở giao diện lẫn API', 'Quyền có hiệu lực ở yêu cầu API kế tiếp'],
    ['Cấu hình vận hành, khoá mạng và sao lưu', 'Thiết bị có IP/mã hợp lệ; cấu hình đã lưu', 'Khai lệnh mẫu → kiểm tra → khoá/mở tay hoặc để bộ hẹn giờ chạy → xem log; cấu hình lịch sao lưu', 'Chỉ thay `{ip}`, `{code}`; lệnh lỗi ghi FAILED; dữ liệu sai khuôn không được chạy', 'Hệ thống tự vận hành nhưng vẫn có nhật ký và khả năng phục hồi'],
  ],
};

export const USE_CASE_CLASS_TRACE = [
  ['Đăng nhập, đăng ký, phân quyền', 'A · Tài khoản & phân quyền; B · Khách hàng', 'Account, Admin, CustomerAccount, Session, Customer', 'A xác thực danh tính; B giữ hồ sơ nghiệp vụ của người thuê'],
  ['Gửi và duyệt yêu cầu thuê', 'B · Khách hàng; C · Thiết bị; D · Đơn thuê; E · Yêu cầu & hỗ trợ', 'Customer, Device, BookingRequest, Rental, RentalPeriod', 'Duyệt yêu cầu tạo Rental và giữ Device trong cùng một giao dịch'],
  ['Thu tiền, trả bằng ví, hoàn tiền', 'B · Khách hàng; D · Đơn thuê & tài chính', 'Customer, Rental, FinancialTransaction', 'Mọi thay đổi tiền đi qua bút toán; số dư và số đã thu là giá trị dẫn xuất'],
  ['Gia hạn và hỗ trợ', 'D · Đơn thuê; E · Yêu cầu & hỗ trợ; B · Khách hàng', 'Rental, RentalPeriod, ExtensionRequest, SupportTicket, TicketMessage, CustomerNotification', 'Yêu cầu được duyệt mới cập nhật kỳ thuê; mọi phản hồi giữ lịch sử'],
  ['Sửa chữa và linh kiện', 'C · Thiết bị & sửa chữa; D · Tài chính', 'Device, Repair, Part, PartMovement, Expense', 'Tồn kho đi theo lịch sử xuất nhập; tiền công và tiền mua linh kiện tạo Expense'],
  ['Khoá mạng và truy vết', 'C · Thiết bị; D · Đơn thuê; F · Vận hành hệ thống', 'Device, Rental, NetworkLockEvent, AppSetting, AuditLog', 'Bộ quét dựa vào hạn thuê, cấu hình và ghi lại cả thành công lẫn thất bại'],
];

/** Tài liệu SEP đã sinh, gom theo thư mục cấp 1 (bỏ thư mục jira và các file 00_). */
export function documents(root) {
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
  const groups = new Map();
  for (const file of walk(root)) {
    const parts = relative(root, file).split(sep);
    if (parts.length < 2 || parts[0] === 'jira') continue;
    const name = parts[parts.length - 1].replace(/\.(docx|xlsx)$/, '');
    groups.set(parts[0], [...(groups.get(parts[0]) ?? []), name]);
  }
  const natural = (a, b) => a.localeCompare(b, 'vi', { numeric: true });
  return [...groups].sort((a, b) => natural(a[0], b[0])).map(([folder, list]) => [folder, list.sort(natural)]);
}

export async function buildProgressReport(root) {
  const stories = STORIES;
  const tasks = TASKS;
  const doneTasks = done(tasks);
  const open = tasks.filter((t) => t.status !== 'Done');
  const sprint3 = SPRINT_DOCS.find((s) => s.no === 3);
  const testFiles = new Set(sprint3.tests.flatMap((r) => r.files));
  const checks = sum(sprint3.tests, (r) => r.checks);
  const files = sourceFiles(ROOT).length;
  const docs = documents(root);
  const docCount = sum(docs, ([, list]) => list.length);

  const perSprint = [1, 2, 3].map((n) => {
    const list = tasks.filter((t) => sprintNow(t) === n);
    const st = stories.filter((s) => s.sprint === n);
    return { n, list, st, doneList: done(list) };
  });

  const intro = [
    title('BÁO CÁO TIẾN ĐỘ DỰ ÁN'),
    subtitle(PROJECT.name),
    para(`Tính đến ngày **${REPORT_DATE}** — tuần 12, Sprint 3 (${SPRINTS[3].from} – ${SPRINTS[3].to}).`),
    ...revisionHistory([
      ['1.0', REPORT_DATE, SCRUM_MASTER, 'Lập báo cáo tiến độ gửi giảng viên hướng dẫn'],
      ['1.1', '29/10/2026', SCRUM_MASTER, 'Bổ sung phân tích tiến độ, giải thích use case và Class Diagram'],
      ['1.2', '29/10/2026', SCRUM_MASTER, 'Đồng bộ mã và số hình với Hướng dẫn thuyết trình; làm rõ quan hệ U0–U3, AR1 và C0–C6'],
      ['1.3', FINAL_RUN_DATE, SCRUM_MASTER, 'Thêm mục 12: giai đoạn hoàn thiện sau Sprint 3 và kết quả kiểm thử cuối; các mục 1–11 giữ nguyên số liệu ngày lập báo cáo'],
    ]),

    h1('1. Thông tin chung'),
    table(['Hạng mục', 'Nội dung'], [
      ['Đề tài', PROJECT.name],
      ['Nhóm', `${PROJECT.org} — ${PROJECT.memberCount} thành viên`],
      ['Giảng viên hướng dẫn', PROJECT.mentor],
      ['Khách hàng', PROJECT.customer],
      ['Thời gian', `${PROJECT.weeks} tuần, ${SPRINTS[0].from} – ${SPRINTS[3].to}, 4 sprint × 3 tuần`],
      ['Scrum Master / Product Owner', `${SCRUM_MASTER} / ${PRODUCT_OWNER}`],
      ['Công nghệ', `${PROJECT.tech.frontend}; ${PROJECT.tech.backend}; ${PROJECT.tech.database}; ${PROJECT.tech.desktop}`],
      ['Công cụ', 'Jira (backlog, sprint, phân công), Figma (thiết kế giao diện), Visual Studio Code, Microsoft Word / Excel'],
    ], [28, 72]),

    h1('2. Tóm tắt'),
    para(`Dự án **đúng tiến độ**. Toàn bộ chức năng có code của ba sprint đã hoàn thành và kiểm thử đạt; còn ${open.length} việc quy trình (Retrospective Sprint 3 và buổi nghiệm thu với khách hàng) chốt tại buổi họp ngày ${SPRINTS[3].to}.`),
    table(['Chỉ số', 'Kết quả', 'Ghi chú'], [
      ['User story hoàn thành', `${stories.filter((s) => s.status === 'Done').length}/${stories.length}`, 'Gồm US.27 giao diện mới thêm giữa Sprint 3'],
      ['Việc (task) hoàn thành', `${doneTasks.length}/${tasks.length} (${pct(doneTasks.length, tasks.length)})`, `Còn ${open.map((t) => t.code).join(', ')}, chốt ngày ${SPRINTS[3].to}`],
      ['Story point hoàn thành', `${sum(doneTasks, (t) => t.points)}/${sum(tasks, (t) => t.points)}`, 'Điểm ghi ở từng việc, không cộng trùng ở story'],
      ['Kiểm thử tự động', `${testFiles.size} bài, ${checks} điểm kiểm tra`, `Đạt 100% ở lần chạy ngày ${REPORT_DATE}`],
      ['Lỗi (defect)', `${DEFECT_LOG.length} phát hiện, ${DEFECT_LOG.filter((d) => d.closedIn <= 3).length} đã sửa`, 'Mỗi lỗi có bài test canh giữ để không tái phát'],
      ['Mã nguồn', `${files} file`, 'Mỗi file thuộc ít nhất một việc trên Jira'],
      ['Tài liệu SEP', `${docCount} file`, 'Kế hoạch, yêu cầu, thiết kế, kiểm thử của cả 3 sprint'],
    ], [26, 30, 44]),

    h1('3. Tiến độ theo sprint'),
    table(['Sprint', 'Thời gian', 'User story', 'Việc xong', 'Story point xong', 'Trạng thái'], [
      ['Sprint 0', `${SPRINTS[0].from} – ${SPRINTS[0].to}`, '—', '—', '—', 'Hoàn thành'],
      ...perSprint.map(({ n, list, st, doneList }) => [
        `Sprint ${n}`, `${SPRINTS[n].from} – ${SPRINTS[n].to}`,
        `${st.length} (${st[0].code}–${st[st.length - 1].code})`,
        `${doneList.length}/${list.length}`,
        `${sum(doneList, (t) => t.points)}/${sum(list, (t) => t.points)}`,
        doneList.length === list.length ? 'Hoàn thành' : 'Đang chạy, đóng ngày 25/10',
      ]),
    ], [12, 24, 18, 12, 16, 18]),
    ...[0, 1, 2, 3].flatMap((n) => [
      h2(`Sprint ${n}${n === 0 ? ' — lập kế hoạch và yêu cầu' : ''}`),
      ...HIGHLIGHTS[n].map((x) => item(x)),
    ]),

    h1('4. Chức năng đã hoàn thành'),
    para(`Hệ thống có ${sum(MODULES, (m) => m.functions.length)} chức năng chia ${MODULES.length} nhóm, theo Function List. Tất cả đã chạy được trên bản hiện tại.`),
    table(['Nhóm chức năng', 'Tác nhân', 'Số chức năng', 'Mã', 'Trạng thái'],
      MODULES.map((m) => [m.name, m.actor, String(m.functions.length),
        `${m.functions[0][0]} – ${m.functions[m.functions.length - 1][0]}`, 'Hoàn thành']),
      [28, 28, 12, 18, 14]),
    h2('4.1. Đánh giá mức hoàn thiện theo luồng nghiệp vụ'),
    para('Bảng dưới gom các chức năng rời thành sáu luồng đầu-cuối. Một luồng chỉ được ghi “Hoàn thành” khi giao diện, API, dữ liệu và kiểm thử liên quan đều đã nối với nhau.'),
    table(['Luồng nghiệp vụ', 'Tác nhân', 'Chuỗi xử lý', 'Trạng thái', 'Bằng chứng'], BUSINESS_FLOW_PROGRESS, [17, 17, 30, 11, 25]),
  ];

  const figures = [
    h1('5. Sản phẩm hiện tại'),
    h2('5.1. Use case tổng quát — mã U0'),
    uml('u0-tong-quat', 1000, 560),
    caption('Hình 1 [U0]. Use case mức tổng quát: ba tác nhân người dùng, hai tác nhân hệ thống và các cụm năng lực chính.'),
    para('**U0 là sơ đồ mức tổng quan nên cố ý có ít hình elip hơn U1–U3.** Mỗi elip trong U0 là một cụm chức năng, không phải một use case chi tiết. U1 mở rộng phần Khách hàng; U2 mở rộng phần Nhân viên; U3 mở rộng phần chỉ Chủ hệ thống. Vì vậy U0 dùng để giới thiệu phạm vi, còn U1–U3 dùng để giải thích luồng và quy tắc.', { size: 12 }),
    para('**Cách đọc:** đường nối cho biết tác nhân tham gia use case; mũi tên tam giác từ Chủ hệ thống tới Nhân viên là quan hệ kế thừa, nghĩa là chủ làm được toàn bộ nghiệp vụ của nhân viên. `«include»` là bước bắt buộc được tái sử dụng; `«extend»` là hành vi chỉ phát sinh khi người dùng chọn hoặc khi đủ điều kiện.', { size: 12 }),
    table(['Tác nhân', 'Mục tiêu', 'Phạm vi trách nhiệm'], [
      ['Khách hàng', 'Tự phục vụ trước và trong thời gian thuê', 'Đăng ký, xem máy, gửi/theo dõi yêu cầu, trả bằng ví, xin gia hạn, gửi ticket, nhận thông báo'],
      ['Nhân viên', 'Vận hành giao dịch tại quầy', 'Quản lý khách và máy, tạo/duyệt đơn, giao máy, thu tiền, xử lý sửa chữa và hỗ trợ'],
      ['Chủ hệ thống', 'Kiểm soát tiền, quyền và cấu hình', 'Kế thừa Nhân viên; thêm tài chính, nhân sự, khoá mạng, nhật ký, sao lưu và báo cáo'],
      ['Bộ hẹn giờ', 'Tự động hoá theo thời gian', 'Quét đơn quá hạn, khoá/mở mạng, tạo nhắc hạn và chạy lịch sao lưu'],
      ['Telegram', 'Kênh thông báo ngoài hệ thống', 'Nhận bản tóm tắt đơn sắp hết hạn cho chủ tiệm'],
    ], [18, 30, 52]),
    table(['Cụm trên U0', 'Được mở rộng ở', 'Cách chuyển khi thuyết trình'], [
      ['Đăng ký, xem máy, yêu cầu thuê, ví, gia hạn, ticket', 'Hình 2 [U1] — Khách hàng', '“Từ phạm vi chung, em đi vào những việc khách tự làm trên cổng khách.”'],
      ['Quản lý khách/máy/đơn, giao máy, thu tiền, sửa chữa', 'Hình 3 [U2] — Nhân viên', '“Tiếp theo là các nghiệp vụ nhân viên xử lý tại quầy.”'],
      ['Tài chính, nhân sự, linh kiện, khoá mạng, sao lưu', 'Hình 4 [U3] — Chủ hệ thống', '“Cuối cùng là các quyền nhạy cảm chỉ chủ hệ thống được thực hiện.”'],
      ['Bộ hẹn giờ và Telegram', 'U0, U3 và Hình 5 [AR1]', '“Hai tác nhân tự động được nối sang kiến trúc để thấy tác vụ nền chạy ở đâu.”'],
    ], [27, 29, 44]),
    h2Page('5.2. Use case Khách hàng — mã U1'),
    uml('u1-khach-hang', 1000, 560),
    caption('Hình 2 [U1]. Chi tiết phần Khách hàng của U0: đăng ký, xem máy, gửi yêu cầu, theo dõi đơn, dùng ví, gia hạn và hỗ trợ.'),
    table(['Use case', 'Tiền điều kiện', 'Luồng chính', 'Ngoại lệ / quy tắc', 'Kết quả'], USE_CASE_ANALYSIS.customer, [16, 18, 27, 23, 16]),
    h2Page('5.3. Use case Nhân viên — mã U2'),
    uml('u2-nhan-vien', 1000, 560),
    caption('Hình 3 [U2]. Chi tiết phần Nhân viên của U0: quản lý tại quầy, tạo/duyệt đơn, giao máy, thu tiền, gia hạn, sửa chữa và hỗ trợ.'),
    table(['Use case', 'Tiền điều kiện', 'Luồng chính', 'Ngoại lệ / quy tắc', 'Kết quả'], USE_CASE_ANALYSIS.staff, [16, 18, 27, 23, 16]),
    h2Page('5.4. Use case Chủ hệ thống — mã U3'),
    uml('u3-chu-he-thong', 1000, 560),
    caption('Hình 4 [U3]. Chi tiết phần chỉ Chủ hệ thống: kế thừa quyền Nhân viên và bổ sung tài chính, nhân sự, cấu hình, sao lưu, báo cáo, khoá mạng.'),
    table(['Use case', 'Tiền điều kiện', 'Luồng chính', 'Ngoại lệ / quy tắc', 'Kết quả'], USE_CASE_ANALYSIS.owner, [16, 18, 27, 23, 16]),
    h2Page('5.5. Kiến trúc triển khai — mã AR1'),
    uml('ar1-kien-truc', 1000, 540),
    caption('Hình 5 [AR1]. Vị trí hiện thực các use case U0–U3: ba giao diện dùng chung backend Express, dữ liệu SQLite và các tác vụ nền.'),
    para('AR1 không phải use case. U0–U3 trả lời **ai làm gì**; AR1 trả lời **chức năng đó chạy ở thành phần nào**. Khi thuyết trình chỉ chuyển sang AR1 sau khi đã chốt phạm vi tác nhân và nghiệp vụ.', { size: 12 }),
    h2('5.6. Quan hệ include, extend và kế thừa'),
    table(['Quan hệ', 'Ví dụ trong hệ thống', 'Ý nghĩa nghiệp vụ'], [
      ['`«include»`', 'Đăng ký → Hoàn thiện hồ sơ; Thu tiền → Kiểm tra số còn nợ/số dư; Duyệt yêu cầu → Tạo đơn giữ chỗ', 'Bước con luôn xảy ra; bỏ bước này thì use case chính không hợp lệ.'],
      ['`«extend»`', 'Gửi yêu cầu thuê mở rộng Xem máy trống; Trả bằng ví/Gia hạn/Huỷ mở rộng Theo dõi đơn', 'Hành vi tuỳ chọn hoặc có điều kiện; use case gốc vẫn có ý nghĩa khi không phát sinh.'],
      ['Kế thừa tác nhân', 'Chủ hệ thống → Nhân viên', 'Chủ sử dụng được mọi use case của nhân viên, sau đó có thêm các use case riêng.'],
    ], [18, 42, 40]),
  ];

  const screens = [
    h2('5.7. Giao diện mới (US.27)'),
    para('Ảnh chụp tự động từ bài test chạy trên trình duyệt thật (`npm run test:hub-ui`), dữ liệu mẫu của bản demo.'),
    ...SCREENS.flatMap(([file, text], i) => [pngFigure(join(UI, `${file}.png`), 560, 360), caption(`Hình ${i + 6}. ${text}`)]),
  ];

  // Sơ đồ lớp đầy đủ, cùng nội dung với tài liệu 3.4 Class Diagram (GROUPS, LEGEND lấy từ gen-class.mjs).
  const firstGroupFig = 5 + SCREENS.length + 1;
  const classes = [
    h1('6. Sơ đồ lớp (Class Diagram)'),
    para('Hệ thống có 21 lớp phân tích/thiết kế chia 6 nhóm nghiệp vụ. Trong đó 20 lớp cụ thể ánh xạ vào 21 bảng SQLite trong `server/database.ts`: `Account` là lớp trừu tượng nên không có bảng riêng, còn `Session` bao quát hai bảng phiên `sessions` và `customer_sessions`. Phương thức trên sơ đồ ánh xạ tới endpoint hoặc hàm nghiệp vụ đang chạy. Các hình lược bỏ khoá kỹ thuật và dấu thời gian để dễ đọc; tuỳ bảng có `id`, `created_at`, `updated_at`, riêng `AppSetting` dùng `key` làm khoá.', { size: 12 }),
    para('Giao diện mới (US.27) thêm 6 cột chưa vẽ trên sơ đồ bản 1.0: `admins.username`, `customers.address`, `customers.identity_number`, `devices.category`, `devices.location`, `repairs.priority`. Server tự thêm cột khi khởi động nên database cũ vẫn dùng được.', { size: 12 }),
    h2('6.1. Tổng quan sáu nhóm lớp'),
    classFig('0-tong-quan', 1000, 450),
    caption(`Hình ${firstGroupFig} [C0]. Sáu nhóm lớp và phụ thuộc giữa các nhóm. Nhóm D là lõi: nối khách hàng (B) với thiết bị (C), nhận đơn từ yêu cầu (E) và khoản chi từ sửa chữa (C).`),
    h2Page('6.2. Cách đọc ký hiệu'),
    table(['Ký hiệu', 'Ý nghĩa'], LEGEND, [32, 68]),
    h2Page('6.3. Từ use case đến các lớp hiện thực'),
    para('Use case mô tả **hệ thống làm gì** theo góc nhìn tác nhân; Class Diagram mô tả **dữ liệu và trách nhiệm được tổ chức ở đâu**. Bảng truy vết dưới đây nối hai góc nhìn để tránh sơ đồ lớp trở thành một hình độc lập, không gắn với nghiệp vụ.'),
    table(['Luồng use case', 'Nhóm lớp tham gia', 'Lớp chính', 'Cách phối hợp'], USE_CASE_CLASS_TRACE, [19, 23, 26, 32]),
    ...GROUPS.flatMap((g, i) => [
      h2Page(`6.${i + 4}. Nhóm ${g.key} — ${g.name}`),
      classFig(g.file, 1000, 420),
      caption(`Hình ${firstGroupFig + i + 1} [C${i + 1}]. ${g.caption.replace(/^Hình \d+\.\s*/, '')}`),
      para(`**Vai trò của nhóm ${g.key}:** ${g.classes}. Bảng dữ liệu và nơi hiện thực của từng lớp ở mục 6.${GROUPS.length + 4}.`, { size: 12 }),
      ...g.points.map((x) => item(x, { size: 12 })),
      // Bảng lớp ↔ bảng ↔ nơi hiện thực của nhóm nằm ở mục tổng hợp ngay sau; để
      // riêng ở đây thì vài dòng cuối luôn tràn sang một trang ngang gần như trống.
    ]),
    h2Page(`6.${GROUPS.length + 4}. Tổng hợp lớp ↔ bảng ↔ nơi hiện thực`),
    table(['Nhóm', 'Lớp', 'Bảng', 'Hiện thực ở'],
      GROUPS.flatMap((g) => g.map.map(([cls, tbl, where], j) => [j === 0 ? `${g.key} · ${g.name}` : '', cls, tbl, where])),
      [20, 18, 24, 38]),
  ];

  const tail = [
    h1('7. Phân công và đóng góp'),
    table(['Thành viên', 'Vai trò', 'Số việc', 'Story point', 'Đã xong', 'Phần phụ trách'],
      TEAM.map((m) => {
        const mine = tasks.filter((t) => t.who === m.alias);
        return [m.name, roleLabel(m), String(mine.length), String(sum(mine, (t) => t.points)), String(sum(done(mine), (t) => t.points)), AREAS[m.alias]];
      }), [17, 17, 8, 10, 9, 39]),
    para('Story point theo từng sprint:'),
    table(['Thành viên', 'Sprint 1', 'Sprint 2', 'Sprint 3', 'Tổng'],
      TEAM.map((m) => {
        const mine = tasks.filter((t) => t.who === m.alias);
        const by = [1, 2, 3].map((n) => sum(mine.filter((t) => sprintNow(t) === n), (t) => t.points));
        return [m.name, ...by.map(String), String(sum(mine, (t) => t.points))];
      }), [36, 16, 16, 16, 16]),
    para('Tổng điểm mỗi người chênh nhau khoảng 10%: việc quy trình (Retrospective, cập nhật backlog, nghiệm thu) được giao cho người đang ít điểm hơn.'),

    h1('8. Chất lượng'),
    h2('8.1. Kiểm thử'),
    para(`Từ Sprint 2, mỗi chức năng có bài test tự động trong thư mục \`scripts/\`, chạy lại được bằng một lệnh. Lần chạy toàn bộ ngày ${REPORT_DATE}: ${testFiles.size} bài, ${checks} điểm kiểm tra, đạt hết.`),
    table(['Chức năng', 'User story', 'Bài test', 'Điểm kiểm tra', 'Kết quả'],
      sprint3.tests.map((r) => [r.fn, r.stories, r.files.join(', '), String(r.checks), 'Đạt']),
      [32, 13, 33, 11, 11]),
    h2('8.2. Lỗi đã phát hiện'),
    table(['Mã', 'Tóm tắt', 'Mức độ', 'Phát hiện', 'Người sửa', 'Trạng thái'],
      DEFECT_LOG.map((d) => [d.id, d.summary, d.severity, `Sprint ${d.release}`, d.owner, d.closedIn <= 3 ? 'Đã sửa' : 'Mở']),
      [8, 42, 10, 12, 17, 11]),

    h1('9. Rủi ro và vấn đề'),
    table(['Mã', 'Rủi ro', 'Tình trạng hiện tại', 'Cách đang xử lý'],
      RISKS.filter((r) => RISK_NOW[r[0]]).map((r) => [r[0], r[1], ...RISK_NOW[r[0]]]),
      [8, 28, 24, 40]),

    h1('10. Việc còn lại đến khi kết thúc dự án'),
    table(['Việc', 'Người phụ trách', 'Hạn'], REMAINING, [56, 28, 16]),
    h2('Hạn chế đã biết'),
    ...LIMITS.map((x) => item(x)),

    h1('11. Kết luận'),
    para(`Sau ${PROJECT.weeks} tuần, nhóm hoàn thành ${stories.length} user story với ${sum(MODULES, (m) => m.functions.length)} chức năng, có kiểm thử tự động cho từng chức năng và bộ tài liệu SEP đầy đủ cho ba sprint. Việc còn lại là các bước khép dự án tại buổi họp ngày ${SPRINTS[3].to}. Nhóm đề nghị giảng viên góp ý thêm về phần giao diện mới và cách trình bày tài liệu trước buổi báo cáo cuối kỳ.`),
    para(`Tester: ${TESTER} · Product Owner: ${PRODUCT_OWNER} · Scrum Master: ${SCRUM_MASTER}`, { italics: true }),

    h1Page(`12. Cập nhật sau Sprint 3 (đến ngày ${FINAL_RUN_DATE})`),
    para(`Các mục 1–11 ghi tiến độ tại ngày ${REPORT_DATE}. Từ ${POST_SPRINT.from} đến ${POST_SPRINT.to}, nhóm ưu tiên hoàn thiện ứng dụng theo thiết kế Figma: mọi màn của giao diện mới đều gọi API thật, không còn màn chỉ xem.`),
    h2('12.1. Khu quản trị và nhân viên'),
    ...POST_SPRINT.admin.map((x) => item(x)),
    h2('12.2. Cổng khách hàng'),
    ...POST_SPRINT.customer.map((x) => item(x)),
    h2('12.3. Backend'),
    ...POST_SPRINT.backend.map((x) => item(x)),
    h2('12.4. Kiểm thử và lỗi'),
    para(`Lần chạy toàn bộ ngày ${FINAL_RUN_DATE} trên database tạm: ${FINAL_TESTS.length}/${FINAL_TESTS.length} bài đạt, ${sum(FINAL_TESTS, (t) => t[4])} điểm kiểm tra (cuối Sprint 3 là ${checks}). Bài API giao diện mới tăng từ 40 lên 64 điểm, bài trình duyệt từ 12 lên 21 màn hình.`),
    table(['Mã', 'Chức năng', 'Lỗi', 'Mức độ', 'Trạng thái'],
      POST_DEFECTS.map(([id, module, summary, severity]) => [id, module, summary, severity, 'Đã sửa']), [8, 22, 50, 10, 10]),
    h2('12.5. Bàn giao'),
    ...POST_SPRINT.delivery.map((x) => item(x)),
    item('Báo cáo hoàn chỉnh của dự án: `00_BAO-CAO-HOAN-CHINH` (Word và PDF) cùng thư mục với báo cáo này.'),
    h2('12.6. Việc còn lại'),
    item('Điền tên trường, khoa, giảng viên hướng dẫn, tên khách hàng, email và số điện thoại thành viên vào tài liệu.'),
    item('Khách hàng ký biên bản nghiệm thu Sprint 2 và Sprint 3; chốt Retrospective Sprint 3 (đang là bản nháp).'),

    h1Page('Phụ lục. Danh sách tài liệu SEP'),
    ...docs.flatMap(([folder, list]) => [h2(folder), ...list.map((name) => item(name, { size: 12 }))]),
  ];

  await writeDocxSections(join(root, '00_BAO-CAO-TIEN-DO.docx'), [
    { children: intro },
    { landscape: true, children: figures },
    { children: screens },
    { landscape: true, children: classes },
    { children: tail },
  ]);
  return 1;
}

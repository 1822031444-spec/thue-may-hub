/**
 * 3.4 Class Diagram — sơ đồ lớp của Thuê Máy Hub dưới dạng Word.
 *
 * Hình lấy từ design/class-diagram/: file .svg được nhúng dạng vector (Word 2019
 * và Microsoft 365 phóng to không vỡ nét), file png/*.png gấp đôi kích thước làm
 * ảnh dự phòng cho Word bản cũ. Trang chữ để dọc theo khuôn bộ SEP; trang hình để
 * ngang, lề hẹp, để sơ đồ đủ to mà đọc.
 *
 * Nội dung bám đúng trang thuyết trình sơ đồ lớp: cùng tên lớp, cùng bội số, cùng
 * mã quy tắc BR, để nói theo trang hay theo file Word đều khớp.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AlignmentType, HeadingLevel, ImageRun, Paragraph, TextRun } from 'docx';
import { DOC_DATE, member, PROJECT, READERS } from './data.mjs';
import { checkSvg, h1, h2, readersTable, revisionHistory, subtitle, table, title, writeDocxSections } from './docx-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DESIGN = join(here, '..', '..', 'design', 'class-diagram');
const N = PROJECT.code;

/* ---- Dựng đoạn văn: chữ trong dấu `…` in font Consolas như code ---- */

const FONT = 'Times New Roman';
const CODE = 'Consolas';

function runs(text, { size = 13, italics = false, bold = false } = {}) {
  return String(text).split('`').map((part, i) => new TextRun({
    text: part,
    font: i % 2 ? CODE : FONT,
    size: Math.round((i % 2 ? size - 1.5 : size) * 2),
    italics,
    bold,
  }));
}

const para = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: runs(text, opts) });
const item = (text) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: runs(text) });
const label = (text) => new Paragraph({ keepNext: true, spacing: { before: 200, after: 100 }, children: runs(text, { bold: true }) });
const caption = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60, after: 160 },
  children: runs(text, { size: 12, italics: true }),
});

/** Heading 1 sang trang mới, cùng kiểu với h1 của docx-kit (cỡ 16, xanh lá). */
const chapterHeading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  pageBreakBefore: true,
  spacing: { after: 160 },
  children: [new TextRun({ text, bold: true, size: 32, font: FONT, color: '2E7D32' })],
});

/** Heading 2 luôn sang trang mới — mỗi nhóm lớp bắt đầu ở đầu trang ngang. */
const groupHeading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  pageBreakBefore: true,
  spacing: { after: 120 },
  children: [new TextRun({ text, bold: true, size: 28, font: FONT })],
});

/* ---- Hình: SVG vector, PNG dự phòng ---- */

// Vùng dùng được của trang ngang lề hẹp ≈ 1026 × 698 px; chừa chỗ cho tiêu đề và chú thích.
const MAX_W = 1000;
const MAX_H = 590;

function figure(file) {
  const svgPath = join(DESIGN, `${file}.svg`);
  const pngPath = join(DESIGN, 'png', `${file}.png`);
  if (!existsSync(svgPath) || !existsSync(pngPath)) {
    throw new Error(`Thiếu hình ${file}.svg hoặc png/${file}.png trong design/class-diagram — hình được dựng một lần rồi lưu ở đó.`);
  }
  const svg = readFileSync(svgPath);
  checkSvg(svg.toString('utf8'), svgPath);
  const [, w, h] = svg.toString('utf8').match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  const s = Math.min(1, MAX_W / w, MAX_H / h);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({
      type: 'svg',
      data: svg,
      transformation: { width: Math.round(w * s), height: Math.round(h * s) },
      fallback: { type: 'png', data: readFileSync(pngPath) },
    })],
  });
}

/* ---- Nội dung ---- */

// LEGEND và GROUPS dùng chung với Báo cáo tiến độ (gen-baocao.mjs) để hai tài liệu luôn khớp.
export const LEGEND = [
  ['Đường liền, số ở hai đầu (1, 0..*, 0..1)', 'Liên kết và bội số: một khách có 0 đến nhiều đơn thuê, mỗi đơn thuộc đúng 1 khách.'],
  ['Hình thoi đặc ở một đầu', 'Hợp thành: phần không tồn tại nếu thiếu toàn thể, ví dụ kỳ thuê thuộc đơn thuê.'],
  ['Tam giác rỗng chỉ vào lớp cha', 'Kế thừa: Admin và CustomerAccount đều là Account.'],
  ['Khung viền đứt', 'Lớp thuộc nhóm khác, chỉ vẽ tên để thấy chỗ nối; chi tiết nằm ở hình của nhóm đó.'],
  ['Mũi tên đứt (chỉ ở hình tổng quan)', 'Phụ thuộc: nhóm ở gốc dùng lớp của nhóm ở ngọn.'],
  ['-  /  +', 'Thuộc tính riêng / phương thức công khai.'],
  ['/tên', 'Thuộc tính dẫn xuất: tính ra từ dữ liệu khác, không lưu thành cột.'],
  ['{unique}  /  [0..1]', 'Không được trùng / có thể để trống.'],
  ['«abstract»', 'Lớp trừu tượng, tên in nghiêng.'],
  ['«immutable»', 'Bản ghi chỉ thêm, không sửa, không xoá.'],
  ['Ghi chú nền vàng', 'Quy tắc nghiệp vụ, kèm mã BR trong tài liệu Business Rule.'],
];

export const GROUPS = [
  {
    key: 'A', name: 'Tài khoản & phân quyền', file: '1-tai-khoan-phan-quyen', who: 'Vinh',
    classes: 'Account, Admin, CustomerAccount, Session',
    caption: 'Hình 1. Hai loại tài khoản kế thừa lớp trừu tượng Account; mỗi tài khoản mở nhiều phiên đăng nhập.',
    points: [
      'Quản trị và khách đều đăng nhập bằng email và mật khẩu băm scrypt, nên phần chung gom vào lớp trừu tượng Account. Mỗi lớp con lưu bảng riêng: `admins` và `customer_accounts`.',
      'Session là hợp thành của Account: phiên không tồn tại nếu thiếu tài khoản. Xoá hoặc khoá tài khoản là cắt hết phiên, có hiệu lực ngay ở lần gọi API kế tiếp.',
      '`Admin.hasPermission()` liệt kê quyền của STAFF trong `server/permissions.ts`. Quên khai một quyền thì nhân viên mặc định không có quyền đó.',
      'CustomerAccount gắn với đúng một hồ sơ Customer, nhờ vậy API cổng khách chỉ trả về dữ liệu của chính khách đang đăng nhập.',
    ],
    map: [
      ['Account', '— (lớp trừu tượng)', 'hashPassword(), verifyPassword()'],
      ['Admin', 'admins', '/api/auth/*, /api/admins'],
      ['CustomerAccount', 'customer_accounts', '/api/customer/auth/*'],
      ['Session', 'sessions, customer_sessions', 'requireAuth, requireCustomer'],
    ],
  },
  {
    key: 'B', name: 'Khách hàng', file: '2-khach-hang', who: 'VietAnh',
    classes: 'Customer, CustomerNotification',
    caption: 'Hình 2. Customer là lớp trung tâm phía khách: sáu lớp ở bốn nhóm khác đều trỏ về đây.',
    points: [
      'Một hồ sơ khách có tối đa một tài khoản đăng nhập. Khách đến thuê tại quầy thì không cần tài khoản, nên bội số là 0..1.',
      'Số dư ví có dấu `/` vì là thuộc tính dẫn xuất: tính bằng tổng `walletChange` trong sổ tiền, không lưu cột riêng.',
      'Trạng thái BLOCKED chặn đăng nhập cổng khách và cắt các phiên đang mở (BR.07).',
      'CustomerNotification là hợp thành của Customer. `dedupeKey` chặn cùng một sự kiện bị báo hai lần.',
    ],
    map: [
      ['Customer', 'customers', '/api/customers, getWalletBalance()'],
      ['CustomerNotification', 'customer_notifications', 'notifyCustomer(), /api/customer/notifications'],
    ],
  },
  {
    key: 'C', name: 'Thiết bị & sửa chữa', file: '3-thiet-bi-sua-chua', who: 'Phat',
    classes: 'Device, Repair, Part, PartMovement',
    caption: 'Hình 3. Thiết bị, phiếu sửa và kho linh kiện. Hai đường sinh chi phí (tiền công, tiền mua linh kiện) đều về Expense.',
    points: [
      'Device có hai trạng thái độc lập: `status` (sẵn sàng, đang thuê, bảo trì…) và `networkStatus` (mở hay đã khoá mạng). Gộp làm một sẽ che mất trường hợp máy sẵn sàng nhưng lệnh mở mạng chưa chạy được.',
      'Mở phiếu sửa thì máy chuyển MAINTENANCE và không cho thuê (BR.08). Đóng phiếu ghi một Expense tiền công.',
      'Tồn kho và giá vốn không lưu cột mà tính từ PartMovement, giống cách sổ tiền làm. Gỡ linh kiện ghi một dòng RETURN chứ không xoá dòng cũ.',
      'Chi phí chỉ sinh ở hai chỗ: lúc mua linh kiện và lúc trả tiền công. Lắp linh kiện từ kho chỉ trừ tồn (BR.09).',
    ],
    map: [
      ['Device', 'devices', '/api/devices, syncDeviceStatus()'],
      ['Repair', 'repairs', '/api/repairs'],
      ['Part', 'parts', '/api/parts, partStock()'],
      ['PartMovement', 'part_movements', '/api/parts/:id/movements, /api/repairs/:id/parts'],
    ],
  },
  {
    key: 'D', name: 'Đơn thuê & tài chính', file: '4-don-thue-tai-chinh', who: 'Thanh',
    classes: 'Rental, RentalPeriod, FinancialTransaction, Expense',
    caption: 'Hình 4. Đơn thuê nối một khách với một máy; mọi đồng tiền đi qua sổ bút toán ba giá trị.',
    points: [
      'Rental là lớp lõi: 1 khách, 1 máy. Vòng đời RESERVED → ACTIVE → COMPLETED, hoặc EXPIRED, CANCELLED. Đổi trạng thái đơn kéo theo trạng thái máy.',
      'Mỗi lần gia hạn là một RentalPeriod riêng, nên sau nhiều tháng vẫn biết `totalAmount` gồm những kỳ nào, giá nào.',
      'FinancialTransaction ghi ba giá trị cash, wallet, revenue và chỉ được thêm. Ví dụ: khách nạp 1.000.000 đ ghi cash +1.000.000, wallet +1.000.000, revenue 0; trả đơn 300.000 đ bằng ví ghi cash 0, wallet −300.000, revenue +300.000.',
      '`paidAmount` không được vượt `totalAmount` (BR.03); hoàn tiền không quá số đã thu (BR.04). Hai người bấm thu tiền cùng lúc cũng không thu vượt: nhóm đã thử 8 yêu cầu song song bằng `npm run test:race`.',
      'Expense tách khỏi bút toán: bút toán là tiền giữa tiệm và khách, khoản chi là chi phí vận hành của tiệm.',
    ],
    map: [
      ['Rental', 'rentals', '/api/rentals, getRentalPaid()'],
      ['RentalPeriod', 'rental_periods', '/api/rentals/:id/renew'],
      ['FinancialTransaction', 'financial_transactions', '/api/finance/transactions'],
      ['Expense', 'expenses', '/api/finance/expenses, recordExpense()'],
    ],
  },
  {
    key: 'E', name: 'Yêu cầu & hỗ trợ', file: '5-yeu-cau-ho-tro', who: 'Phu',
    classes: 'BookingRequest, ExtensionRequest, SupportTicket, TicketMessage',
    caption: 'Hình 5. Khách tự gửi yêu cầu từ cổng khách; chỉ khi quản trị duyệt, yêu cầu mới thành đơn thuê.',
    points: [
      'BookingRequest và Rental là 0..1 với 0..1: yêu cầu bị từ chối không sinh đơn, còn đơn tạo tại quầy không có yêu cầu nào.',
      'Duyệt yêu cầu tạo một Rental ở trạng thái RESERVED và chuyển máy sang RESERVED, nên máy biến khỏi danh mục của khách khác.',
      'Gia hạn từ cổng khách đi qua ExtensionRequest: quản trị nhập phí bổ sung, duyệt thì hạn đơn và tổng tiền được cập nhật.',
      'Ticket luôn có ít nhất một tin nhắn (1..*) vì được tạo cùng tin đầu tiên. TicketMessage ghi `authorType` để biết khách hay tiệm trả lời.',
    ],
    map: [
      ['BookingRequest', 'booking_requests', '/api/customer/bookings, /api/service-desk/bookings/:id/approve'],
      ['ExtensionRequest', 'extension_requests', '/api/customer/rentals/:id/extensions, /api/service-desk/extensions/:id/approve'],
      ['SupportTicket', 'support_tickets', '/api/customer/tickets, /api/service-desk/tickets'],
      ['TicketMessage', 'ticket_messages', '…/tickets/:id/messages'],
    ],
  },
  {
    key: 'F', name: 'Vận hành hệ thống', file: '6-van-hanh-he-thong', who: 'Phat',
    classes: 'AuditLog, AppSetting, NetworkLockEvent',
    caption: 'Hình 6. Các lớp giúp hệ thống tự vận hành và truy vết được: ai đã làm gì, lệnh khoá mạng nào đã chạy.',
    points: [
      'AuditLog và NetworkLockEvent đều là «immutable»: chỉ ghi thêm, dùng để trả lời ai đã làm gì và lệnh nào đã chạy.',
      'NetworkLockEvent có nguồn AUTO khi bộ quét tự khoá máy quá hạn, MANUAL khi chủ bấm tay; ghi cả những lần thất bại.',
      'Lệnh khoá/mở chỉ được thay hai chỗ trống IP và mã máy, sai khuôn thì từ chối chạy (BR.15). Bộ quét chạy mỗi phút, khoá máy của đơn quá hạn quá thời gian ân hạn (BR.16).',
      'AppSetting lưu cấu hình dạng khoá–giá trị, nên thêm cấu hình mới không phải sửa bảng.',
    ],
    map: [
      ['AuditLog', 'audit_logs', 'audit(), /api/audit-logs'],
      ['AppSetting', 'app_settings', 'readSettings(), writeSettings()'],
      ['NetworkLockEvent', 'network_lock_events', 'server/network-lock.ts, /api/network-lock'],
    ],
  },
];

const ENUMS = [
  ['RentalStatus', 'Trạng thái đơn thuê', 'D', 'RESERVED, ACTIVE, COMPLETED, EXPIRED, CANCELLED'],
  ['DeviceStatus', 'Trạng thái máy', 'C', 'AVAILABLE, RESERVED, RENTED, MAINTENANCE, OFFLINE, RETIRED'],
  ['TransactionKind', 'Loại bút toán', 'D', 'DEPOSIT, RENTAL_PAYMENT, REFUND, ADJUSTMENT'],
  ['PaymentMethod', 'Phương thức trả', 'D', 'WALLET, CASH, BANK, OTHER'],
  ['RepairStatus', 'Trạng thái phiếu sửa', 'C', 'REPORTED, IN_PROGRESS, DONE, UNREPAIRABLE, CANCELLED'],
  ['MovementKind', 'Loại xuất nhập kho', 'C', 'PURCHASE, CONSUME, RETURN, ADJUST'],
  ['RequestStatus', 'Trạng thái yêu cầu', 'E', 'PENDING, APPROVED, REJECTED, CANCELLED'],
  ['TicketStatus', 'Trạng thái ticket', 'E', 'OPEN, WAITING_CUSTOMER, RESOLVED, CLOSED'],
  ['AdminRole', 'Vai trò quản trị', 'A', 'OWNER, STAFF'],
  ['CustomerStatus', 'Trạng thái khách', 'B', 'ACTIVE, LIMITED, BLOCKED'],
  ['DeviceType', 'Loại máy', 'C', 'PC, BOXPHONE'],
  ['PeriodUnit', 'Đơn vị kỳ thuê', 'D', 'HOUR, DAY, WEEK, MONTH'],
];

const METHODS = [
  ['Account.login()', 'POST /api/auth/login · POST /api/customer/auth/login'],
  ['Customer.deposit()', 'POST /api/customers/:id/deposit'],
  ['Rental.activate() / complete() / cancel()', 'PATCH /api/rentals/:id/status'],
  ['Rental.collectPayment()', 'POST /api/rentals/:id/payment'],
  ['Rental.refund()', 'POST /api/rentals/:id/refund'],
  ['Rental.renew()', 'POST /api/rentals/:id/renew'],
  ['BookingRequest.approve()', 'POST /api/service-desk/bookings/:id/approve'],
  ['Repair.installPart()', 'POST /api/repairs/:id/parts'],
  ['Part.purchase()', 'POST /api/parts/:id/movements'],
  ['Device.lockNetwork()', 'POST /api/network-lock/devices/:id/:action'],
];

const QA = [
  ['Vì sao số dư ví, số đã thu và tồn kho có dấu / mà không lưu thành cột?',
    'Ba con số này đều tính lại từ lịch sử: sổ bút toán và lịch sử xuất nhập kho. Lưu thêm một cột thì sớm muộn sẽ lệch với lịch sử; tính lại thì luôn khớp, và vẫn trả lời được con số đó gồm những lần nào.'],
  ['Phương thức trên sơ đồ nằm ở đâu trong code?',
    'Server viết theo kiểu handler Express, không có class TypeScript cho từng lớp. Mỗi phương thức trên sơ đồ là một endpoint, xem bảng dưới.'],
  ['Database không có bảng accounts, sao lại vẽ lớp Account?',
    'Account là lớp trừu tượng gom phần chung của hai loại tài khoản. Khi xuống database, mỗi lớp con có một bảng riêng (table per concrete class): `admins` và `customer_accounts` đều có `email`, `password_hash`, `status`.'],
  ['Khi nào dùng hợp thành, khi nào dùng liên kết thường?',
    'Hợp thành khi phần không có nghĩa nếu thiếu toàn thể và bị xoá theo: Session, CustomerNotification, RentalPeriod, TicketMessage, PartMovement. Còn lại là liên kết thường: xoá một khách hàng không được kéo theo xoá đơn thuê và sổ tiền của khách đó.'],
  ['Hai nhân viên cùng bấm thu tiền một đơn cùng lúc thì sao?',
    'Không thu vượt được. Bước đọc số đã thu, kiểm tra và ghi bút toán chạy liền một mạch vì `node:sqlite` là API đồng bộ, không có điểm chờ ở giữa. Nhóm kiểm chứng bằng cách bắn 8 yêu cầu song song vào cùng một đơn: chỉ một yêu cầu được nhận (`scripts/race-test.mjs`).'],
];

const SCHEDULE = [
  ['1', 'Tổng quan sáu nhóm lớp (Hình 0)', 'Phu', '2′'],
  ['2', 'Cách đọc ký hiệu', 'Phu', '1′'],
  ['3', 'A · Tài khoản & phân quyền', 'Vinh', '1,5′'],
  ['4', 'B · Khách hàng', 'VietAnh', '1,5′'],
  ['5', 'C · Thiết bị & sửa chữa', 'Phat', '2′'],
  ['6', 'D · Đơn thuê & tài chính (phần lõi)', 'Thanh', '3′'],
  ['7', 'E · Yêu cầu & hỗ trợ', 'Phu', '2′'],
  ['8', 'F · Vận hành hệ thống và kiểu liệt kê', 'Phat', '1,5′'],
  ['9', 'Hỏi đáp', null, '3′'],
];

/* ---- Xuất ---- */

export async function buildClassDiagram(dir) {
  const intro = [
    title('CLASS DIAGRAM'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.classDiagram, PROJECT.org, 'Tạo tài liệu']]),

    h1('I. Giới thiệu'),
    h2('1. Mục đích'),
    para('Tài liệu mô tả góc nhìn tĩnh của hệ thống Thuê Máy Hub bằng sơ đồ lớp UML: các lớp thực thể, thuộc tính, phương thức và quan hệ giữa chúng. Đây là phần chi tiết cho mục "Góc nhìn tĩnh" trong tài liệu Architecture Design.'),
    h2('2. Phạm vi'),
    para('Hệ thống có 21 lớp thực thể chia 6 nhóm nghiệp vụ, 29 quan hệ và 12 kiểu liệt kê. Mỗi lớp ứng với một bảng SQLite trong `server/database.ts`, mỗi phương thức ứng với một endpoint đang chạy, nên sơ đồ lớp khớp từng tên với tài liệu Database Design.'),
    para('Mọi lớp đều có `id`, `createdAt`, `updatedAt`; các hình lược bỏ ba thuộc tính này cho gọn.'),
    h2('3. Đối tượng đọc'),
    readersTable(READERS),

    h1('II. Cách đọc ký hiệu'),
    para('Ký hiệu UML chuẩn, dùng giống nhau ở cả bảy hình.'),
    table(['Ký hiệu', 'Ý nghĩa'], LEGEND, [32, 68]),
  ];

  const overview = [
    h1('III. Tổng quan sáu nhóm lớp'),
    figure('0-tong-quan'),
    caption('Hình 0. Sáu nhóm lớp và phụ thuộc giữa các nhóm. Nhóm D là lõi: nó nối khách hàng (B) với thiết bị (C), nhận đơn từ yêu cầu (E) và nhận khoản chi từ sửa chữa (C).'),
    label('Giải thích'),
    item('Mỗi khung là một nhóm, bên trong là tên các lớp của nhóm. Mũi tên đứt đi từ nhóm dùng tới nhóm được dùng, nhãn trên mũi tên là quan hệ cụ thể.'),
    item('Đọc theo chiều nghiệp vụ: ai đăng nhập (A), ai thuê (B), thuê cái gì (C), đơn thuê nối hai bên và ghi tiền (D), khách tự gửi yêu cầu (E), hệ thống tự ghi nhật ký và tự khoá máy (F).'),
    item('Mọi mũi tên quan trọng đều đi qua nhóm D, vì cho thuê là nghiệp vụ chính của tiệm.'),
    table(['Nhóm', 'Các lớp', 'Hình'],
      GROUPS.map((g, i) => [`${g.key} · ${g.name}`, g.classes, `Hình ${i + 1}`]), [32, 52, 16]),
  ];

  // Tiêu đề mục IV đứng cùng trang với nhóm đầu tiên; các nhóm sau mỗi nhóm một trang mới.
  const details = [chapterHeading('IV. Chi tiết từng nhóm lớp')];
  GROUPS.forEach((g, i) => {
    const heading = `${i + 1}. Nhóm ${g.key} — ${g.name}`;
    details.push(
      i === 0 ? h2(heading) : groupHeading(heading),
      figure(g.file),
      caption(g.caption),
      label('Giải thích'),
      ...g.points.map(item),
      label('Lớp ↔ bảng ↔ nơi hiện thực'),
      table(['Lớp', 'Bảng', 'Hiện thực ở'], g.map, [24, 26, 50]),
    );
  });

  const tail = [
    h1('V. Kiểu liệt kê'),
    para('Mười hai kiểu dùng cho các thuộc tính trạng thái. Đây cũng là đầu vào nếu cần vẽ thêm sơ đồ trạng thái cho đơn thuê hay phiếu sửa.'),
    table(['Kiểu', 'Ý nghĩa', 'Nhóm', 'Giá trị'], ENUMS, [20, 22, 9, 49]),

    h1('VI. Câu hỏi thường gặp'),
    ...QA.flatMap(([q, a], i) => [
      h2(`${i + 1}. ${q}`),
      para(a),
      ...(i === 1 ? [table(['Phương thức', 'Endpoint'], METHODS, [38, 62])] : []),
    ]),

    h1('Phụ lục A. Thứ tự thuyết trình gợi ý'),
    para('Người trình bày gợi ý theo phần việc mỗi bạn đã làm; tổng khoảng 17,5 phút.'),
    table(['STT', 'Nội dung', 'Người trình bày', 'Thời gian'],
      SCHEDULE.map(([n, what, who, t]) => [n, what, who ? member(who).name : 'Cả nhóm', t]), [8, 50, 28, 14]),

    h1('Phụ lục B. File hình đi kèm'),
    para('Bảy hình nằm trong thư mục `design/class-diagram/` của dự án, dạng SVG nền trắng, chèn được vào Word hoặc PowerPoint bằng Chèn → Ảnh: `0-tong-quan.svg`, `1-tai-khoan-phan-quyen.svg`, `2-khach-hang.svg`, `3-thiet-bi-sua-chua.svg`, `4-don-thue-tai-chinh.svg`, `5-yeu-cau-ho-tro.svg`, `6-van-hanh-he-thong.svg`. File `class-diagram.mmd` chứa toàn bộ sơ đồ dạng Mermaid để chỉnh sửa.'),
  ];

  await writeDocxSections(join(dir, `3.4 SEP_${N}_ClassDiagram_Ver1.0.docx`), [
    { children: intro },
    { landscape: true, children: [...overview, ...details] },
    { children: tail },
  ]);
  return 1;
}

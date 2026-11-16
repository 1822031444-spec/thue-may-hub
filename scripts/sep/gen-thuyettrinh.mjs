/**
 * Hướng dẫn thuyết trình cho 5 thành viên: chương trình, chuẩn bị, lời nói gợi ý
 * từng phần, kịch bản demo, câu hỏi thường gặp và toàn bộ sơ đồ (mỗi hình một
 * trang ngang để chiếu thẳng hoặc chèn slide).
 *
 * Sơ đồ lấy từ design/uml (use case, tuần tự, trạng thái, hoạt động, kiến trúc) và
 * design/class-diagram (sơ đồ lớp); ảnh dự phòng lấy từ design/ui.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { member, PROJECT, roleLabel, SCRUM_MASTER, SPRINTS, TEAM } from './data.mjs';
import { BUSINESS_RULES, MODULES } from './domain.mjs';
import { STORIES } from './progress.mjs';
import { DEFECT_LOG, SPRINT_DOCS } from './sprints.mjs';
import { TASKS } from './tasks.mjs';
import { REPORT_DATE } from './gen-baocao.mjs';
import { GROUPS, LEGEND } from './gen-class.mjs';
import {
  caption, h1, h1Page, h2, h2Page, item, para, pngFigure, revisionHistory, subtitle, svgFigure, table, title, writeDocxSections,
} from './docx-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DESIGN = join(here, '..', '..', 'design');
const name = (alias) => member(alias).name;
const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0);

/* ---- Hình ------------------------------------------------------------------- */

const uml = (file) => ({ svg: join(DESIGN, 'uml', `${file}.svg`), png: join(DESIGN, 'uml', 'png', `${file}.png`) });
const cls = (file) => ({ svg: join(DESIGN, 'class-diagram', `${file}.svg`), png: join(DESIGN, 'class-diagram', 'png', `${file}.png`) });

/** Thứ tự hình = thứ tự trình bày. `key` để kịch bản gọi theo tên thay vì số. */
const FIGURES = [
  { key: 'u0', code: 'U0', ...uml('u0-tong-quat'), title: 'Use case tổng quát — mức 0', who: 'Thanh', say: 'Sơ đồ phạm vi: ba tác nhân người dùng, hai tác nhân hệ thống; mỗi elip là một cụm năng lực được mở rộng ở U1–U3.' },
  { key: 'u1', code: 'U1', ...uml('u1-khach-hang'), title: 'Use case — Khách hàng trên cổng khách', who: 'Thanh', say: 'Mở rộng nhánh Khách hàng của U0: đăng ký luôn kèm hoàn thiện hồ sơ («include»); trả ví, gia hạn, huỷ là phần mở rộng («extend»).' },
  { key: 'u2', code: 'U2', ...uml('u2-nhan-vien'), title: 'Use case — Nhân viên tại quầy', who: 'Thanh', say: 'Mở rộng nhánh Nhân viên của U0: thu tiền luôn kiểm tra số còn nợ/số dư; duyệt yêu cầu luôn sinh đơn giữ chỗ.' },
  { key: 'u3', code: 'U3', ...uml('u3-chu-he-thong'), title: 'Use case — Chủ hệ thống', who: 'Thanh', say: 'Mở rộng nhánh riêng của Chủ trong U0; Chủ kế thừa Nhân viên, còn STAFF gọi các API nhạy cảm bị chặn 403.' },
  { key: 'ar', code: 'AR1', ...uml('ar1-kien-truc'), title: 'Kiến trúc triển khai', who: 'Thanh', say: 'Không phải use case: AR1 chỉ ra U0–U3 được hiện thực ở ba giao diện, một backend Express, một file SQLite và các hệ thống ngoài.' },
  { key: 's1', code: 'S1', ...uml('s1-dang-nhap'), title: 'Tuần tự — Đăng nhập chung cho ba vai trò', who: 'Thanh', say: 'Chi tiết trình tự của use case Đăng nhập trong U0/U1/U2: tìm quản trị trước, không có mới tìm khách; phiên dùng cookie HttpOnly.' },
  { key: 's2', code: 'S2', ...uml('s2-yeu-cau-thue'), title: 'Tuần tự — Từ yêu cầu thuê tới lúc duyệt', who: 'Thanh', say: 'Chi tiết tương tác nối U1 và U2: duyệt là một transaction tạo đơn, đóng yêu cầu và giữ máy.' },
  { key: 's3', code: 'S3', ...uml('s3-giao-may-thu-tien'), title: 'Tuần tự — Giao máy và thu tiền', who: 'Thanh', say: 'Chi tiết sau U2: server chặn thu vượt số còn nợ và chặn trừ ví khi ví không đủ.' },
  { key: 'c0', code: 'C0', ...cls('0-tong-quan'), title: 'Sơ đồ lớp — tổng quan sáu nhóm lớp', who: 'Phat', say: 'Góc nhìn dữ liệu của các use case: 21 lớp, 6 nhóm; nhóm D là lõi nối khách, máy và tiền.' },
  { key: 'c4', code: 'C4', ...cls('4-don-thue-tai-chinh'), title: 'Sơ đồ lớp — Đơn thuê & tài chính', who: 'Phat', say: 'Hiện thực dữ liệu cho tạo đơn, gia hạn, thu/hoàn tiền: bút toán chỉ thêm; số đã thu tính lại từ lịch sử.' },
  { key: 'st', code: 'ST1', ...uml('st1-don-thue'), title: 'Trạng thái — Vòng đời đơn thuê', who: 'Phat', say: 'Không phải sơ đồ lớp: mô tả trạng thái của Rental theo thời gian và tác động sang trạng thái máy/mạng.' },
  { key: 'a1', code: 'A1', ...uml('a1-quy-trinh-thue'), title: 'Hoạt động — Quy trình thuê máy', who: 'VietAnh', say: 'Gộp các use case U1 và U2 thành quy trình đầu-cuối qua ba làn: khách, nhân viên, hệ thống.' },
  { key: 'a2', code: 'A2', ...uml('a2-khoa-mang'), title: 'Hoạt động — Bộ quét khoá mạng mỗi phút', who: 'Phu', say: 'Chi tiết use case tự khoá trong U3: chỉ chạy lệnh khi IP/mã máy đúng khuôn; lỗi không báo khoá giả.' },
  { key: 'c1', code: 'C1', ...cls('1-tai-khoan-phan-quyen'), title: 'Sơ đồ lớp — Tài khoản & phân quyền (dự phòng)', who: 'Phat', say: 'Dữ liệu cho đăng nhập/phân quyền trong U0–U3: Account, Admin, CustomerAccount, Session.' },
  { key: 'c2', code: 'C2', ...cls('2-khach-hang'), title: 'Sơ đồ lớp — Khách hàng (dự phòng)', who: 'Phat', say: 'Dữ liệu cho nhánh khách U1 và quản lý khách U2: hồ sơ, số dư ví dẫn xuất, thông báo.' },
  { key: 'c3', code: 'C3', ...cls('3-thiet-bi-sua-chua'), title: 'Sơ đồ lớp — Thiết bị & sửa chữa (dự phòng)', who: 'Phat', say: 'Dữ liệu cho máy và sửa chữa trong U2: trạng thái máy, tồn kho, giá vốn, phiếu sửa.' },
  { key: 'c5', code: 'C5', ...cls('5-yeu-cau-ho-tro'), title: 'Sơ đồ lớp — Yêu cầu & hỗ trợ (dự phòng)', who: 'Phat', say: 'Dữ liệu nối U1 với U2: yêu cầu thuê, gia hạn, ticket và tin nhắn.' },
  { key: 'c6', code: 'C6', ...cls('6-van-hanh-he-thong'), title: 'Sơ đồ lớp — Vận hành hệ thống (dự phòng)', who: 'Phat', say: 'Dữ liệu cho cấu hình và tự động hoá U3: nhật ký thao tác, cấu hình, nhật ký khoá mạng.' },
];
const fig = Object.fromEntries(FIGURES.map((f, i) => [f.key, `Hình ${i + 1} [${f.code}]`]));
const figs = (...keys) => keys.map((k) => fig[k]).join(', ');

/** Số hình ở Báo cáo tiến độ sau khi đồng bộ năm hình đầu với tài liệu này. */
const REPORT_FIGURE = {
  u0: 1, u1: 2, u2: 3, u3: 4, ar: 5,
  c0: 12, c1: 13, c2: 14, c3: 15, c4: 16, c5: 17, c6: 18,
};
const CROSS_NOTE = {
  u0: 'Sơ đồ phạm vi, cố ý gom chức năng; không dùng để kể luồng chi tiết.',
  u1: 'Chỉ việc khách tự làm; không lẫn thao tác duyệt của nhân viên.',
  u2: 'Chỉ nghiệp vụ tại quầy; không lẫn quyền riêng của chủ.',
  u3: 'Chỉ quyền nhạy cảm của chủ; Chủ vẫn kế thừa toàn bộ U2.',
  ar: 'Kiến trúc trả lời “chạy ở đâu”, không trả lời “ai làm gì”.',
  c0: 'Tổng quan nhóm lớp, không phải luồng thao tác hay trạng thái.',
  c1: 'Lớp đăng nhập và phiên; liên quan U0–U3.',
  c2: 'Lớp hồ sơ khách và thông báo; liên quan U1/U2.',
  c3: 'Lớp máy, sửa chữa, linh kiện; liên quan U2.',
  c4: 'Lớp lõi đơn thuê và tiền; liên quan U1/U2/U3.',
  c5: 'Lớp yêu cầu thuê, gia hạn, ticket; nối U1 với U2.',
  c6: 'Lớp cấu hình và nhật ký; liên quan vận hành U3.',
};
const COMMON_FIGURE_KEYS = ['u0', 'u1', 'u2', 'u3', 'ar', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const FIGURE_CROSSWALK = COMMON_FIGURE_KEYS.map((key) => {
  const f = FIGURES.find((x) => x.key === key);
  const guideNo = FIGURES.indexOf(f) + 1;
  return [f.code, `Hình ${guideNo}`, `Hình ${REPORT_FIGURE[key]}`, f.title, CROSS_NOTE[key]];
});

const FIRST_FIVE_GUIDE = [
  ['U0 · Hình 1', 'Hệ thống phục vụ ai và có những cụm năng lực nào?', 'Nêu 3 vai người dùng, 2 tác nhân hệ thống; Chủ kế thừa Nhân viên. Mỗi elip là cụm, chưa phải luồng chi tiết.', 'Chuyển sang U1–U3 để mở rộng; không đọc U0 như danh sách đầy đủ từng nút.'],
  ['U1 · Hình 2', 'Khách hàng tự làm gì trên cổng khách?', 'Đăng ký/hoàn thiện hồ sơ, xem máy, gửi và theo dõi yêu cầu, trả ví, gia hạn, ticket, thông báo.', 'Duyệt yêu cầu không nằm ở U1; đó là trách nhiệm Nhân viên trong U2.'],
  ['U2 · Hình 3', 'Nhân viên vận hành giao dịch tại quầy thế nào?', 'Quản lý khách/máy, tạo hoặc duyệt đơn, giao máy, thu tiền, gia hạn, sửa chữa, hỗ trợ.', 'Tài chính tổng hợp, nhân sự, sao lưu và cấu hình khoá mạng không thuộc STAFF; xem U3.'],
  ['U3 · Hình 4', 'Chủ có thêm quyền gì so với Nhân viên?', 'Nạp/hoàn tiền, sổ tài chính, chi phí, linh kiện, nhân viên, báo cáo, khoá mạng, sao lưu, Telegram.', 'U3 chỉ vẽ phần bổ sung; Chủ vẫn làm được toàn bộ U2 nhờ quan hệ kế thừa.'],
  ['AR1 · Hình 5', 'Các use case được hiện thực và triển khai ở đâu?', 'Ba giao diện gọi cùng backend Express; SQLite lưu dữ liệu; tác vụ nền gọi Telegram và máy cho thuê.', 'AR1 là kiến trúc, không phải use case; không dùng từ include/extend khi giải thích hình này.'],
];

const GUIDE_ONLY_FIGURES = [
  ['S1 · Hình 6', 'Chi tiết trình tự đăng nhập chung', 'Mở rộng use case Đăng nhập trong U0/U1/U2', 'Báo cáo chỉ mô tả đăng nhập ở bảng tiến độ và U0–U2, không chèn riêng S1.'],
  ['S2 · Hình 7', 'Chi tiết khách gửi yêu cầu đến nhân viên duyệt', 'Nối U1 (khách gửi) với U2 (nhân viên duyệt)', 'Không phải use case mới; đây là thứ tự gọi giữa giao diện, API và database.'],
  ['S3 · Hình 8', 'Chi tiết giao máy và thu tiền', 'Mở rộng U2; dữ liệu nằm ở C4', 'Không nhầm với C4: S3 nói thứ tự theo thời gian, C4 nói cấu trúc dữ liệu.'],
  ['ST1 · Hình 11', 'Vòng đời đơn thuê', 'Mở rộng trạng thái của Rental trong C4', 'Không phải quy trình toàn hệ thống; chỉ theo dõi một đơn đổi trạng thái.'],
  ['A1 · Hình 12', 'Quy trình thuê máy đầu-cuối', 'Gộp U1 và U2 qua ba làn Khách–Nhân viên–Hệ thống', 'Dùng dẫn vào demo; không đọc như Class Diagram.'],
  ['A2 · Hình 13', 'Quy trình bộ quét khoá mạng', 'Mở rộng use case tự khoá trong U3; dữ liệu nhật ký ở C6', 'Chỉ nói kiểm tra điều kiện và nhánh thành công/thất bại.'],
];

/* ---- Nội dung ---------------------------------------------------------------- */

const points = TEAM.map((m) => sum(TASKS.filter((t) => t.who === m.alias), (t) => t.points));
const sprint3 = SPRINT_DOCS.find((s) => s.no === 3);
const testCount = new Set(sprint3.tests.flatMap((r) => r.files)).size;
const checkCount = sum(sprint3.tests, (r) => r.checks);
const fnCount = sum(MODULES, (m) => m.functions.length);

/** Các phần thuyết trình: người nói, thời lượng, hình dùng, ý chính, câu chuyển. */
const PARTS = [
  {
    title: 'Mở đầu', who: ['Phu'], min: 2, figures: 'Trang bìa',
    say: [
      `Chào thầy/cô, giới thiệu nhóm ${PROJECT.memberCount} người và vai trò: ${TEAM.map((m) => `${m.name} (${roleLabel(m)})`).join('; ')}.`,
      '**Bài toán:** tiệm cho thuê PC và boxphone ghi sổ tay và Excel rời rạc, nên không biết chắc máy nào đang cho ai thuê, đã thu bao nhiêu, máy nào đang lỗ vì sửa chữa.',
      '**Sản phẩm:** Thuê Máy Hub quản lý kho máy, khách hàng, đơn thuê, dòng tiền, sửa chữa; khách tự đặt thuê qua cổng khách; máy tự khoá mạng khi hết hạn thuê.',
      `**Cách làm:** Scrum ${SPRINTS.length} sprint × 3 tuần (${SPRINTS[0].from} – ${SPRINTS[3].to}), quản lý việc trên Jira, thiết kế giao diện trên Figma.`,
    ],
    next: 'Thành sẽ trình bày hệ thống làm được những gì qua sơ đồ use case.',
  },
  {
    title: 'Yêu cầu và use case', who: ['Thanh'], min: 4, figures: figs('u0', 'u1', 'u2', 'u3'),
    say: [
      `${fig.u0}: ba tác nhân chính. **Mũi tên tam giác** từ Chủ hệ thống tới Nhân viên nghĩa là chủ làm được mọi việc của nhân viên. Hai tác nhân hệ thống: Bộ hẹn giờ (khoá mạng mỗi phút, nhắc hạn) và Telegram.`,
      `${fig.u1}: Đăng ký **«include»** Hoàn thiện hồ sơ — khách mới bắt buộc nhập CCCD và địa chỉ. Gửi yêu cầu thuê **«extend»** Xem máy trống: chỉ xảy ra khi khách bấm gửi.`,
      `${fig.u2}: Thu tiền «include» kiểm tra số còn nợ và số dư ví (BR.03, BR.06). Duyệt yêu cầu «include» sinh đơn giữ chỗ.`,
      `${fig.u3}: phần riêng của chủ — tài chính, nhân viên, khoá mạng. Nhân viên gọi thẳng các API này vẫn bị server chặn 403.`,
      `Số liệu: ${fnCount} chức năng trong ${MODULES.length} nhóm, ${STORIES.length} user story, ${BUSINESS_RULES.length} quy tắc nghiệp vụ.`,
    ],
    next: 'Các chức năng này chạy trên kiến trúc như sau.',
  },
  {
    title: 'Kiến trúc và luồng xử lý', who: ['Thanh'], min: 3, figures: figs('ar', 's1', 's2', 's3'),
    say: [
      `${fig.ar}: một backend Express phục vụ cả ba giao diện; dữ liệu là một file SQLite trên máy của tiệm; tác vụ nền tự khoá mạng, nhắc hạn, sao lưu.`,
      `${fig.s1}: một màn đăng nhập cho ba vai. Server tìm tài khoản quản trị theo email hoặc username trước, không có mới tìm khách theo email hoặc số điện thoại. Phiên lưu bằng cookie HttpOnly, mật khẩu băm scrypt.`,
      `${fig.s2} và ${fig.s3}: khách gửi yêu cầu → nhân viên duyệt (tạo đơn, đóng yêu cầu, giữ máy trong **một transaction**) → giao máy → thu tiền.`,
      '**Ý chính:** mọi kiểm tra về tiền đều làm ở server — không thu vượt số còn nợ, không trừ ví khi ví không đủ — nên sửa giao diện cũng không lách được.',
    ],
    next: 'Phát trình bày dữ liệu được tổ chức thế nào.',
  },
  {
    title: 'Thiết kế dữ liệu', who: ['Phat'], min: 4, figures: `${figs('c0', 'c4', 'st')} (${figs('c1', 'c2', 'c3', 'c5', 'c6')} khi được hỏi)`,
    say: [
      `${fig.c0}: 21 lớp chia 6 nhóm; 20 lớp cụ thể ánh xạ vào 21 bảng SQLite. Account là lớp trừu tượng không có bảng riêng; Session bao quát hai bảng phiên. Nhóm D (Đơn thuê & tài chính) là lõi nối khách, máy và tiền.`,
      `${fig.c4}: mỗi đơn có đúng 1 khách, 1 máy; mỗi lần gia hạn là một kỳ thuê riêng. Bút toán ghi ba giá trị cash, wallet, revenue và chỉ được thêm. Ví dụ: khách nạp 1.000.000 đ ghi cash +1.000.000, wallet +1.000.000; trả đơn 300.000 đ bằng ví ghi wallet −300.000, revenue +300.000.`,
      '**Thuộc tính dẫn xuất** (dấu /): số dư ví, số đã thu, tồn kho không lưu thành cột mà tính lại từ lịch sử, nên không bao giờ lệch.',
      `${fig.st}: Giữ chỗ → Đang thuê → Hoàn tất hoặc Hết hạn; chỉ huỷ được khi chưa thu đồng nào (BR.05). Trạng thái máy đổi theo đơn; trạng thái mạng chạy song song.`,
      'Giao diện mới thêm 6 cột (`username`, `address`, `identity_number`, `category`, `location`, `priority`). Server tự thêm cột khi khởi động (`ensureColumn`), database cũ không mất dữ liệu.',
    ],
    next: 'Việt Anh và Phát demo trực tiếp.',
  },
  {
    title: 'Demo sản phẩm', who: ['VietAnh', 'Phat'], min: 6, figures: `${fig.a1}, mục V`,
    say: [
      `Mở ${fig.a1} khoảng 30 giây: quy trình thuê đi qua ba làn khách hàng, nhân viên, hệ thống.`,
      'Demo theo bảng ở mục V: Việt Anh làm phần quản trị (bước 1–5), Phát làm phần nhân viên và khách (bước 6–10), Việt Anh khép vòng ở bước 11.',
      'Vừa thao tác vừa nói điều người xem cần thấy (cột “Cần thấy”), không đọc to từng nút bấm.',
    ],
    next: 'Phú nói về tính năng tự khoá mạng — phần nhóm chú ý an toàn nhất.',
  },
  {
    title: 'Điểm kỹ thuật: khoá mạng an toàn', who: ['Phu'], min: 2, figures: fig.a2,
    say: [
      'Mỗi 60 giây, bộ quét tìm máy có đơn đang thuê đã quá hạn quá thời gian ân hạn chủ cấu hình (BR.16).',
      'Câu lệnh do chủ tiệm tự khai; hệ thống **chỉ thay {ip} và {code}**, giá trị phải đúng khuôn, sai khuôn thì từ chối chạy — không chèn được lệnh khác (BR.15).',
      'Lệnh lỗi thì ghi FAILED và giữ trạng thái mở: màn hình **không bao giờ báo khoá giả**. Gia hạn xong, vòng quét kế tiếp tự mở lại.',
    ],
    next: 'Vinh trình bày cách nhóm kiểm thử.',
  },
  {
    title: 'Kiểm thử và chất lượng', who: ['Vinh'], min: 3, figures: 'Test Report Sprint 3, Defect Report Sprint 3',
    say: [
      'Sprint 1 viết test case tay cho 3 chức năng đại diện; từ Sprint 2 mỗi chức năng có một bài test tự động, chạy lại bằng một lệnh `npm run test:…`.',
      `Lần chạy toàn bộ ngày ${REPORT_DATE}: **${testCount} bài, ${checkCount} điểm kiểm tra, đạt hết**. Cả dự án phát hiện ${DEFECT_LOG.length} lỗi, đã sửa hết, mỗi lỗi có bài test canh giữ.`,
      'Kể hai lỗi: DF.01 — bấm “Xác nhận thu” hai lần làm đơn bị thu hai lần; DF.13 — bài test nhắc hạn chỉ lỗi khi chạy sau 18 giờ. Bài học: test không được phụ thuộc giờ chạy.',
      'Còn thời gian thì chạy trực tiếp `npm run test:hub` (40 bước, khoảng 2 giây) theo phụ lục A.',
    ],
    next: 'Phú tổng kết phần quản lý dự án.',
  },
  {
    title: 'Quản lý dự án và kết luận', who: ['Phu'], min: 2, figures: 'Jira: Backlog, Board, Reports',
    say: [
      'Jira: Backlog đủ 3 sprint, Board của Sprint 3, lọc theo nhãn tên để xem việc từng người; thiết kế Figma gắn vào Jira.',
      `Chia việc đều: mỗi người ${Math.min(...points)}–${Math.max(...points)} story point; ai nắm phần nào xem Báo cáo tiến độ mục 7.`,
      'Bài học từ Retrospective: phân trang ngay từ đầu, ghép giao diện với API sớm, test không phụ thuộc giờ.',
      'Hướng phát triển: bản desktop dùng giao diện mới, thanh toán trực tuyến, nhiều chi nhánh. Cảm ơn thầy/cô, mời đặt câu hỏi.',
    ],
    next: null,
  },
];

const PREPARE = [
  ['Chạy `npm run hub:reset`, rồi `npm run hub:start`; mở http://127.0.0.1:8789', name('VietAnh'), 'Trước 30 phút'],
  ['Mở sẵn ba trình duyệt riêng cho ba vai: Edge thường (chủ), Edge InPrivate (nhân viên), Chrome hoặc hồ sơ Edge khác (khách). Một trình duyệt chỉ giữ một vai: đăng nhập vai này sẽ đăng xuất vai kia', `${name('VietAnh')}, ${name('Phat')}`, 'Trước 15 phút'],
  ['Mở Jira (Backlog, Board Sprint 3, Reports) và Figma', name('Phu'), 'Trước 15 phút'],
  ['Mở file PDF này ở mục VIII để chiếu sơ đồ, hoặc chèn hình từ `design/uml` và `design/class-diagram` vào slide', name('Thanh'), 'Trước buổi'],
  ['Mở terminal ở thư mục dự án cho phần kiểm thử', name('Vinh'), 'Trước 15 phút'],
  ['Phóng to trình duyệt 125%, tắt thông báo, cắm sạc máy chiếu demo', 'Cả nhóm', 'Trước 10 phút'],
  ['Đọc lại mục VI, mỗi người nắm các câu hỏi thuộc phần mình', 'Cả nhóm', 'Hôm trước'],
];

const ACCOUNTS = [
  ['Chủ hệ thống', '`admin` hoặc `admin@thuemayhub.com`', '`demo123`', `${name('Phu')} — thấy đủ menu`],
  ['Nhân viên', '`phat`, `thanh`, `vinh`, `anh`', '`demo123`', 'Không thấy Ví khách, Linh kiện, Nhân viên, Báo cáo, Cài đặt'],
  ['Khách hàng', '`0902345678` hoặc `minhanh@email.com`', '`demo123`', 'Nguyễn Minh Anh, ví 1.250.000 đ'],
];

const DEMO = [
  ['1', 'VietAnh', 'Mở http://127.0.0.1:8789', 'Màn đăng nhập chung, có Đăng nhập và Đăng ký'],
  ['2', 'VietAnh', 'Đăng nhập `admin` / `demo123`', 'Dashboard: máy còn trống, đơn cần chú ý, đã thu thực tế; menu Đơn thuê có số 1 (một yêu cầu chờ duyệt)'],
  ['3', 'VietAnh', 'Đơn thuê → yêu cầu TMH-1023 của Phạm Gia Huy (PC Gaming RTX 3060, 3 ngày) → Duyệt → Duyệt', 'Thông báo “Đã duyệt, tạo đơn …”; đơn mới ở trạng thái Đã xác nhận'],
  ['4', 'VietAnh', 'Trên đơn vừa tạo bấm Giao máy', 'Đơn chuyển Đang thuê, máy chuyển Đang thuê'],
  ['5', 'VietAnh', 'Ví khách → Nạp ví cho Nguyễn Minh Anh 200.000 đ', 'Số dư 1.250.000 đ thành 1.450.000 đ'],
  ['6', 'Phat', 'Trình duyệt thứ hai: đăng nhập `phat` / `demo123`', 'Khu vực nhân viên; menu không có Ví khách, Linh kiện, Nhân viên, Báo cáo, Cài đặt (BR.14)'],
  ['7', 'Phat', 'Thanh toán → Thu tiền 100.000 đ cho một đơn còn nợ', '“Đã ghi nhận thu tiền.”, phiếu thu mới ở đầu danh sách'],
  ['8', 'Phat', 'Trình duyệt thứ ba: đăng nhập `0902345678` / `demo123`', '“Xin chào, Nguyễn Minh Anh”, tab Máy trống'],
  ['9', 'Phat', 'Gửi yêu cầu thuê một máy → Gửi yêu cầu', 'Chuyển sang tab Đơn của tôi, yêu cầu chờ duyệt kèm giá tạm tính'],
  ['10', 'Phat', 'Tab Ví tiền', 'Số dư 1.450.000 đ, khớp với lần nạp ở bước 5'],
  ['11', 'VietAnh', 'Quay lại trình duyệt của chủ, chờ tối đa 20 giây (tự làm mới)', 'Menu Đơn thuê hiện yêu cầu khách vừa gửi — khép vòng'],
  ['12', 'Phat', '(Tuỳ chọn) Đăng xuất khách → Đăng ký số điện thoại mới → nhập CCCD `12ab`', 'Báo lỗi CCCD phải có 9–12 chữ số; nhập đúng thì vào được cổng'],
];

const QA = [
  ['Vì sao chọn SQLite mà không phải MySQL hay PostgreSQL?', 'Tiệm chạy trên một máy, không phải cài server cơ sở dữ liệu; cả dữ liệu là một file, sao lưu bằng cách chụp bản sao (VACUUM INTO). `node:sqlite` chạy đồng bộ nên đọc–kiểm tra–ghi tiền không bị chen ngang. Mở nhiều chi nhánh thì chuyển sang PostgreSQL và bọc thao tác tiền vào transaction — bài race-test sẽ báo nếu quên.', 'Thanh, Phat'],
  ['Hai nhân viên bấm thu tiền cùng một đơn cùng lúc thì sao?', 'Không thu vượt được. Bài `race-test` bắn 8 yêu cầu song song vào cùng một đơn: chỉ đúng 1 yêu cầu được nhận, ví không bao giờ âm.', 'Thanh'],
  ['Vì sao số dư ví không lưu thành một cột?', 'Lưu cột thì sớm muộn lệch với lịch sử. Tính lại từ sổ bút toán thì luôn khớp, và trả lời được con số đó gồm những lần nạp, trả nào.', 'Phat'],
  ['Mật khẩu và phiên đăng nhập bảo vệ thế nào?', 'Mật khẩu băm scrypt kèm salt, không lưu dạng đọc được. Phiên là cookie HttpOnly nên JavaScript trên trang không đọc được; đăng nhập vai này thì phiên vai kia bị huỷ.', 'Thanh'],
  ['Phân quyền chỉ là ẩn menu thôi à?', 'Không. Server kiểm tra quyền ở từng API (`requirePermission`); nhân viên gọi thẳng API tài chính vẫn bị chặn 403. Bài `permission-smoke-test` kiểm 35 điểm.', 'Thanh'],
  ['Lệnh khoá mạng có bị lợi dụng chạy lệnh khác không?', 'Không. Hệ thống chỉ thay {ip} và {code}, giá trị phải khớp biểu thức chính quy; IP chứa ký tự lạ bị từ chối. Bài `network-lock-smoke-test` thử chèn lệnh và xác nhận bị chặn.', 'Phu'],
  ['«include» khác «extend» thế nào?', '«include» luôn xảy ra (thu tiền nào cũng kiểm tra số còn nợ). «extend» chỉ xảy ra khi có điều kiện (xuất CSV chỉ khi chủ bấm xuất). Mũi tên «extend» chỉ về use case gốc.', 'Thanh'],
  ['Sơ đồ lớp khớp với database ra sao?', 'Mỗi lớp là một bảng, mỗi phương thức là một endpoint. Account là lớp trừu tượng: xuống database thành hai bảng `admins` và `customer_accounts`.', 'Phat'],
  ['Vì sao có hai giao diện?', 'Giao diện mới theo Figma (US.27) được thêm giữa Sprint 3 và dùng chung backend. Bản desktop vẫn đóng gói giao diện thế hệ đầu; chuyển sang giao diện mới là bước tiếp theo.', 'VietAnh'],
  ['Kiểm thử bao nhiêu, làm sao biết đủ?', `${testCount} bài test tự động, ${checkCount} điểm kiểm tra; mỗi user story có ít nhất một bài, mỗi lỗi đã gặp có bài canh giữ. Chức năng tiền bắt buộc có ca biên và ca bấm hai lần.`, 'Vinh'],
  ['Lỗi đáng nhớ nhất?', 'DF.01: bấm “Xác nhận thu” hai lần làm đơn bị thu hai lần — sửa bằng khoá nút và kiểm tra số còn nợ ở server. DF.13: bài test chỉ lỗi sau 18 giờ vì cộng cứng 6 giờ cho đơn “hôm nay”.', 'Vinh'],
  ['Nhóm áp dụng Scrum thế nào?', '4 sprint × 3 tuần; Sprint Planning tạo backlog trên Jira; họp daily ngắn; cuối sprint có Test Report, nghiệm thu và Retrospective. Việc chưa xong chuyển sprint sau (T.13 từ Sprint 1 sang Sprint 2).', 'Phu'],
  ['Chia việc có đều không, ai làm gì?', `Mỗi người ${Math.min(...points)}–${Math.max(...points)} story point. Thành, Phú: Backend (Phú kiêm UX/UI); Việt Anh: Frontend; Phát: Database và Frontend; Vinh: Tester. Mỗi file mã nguồn đều thuộc một việc có tên người làm trên Jira.`, 'Phu'],
  ['Mất dữ liệu thì sao?', 'Sao lưu tự động theo lịch, giữ số bản do chủ chọn; đã diễn tập phục hồi bằng script. Bài `backup-test` kiểm 21 điểm: bản sao mở lại được, đủ dữ liệu.', 'Phat'],
  ['Hạn chế và hướng phát triển?', 'Bản desktop chưa dùng giao diện mới; chưa có thanh toán trực tuyến; chưa hỗ trợ nhiều chi nhánh. Hướng tiếp: đóng gói giao diện mới, cổng thanh toán, chuyển PostgreSQL.', 'Phu'],
];

const COMMANDS = [
  ['`npm run hub`', 'Bản phát triển: giao diện cổng 5274, API cổng 8789'],
  ['`npm run hub:start`', 'Bản dựng, một cổng 8789 (dùng khi demo)'],
  ['`npm run hub:reset`', 'Đưa dữ liệu demo về ban đầu — dừng server trước'],
  ['`npm run test:hub`', 'Kiểm thử API giao diện mới, 40 bước — cần dữ liệu sạch'],
  ['`npm run test:hub-ui`', 'Chạy thử 4 vai trên Edge, chụp 12 ảnh — cần dữ liệu sạch'],
  ['`npm run sep`, `sep:uml`, `sep:pdf`', 'Sinh lại tài liệu, sơ đồ, bản PDF'],
];

const TROUBLE = [
  ['Không còn yêu cầu chờ duyệt (đã duyệt lúc tập)', 'Dừng server (Ctrl+C), `npm run hub:reset`, `npm run hub:start`'],
  ['Đăng nhập vai này thì vai kia bị đăng xuất', 'Mỗi vai một trình duyệt riêng (xem mục III)'],
  ['`test:hub` báo FAIL ở “Danh sách phiếu thu” hoặc “Có yêu cầu chờ duyệt”', 'Dữ liệu đã bị demo thay đổi: dừng server, reset, chạy lại server rồi chạy test'],
  ['Reset báo file database đang được dùng', 'Server vẫn chạy: dừng server trước rồi mới reset'],
  ['Cổng 8789 đang bận', 'Đóng terminal cũ còn chạy server, hoặc tắt tiến trình node rồi chạy lại'],
  ['Máy hoặc mạng lỗi giữa buổi', 'Chiếu ảnh dự phòng ở phụ lục C và nói theo bảng demo'],
];

const BACKUP_SHOTS = [
  ['1-dang-nhap', 'Màn đăng nhập chung'],
  ['2-admin-tong-quan', 'Dashboard của chủ hệ thống'],
  ['3-admin-don-thue', 'Danh sách đơn thuê, có yêu cầu chờ duyệt'],
  ['4-admin-duyet', 'Hộp thoại duyệt yêu cầu thuê'],
  ['5-admin-vi', 'Ví khách sau khi nạp'],
  ['6-admin-linh-kien', 'Kho linh kiện'],
  ['7-admin-bao-cao', 'Báo cáo doanh thu'],
  ['8-nhanvien-thanh-toan', 'Nhân viên: lịch sử thu tiền, menu bị giới hạn'],
  ['9-khach-may-trong', 'Khách: máy trống'],
  ['10-khach-don', 'Khách: đơn và yêu cầu của tôi'],
  ['11-khach-vi', 'Khách: ví tiền'],
  ['12-ho-so', 'Khách mới: hoàn thiện hồ sơ'],
];

/** Bảng nối phần trình diễn nghiệp vụ với nhóm lớp để giải thích Class Diagram có ngữ cảnh. */
const CLASS_USE_CASE_TRACE = [
  ['Đăng nhập chung và phân quyền', 'A + B', 'Account, Admin, CustomerAccount, Session, Customer', 'Xác thực đúng loại tài khoản, tạo phiên và giới hạn dữ liệu theo người dùng.'],
  ['Khách gửi yêu cầu, nhân viên duyệt', 'B + C + D + E', 'Customer, Device, BookingRequest, Rental, RentalPeriod', 'Duyệt yêu cầu tạo đơn giữ chỗ và đổi trạng thái máy trong cùng một giao dịch.'],
  ['Thu tiền hoặc trả bằng ví', 'B + D', 'Customer, Rental, FinancialTransaction', 'Số dư ví và số đã thu được tính từ bút toán, không lưu hai con số dễ sai lệch.'],
  ['Gia hạn và hỗ trợ', 'B + D + E', 'RentalPeriod, ExtensionRequest, SupportTicket, TicketMessage, CustomerNotification', 'Chỉ yêu cầu được duyệt mới đổi kỳ thuê; trao đổi và thông báo được lưu đầy đủ.'],
  ['Sửa chữa, lắp linh kiện', 'C + D', 'Device, Repair, Part, PartMovement, Expense', 'Lịch sử xuất nhập tạo tồn kho; mua linh kiện và tiền công tạo khoản chi.'],
  ['Khoá mạng máy quá hạn', 'C + D + F', 'Device, Rental, AppSetting, NetworkLockEvent, AuditLog', 'Bộ quét đọc hạn thuê và cấu hình, chạy lệnh an toàn rồi ghi cả kết quả thành công lẫn thất bại.'],
];

const CLASS_QA = [
  ['Vì sao sơ đồ có lớp nhưng code server không khai báo `class` TypeScript?', 'Đây là lớp phân tích/thiết kế. Các lớp cụ thể chủ yếu ánh xạ sang bảng dữ liệu và nhóm trách nhiệm; Account là lớp trừu tượng, còn Session bao quát hai bảng phiên. Server hiện thực hành vi bằng Express handler; phương thức trên sơ đồ ánh xạ sang endpoint hoặc hàm nghiệp vụ.'],
  ['Vì sao Account là lớp trừu tượng nhưng database không có bảng `accounts`?', 'Account gom hành vi chung như băm và kiểm tra mật khẩu. Hai lớp cụ thể Admin và CustomerAccount lưu ở hai bảng riêng vì chúng có vòng đời và quyền khác nhau.'],
  ['Dấu `/` trước walletBalance, paidAmount hoặc stock nghĩa là gì?', 'Đó là thuộc tính dẫn xuất: tính từ FinancialTransaction hoặc PartMovement. Không lưu cột riêng để lịch sử và số tổng không bị lệch.'],
  ['Khi nào dùng hợp thành?', 'Dùng khi phần không có ý nghĩa nếu thiếu toàn thể: Session thuộc Account, RentalPeriod thuộc Rental, TicketMessage thuộc SupportTicket. Xoá toàn thể thì phần cũng phải mất.'],
  ['Lớp trung tâm của hệ thống là lớp nào?', 'Rental là lõi nghiệp vụ: nối đúng một Customer với đúng một Device, chứa các RentalPeriod và được FinancialTransaction tham chiếu khi thu hoặc hoàn tiền.'],
  ['Class Diagram bảo vệ quy tắc nghiệp vụ thế nào?', 'Các ghi chú nền vàng chỉ ra BR quan trọng; phương thức của lớp/endpoint kiểm tra trạng thái, số tiền, tồn kho và quyền trước khi ghi dữ liệu.'],
];

/* ---- Xuất ------------------------------------------------------------------- */

export async function buildPresentationGuide(root) {
  const total = sum(PARTS, (p) => p.min);
  const who = (aliases) => aliases.map(name).join(', ');

  const front = [
    title('HƯỚNG DẪN THUYẾT TRÌNH'),
    subtitle(PROJECT.name),
    para(`Dành cho ${PROJECT.memberCount} thành viên ${PROJECT.org} khi báo cáo đồ án với giảng viên và hội đồng.`),
    ...revisionHistory([
      ['1.0', REPORT_DATE, SCRUM_MASTER, 'Tạo tài liệu: chương trình, kịch bản, demo, hỏi đáp, bộ sơ đồ'],
      ['1.1', '29/10/2026', SCRUM_MASTER, 'Bổ sung hướng dẫn giải thích và báo cáo Class Diagram'],
      ['1.2', '29/10/2026', SCRUM_MASTER, 'Đồng bộ số hình với Báo cáo tiến độ; thêm mã U0–U3, AR1, C0–C6 và bảng chống nhầm sơ đồ'],
    ]),

    h1('I. Cách dùng tài liệu'),
    item('**Mục II** — chương trình: ai nói phần nào, bao lâu, dùng hình nào.'),
    item('**Mục III** — việc cần chuẩn bị trước buổi.'),
    item('**Mục IV** — lời nói gợi ý từng phần. Không cần học thuộc: nói theo các ý in đậm, mỗi phần kết bằng câu chuyển cho người sau.'),
    item('**Mục V** — kịch bản demo từng bước, kèm điều người xem cần thấy.'),
    item('**Mục VI** — câu hỏi hay gặp và người trả lời.'),
    item('**Mục VII** — hướng dẫn giải thích Class Diagram: cách đọc, sáu nhóm lớp, truy vết use case và câu hỏi phản biện.'),
    item('**Mục VIII** — bộ sơ đồ: mỗi hình một trang ngang, chiếu thẳng hoặc chèn slide.'),
    item('**Phụ lục** — tài khoản, lệnh, xử lý sự cố, ảnh dự phòng khi demo lỗi.'),
    h2('Quy ước đối chiếu hình với Báo cáo tiến độ'),
    para('Mỗi sơ đồ có một **mã cố định** theo tên file: U0–U3 (use case), AR1 (kiến trúc), S1–S3 (tuần tự), C0–C6 (lớp), ST1 (trạng thái), A1–A2 (hoạt động). Khi nói, luôn đọc cả số và mã, ví dụ “Hình 1, mã U0”. Nếu số hình giữa hai tài liệu khác nhau thì mã vẫn không đổi.'),
    para('Năm hình đầu đã được sắp cùng thứ tự trong cả hai tài liệu. Các sơ đồ lớp có số khác nhau vì Báo cáo tiến độ xen sáu ảnh giao diện, còn Hướng dẫn xen sơ đồ tuần tự/trạng thái/hoạt động; vì vậy phần Class Diagram phải đối chiếu bằng mã C0–C6.'),
    table(['Mã cố định', 'Trong Hướng dẫn', 'Trong Báo cáo', 'Nội dung', 'Điểm không được nhầm'], FIGURE_CROSSWALK, [10, 13, 13, 29, 35]),
    h2('Các hình chỉ có trong Hướng dẫn thuyết trình'),
    para('Các hình dưới đây không mâu thuẫn với Báo cáo tiến độ; chúng là hình đào sâu để trả lời “xử lý theo thứ tự nào” hoặc “trạng thái đổi ra sao”. Báo cáo giữ ở mức tổng hợp nên không chèn lại.'),
    table(['Mã / số hình', 'Hình giải thích gì', 'Liên hệ với hình chung', 'Cách tránh nhầm'], GUIDE_ONLY_FIGURES, [15, 25, 27, 33]),

    h1('II. Chương trình'),
    table(['STT', 'Phần', 'Người trình bày', 'Thời lượng', 'Hình / màn dùng'],
      [
        ...PARTS.map((p, i) => [String(i + 1), p.title, who(p.who), `${p.min} phút`, p.figures]),
        ['', 'Hỏi đáp', 'Cả nhóm (xem mục VI)', '10 phút', '—'],
        ['', 'TỔNG', '', `${total + 10} phút`, ''],
      ], [7, 25, 22, 13, 33]),
    para('Ai đang không nói thì theo dõi để đỡ lời khi bạn mình bị hỏi trúng phần mình làm.'),
    h2('Cách trình bày năm hình đầu — đã đồng bộ với Báo cáo tiến độ'),
    table(['Mã / số hình', 'Câu hỏi hình trả lời', 'Nội dung phải nói', 'Cách nối và tránh nhầm'], FIRST_FIVE_GUIDE, [13, 24, 35, 28]),

    h1('III. Chuẩn bị trước buổi'),
    table(['Việc', 'Người làm', 'Khi nào'], PREPARE, [60, 24, 16]),

    h1('IV. Kịch bản từng phần'),
    ...PARTS.flatMap((p, i) => [
      h2(`${i + 1}. ${p.title} — ${who(p.who)} · ${p.min} phút`),
      para(`Hình dùng: ${p.figures}`, { italics: true }),
      ...p.say.map((s) => item(s)),
      ...(p.next ? [para(`Chuyển ý: “${p.next}”`, { italics: true })] : []),
    ]),

    h1Page('V. Kịch bản demo'),
    para('Dữ liệu mẫu sau `npm run hub:reset`. Tập trước ít nhất một lần, tập xong nhớ reset lại.'),
    table(['Vai trò', 'Đăng nhập', 'Mật khẩu', 'Ghi chú'], ACCOUNTS, [16, 34, 14, 36]),
    // Hai bảng liền nhau thì Word gộp làm một, nên luôn có một đoạn chữ ở giữa.
    para('Các bước, theo thứ tự:', { bold: true }),
    table(['Bước', 'Người', 'Thao tác', 'Cần thấy'],
      DEMO.map(([n, alias, act, see]) => [n, name(alias), act, see]), [7, 18, 40, 35]),

    h1Page('VI. Câu hỏi thường gặp'),
    table(['Câu hỏi', 'Trả lời gợi ý', 'Ai trả lời'],
      QA.map(([q, a, w]) => [q, a, w.split(', ').map(name).join(', ')]), [24, 56, 20]),

    h1Page('VII. Hướng dẫn giải thích Class Diagram'),
    para('Class Diagram là **góc nhìn tĩnh**: mô tả hệ thống có những lớp dữ liệu nào, mỗi lớp chịu trách nhiệm gì và liên hệ với lớp khác ra sao. Khi thuyết trình, không đọc toàn bộ thuộc tính; hãy đi từ use case → lớp tham gia → quan hệ → quy tắc nghiệp vụ → nơi hiện thực trong database/API.'),
    h2('1. Cách đọc ký hiệu'),
    table(['Ký hiệu', 'Cách giải thích khi thuyết trình'], LEGEND, [32, 68]),

    h2('2. Bức tranh tổng thể'),
    para(`Hệ thống có **${GROUPS.reduce((n, g) => n + g.classes.split(', ').length, 0)} lớp**, chia thành **${GROUPS.length} nhóm**. Trình bày từ ${fig.c0}: A xác thực người dùng; B giữ hồ sơ khách; C quản lý tài sản cho thuê; D nối khách–máy–tiền và là lõi; E tiếp nhận yêu cầu từ cổng khách; F tự động hoá và truy vết.`),
    table(['Nhóm', 'Các lớp', 'Vai trò nghiệp vụ', 'Hình dùng'], GROUPS.map((g) => [
      `${g.key} · ${g.name}`,
      g.classes,
      g.points[0],
      fig[`c${g.key === 'A' ? '1' : g.key === 'B' ? '2' : g.key === 'C' ? '3' : g.key === 'D' ? '4' : g.key === 'E' ? '5' : '6'}`],
    ]), [18, 27, 45, 10]),

    h2('3. Truy vết từ use case sang lớp'),
    para('Bảng này là câu trả lời ngắn cho câu hỏi “sơ đồ lớp phục vụ chức năng nào?”. Khi demo đến đâu, chỉ vào dòng tương ứng để giải thích dữ liệu đi qua những lớp nào.'),
    table(['Luồng use case', 'Nhóm', 'Lớp chính', 'Giải thích'], CLASS_USE_CASE_TRACE, [20, 10, 32, 38]),

    h2('4. Giải thích chi tiết sáu nhóm lớp'),
    ...GROUPS.flatMap((g, i) => [
      h2(`4.${i + 1}. Nhóm ${g.key} — ${g.name} (${fig[`c${i + 1}`]})`),
      para(`**Các lớp:** ${g.classes}.`),
      ...g.points.map((p) => item(p)),
      table(['Lớp', 'Bảng dữ liệu', 'Endpoint / trách nhiệm'], g.map, [24, 28, 48]),
    ]),

    h2('5. Kịch bản nói Class Diagram trong 4 phút'),
    item(`**0:00–0:35 — Tổng quan (${fig.c0}):** “Sơ đồ có sáu nhóm. Nhóm D là lõi vì mọi giao dịch thuê đều nối khách hàng, thiết bị và tiền tại đây.”`),
    item(`**0:35–1:10 — Tài khoản và khách hàng (${fig.c1}, ${fig.c2}):** giải thích Account trừu tượng, Session hợp thành và walletBalance là thuộc tính dẫn xuất.`),
    item(`**1:10–1:45 — Thiết bị (${fig.c3}):** nói hai trạng thái độc lập của Device; tồn kho tính từ PartMovement; phiếu sửa mở thì máy không được cho thuê.`),
    item(`**1:45–2:45 — Đơn thuê và tài chính (${fig.c4}):** nói quan hệ 1 khách–1 máy, RentalPeriod cho từng lần gia hạn, bút toán cash/wallet/revenue chỉ thêm và quy tắc không thu vượt.`),
    item(`**2:45–3:25 — Yêu cầu và hỗ trợ (${fig.c5}):** BookingRequest chỉ tạo Rental khi được duyệt; TicketMessage giữ toàn bộ hội thoại.`),
    item(`**3:25–3:50 — Vận hành (${fig.c6}):** AuditLog và NetworkLockEvent chỉ thêm; ghi cả lệnh khoá thành công lẫn thất bại.`),
    item('**3:50–4:00 — Kết:** “Như vậy, use case cho biết người dùng làm gì; Class Diagram cho biết dữ liệu và quy tắc của thao tác đó nằm ở đâu.”'),

    h2('6. Câu hỏi phản biện về Class Diagram'),
    table(['Câu hỏi', 'Trả lời gợi ý'], CLASS_QA, [34, 66]),
  ];

  const atlas = [
    h1('VIII. Bộ sơ đồ'),
    para('Quy tắc khi chiếu: đọc **số hình + mã cố định + tên hình**. Ví dụ: “Hình 2 [U1] — Use case Khách hàng”. Không gọi tắt “Hình 2” khi đang mở đồng thời Báo cáo tiến độ và Hướng dẫn thuyết trình.'),
  ];
  FIGURES.forEach((f, i) => {
    atlas.push(
      i === 0 ? h2(`Hình ${i + 1} [${f.code}]. ${f.title}`) : h2Page(`Hình ${i + 1} [${f.code}]. ${f.title}`),
      // Dùng PNG khi xuất hai tài liệu tổng hợp: Word dàn trang ổn định hơn khi
      // một file có nhiều hình; bản SVG gốc vẫn nằm trong design/ để chèn slide.
      svgFigure(f.svg, f.png, 1000, 560, { rasterOnly: true }),
      caption(`[${f.code}] ${f.say} — Người trình bày: ${name(f.who)}.`),
    );
  });

  const appendix = [
    h1('Phụ lục A. Tài khoản và lệnh'),
    table(['Vai trò', 'Đăng nhập', 'Mật khẩu', 'Ghi chú'], ACCOUNTS, [16, 34, 14, 36]),
    para('Lệnh hay dùng (chạy ở thư mục dự án):', { bold: true }),
    table(['Lệnh', 'Dùng để'], COMMANDS, [36, 64]),
    para('Chạy kiểm thử trực tiếp sau phần demo: dừng server (Ctrl+C) → `npm run hub:reset` → `npm run hub:start` → mở terminal khác chạy `npm run test:hub`. Kết quả cuối: “Tất cả kiểm tra đều đạt”.'),

    h1('Phụ lục B. Xử lý sự cố'),
    table(['Hiện tượng', 'Cách xử lý'], TROUBLE, [44, 56]),

    h1Page('Phụ lục C. Ảnh dự phòng khi demo lỗi'),
    para('Ảnh chụp tự động bằng `npm run test:hub-ui` trên dữ liệu mẫu.'),
    ...BACKUP_SHOTS.flatMap(([file, text], i) => [pngFigure(join(DESIGN, 'ui', `${file}.png`), 560, 350), caption(`Ảnh ${i + 1}. ${text}`)]),

    h1Page('Phụ lục D. File hình để chèn slide'),
    para('Mỗi hình có bản SVG (phóng to không vỡ nét, chèn bằng Chèn → Ảnh trong PowerPoint hoặc Word) và bản PNG trong thư mục `png/` bên cạnh.'),
    table(['Hình / mã', 'File'], FIGURES.map((f, i) => [`Hình ${i + 1} [${f.code}]. ${f.title}`, `design/${f.svg.split(/[\\/]design[\\/]/)[1].replace(/\\/g, '/')}`]), [55, 45]),
  ];

  await writeDocxSections(join(root, '00_HUONG-DAN-THUYET-TRINH.docx'), [
    { children: front },
    { landscape: true, children: atlas },
    { children: appendix },
  ]);
  return 1;
}

/** Phần 1 — PROJECT MANAGEMENT (8 planning + 2 tracking + 1 meeting). */

import { join } from 'node:path';
import {
  DESIGNER, DEVS, DOC_DATE, PRODUCT_OWNER, PROJECT, READERS, roleLabel,
  SCRUM_MASTER, SPRINTS, TEAM, TESTER, WEEKS,
} from './data.mjs';
import { DELIVERABLES, ISSUES, PRODUCT_BACKLOG, RISKS, SPRINT1_TASKS } from './plan.mjs';
import { bullet, h1, h2, p, readersTable, revisionHistory, spacer, subtitle, table, title, writeDocx } from './docx-kit.mjs';
import { blank, dataRow, headerRow, infoRows, newBook, save, setWidths, sheetTitle, subTitle } from './xlsx-kit.mjs';

const N = PROJECT.code;

/* ---- 1.1.1 Configuration Management Plan ---------------------------------- */

async function configMgmt(dir) {
  await writeDocx(join(dir, `1.1.1 SEP_${N}_ConfigurationManagementPlan-ver1.0.docx`), [
    title('CONFIGURATION MANAGEMENT PLAN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.configMgmt, DEVS[0], 'Tạo tài liệu']]),

    h1('1. Giới thiệu'),
    h2('1.1. Mục đích'),
    p('Tài liệu mô tả cách nhóm quản lý tài liệu dự án, mã nguồn, kế hoạch quản lý và nơi lưu trữ các tài liệu này.'),
    h2('1.2. Đối tượng đọc'),
    readersTable(READERS),

    h1('2. Quản lý cấu hình'),
    h2('2.1. Môi trường'),
    table(['#', 'Quản lý', 'Công cụ', 'Ghi chú'], [
      ['1', 'Backlog, Task', 'Excel / Trello', 'Theo dõi công việc từng sprint'],
      ['2', 'Test case, Test report', 'Microsoft Excel', ''],
      ['3', 'Files tài liệu', 'Google Drive', 'Lưu trữ tập trung, chia sẻ cho mentor'],
      ['4', 'Mã nguồn (Source code)', 'Git / GitHub', ''],
      ['5', 'Trao đổi nhóm', 'Messenger / MS Teams', ''],
      ['6', 'Database', 'SQLite (file thuemay.db)', 'Sao lưu bằng cách chép file khi đã đóng ứng dụng'],
      ['7', 'Vẽ sơ đồ', 'draw.io', ''],
      ['8', 'Viết code', 'Visual Studio Code', ''],
    ], [6, 26, 28, 40]),

    h2('2.2. Hệ thống thư mục'),
    table(['Cấp 1', 'Cấp 2', 'Cấp 3'], [
      [`ThueMayHub - ${PROJECT.org}`, '1. Kick-off', 'Kick-off Presentation'],
      ['', '2. Project Planning', 'Project Plan, Configuration Management Plan, Milestone, Team Charter, Risk Management Plan, Risk List, Product Backlog'],
      ['', '3. Requirement & Architecture', 'Concept of Operations, Function List, Business Rule, Traceability Matrix, Architecture Driver, Architecture Design, Database Design'],
      ['', '4. Sprint Execute (0-3)', 'Sprint Plan, Sprint Backlog, Retrospective, Test Case/Execute, Defect Report, Test Report, Source code'],
      ['', '5. Closure', 'User Guide, Install Guide, Release Product'],
      ['', '6. Monitoring & Controlling', 'Meeting Minutes, Risk & Issue Log'],
    ], [22, 24, 54]),

    h1('3. Định danh cấu hình'),
    h2('3.1. Quy ước đặt tên file'),
    p('SEP-<Tên tài liệu>-Ver<1.x>'),
    p('Trong đó <Tên tài liệu>: đặt tên tiếng Anh; Ver<1.x>: số phiên bản, ví dụ ver1.0, ver1.1, ...'),
    h2('3.2. Cập nhật phiên bản'),
    p('Mỗi lần thay đổi nội dung tài liệu, phiên bản tăng thêm 0.1 (trừ khi chỉ đổi định dạng: màu/font/size).'),
    h2('3.3. Định dạng Word'),
    bullet('Font chữ: Times New Roman, cỡ 13, màu đen.'),
    bullet('Tiêu đề tài liệu: cỡ 36.'),
    bullet('Heading 1: cỡ 16, màu xanh lá.'),
    bullet('Heading 2: cỡ 14, màu đen.'),
    bullet('Bảng biểu: cỡ 12, màu đen.'),
    h2('3.4. Định dạng Excel'),
    bullet('Font chữ: Calibri, cỡ 12.'),
    bullet('Tiêu đề: Calibri, cỡ 22, màu xanh dương.'),
    bullet('Heading 1: Calibri, cỡ 14.'),

    h1('4. Kiểm soát cấu hình'),
    p('Scrum Master kiểm soát yêu cầu thay đổi (change request), phê duyệt/từ chối và thực hiện thay đổi cho các cấu hình (CIs).'),
    h1('5. Báo cáo cấu hình'),
    p('Scrum Master định kỳ tổng hợp báo cáo tình trạng phiên bản tài liệu hiện tại, đang chờ hoặc trước đó.'),
  ]);
}

/* ---- 1.1.2 Milestone ------------------------------------------------------ */

async function milestone(dir) {
  const book = newBook();
  const sheet = book.addWorksheet('Milestone');
  sheetTitle(sheet, 'MILESTONE DỰ ÁN PHẦN MỀM', 4);
  blank(sheet);
  infoRows(sheet, [
    ['Nhóm dự án:', PROJECT.org],
    ['Dự án:', PROJECT.name],
    ['Mentor:', PROJECT.mentor],
    ['Product Owner:', PRODUCT_OWNER],
  ]);
  blank(sheet);
  headerRow(sheet, ['Tuần', 'Ngày bắt đầu', 'Ngày kết thúc', 'Sprint']);
  for (const w of WEEKS) dataRow(sheet, [w.week, w.from, w.to, w.sprint]);
  blank(sheet);
  infoRows(sheet, [
    ['Bắt đầu dự án:', SPRINTS[0].from],
    ['Kết thúc Sprint 0:', SPRINTS[0].to],
    ['Kết thúc Sprint 1:', SPRINTS[1].to],
    ['Kết thúc Sprint 2:', SPRINTS[2].to],
    ['Kết thúc dự án (Kết thúc Sprint 3):', SPRINTS[3].to],
  ]);
  setWidths(sheet, [34, 18, 18, 16]);
  await save(book, join(dir, `1.1.2 SEP_${N}_Milestone_ver1.0.xlsx`));
}

/* ---- 1.1.4 Product Backlog ------------------------------------------------ */

async function productBacklog(dir) {
  const book = newBook();
  const sheet = book.addWorksheet('Product Backlog');
  sheetTitle(sheet, 'PRODUCT BACKLOG', 6);
  subTitle(sheet, PROJECT.name, 6);
  blank(sheet);
  headerRow(sheet, ['ID', 'User Story', 'Module', 'Story Point', 'Độ ưu tiên', 'Sprint dự kiến']);
  for (const row of PRODUCT_BACKLOG) dataRow(sheet, row);
  blank(sheet);
  dataRow(sheet, ['', 'TỔNG STORY POINT', '', PRODUCT_BACKLOG.reduce((s, r) => s + r[3], 0), '', ''], { bold: true });
  setWidths(sheet, [9, 72, 24, 13, 13, 16]);
  await save(book, join(dir, `1.1.4 SEP_${N}_ProductBacklog_ver1.0.xlsx`));
}

/* ---- 1.1.5 Project Plan --------------------------------------------------- */

async function projectPlan(dir) {
  await writeDocx(join(dir, `1.1.5 SEP_${N}_ProjectPlan-ver1.0.docx`), [
    title('PROJECT PLAN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.projectPlan, SCRUM_MASTER, 'Tạo tài liệu, tạo nội dung']]),

    h1('1. Giới thiệu'),
    h2('1.1. Mục đích tài liệu'),
    p(`Tài liệu mô tả tổng quan cách ${PROJECT.org} thực hiện dự án, bao gồm mục tiêu, phương pháp phát triển, các bên liên quan, ràng buộc, deliverable, mốc thời gian và kế hoạch phát hành.`),
    h2('1.2. Đối tượng đọc'),
    readersTable(READERS),

    h1('2. Tổng quan dự án'),
    h2('2.1. Mục tiêu dự án'),
    p('Tổng quan yêu cầu khách hàng: Xây dựng hệ thống giúp tiệm cho thuê máy tính và boxphone quản lý kho máy, đơn thuê, khách hàng và dòng tiền, thay cho việc ghi sổ tay và file Excel rời rạc.'),
    p('Mục đích chung: Giúp chủ tiệm nắm chính xác máy nào đang cho ai thuê, đến khi nào, đã thu bao nhiêu tiền và máy nào đang lỗ vì chi phí sửa chữa.'),
    p('Mục đích cụ thể:'),
    bullet('Quản lý tập trung kho máy PC/Boxphone kèm giá thuê và trạng thái từng máy.'),
    bullet('Tạo đơn thuê và thu tiền chính xác, không để thu vượt hay ví âm.'),
    bullet('Tách bạch tiền thực thu, doanh thu ghi nhận và số dư ví khách nạp trước.'),
    bullet('Quy chi phí sửa chữa về đúng từng máy để biết máy nào đang lỗ.'),
    bullet('Cho khách tự đặt thuê, thanh toán và xin gia hạn qua cổng khách hàng.'),
    bullet('Tự động khoá mạng máy khi khách hết hạn thuê mà chưa gia hạn.'),
    p('Mục tiêu của dự án (đối với nhóm):'),
    bullet('Áp dụng mô hình Scrum vào phát triển và quản lý dự án phần mềm.'),
    bullet('Nhận diện và quản lý rủi ro trong suốt dự án.'),
    bullet('Thu thập, phân tích và đặc tả yêu cầu phần mềm.'),
    bullet('Phân tích, thiết kế kiến trúc phần mềm ở 3 góc nhìn (động, tĩnh, vật lý).'),
    bullet(`Phát triển sản phẩm bằng ${PROJECT.tech.frontend} và ${PROJECT.tech.backend}.`),
    bullet('Áp dụng kiến thức kiểm thử để thiết kế, thực thi test case và báo cáo kết quả.'),

    h2('2.2. Kết quả dự án'),
    p('Các tính năng chính của hệ thống:'),
    bullet('Chủ hệ thống: quản lý kho máy, khách hàng, đơn thuê, sổ tiền, tài khoản nhân viên, cấu hình khoá mạng.'),
    bullet('Nhân viên: tạo đơn thuê, thu tiền đơn, quản lý thiết bị, lập và xử lý phiếu sửa chữa.'),
    bullet('Khách hàng: xem danh mục máy, gửi yêu cầu thuê, thanh toán bằng ví, xin gia hạn, gửi ticket hỗ trợ.'),
    bullet('Hệ thống: tự quét đơn quá hạn và khoá mạng máy theo lệnh chủ tiệm cấu hình.'),

    h2('2.3. Sản phẩm bàn giao'),
    table(['Tên tài liệu bàn giao', 'Mô tả'], DELIVERABLES, [32, 68]),

    h2('2.4. Các bên liên quan'),
    table(['Tên', 'Trách nhiệm'], [
      [`Nhóm dự án (${PROJECT.org})`, 'Phát triển sản phẩm, đảm bảo đạt chức năng và chất lượng đề ra'],
      [PROJECT.mentor, 'Hỗ trợ, tư vấn giải pháp cho nhóm khi gặp khó khăn'],
      [PROJECT.customer, 'Cung cấp yêu cầu nghiệp vụ thực tế của tiệm, nghiệm thu sản phẩm'],
    ], [34, 66]),

    h2('2.5. Ràng buộc của dự án'),
    h2('2.5.1. Ràng buộc kỹ thuật'),
    bullet(`Frontend: ${PROJECT.tech.frontend}`),
    bullet(`Backend: ${PROJECT.tech.backend}`),
    bullet(`Database: ${PROJECT.tech.database}`),
    bullet(`Đóng gói desktop: ${PROJECT.tech.desktop}`),
    h2('2.5.2. Ràng buộc nghiệp vụ'),
    bullet(`Thời gian thực hiện dự án: ${PROJECT.weeks} tuần (từ ${SPRINTS[0].from} đến ${SPRINTS[3].to}).`),
    bullet(`Số lượng thành viên: ${PROJECT.memberCount} người.`),

    h1('3. Phương pháp phát triển dự án'),
    h2('3.1. Phương pháp phát triển dự án'),
    p('Nhóm áp dụng mô hình Scrum, gồm 4 hoạt động chính lặp lại theo từng sprint:'),
    table(['Giai đoạn', 'Mô tả'], [
      ['Sprint Planning Meeting', 'Nhóm họp lên kế hoạch, tạo Sprint Backlog từ Product Backlog'],
      ['Sprint Loop', 'Thực hiện công việc trong Sprint, họp hàng ngày (Daily Meeting) chia sẻ tiến độ'],
      ['Sprint Review', 'Sau khi kết thúc sprint, demo sản phẩm tăng trưởng cho khách hàng'],
      ['Sprint Retrospective', 'Họp rút kinh nghiệm, tìm điểm cần cải thiện trước sprint kế tiếp'],
    ], [28, 72]),

    h2('3.2. Vai trò và trách nhiệm trong dự án'),
    table(['Vai trò', 'Tên', 'Trách nhiệm'], [
      ['Scrum Master', SCRUM_MASTER, 'Hỗ trợ nhóm áp dụng đúng quy trình Scrum, theo dõi tiến độ và rủi ro; kiêm Backend và UX/UI'],
      ['Product Owner', PRODUCT_OWNER, 'Kết nối nhóm phát triển với khách hàng, đảm bảo sản phẩm đúng yêu cầu; kiêm Backend'],
      ['Developer Team', TEAM.filter((m) => m.role !== 'Tester').map((m) => `${m.name} (${m.role})`).join('; '), 'Thực hiện các hạng mục trong Sprint Backlog'],
      ['Tester', TESTER, 'Thiết kế, thực thi test case và báo cáo kết quả kiểm thử'],
    ], [18, 30, 52]),

    h1('4. Milestone'),
    p(`Xem chi tiết tại: SEP_${N}_Milestone_ver1.0.xlsx`),
    h1('5. Product Backlog'),
    p(`Xem chi tiết tại: SEP_${N}_ProductBacklog_ver1.0.xlsx`),
    h1('6. Risk Management Plan'),
    p(`Xem chi tiết tại: SEP_${N}_RiskManagementPlan_ver1.0.docx và SEP_${N}_RiskList_Ver1.0.xlsx`),
  ]);
}

/* ---- 1.1.7 Risk List ------------------------------------------------------ */

async function riskList(dir) {
  const book = newBook();

  const history = book.addWorksheet('Lịch sử chỉnh sửa');
  sheetTitle(history, `Danh sách rủi ro — ${PROJECT.name}`, 4);
  blank(history);
  headerRow(history, ['Phiên bản', 'Ngày', 'Người thực hiện', 'Nội dung']);
  dataRow(history, ['1.0', DOC_DATE.riskList, TEAM[4].name, 'Tạo Risk List']);
  setWidths(history, [14, 16, 26, 40]);

  const sheet = book.addWorksheet('RISKLIST');
  sheetTitle(sheet, `Rủi ro dự án — ${PROJECT.name}`, 12);
  blank(sheet);
  headerRow(sheet, ['ID', 'MÔ TẢ', 'RỦI RO', 'LOẠI', 'NGƯỜI PHỤ TRÁCH', 'GIAO CHO',
    'XÁC SUẤT(%)', 'MỨC ĐỘ ẢNH HƯỞNG', 'RE(xs*mđ)', 'ĐỘ ƯU TIÊN', 'CÁCH XỬ LÝ', 'TRẠNG THÁI']);
  for (const r of RISKS) dataRow(sheet, r);
  setWidths(sheet, [8, 40, 34, 16, 20, 16, 12, 14, 11, 12, 54, 12]);

  const issues = book.addWorksheet('ISSUELOG');
  sheetTitle(issues, `Vấn đề phát sinh — ${PROJECT.name}`, 9);
  blank(issues);
  headerRow(issues, ['ID', 'MÔ TẢ', 'RISK ID', 'LOẠI', 'NGƯỜI PHỤ TRÁCH', 'ĐÃ XẢY RA', 'MỨC ĐỘ ẢNH HƯỞNG', 'CÁCH XỬ LÝ', 'TRẠNG THÁI']);
  for (const i of ISSUES) dataRow(issues, i);
  setWidths(issues, [10, 52, 11, 16, 20, 13, 16, 46, 12]);

  await save(book, join(dir, `1.1.7 SEP_${N}_RiskList_Ver1.0.xlsx`));
}

/* ---- 1.1.8 Risk Management Plan ------------------------------------------- */

async function riskPlan(dir) {
  await writeDocx(join(dir, `1.1.8 SEP_${N}_RiskManagementPlan_ver1.0.docx`), [
    title('RISK MANAGEMENT PLAN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.riskPlan, TEAM[4].name, 'Tạo tài liệu']]),

    h1('1. Tổng quan tài liệu'),
    h2('a. Mục đích'),
    p('Tài liệu định nghĩa quy trình nhận diện, đánh giá, ưu tiên, ứng phó, theo dõi và báo cáo rủi ro trong dự án.'),
    h2('b. Đối tượng đọc'),
    readersTable(READERS),

    h1('2. Quản lý rủi ro'),
    h2('a. Quy trình'),
    table(['STT', 'Bước', 'Mô tả', 'Vai trò', 'Kết quả'], [
      ['1', 'Risk Identification', 'Xác định danh sách rủi ro có thể xảy ra trong dự án', 'Scrum Master, cả nhóm', 'Risk Identified List'],
      ['2', 'Risk Assessment', 'Đánh giá xác suất và mức độ ảnh hưởng của từng rủi ro', 'Scrum Master, cả nhóm', 'Risk phân tích Probability/Impact'],
      ['3', 'Risk Treatment', 'Xếp hạng ưu tiên rủi ro theo mức độ ảnh hưởng', 'Scrum Master', 'Risk Prioritized'],
      ['4', 'Risk Monitoring', 'Theo dõi rủi ro có thể xuất hiện trong suốt dự án', 'Scrum Master', 'Risk Management Log Updated'],
      ['5', 'Risk Communication', 'Lên kế hoạch xử lý cho từng rủi ro', 'Scrum Master, cả nhóm', 'Giải pháp xử lý rủi ro'],
    ], [7, 22, 35, 20, 16]),
    h2('b. Nhận diện rủi ro'),
    p(`Chi tiết rủi ro được quản lý tại file SEP_${N}_RiskList_Ver1.0.xlsx, bao gồm mức ưu tiên, xác suất, tác động và kế hoạch xử lý.`),
    h2('c. Phân tích rủi ro'),
    p('Rủi ro được phân tích theo 2 yếu tố: xác suất xảy ra và mức độ tác động.'),
    h2('d. Phân tích rủi ro - Xác suất'),
    table(['STT', 'Xác suất', 'Mức độ', 'Mô tả'], [
      ['1', '5%', 'Minimal impact', 'Rủi ro không nghiêm trọng, có thể xử lý nhanh'],
      ['2', '10%', 'Not Likely', 'Rủi ro dự kiến không xảy ra, dễ tránh'],
      ['3', '30%', 'Low Likelihood', 'Rủi ro ít xảy ra, dễ giảm nhẹ'],
      ['4', '50%', 'Likely', 'Rủi ro có thể xảy ra hoặc không, cần thận trọng'],
      ['5', '70%', 'High Likely', 'Rủi ro có khả năng cao xảy ra, cần biện pháp giảm nhẹ'],
      ['6', '90%', 'Near Certainly', 'Rủi ro gần như chắc chắn xảy ra, cần xử lý ngay'],
    ], [8, 14, 24, 54]),
    h2('e. Phân tích rủi ro – Mức độ ảnh hưởng'),
    table(['Mục tiêu dự án', 'Tối thiểu (1)', 'Nhỏ (2)', 'Vừa (3)', 'Đáng kể (4)', 'Nghiêm trọng (5)'], [
      ['Tiến độ', 'Trễ không đáng kể', 'Trễ < 5% tổng thời gian', 'Trễ 5-10%', 'Trễ 10-20%', 'Trễ > 20%'],
      ['Phạm vi', 'Giảm không đáng kể', 'Ảnh hưởng phần nhỏ', 'Ảnh hưởng phần lớn', 'Giảm phạm vi không chấp nhận được', 'Dự án không còn giá trị sử dụng'],
      ['Chất lượng', 'Giảm không đáng kể', 'Chỉ ảnh hưởng chức năng ít dùng', 'Cần khách hàng phê duyệt lại', 'Giảm chất lượng không chấp nhận được', 'Sản phẩm không dùng được'],
    ], [14, 16, 18, 17, 18, 17]),

    h1('3. Ma trận phân tích rủi ro'),
    p(`Xem chi tiết danh sách và mức độ ưu tiên rủi ro tại SEP_${N}_RiskList_Ver1.0.xlsx.`),
    h1('4. Ứng phó rủi ro'),
    p('Nhóm sử dụng 3 chiến lược ứng phó rủi ro:'),
    bullet('Avoid: Loại bỏ rủi ro bằng cách loại bỏ nguyên nhân.'),
    bullet('Mitigate: Giảm xác suất và/hoặc mức độ tác động của rủi ro.'),
    bullet('Accept: Chấp nhận rủi ro và không hành động thêm.'),
  ]);
}

/* ---- 1.1.10 Sprint 1 Plan ------------------------------------------------- */

async function sprint1Plan(dir) {
  const backlog = [
    ['1.0', 'Scrum Master tổ chức họp Sprint 1', 5, 'Medium', SCRUM_MASTER],
    ['2.0', 'Là người dùng, tôi muốn Đăng nhập/Đăng xuất bằng email (F.1.1)', 18, 'High', SCRUM_MASTER],
    ['2.1', '   - Designer: thiết kế prototype', 5, 'High', DESIGNER],
    ['2.2', '   - Tester: viết test case', 5, 'High', TESTER],
    ['2.3', '   - Developer: hiện thực chức năng', 5, 'High', DEVS[0]],
    ['2.4', '   - Tester: thực thi test', 3, 'High', TESTER],
    ['3.0', 'Là Chủ hệ thống, tôi muốn Quản lý khách hàng (F.2.1-F.2.5)', 31, 'High', PRODUCT_OWNER],
    ['4.0', 'Là Chủ hệ thống, tôi muốn Quản lý thiết bị (F.3.1-F.3.5)', 34, 'High', PRODUCT_OWNER],
    ['4.1', '   - Designer: thiết kế prototype kho thiết bị', 8, 'High', DESIGNER],
    ['4.2', '   - Tester: viết test case Thêm thiết bị', 8, 'High', TESTER],
    ['4.3', '   - Developer: hiện thực CRUD thiết bị', 13, 'High', DEVS[2]],
    ['4.4', '   - Tester: thực thi test', 5, 'High', TESTER],
    ['5.0', 'Là Nhân viên, tôi muốn Tạo đơn thuê (F.4.2)', 47, 'High', PRODUCT_OWNER],
    ['5.1', '   - Designer: thiết kế prototype form tạo đơn', 13, 'High', DESIGNER],
    ['5.2', '   - Tester: viết test case', 8, 'High', TESTER],
    ['5.3', '   - Developer: hiện thực chức năng, tự tính thành tiền', 13, 'High', DEVS[0]],
    ['5.4', '   - Tester: thực thi test', 13, 'High', TESTER],
    ['6.0', 'Là Nhân viên, tôi muốn Thu tiền đơn thuê (F.4.3)', 42, 'High', PRODUCT_OWNER],
    ['7.0', 'Là Nhân viên, tôi muốn Kích hoạt & hoàn tất đơn (F.4.4)', 21, 'High', PRODUCT_OWNER],
    ['8.0', 'Tester viết Test Report Sprint 1', 5, 'High', TESTER],
    ['9.0', 'Scrum Master viết Retrospective Sprint 1', 5, 'High', SCRUM_MASTER],
    ['10.0', 'Tester cập nhật Defect Report', 5, 'High', TESTER],
    ['11.0', 'Product Owner cập nhật Traceability Matrix Sprint 1', 5, 'High', PRODUCT_OWNER],
  ];

  await writeDocx(join(dir, `1.1.10 SEP-${N}-Sprint1Plan-ver1.0.docx`), [
    title('SPRINT 1 PLAN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.sprint1Plan, SCRUM_MASTER, 'Tạo tài liệu']]),

    h1('1. Giới thiệu'),
    h2('1.1. Mục đích tài liệu'),
    p('Tài liệu mô tả kế hoạch của Sprint 1: các hạng mục cần làm, người phụ trách và story point ước lượng.'),
    h2('1.2. Đối tượng đọc'),
    readersTable(READERS),

    h1('2. Lịch trình Sprint'),
    table(['STT', 'Sprint #', 'Thời lượng', 'Ngày bắt đầu', 'Ngày kết thúc', 'Tuần bắt đầu', 'Tuần kết thúc'],
      SPRINTS.map((s, i) => [String(i + 1), s.name, `${s.days} ngày`, s.from, s.to, s.weekFrom, s.weekTo]),
      [7, 14, 14, 17, 17, 15, 16]),

    h1('3. Nhân sự'),
    table(['STT', 'Tên', 'Vai trò'], TEAM.map((m) => [String(m.no), m.name, roleLabel(m)]), [8, 38, 54]),

    h1('4. Sprint 1 Backlog'),
    table(['STT', 'User Story', 'Story Point', 'Độ ưu tiên', 'Người thực hiện'],
      backlog.map((r) => [r[0], r[1], String(r[2]), r[3], r[4]]),
      [7, 46, 12, 13, 22]),

    h1('5. Tài liệu tham khảo'),
    p(`SEP_${N}_Milestone_ver1.0.xlsx`),
    p(`SEP_${N}_ProductBacklog_ver1.0.xlsx`),
  ]);
}

/* ---- 1.1.13 Team Charter -------------------------------------------------- */

async function teamCharter(dir) {
  const memberSections = TEAM.flatMap((m) => [
    h2(`${m.no}. ${m.name}`),
    table(['Thông tin thành viên', ''], [
      [`Họ và tên: ${m.name}`, `Nhóm: ${PROJECT.code.replace('Nhom', '')}`],
      [`Mã số sinh viên: ${m.mssv}`, `Lớp: ${PROJECT.className}`],
      [`Email: ${m.email}`, `Số điện thoại: ${m.phone}`],
      [`Chức vụ: ${roleLabel(m)}`, ''],
    ], [55, 45]),
  ]);

  await writeDocx(join(dir, `1.1.13 SEP_${N}_TeamCharter_ver1.0.docx`), [
    title('TEAM CHARTER'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.teamCharter, SCRUM_MASTER, 'Tạo tài liệu, tạo nội dung, định dạng tài liệu']]),

    h1('I. Giới thiệu'),
    h2('Mục tiêu'),
    p('Tài liệu này ghi nhận thông tin thành viên và nội quy hoạt động của nhóm trong suốt dự án.'),
    h2('Nhóm thực hiện'),
    table(['Họ và tên', 'Vai trò'], TEAM.map((m) => [m.name, roleLabel(m)]), [50, 50]),
    h2('Đối tượng đọc'),
    readersTable(READERS),

    h1('II. Thành viên nhóm'),
    ...memberSections,

    h1('III. Nội quy'),
    bullet('Mỗi thành viên bắt đầu với 100 điểm = 100% cho 1 giai đoạn.'),
    bullet('Đi trễ (họp): -10 điểm.'),
    bullet('Nộp bài trễ: -10 điểm.'),
    bullet('Không nộp bài: -30 điểm.'),
    bullet('Vắng mặt (không phép): -10 điểm.'),
    bullet('Vắng mặt có lý do chính đáng (được cả nhóm đồng ý), tối đa 3 lần: -0 điểm.'),
    bullet('Có ý tưởng hay/mới: +(5-10) điểm.'),
    bullet('Hỗ trợ thành viên khác: +(5-10) điểm.'),
  ]);
}

/* ---- 1.2.2 Retrospective -------------------------------------------------- */

/** Tổng điểm Sprint 1 của từng người, cao xuống thấp — tính từ bảng việc để không ghi cứng tên. */
function effortSprint1() {
  const tong = new Map();
  for (const [, , , ten, , diem] of SPRINT1_TASKS) tong.set(ten, (tong.get(ten) ?? 0) + diem);
  return [...tong].sort((a, b) => b[1] - a[1]);
}

async function retrospective(dir) {
  await writeDocx(join(dir, `1.2.2 SEP_${N}_RetrospectiveSummaryReportSprint1.docx`), [
    title('RETROSPECTIVE SUMMARY REPORT'),
    subtitle(`Sprint 1 — ${PROJECT.name}`),
    p(`Ngày lập: ${DOC_DATE.retrospective}`),

    h1('Tóm tắt'),
    table(['Hạng mục', 'Nội dung'], [
      ['Điều phối viên', SCRUM_MASTER],
      ['Người tham gia', TEAM.map((m) => m.name).join(', ')],
      ['Người hỗ trợ', PROJECT.mentor],
      ['Số liệu', `Họp Retrospective Sprint 1: ${(PROJECT.memberCount * 0.75).toFixed(2)} giờ (thời lượng x số người tham gia)`],
    ], [24, 76]),

    h1('Điều đã làm tốt'),
    table(['Hạng mục', 'Ghi nhận'], [
      ['Yêu cầu', 'Yêu cầu quản lý khách hàng, thiết bị và đơn thuê được thu thập đầy đủ từ chủ tiệm, tài liệu đã cập nhật'],
      ['Quản lý quy trình', 'Quy trình Scrum được áp dụng đều đặn, họp daily 15 phút mỗi ngày'],
      ['Làm việc nhóm', 'Các thành viên chủ động nhận việc và cập nhật tiến độ trên Sprint Backlog'],
      ['Chất lượng', 'Phát hiện sớm lỗi thu tiền hai lần nhờ có ca kiểm thử riêng cho tình huống bấm nút nhanh'],
    ], [24, 76]),

    h1('Điều cần cải thiện'),
    table(['Hạng mục', 'Ghi nhận'], [
      ['Công việc', 'Module Quản lý đơn thuê có nhiều luồng con (tạo, thu tiền, kích hoạt, hoàn tất, huỷ) nên tốn nhiều thời gian hơn ước lượng'],
      ['Năng suất làm việc', 'Một số thành viên chưa quen TypeScript nên tiến độ chưa đều giữa các thành viên'],
      ['Tiến độ dự án', 'Chức năng Kích hoạt & hoàn tất đơn chưa xong, phải chuyển sang đầu Sprint 2'],
      ['Kiểm thử', 'Test case cho luồng tiền được viết muộn, sát ngày chạy test nên thiếu thời gian review chéo'],
    ], [24, 76]),

    h1('Bài học kinh nghiệm'),
    table(['Hạng mục', 'Bài học'], [
      ['Quản lý quy trình', 'Cần tách nhỏ module Quản lý đơn thuê thành từng luồng ngay từ đầu sprint để dễ theo dõi'],
      ['Quản lý nhân sự', 'Cần trao đổi thường xuyên hơn để phát hiện sớm thành viên bị chậm tiến độ'],
      ['Quản lý chất lượng', 'Mọi thao tác liên quan tới tiền đều phải có ca kiểm thử biên và ca bấm nút hai lần'],
      ['Quản lý rủi ro', 'Rủi ro sai sót khi tính tiền là có thật (đã xảy ra ở DF.01), cần giữ mức ưu tiên cao ở các sprint sau'],
    ], [24, 76]),

    h1('Kết luận'),
    table(['Hạng mục', 'Nội dung'], [
      ['Điều cần duy trì', 'Duy trì họp daily 15 phút mỗi ngày và review chéo code phần tiền'],
      ['Điều cần thay đổi', 'Viết test case song song lúc code thay vì để dồn cuối sprint'],
    ], [24, 76]),

    h1('Công sức thực hiện Sprint 1'),
    p(`Theo Sprint 1 Backlog Items, ${effortSprint1().slice(0, 2).map(([ten, diem]) => `${ten} (${diem} điểm)`).join(' và ')} có tổng effort cao nhất. Trung bình mỗi thành viên khoảng 60 giờ công (tối thiểu 20 giờ/tuần).`),

    h1('Sprint 1 Burndown'),
    p('Các hạng mục trong Sprint 1 Backlog đã hoàn thành, riêng chức năng Kích hoạt & hoàn tất đơn thuê còn dở dang và được chuyển sang đầu Sprint 2. Hai defect phát hiện trong sprint (DF.01, DF.02) đã được sửa và kiểm thử lại đạt.'),
  ]);
}

/* ---- 1.2.6 Sprint 1 Backlog Items ----------------------------------------- */

async function sprintBacklogItems(dir) {
  const book = newBook();
  const sheet = book.addWorksheet('Sprint 1 Backlog Items');
  sheetTitle(sheet, `SPRINT 1 BACKLOG ITEMS — ${PROJECT.name}`, 6);
  blank(sheet);
  headerRow(sheet, ['Task ID', 'User Story', 'Công việc', 'Người thực hiện', 'Trạng thái', 'Story Point']);
  for (const t of SPRINT1_TASKS) dataRow(sheet, t);
  blank(sheet);
  dataRow(sheet, ['', '', 'TỔNG STORY POINT', '', '', SPRINT1_TASKS.reduce((s, t) => s + t[5], 0)], { bold: true });
  setWidths(sheet, [10, 12, 58, 24, 14, 13]);
  await save(book, join(dir, `1.2.6 SEP_${N}_Sprint1_BacklogItems.xlsx`));
}

/* ---- 1.3 Meeting Report --------------------------------------------------- */

async function meetingReport(dir) {
  await writeDocx(join(dir, `${N}_MeetingReport_Week5_Tuesday_ver1.0.docx`), [
    title('BIÊN BẢN HỌP NHÓM'),
    subtitle(`${PROJECT.org} – Lớp ${PROJECT.className} – ${PROJECT.name}`),
    p(`Customer: ${PROJECT.customer}          Mentor: ${PROJECT.mentor}`),

    table(['Hạng mục', 'Nội dung'], [
      ['Ngày', DOC_DATE.meeting],
      ['Giờ', '20h00 - 20h45'],
      ['Địa điểm', 'MS Teams'],
      ['Sprint', '01'],
    ], [24, 76]),

    h1('Thành phần tham dự'),
    table(['Vai trò', 'Tên'], [
      ['Mentor', PROJECT.mentor],
      ...TEAM.map((m) => ['Thành viên nhóm', m.name]),
    ], [30, 70]),

    h1('Biên bản cuộc họp'),
    p('Nội dung trao đổi:'),
    bullet('Rà soát tiến độ module Quản lý đơn thuê (F.4.1-F.4.6) — đã hoàn thành khoảng 80%.'),
    bullet('Thảo luận lỗi thu tiền hai lần khi bấm nhanh nút "Xác nhận thu" (DF.01).'),
    bullet('Thống nhất khoá nút ngay sau lần bấm đầu và bổ sung kiểm tra số còn nợ ở phía máy chủ.'),
    bullet('Thống nhất sổ tiền ghi theo ba giá trị (tiền thực, biến động ví, doanh thu) thay vì một cột số tiền.'),
    bullet('Nhắc các thành viên cập nhật Sprint Backlog Items hằng ngày.'),

    h1('Danh sách hành động'),
    table(['Người phụ trách', 'Việc cần làm', 'Hạn hoàn thành', 'Trạng thái'], [
      [DEVS[0], 'Sửa lỗi thu tiền hai lần và bổ sung kiểm tra ở máy chủ', SPRINTS[1].to, 'Đang làm'],
      [DESIGNER, 'Hoàn thiện giao diện kho thiết bị dạng bảng', SPRINTS[1].to, 'Đang làm'],
      [TESTER, 'Chạy lại test case Thu tiền đơn sau khi fix', SPRINTS[1].to, 'Chưa bắt đầu'],
    ], [24, 44, 18, 14]),
  ]);
}

/* ---- Xuất --------------------------------------------------------------- */

export async function buildPlanning(dir) {
  await configMgmt(dir);
  await milestone(dir);
  await productBacklog(dir);
  await projectPlan(dir);
  await riskList(dir);
  await riskPlan(dir);
  await sprint1Plan(dir);
  await teamCharter(dir);
  return 8;
}

export async function buildTracking(dir) {
  await retrospective(dir);
  await sprintBacklogItems(dir);
  return 2;
}

export async function buildMeeting(dir) {
  await meetingReport(dir);
  return 1;
}

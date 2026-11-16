/** Phần 2 — CONTEXT AND SYSTEM REQUIREMENT (4 tài liệu). */

import { join } from 'node:path';
import { DOC_DATE, PRODUCT_OWNER, PROJECT, READERS, roleLabel, SCRUM_MASTER, TEAM } from './data.mjs';
import { BUSINESS_RULES, FRS, FUNCTION_ROWS, MODULES } from './domain.mjs';
import { bullet, h1, h2, p, readersTable, revisionHistory, spacer, subtitle, table, title, writeDocx } from './docx-kit.mjs';
import { blank, dataRow, headerRow, infoRows, newBook, save, setWidths, sheetTitle } from './xlsx-kit.mjs';

const N = PROJECT.code;

/* ---- 2.1 Function List ---------------------------------------------------- */

async function functionList(dir) {
  const book = newBook();

  const info = book.addWorksheet('Info');
  sheetTitle(info, 'Function List', 4);
  info.addRow([PROJECT.org]).font = { name: 'Calibri', size: 14, bold: true };
  blank(info);
  headerRow(info, ['STT', 'Mã số sinh viên', 'Họ và tên', 'Vai trò']);
  for (const m of TEAM) dataRow(info, [m.no, m.mssv, m.name, roleLabel(m)]);
  setWidths(info, [8, 18, 26, 32]);

  const sheet = book.addWorksheet('Function List');
  sheetTitle(sheet, `Function List — ${PROJECT.name}`, 8);
  blank(sheet);
  headerRow(sheet, ['Module', 'Chức năng', 'Release', 'Function ID', 'Feature', 'Độ ưu tiên', 'Mô tả', 'Actor']);
  for (const row of FUNCTION_ROWS) {
    dataRow(sheet, [
      row.isFirst ? row.moduleNo : '',
      row.isFirst ? row.module : '',
      row.release, row.id, row.feature, row.priority, row.desc,
      row.isFirst ? row.actor : '',
    ]);
  }
  setWidths(sheet, [9, 24, 9, 12, 30, 11, 52, 26]);

  await save(book, join(dir, `2.1 SEP_${N}_FunctionList_v1.0.xlsx`));
}

/* ---- 2.2 Traceability Matrix ---------------------------------------------- */

async function traceability(dir) {
  const book = newBook();
  const sheet = book.addWorksheet('Traceability Matrix');
  sheetTitle(sheet, `TRACEABILITY MATRIX — ${PROJECT.name}`, 6);
  blank(sheet);
  headerRow(sheet, ['FR ID', 'Mô tả yêu cầu', 'Tham chiếu thiết kế', 'Tham chiếu Test Case', 'Tham chiếu Test Report', 'Trạng thái']);
  for (const fr of FRS) {
    dataRow(sheet, [fr.id, fr.name, fr.design, fr.test, `Test Report Sprint ${fr.sprint}`, fr.status]);
  }
  setWidths(sheet, [10, 42, 46, 34, 24, 12]);
  await save(book, join(dir, `2.2 SEP_${N}_TraceabilityMatrix_ver1.0.xlsx`));
}

/* ---- 2.3 Concept of Operations -------------------------------------------- */

async function conops(dir) {
  await writeDocx(join(dir, `2.3 SEP-${N}-Concept-Of-Operation-ver1.0.docx`), [
    title('CONCEPT OF OPERATIONS'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.conops, PRODUCT_OWNER, 'Tạo tài liệu']]),

    h1('I. Giới thiệu'),
    h2('Mục đích'),
    p('Tài liệu mô tả cách một tiệm cho thuê máy tính và boxphone đang vận hành thủ công hiện nay, những khó khăn gặp phải, và những thay đổi trong quy trình khi triển khai hệ thống Thuê Máy Hub.'),
    h2('Đối tượng đọc'),
    readersTable(READERS),

    h1('II. Cho thuê máy tính & boxphone là gì?'),
    p('Cho thuê máy tính và boxphone là hình thức tiệm mua sẵn máy cấu hình cao rồi cho khách thuê theo giờ hoặc theo tháng. Khách không cần mua máy đắt tiền mà vẫn có máy mạnh để làm việc, chơi game hoặc chạy ứng dụng Android thật trên boxphone. Tiệm thu tiền theo thời hạn thuê và chịu trách nhiệm bảo trì, sửa chữa máy.'),
    p('Vì mỗi máy là một tài sản có giá trị, tiệm cần biết chính xác từng máy đang cho ai thuê, đến khi nào, đã thu về bao nhiêu tiền và đã tốn bao nhiêu tiền sửa chữa.'),

    h1('III. Hệ thống hiện tại và khó khăn'),
    h2('Mục tiêu, Đối tượng đọc'),
    p('Mục tiêu: hỗ trợ chủ tiệm quản lý máy, đơn thuê và dòng tiền chính xác hơn cách ghi sổ tay hiện nay.'),
    p(`Đối tượng: Khách hàng (${PROJECT.customerShort}) và nhóm phát triển.`),
    h2('Ràng buộc'),
    bullet('Toàn bộ thông tin thuê máy ghi trong sổ tay và file Excel rời rạc.'),
    bullet('Chủ tiệm không biết chính xác máy nào sắp hết hạn thuê để nhắc khách.'),
    bullet('Không tách bạch được tiền thực thu, doanh thu và tiền khách nạp trước.'),
    bullet('Không biết máy nào đang lỗ vì chi phí sửa chữa vượt doanh thu thu về.'),
    h2('Mô tả hệ thống hiện tại'),
    p('Quy trình cho thuê hiện tại:'),
    bullet('Khách liên hệ qua điện thoại hoặc nhắn tin để hỏi máy trống.'),
    bullet('Chủ tiệm tra sổ tay xem máy nào còn trống, báo giá miệng cho khách.'),
    bullet('Chủ tiệm ghi tên khách, máy, ngày bắt đầu và ngày hết hạn vào sổ.'),
    bullet('Khách chuyển khoản hoặc trả tiền mặt, chủ tiệm ghi lại vào một file Excel khác.'),
    bullet('Khi hết hạn, chủ tiệm phải tự nhớ để nhắc khách gia hạn hoặc thu hồi máy.'),
    bullet('Máy hỏng thì sửa và ghi chi phí vào sổ, không quy được về từng máy.'),
    h2('Người dùng và các bên liên quan hiện tại'),
    table(['Vai trò', 'Trách nhiệm'], [
      ['Chủ tiệm', 'Nhận yêu cầu thuê, ghi sổ, thu tiền, theo dõi hạn thuê và sửa chữa máy'],
      ['Nhân viên', 'Hỗ trợ bàn giao máy, nhắc khách gia hạn'],
      ['Khách hàng', 'Liên hệ hỏi máy trống, chuyển tiền và nhận thông tin truy cập máy'],
    ], [26, 74]),
    h2('Môi trường hỗ trợ công việc hiện tại'),
    p('Sổ tay ghi chép, file Excel rời rạc, tin nhắn Zalo/Messenger với khách hàng.'),

    h1('IV. Hệ thống đề xuất'),
    h2('Mục tiêu'),
    bullet('Quản lý tập trung kho máy, đơn thuê và khách hàng ở một nơi duy nhất.'),
    bullet('Tách bạch rõ ba con số: tiền thực thu, doanh thu ghi nhận và số dư ví khách đã nạp trước.'),
    bullet('Biết chính xác từng máy đã thu về bao nhiêu và tốn bao nhiêu tiền sửa để quyết định giữ hay thanh lý.'),
    bullet('Cảnh báo đơn sắp hết hạn, tự khoá mạng máy khi khách quá hạn mà chưa gia hạn.'),
    bullet('Cho khách tự đặt thuê, tự thanh toán bằng ví và tự xin gia hạn qua cổng khách hàng.'),
    h2('Chính sách'),
    p(`Dự án được thực hiện trong ${PROJECT.weeks} tuần với ${PROJECT.memberCount} thành viên.`),
    h2('Mô tả hệ thống đề xuất'),
    bullet('Chủ hệ thống quản lý kho máy PC/Boxphone: giá thuê giờ, giá thuê tháng, cấu hình, địa chỉ IP.'),
    bullet('Nhân viên tạo đơn thuê cho khách, hệ thống tự tính thành tiền theo thời hạn thuê.'),
    bullet('Nhân viên thu tiền đơn bằng tiền mặt, chuyển khoản hoặc trừ vào ví khách; hệ thống chặn thu vượt số còn nợ.'),
    bullet('Chủ hệ thống nạp tiền vào ví khách và hoàn tiền khi cần, mọi thao tác đều ghi vào sổ giao dịch.'),
    bullet('Khách hàng đăng nhập cổng riêng để xem máy còn trống, gửi yêu cầu thuê, trả tiền bằng ví và xin gia hạn.'),
    bullet('Hệ thống lập phiếu sửa chữa, quản lý kho linh kiện và quy chi phí sửa về đúng từng máy.'),
    bullet('Hệ thống tự quét đơn quá hạn và chạy lệnh khoá mạng do chủ tiệm cấu hình sẵn.'),
    bullet('Chủ hệ thống tạo tài khoản cho nhân viên với quyền hạn giới hạn, và xem nhật ký thao tác.'),
    h2('Người dùng và các bên liên quan trong tương lai'),
    table(['Vai trò', 'Trách nhiệm'], [
      ['Chủ hệ thống', 'Quản lý toàn bộ: kho máy, khách hàng, đơn thuê, sổ tiền, tài khoản nhân viên, cấu hình khoá mạng'],
      ['Nhân viên', 'Tạo đơn thuê, thu tiền đơn, quản lý thiết bị và xử lý phiếu sửa chữa; không xem được sổ tiền tổng'],
      ['Khách hàng', 'Xem danh mục máy, gửi yêu cầu thuê, thanh toán bằng ví, xin gia hạn, gửi ticket hỗ trợ'],
    ], [22, 78]),
    h2('Môi trường hỗ trợ hệ thống đề xuất'),
    p(`Ứng dụng chạy được ở hai dạng từ cùng một mã nguồn: bản web (${PROJECT.tech.frontend} + ${PROJECT.tech.backend} + ${PROJECT.tech.database}) và bản ứng dụng desktop cho Windows đóng gói bằng ${PROJECT.tech.desktop}.`),

    h1('V. Function List: Tài liệu tham khảo'),
    p(`SEP_${N}_FunctionList_v1.0.xlsx`),
    h2('Phần mềm hỗ trợ'),
    bullet('Visual Studio Code'),
    bullet('Node.js, SQLite'),
    bullet('Git / GitHub'),

    h1('VI. Phê duyệt của khách hàng'),
    p('Ý kiến (nếu có): ........................................................................'),
    spacer(),
    p('HCMC, ......../......../2026'),
    spacer(),
    p(`LEADER: ${SCRUM_MASTER}                              CUSTOMER: ${PROJECT.customer}`),
  ]);
}

/* ---- 2.4 Business Rule ---------------------------------------------------- */

async function businessRule(dir) {
  const book = newBook();
  const sheet = book.addWorksheet('Business Rule');
  sheetTitle(sheet, `BUSINESS RULE — ${PROJECT.name}`, 3);
  blank(sheet);
  headerRow(sheet, ['Rule ID', 'Module', 'Mô tả quy tắc nghiệp vụ']);
  for (const r of BUSINESS_RULES) dataRow(sheet, r);
  setWidths(sheet, [11, 26, 96]);
  await save(book, join(dir, `2.4 SEP-${N}-BusinessRule-ver1.0.xlsx`));
}

export async function buildRequirements(dir) {
  await functionList(dir);
  await traceability(dir);
  await conops(dir);
  await businessRule(dir);
  return 4;
}

export { MODULES, infoRows };

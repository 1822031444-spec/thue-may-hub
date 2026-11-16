/** Phần 4 — TESTING (Test Plan, 3 Test Case, 3 Test Execute, Defect, Report, UAT). */

import { join } from 'node:path';
import { DEVS, DOC_DATE, PRODUCT_OWNER, PROJECT, READERS, SCRUM_MASTER, SPRINTS, TESTER } from './data.mjs';
import { DEFECTS, SUITES, TEST_REPORT_ROWS } from './tests.mjs';
import { bullet, h1, h2, p, readersTable, revisionHistory, spacer, subtitle, table, title, writeDocx } from './docx-kit.mjs';
import { blank, dataRow, dropdown, headerRow, infoRows, lookupSheet, newBook, save, setWidths, sheetTitle } from './xlsx-kit.mjs';

const N = PROJECT.code;

/* ---- 4.1 Test Plan -------------------------------------------------------- */

async function testPlan(dir) {
  await writeDocx(join(dir, `4.1 SEP_${N}_TestPlan_Ver1.0.docx`), [
    title('TEST PLAN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.testPlan, TESTER, 'Tạo tài liệu']]),

    h1('1. Giới thiệu'),
    h2('1.1. Mục đích'),
    p('Test Plan mô tả cách tiếp cận và phương pháp áp dụng cho việc kiểm thử unit, functional và acceptance của hệ thống Thuê Máy Hub. Tài liệu xác định rõ phạm vi trong và ngoài của việc kiểm thử.'),
    h2('1.2. Đối tượng đọc'),
    readersTable(READERS),

    h1('2. Quy trình'),
    h2('2.1. Mô tả các hoạt động'),
    table(['Hoạt động', 'Mô tả'], [
      ['Design Unit Test', 'Developer thiết kế unit test cho từng handler nghiệp vụ'],
      ['Execute Unit Test', 'Developer chạy unit test, ghi nhận lỗi'],
      ['Report Unit Test', 'Đối chiếu kết quả với Exit Criteria'],
      ['Design Functional Test', 'Tester thiết kế test case theo Function List'],
      ['Execute Functional Test', 'Tester thực thi khi chức năng hoàn thành, ghi nhận defect'],
      ['Report Functional Test', 'Tổng hợp Test Report'],
      ['Execute User Acceptance Test', 'Khách hàng (chủ tiệm) kiểm tra theo kịch bản nghiệp vụ thực tế'],
      ['Report Defects', 'Ghi nhận lỗi vào Defect Report'],
      ['Fixes Defect', 'Developer sửa lỗi, tester chạy lại test (re-test)'],
    ], [28, 72]),

    h1('3. Chiến lược kiểm thử'),
    h2('3.1. Phạm vi kiểm thử'),
    p('Các module cần kiểm thử:'),
    bullet('Đăng nhập/Đăng xuất và Đổi mật khẩu'),
    bullet('Quản lý khách hàng và ví tiền'),
    bullet('Quản lý thiết bị'),
    bullet('Quản lý đơn thuê (tạo, thu tiền, kích hoạt, hoàn tất, hoàn tiền, huỷ)'),
    bullet('Tài chính (sổ giao dịch, sổ chi phí)'),
    bullet('Sửa chữa và kho linh kiện'),
    bullet('Cổng khách hàng và Yêu cầu & hỗ trợ'),
    bullet('Khoá mạng khi hết hạn'),
    bullet('Cài đặt và phân quyền'),
    p('Ngoài phạm vi: kiểm thử hiệu năng với hàng nghìn người dùng đồng thời, kiểm thử bảo mật chuyên sâu (penetration test).'),

    h2('3.2. Phương pháp kiểm thử'),
    p('Developer thực hiện unit test song song lúc code. Tester thực hiện functional test khi chức năng hoàn thành. Khách hàng thực hiện acceptance test cuối mỗi sprint và phản hồi cho nhóm.'),
    p('Riêng các chức năng liên quan tới tiền (tạo đơn, thu tiền, hoàn tiền, nạp ví) bắt buộc phải có đủ ba loại ca kiểm thử: ca thuận, ca nghịch và ca biên. Ngoài ra phải có ca kiểm thử bấm nút hai lần liên tiếp, vì đây là nguồn lỗi đã từng xảy ra thật.'),

    h2('3.3. Loại kiểm thử và tổ chức thực hiện'),
    table(['Loại test', 'Lý do', 'Người thực hiện', 'Thời điểm'], [
      ['Unit Test', 'Đảm bảo từng phần code chạy đúng', 'Developer', 'Ngay khi code xong'],
      ['Functional Test', 'Đảm bảo chức năng chạy đúng yêu cầu', 'Tester', 'Khi chức năng sẵn sàng'],
      ['Integration Test', 'Đảm bảo các module liên kết đúng (VD: Tạo đơn — Thu tiền — Sổ giao dịch)', 'Tester', 'Sau Functional Test'],
      ['Acceptance Test', 'Đảm bảo đúng kỳ vọng khách hàng', 'Cả nhóm + Khách hàng', 'Cuối mỗi sprint'],
    ], [16, 44, 20, 20]),

    h2('3.4. Rủi ro và vấn đề'),
    table(['STT', 'Rủi ro', 'Độ ưu tiên', 'Giải pháp'], [
      ['1', 'Nhóm chưa có nhiều kinh nghiệm kiểm thử phần mềm quản lý tiền', 'High', 'Lên kế hoạch tự học, nhờ mentor hướng dẫn, ưu tiên viết ca biên trước'],
      ['2', 'Viết sai hoặc thiếu test case cho luồng tiền', 'High', 'Cho 2 thành viên review chéo test case trước khi thực thi'],
      ['3', 'Lịch dự án gấp, khó hoàn thành đúng hạn', 'Medium', 'Ưu tiên kiểm thử theo mức độ quan trọng của chức năng'],
    ], [7, 40, 13, 40]),

    h1('4. Mục tiêu kiểm thử'),
    bullet('Phát hiện lỗi phát sinh trong giai đoạn code.'),
    bullet('Đảm bảo không có sai sót nào về tiền lọt ra sản phẩm bàn giao.'),
    bullet('Đảm bảo sản phẩm đáp ứng đúng yêu cầu của chủ tiệm.'),

    h1('5. Kế hoạch nguồn lực'),
    table(['Hoạt động', 'Công cụ'], [
      ['Viết Test Plan', 'MS Word'],
      ['Test Case / Test Case Management', 'MS Excel'],
      ['Unit Test', 'Node.js test runner'],
      ['API Test', 'Postman'],
      ['Functional / Acceptance Test', 'MS Excel'],
    ], [46, 54]),

    h1('6. Lịch trình'),
    table(['Sprint', 'Công việc', 'Thời lượng'], [
      ['1', 'Viết test case Sprint 1', `${SPRINTS[1].from} - ${DOC_DATE.testCase}`],
      ['1', 'Viết & thực thi unit test', `${DOC_DATE.testCase} - ${DOC_DATE.testExecute1}`],
      ['1', 'Thực thi functional test Sprint 1', `${DOC_DATE.testExecute1} - ${DOC_DATE.testExecute2}`],
      ['1', 'Thực thi User Acceptance Test Release 1', `${DOC_DATE.acceptance} - ${SPRINTS[1].to}`],
      ['2', 'Viết test case Sprint 2', `${SPRINTS[2].from} - ...`],
      ['2', 'Thực thi functional & integration test Sprint 2', `... - ${SPRINTS[2].to}`],
      ['3', 'Viết & thực thi test case Sprint 3', `${SPRINTS[3].from} - ${SPRINTS[3].to}`],
    ], [10, 52, 38]),

    h1('7. Thang đánh giá kết quả kiểm thử'),
    p('Kết quả đo lường:'),
    bullet('0-50%: Test case pass thấp, chức năng lỗi nhiều, cần làm lại.'),
    bullet('50-90%: Test case pass khá, chức năng cần fix bug và đưa vào sprint sau.'),
    bullet('> 90%: Test case pass cao, chức năng chỉ cần fix defect nhỏ.'),
  ]);
}

/* ---- Bảng test case dùng chung cho Test Case và Test Execute -------------- */

const CASE_HEADERS = ['No.', 'Test Requirement ID', 'Test Case ID', 'Mục tiêu kiểm thử',
  'Điều kiện tiên quyết', 'Step #', 'Hành động', 'Dữ liệu kiểm thử', 'Kết quả mong đợi'];

const CASE_WIDTHS = [6, 18, 14, 42, 26, 8, 44, 28, 52];

function writeCaseRows(sheet, suite, { withResult = false, run = {} } = {}) {
  suite.cases.forEach((tc, index) => {
    tc.steps.forEach(([action, data, expected], step) => {
      const first = step === 0;
      const outcome = run[tc.tc];
      const values = [
        first ? index + 1 : '',
        first ? tc.tr : '',
        first ? tc.tc : '',
        first ? tc.goal : '',
        first ? 'Đã đăng nhập bằng tài khoản Chủ hệ thống' : '',
        step + 1,
        action,
        data,
        expected,
      ];
      if (withResult) {
        values.push(first ? (outcome?.result ?? 'Pass') : '');
        values.push(first ? (outcome?.note ?? '') : '');
      }
      const row = dataRow(sheet, values);
      if (withResult && first && outcome?.result === 'Fail') {
        row.getCell(10).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFC00000' } };
      }
    });
  });
}

function writeRequirementsSheet(book, suite, designer, date) {
  const sheet = book.addWorksheet('Test Requirements');
  sheetTitle(sheet, 'Thông tin chung', 6);
  infoRows(sheet, [
    ['Dự án', PROJECT.name],
    ['Module', suite.module],
    ['Người thiết kế test', designer],
    ['Người review', PROJECT.mentor],
    ['Ngày thiết kế test', date],
  ]);
  blank(sheet);
  sheetTitle(sheet, 'Danh sách Test Requirement', 6);
  headerRow(sheet, ['No.', 'Test Requirement ID', 'Mô tả Test Requirement', 'Test Type', 'Mức độ quan trọng', 'Số lượng Test Case']);
  suite.requirements.forEach((r, i) => dataRow(sheet, [i + 1, r[0], r[1], r[2], r[3], 1]));
  setWidths(sheet, [6, 20, 62, 14, 18, 18]);
}

/* ---- 4.3 Test Case -------------------------------------------------------- */

async function testCases(dir) {
  for (const suite of SUITES) {
    const book = newBook();
    lookupSheet(book);

    const cover = book.addWorksheet('Cover Page');
    sheetTitle(cover, 'GUI & FUNCTIONAL TEST CASES', 4);
    cover.addRow([`cho ${PROJECT.name}`]).font = { name: 'Calibri', size: 14, bold: true };
    blank(cover);
    headerRow(cover, ['Phiên bản', 'Ngày', 'Người thực hiện', 'Mô tả thay đổi']);
    dataRow(cover, [1, DOC_DATE.testCase, TESTER, 'Tạo tài liệu']);
    setWidths(cover, [14, 16, 26, 40]);

    const sheet = book.addWorksheet('Test Cases');
    sheetTitle(sheet, `Test Cases for '${suite.fn}' function - Module ${suite.module}`, 9);
    blank(sheet);
    infoRows(sheet, [
      ['Dự án', PROJECT.name],
      ['Module', suite.module],
      ['Người thiết kế test', TESTER],
      ['Người review', PROJECT.mentor],
      ['Ngày thiết kế test', DOC_DATE.testCase],
    ]);
    blank(sheet);
    headerRow(sheet, CASE_HEADERS);
    writeCaseRows(sheet, suite);
    setWidths(sheet, CASE_WIDTHS);

    writeRequirementsSheet(book, suite, TESTER, DOC_DATE.testCase);
    await save(book, join(dir, `SEP-${N}-Testcase-${suite.key}.xlsx`));
  }
  return SUITES.length;
}

/* ---- 4.4 Test Execute ----------------------------------------------------- */

async function testExecutes(dir) {
  for (const suite of SUITES) {
    const book = newBook();
    lookupSheet(book);

    const hasFail = Object.keys(suite.run1).length > 0;

    const cover = book.addWorksheet('Cover Page');
    sheetTitle(cover, 'FUNCTIONAL TEST EXECUTE', 4);
    cover.addRow([`cho ${PROJECT.name}`]).font = { name: 'Calibri', size: 14, bold: true };
    blank(cover);
    headerRow(cover, ['Phiên bản', 'Ngày', 'Người thực hiện', 'Mô tả thay đổi']);
    dataRow(cover, [1, DOC_DATE.testExecute1, TESTER, 'Tạo tài liệu']);
    if (hasFail) dataRow(cover, [1.1, DOC_DATE.testExecute2, TESTER, 'Chạy lại sau khi fix defect']);
    setWidths(cover, [14, 16, 26, 40]);

    const headers = [...CASE_HEADERS, 'Kết quả', 'Ghi chú'];
    const widths = [...CASE_WIDTHS, 12, 56];

    const run1 = book.addWorksheet('Test Execute Lan 1');
    sheetTitle(run1, `Test Execute for '${suite.fn}' function - Lần chạy 1`, 11);
    blank(run1);
    infoRows(run1, [
      ['Dự án', PROJECT.name],
      ['Module', suite.module],
      ['Người thực thi test', TESTER],
      ['Người review', PROJECT.mentor],
      ['Ngày thực thi test', DOC_DATE.testExecute1],
    ]);
    blank(run1);
    headerRow(run1, headers);
    writeCaseRows(run1, suite, { withResult: true, run: suite.run1 });
    setWidths(run1, widths);

    const run2 = book.addWorksheet('Test Execute Lan 2');
    sheetTitle(run2, `Test Execute for '${suite.fn}' function - Lần chạy 2${hasFail ? ' (sau khi fix defect)' : ''}`, 11);
    blank(run2);
    infoRows(run2, [
      ['Dự án', PROJECT.name],
      ['Module', suite.module],
      ['Người thực thi test', TESTER],
      ['Người review', PROJECT.mentor],
      ['Ngày thực thi test', DOC_DATE.testExecute2],
    ]);
    blank(run2);
    headerRow(run2, headers);
    writeCaseRows(run2, suite, { withResult: true, run: {} });
    setWidths(run2, widths);

    writeRequirementsSheet(book, suite, TESTER, DOC_DATE.testCase);
    await save(book, join(dir, `SEP-${N}-TestExecute-${suite.key}.xlsx`));
  }
  return SUITES.length;
}

/* ---- 4.5 Defect Report ---------------------------------------------------- */

async function defectReport(dir) {
  const book = newBook();

  const info = book.addWorksheet('Info');
  sheetTitle(info, `DEFECT REPORT — ${PROJECT.name}`, 2);
  blank(info);
  infoRows(info, [
    ['Dự án', PROJECT.name],
    ['Ngày bắt đầu', DOC_DATE.defect],
    ['Tổ chức', PROJECT.org],
    ['Product Owner', PRODUCT_OWNER],
    ['Scrum Master', SCRUM_MASTER],
    ['Mentor', PROJECT.mentor],
  ]);
  setWidths(info, [24, 70]);

  const sheet = book.addWorksheet('DefectReport');
  headerRow(sheet, ['Defect ID', 'Module', 'Release', 'Tóm tắt', 'Mô tả', 'Các bước tái hiện lỗi',
    'Kết quả mong đợi', 'Kết quả thực tế', 'Mức độ nghiêm trọng', 'Độ ưu tiên', 'Người phụ trách', 'Trạng thái']);
  for (const d of DEFECTS) dataRow(sheet, d);
  setWidths(sheet, [11, 22, 9, 42, 56, 44, 40, 40, 14, 12, 22, 12]);

  await save(book, join(dir, `4.5 SEP_${N}_DefectReport_Sprint1_Ver1.0.xlsx`));
}

/* ---- 4.6 Test Report ------------------------------------------------------ */

async function testReport(dir) {
  const book = newBook();
  const total = (rows, i) => rows.reduce((s, r) => s + r[i], 0);

  const info = book.addWorksheet('Info');
  sheetTitle(info, `TEST REPORT — ${PROJECT.name}`, 2);
  blank(info);
  infoRows(info, [
    ['Dự án', PROJECT.name],
    ['Tổ chức', PROJECT.org],
    ['Product Owner', PRODUCT_OWNER],
    ['Scrum Master', SCRUM_MASTER],
    ['Tester', TESTER],
    ['Sprint', `Sprint 1 (${SPRINTS[1].from} - ${SPRINTS[1].to})`],
  ]);
  setWidths(info, [24, 70]);

  const run1 = book.addWorksheet('Functional Report Lan 1');
  sheetTitle(run1, 'BÁO CÁO TỔNG HỢP KIỂM THỬ', 5);
  blank(run1);
  headerRow(run1, ['Chức năng', 'Số lượng test case đã thực thi', 'Passed', 'Failed', 'Cancel']);
  for (const r of TEST_REPORT_ROWS) dataRow(run1, [...r, '']);
  dataRow(run1, ['TỔNG CỘNG', total(TEST_REPORT_ROWS, 1), total(TEST_REPORT_ROWS, 2), total(TEST_REPORT_ROWS, 3), ''], { bold: true });
  setWidths(run1, [44, 28, 12, 12, 12]);

  const run2 = book.addWorksheet('Functional Report Lan 2');
  sheetTitle(run2, 'BÁO CÁO TỔNG HỢP KIỂM THỬ (sau khi fix defect)', 5);
  blank(run2);
  headerRow(run2, ['Chức năng', 'Số lượng test case đã thực thi', 'Passed', 'Failed', 'Cancel']);
  for (const r of TEST_REPORT_ROWS) dataRow(run2, [r[0], r[1], r[1], 0, '']);
  dataRow(run2, ['TỔNG CỘNG', total(TEST_REPORT_ROWS, 1), total(TEST_REPORT_ROWS, 1), 0, ''], { bold: true });
  setWidths(run2, [44, 28, 12, 12, 12]);

  const uat = book.addWorksheet('Acceptance Test Report');
  sheetTitle(uat, 'BÁO CÁO NGHIỆM THU CỦA KHÁCH HÀNG', 4);
  blank(uat);
  headerRow(uat, ['Chức năng', 'Passed', 'Failed', 'Ghi chú']);
  for (const r of TEST_REPORT_ROWS) dataRow(uat, [r[0], 'x', '', '']);
  dataRow(uat, [`TỔNG CỘNG (${TEST_REPORT_ROWS.length})`, TEST_REPORT_ROWS.length, 0, ''], { bold: true });
  setWidths(uat, [44, 12, 12, 40]);

  await save(book, join(dir, `4.6 SEP-${N}-TestReportSprint1_Ver1.0.xlsx`));
}

/* ---- 4.7 User Acceptance -------------------------------------------------- */

async function userAcceptance(dir) {
  await writeDocx(join(dir, `SEP-${N}-USER-ACCEPTANCE-Sprint1-ver1.0.docx`), [
    title('BIÊN BẢN NGHIỆM THU'),
    subtitle(`Sprint 1 — ${PROJECT.name}`),

    h1('1. Thông tin chung'),
    table(['Hạng mục', 'Nội dung'], [
      ['Dự án', PROJECT.name],
      ['Nhóm thực hiện', PROJECT.org],
      ['Khách hàng', PROJECT.customer],
      ['Sprint nghiệm thu', `Sprint 1 (${SPRINTS[1].from} - ${SPRINTS[1].to})`],
      ['Ngày nghiệm thu', DOC_DATE.acceptance],
    ], [26, 74]),

    h1('2. Nội dung nghiệm thu'),
    p('Khách hàng đã trực tiếp thao tác trên hệ thống theo các kịch bản nghiệp vụ thực tế của tiệm và xác nhận kết quả như sau:'),
    table(['STT', 'Chức năng', 'Đạt', 'Không đạt', 'Ghi chú'],
      TEST_REPORT_ROWS.map((r, i) => [String(i + 1), r[0], 'x', '', '']),
      [7, 47, 10, 13, 23]),

    h1('3. Kết luận'),
    p('Khách hàng đồng ý nghiệm thu các chức năng của Sprint 1. Hai lỗi phát hiện trong quá trình kiểm thử (DF.01 — thu tiền hai lần, DF.02 — lỗi tải dữ liệu hiển thị nhầm) đã được sửa và kiểm thử lại đạt trước khi nghiệm thu.'),
    p('Ý kiến khác của khách hàng: ........................................................................'),
    spacer(),
    p('..........................................................................................................'),
    spacer(),
    spacer(),
    p(`HCMC, ......../......../${SPRINTS[1].to.slice(-4)}`),
    spacer(),
    table(['ĐẠI DIỆN NHÓM THỰC HIỆN', 'ĐẠI DIỆN KHÁCH HÀNG'], [
      ['(Ký và ghi rõ họ tên)', '(Ký và ghi rõ họ tên)'],
      ['\n\n\n', '\n\n\n'],
      [SCRUM_MASTER, PROJECT.customer],
    ], [50, 50]),
  ]);
}

export async function buildTesting(dirs) {
  await testPlan(dirs.test);
  const cases = await testCases(dirs.testCase);
  const execs = await testExecutes(dirs.testExec);
  await defectReport(dirs.defect);
  await testReport(dirs.testReport);
  await userAcceptance(dirs.acceptance);
  return 1 + cases + execs + 3;
}

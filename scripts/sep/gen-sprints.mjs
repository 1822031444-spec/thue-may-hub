/**
 * Tài liệu theo sprint cho Sprint 2 và Sprint 3, mỗi sprint 6 file: Sprint Plan,
 * Retrospective, Sprint Backlog Items, Defect Report, Test Report, User Acceptance.
 *
 * Cùng khuôn với bản Sprint 1 trong gen-pm.mjs / gen-test.mjs. Việc lấy từ
 * tasks.mjs, lỗi và kết quả kiểm thử lấy từ sprints.mjs.
 */

import { join } from 'node:path';
import {
  JOBS, member, PRODUCT_OWNER, PROJECT, READERS, roleLabel, SCRUM_MASTER, SPRINTS, TEAM, TESTER,
} from './data.mjs';
import { TASKS } from './tasks.mjs';
import { sprintNow, STORIES } from './progress.mjs';
import { DEFECT_LOG, SPRINT_DOCS } from './sprints.mjs';
import { bullet, h1, h2, p, readersTable, revisionHistory, spacer, subtitle, table, title, writeDocx } from './docx-kit.mjs';
import { blank, dataRow, headerRow, infoRows, newBook, save, setWidths, sheetTitle, subTitle } from './xlsx-kit.mjs';

const N = PROJECT.code;

/** Việc thuộc sprint n tính theo sprint hiện tại (việc chuyển sprint tính ở sprint mới). */
const tasksOf = (n) => TASKS.filter((t) => sprintNow(t) === n);
const storiesOf = (n) => STORIES.filter((s) => s.sprint === n);
const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0);
/** Tài liệu dùng chữ của bộ mẫu: việc đang làm ghi là Doing. */
const docStatus = (status) => (status === 'In Progress' ? 'Doing' : status);
const range = (s) => `${s.from} - ${s.to}`;

/** Tổng điểm từng người trong sprint, cao xuống thấp. */
function effort(n) {
  const tong = new Map(TEAM.map((m) => [m.name, 0]));
  for (const t of tasksOf(n)) tong.set(member(t.who).name, tong.get(member(t.who).name) + t.points);
  return [...tong].sort((a, b) => b[1] - a[1]);
}

/* ---- 1.1.11 / 1.1.12 Sprint Plan ------------------------------------------ */

async function sprintPlan(dir, sd) {
  const n = sd.no;
  const rows = [];
  let i = 0;
  for (const s of storiesOf(n)) {
    const tasks = s.tasks.filter((t) => sprintNow(t) === n);
    i += 1;
    const carried = s.planned !== n ? ` (chuyển từ Sprint ${s.planned})` : '';
    rows.push([`${i}.0`, `${s.code} — ${s.story}${carried}`, String(sum(tasks, (t) => t.points)), s.priority, PRODUCT_OWNER]);
    tasks.forEach((t, k) => rows.push([
      `${i}.${k + 1}`, `   - ${t.code} [${JOBS[t.job].label}] ${t.title}`, String(t.points), s.priority, member(t.who).name,
    ]));
  }
  for (const t of tasksOf(n).filter((x) => x.story === '-')) {
    i += 1;
    rows.push([`${i}.0`, `${t.code} ${t.title}`, String(t.points), 'High', member(t.who).name]);
  }

  const total = sum(tasksOf(n), (t) => t.points);
  await writeDocx(join(dir, `1.1.${10 + n - 1} SEP-${N}-Sprint${n}Plan-ver${sd.plan.version}.docx`), [
    title(`SPRINT ${n} PLAN`),
    subtitle(PROJECT.name),
    ...revisionHistory(sd.plan.revisions),

    h1('1. Giới thiệu'),
    h2('1.1. Mục đích tài liệu'),
    p(`Tài liệu mô tả kế hoạch của Sprint ${n}: mục tiêu, các hạng mục cần làm, người phụ trách và story point ước lượng.`),
    h2('1.2. Đối tượng đọc'),
    readersTable(READERS),

    h1('2. Lịch trình Sprint'),
    table(['STT', 'Sprint #', 'Thời lượng', 'Ngày bắt đầu', 'Ngày kết thúc', 'Tuần bắt đầu', 'Tuần kết thúc'],
      SPRINTS.map((s, k) => [String(k + 1), s.name, `${s.days} ngày`, s.from, s.to, s.weekFrom, s.weekTo]),
      [7, 14, 14, 17, 17, 15, 16]),

    h1(`3. Mục tiêu Sprint ${n}`),
    p(sd.goal),

    h1('4. Nhân sự và phân bổ story point'),
    table(['STT', 'Tên', 'Vai trò', 'Story point'],
      TEAM.map((m) => [String(m.no), m.name, roleLabel(m), String(sum(tasksOf(n).filter((t) => t.who === m.alias), (t) => t.points))]),
      [8, 32, 42, 18]),
    p(`Tổng: ${total} story point, ${tasksOf(n).length} việc, ${storiesOf(n).length} user story.`),

    h1(`5. Sprint ${n} Backlog`),
    table(['STT', 'User Story / Công việc', 'Story Point', 'Độ ưu tiên', 'Người thực hiện'], rows, [7, 50, 11, 12, 20]),

    h1('6. Tài liệu tham khảo'),
    p(`SEP_${N}_Milestone_ver1.0.xlsx`),
    p(`SEP_${N}_ProductBacklog_ver1.0.xlsx`),
    p(`SEP_${N}_Sprint${n}_BacklogItems.xlsx`),
  ]);
}

/* ---- 1.2.2 Retrospective -------------------------------------------------- */

async function retrospective(dir, sd) {
  const n = sd.no;
  const tasks = tasksOf(n);
  const done = tasks.filter((t) => t.status === 'Done');
  const open = tasks.filter((t) => t.status !== 'Done');
  const found = DEFECT_LOG.filter((d) => d.release === n);
  const carried = DEFECT_LOG.filter((d) => d.release <= n && d.closedIn > n);
  const top = effort(n).slice(0, 2).map(([ten, diem]) => `${ten} (${diem} điểm)`).join(' và ');

  const burndown = [
    `${done.length}/${tasks.length} việc của Sprint ${n} đã hoàn thành (${sum(done, (t) => t.points)}/${sum(tasks, (t) => t.points)} story point).`,
    open.length ? `Còn lại: ${open.map((t) => `${t.code} ${t.title}`).join('; ')} — chốt tại buổi họp ngày ${sd.date.retro}.` : '',
    `${found.length} defect phát hiện trong sprint (${found.map((d) => d.id).join(', ')}).`,
    carried.length ? `${carried.map((d) => d.id).join(', ')} chưa sửa xong, chuyển sang Sprint ${n + 1}.` : 'Tất cả đã sửa và kiểm thử lại đạt.',
  ].filter(Boolean).join(' ');

  await writeDocx(join(dir, `1.2.2 SEP_${N}_RetrospectiveSummaryReportSprint${n}.docx`), [
    title('RETROSPECTIVE SUMMARY REPORT'),
    subtitle(`Sprint ${n} — ${PROJECT.name}`),
    p(`Ngày lập: ${sd.date.retro}`),
    p(`Người lập: ${sd.retroAuthor}`),
    ...(sd.draft ? [p(`BẢN NHÁP — lập trước buổi họp Retrospective Sprint ${n}. Cả nhóm rà lại từng mục tại buổi họp ngày ${sd.date.retro} rồi mới chốt.`, { bold: true })] : []),

    h1('Tóm tắt'),
    table(['Hạng mục', 'Nội dung'], [
      ['Điều phối viên', SCRUM_MASTER],
      ['Người tham gia', TEAM.map((m) => m.name).join(', ')],
      ['Người hỗ trợ', PROJECT.mentor],
      ['Số liệu', `Họp Retrospective Sprint ${n}: ${(PROJECT.memberCount * 0.75).toFixed(2)} giờ (thời lượng x số người tham gia)`],
    ], [24, 76]),

    h1('Điều đã làm tốt'),
    table(['Hạng mục', 'Ghi nhận'], sd.retro.good, [24, 76]),
    h1('Điều cần cải thiện'),
    table(['Hạng mục', 'Ghi nhận'], sd.retro.improve, [24, 76]),
    h1('Bài học kinh nghiệm'),
    table(['Hạng mục', 'Bài học'], sd.retro.lessons, [24, 76]),
    h1('Kết luận'),
    table(['Hạng mục', 'Nội dung'], [
      ['Điều cần duy trì', sd.retro.keep],
      ['Điều cần thay đổi', sd.retro.change],
    ], [24, 76]),

    h1(`Công sức thực hiện Sprint ${n}`),
    table(['Thành viên', 'Story point'], effort(n).map(([ten, diem]) => [ten, String(diem)]), [70, 30]),
    p(`Theo Sprint ${n} Backlog Items, ${top} có tổng effort cao nhất. Trung bình mỗi thành viên khoảng 60 giờ công (tối thiểu 20 giờ/tuần).`),

    h1(`Sprint ${n} Burndown`),
    p(burndown),
  ]);
}

/* ---- 1.2.6 Sprint Backlog Items ------------------------------------------- */

async function backlogItems(dir, sd) {
  const n = sd.no;
  const tasks = tasksOf(n);
  const book = newBook();
  const sheet = book.addWorksheet(`Sprint ${n} Backlog Items`);
  sheetTitle(sheet, `SPRINT ${n} BACKLOG ITEMS — ${PROJECT.name}`, 6);
  subTitle(sheet, `${SPRINTS[n].name}: ${range(SPRINTS[n])}`, 6);
  blank(sheet);
  headerRow(sheet, ['Task ID', 'User Story', 'Công việc', 'Người thực hiện', 'Trạng thái', 'Story Point']);
  for (const t of tasks) dataRow(sheet, [t.code, t.story, t.title, member(t.who).name, docStatus(t.status), t.points]);
  blank(sheet);
  dataRow(sheet, ['', '', 'TỔNG STORY POINT', '', '', sum(tasks, (t) => t.points)], { bold: true });
  dataRow(sheet, ['', '', 'ĐÃ HOÀN THÀNH', '', 'Done', sum(tasks.filter((t) => t.status === 'Done'), (t) => t.points)], { bold: true });
  setWidths(sheet, [10, 12, 70, 24, 14, 13]);
  await save(book, join(dir, `1.2.6 SEP_${N}_Sprint${n}_BacklogItems.xlsx`));
}

/* ---- 4.5 Defect Report ---------------------------------------------------- */

async function defectReport(dir, sd) {
  const n = sd.no;
  const book = newBook();

  const info = book.addWorksheet('Info');
  sheetTitle(info, `DEFECT REPORT — ${PROJECT.name}`, 2);
  blank(info);
  infoRows(info, [
    ['Dự án', PROJECT.name],
    ['Sprint', `Sprint ${n} (${range(SPRINTS[n])})`],
    ['Ngày bắt đầu', sd.date.defect],
    ['Tổ chức', PROJECT.org],
    ['Product Owner', PRODUCT_OWNER],
    ['Scrum Master', SCRUM_MASTER],
    ['Tester', TESTER],
    ['Mentor', PROJECT.mentor],
    ['Ghi chú', 'Danh sách cộng dồn từ Sprint 1; Release là sprint phát hiện lỗi'],
  ]);
  setWidths(info, [24, 70]);

  const sheet = book.addWorksheet('DefectReport');
  headerRow(sheet, ['Defect ID', 'Module', 'Release', 'Tóm tắt', 'Mô tả', 'Các bước tái hiện lỗi',
    'Kết quả mong đợi', 'Kết quả thực tế', 'Mức độ nghiêm trọng', 'Độ ưu tiên', 'Người phụ trách', 'Trạng thái']);
  for (const d of DEFECT_LOG.filter((x) => x.release <= n)) {
    dataRow(sheet, [d.id, d.module, d.release, d.summary, d.desc, d.steps, d.expected, d.actual,
      d.severity, d.priority, d.owner, d.closedIn <= n ? 'Done' : 'Open']);
  }
  setWidths(sheet, [11, 22, 9, 42, 56, 44, 40, 40, 14, 12, 22, 12]);

  await save(book, join(dir, `4.5 SEP_${N}_DefectReport_Sprint${n}_Ver1.0.xlsx`));
}

/* ---- 4.6 Test Report ------------------------------------------------------ */

async function testReport(dir, sd) {
  const n = sd.no;
  const rows = sd.tests;
  const book = newBook();
  const checks = sum(rows, (r) => r.checks);
  const failed = sum(rows, (r) => r.defects.length);
  const headers = ['Chức năng', 'User story', 'Bài test tự động', 'Số điểm kiểm tra đã thực thi', 'Passed', 'Failed', 'Cancel', 'Defect'];
  const widths = [52, 16, 34, 16, 10, 10, 10, 18];

  const info = book.addWorksheet('Info');
  sheetTitle(info, `TEST REPORT — ${PROJECT.name}`, 2);
  blank(info);
  infoRows(info, [
    ['Dự án', PROJECT.name],
    ['Tổ chức', PROJECT.org],
    ['Product Owner', PRODUCT_OWNER],
    ['Scrum Master', SCRUM_MASTER],
    ['Tester', TESTER],
    ['Sprint', `Sprint ${n} (${range(SPRINTS[n])})`],
    ['Ngày lập', sd.date.report],
    ['Cách kiểm thử', 'Bài test tự động trong thư mục scripts/, chạy trên database thử nghiệm (server cổng 8788; giao diện mới cổng 8789)'],
    ['Điểm kiểm tra', 'Mỗi điều kiện một bài test xác nhận (ví dụ "ví không âm", "nhân viên bị chặn 403") tính là một điểm'],
  ]);
  setWidths(info, [24, 90]);

  const run1 = book.addWorksheet('Functional Report Lan 1');
  sheetTitle(run1, `BÁO CÁO TỔNG HỢP KIỂM THỬ — lần 1 (${sd.date.exec1})`, headers.length);
  blank(run1);
  headerRow(run1, headers);
  for (const r of rows) {
    const line = dataRow(run1, [r.fn, r.stories, r.files.join('\n'), r.checks, r.checks - r.defects.length, r.defects.length, '', r.defects.join(', ')]);
    if (r.defects.length) line.getCell(6).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFC00000' } };
  }
  dataRow(run1, ['TỔNG CỘNG', '', '', checks, checks - failed, failed, '', ''], { bold: true });
  setWidths(run1, widths);

  const run2 = book.addWorksheet('Functional Report Lan 2');
  sheetTitle(run2, `BÁO CÁO TỔNG HỢP KIỂM THỬ — lần 2, sau khi fix defect (${sd.date.exec2})`, headers.length);
  blank(run2);
  headerRow(run2, headers);
  for (const r of rows) dataRow(run2, [r.fn, r.stories, r.files.join('\n'), r.checks, r.checks, 0, '', '']);
  dataRow(run2, ['TỔNG CỘNG', '', '', checks, checks, 0, '', ''], { bold: true });
  setWidths(run2, widths);

  const how = book.addWorksheet('Cach chay lai');
  sheetTitle(how, 'CÁCH CHẠY LẠI CÁC BÀI TEST', 3);
  blank(how);
  infoRows(how, [
    ['Bước 1', 'Chạy server thử: đặt PORT=8788 và DATABASE_PATH trỏ tới một file database thử, rồi chạy npx tsx server/index.ts'],
    ['Bước 2', 'Chạy từng lệnh ở bảng dưới; kết quả cuối mỗi bài là PASS hoặc mã thoát 0'],
    ['Giao diện mới', 'npm run hub:reset, rồi npm run hub:start (cổng 8789), rồi chạy test:hub hoặc test:hub-ui; xong chạy lại hub:reset'],
  ]);
  blank(how);
  headerRow(how, ['Chức năng', 'Bài test', 'Lệnh']);
  for (const r of rows) dataRow(how, [r.fn, r.files.join('\n'), r.cmds.join('\n')]);
  setWidths(how, [52, 34, 30]);

  const stories = storiesOf(n);
  const uat = book.addWorksheet('Acceptance Test Report');
  sheetTitle(uat, 'BÁO CÁO NGHIỆM THU CỦA KHÁCH HÀNG', 4);
  subTitle(uat, `Điền sau buổi nghiệm thu ngày ${sd.date.acceptance}, theo biên bản User Acceptance Sprint ${n}`, 4);
  blank(uat);
  headerRow(uat, ['Chức năng', 'Passed', 'Failed', 'Ghi chú']);
  for (const s of stories) dataRow(uat, [`${s.code} — ${s.story}`, '', '', '']);
  dataRow(uat, [`TỔNG CỘNG (${stories.length})`, '', '', ''], { bold: true });
  setWidths(uat, [70, 12, 12, 40]);

  await save(book, join(dir, `4.6 SEP-${N}-TestReportSprint${n}_Ver1.0.xlsx`));
}

/* ---- 4.7 User Acceptance -------------------------------------------------- */

async function userAcceptance(dir, sd) {
  const n = sd.no;
  const found = DEFECT_LOG.filter((d) => d.release === n);
  const carried = DEFECT_LOG.filter((d) => d.release <= n && d.closedIn > n);
  const fixed = found.filter((d) => d.closedIn <= n);

  await writeDocx(join(dir, `SEP-${N}-USER-ACCEPTANCE-Sprint${n}-ver1.0.docx`), [
    title('BIÊN BẢN NGHIỆM THU'),
    subtitle(`Sprint ${n} — ${PROJECT.name}`),

    h1('1. Thông tin chung'),
    table(['Hạng mục', 'Nội dung'], [
      ['Dự án', PROJECT.name],
      ['Nhóm thực hiện', PROJECT.org],
      ['Khách hàng', PROJECT.customer],
      ['Sprint nghiệm thu', `Sprint ${n} (${range(SPRINTS[n])})`],
      ['Ngày nghiệm thu', sd.date.acceptance],
    ], [26, 74]),

    h1('2. Nội dung nghiệm thu'),
    p('Khách hàng trực tiếp thao tác trên hệ thống theo kịch bản nghiệp vụ thực tế của tiệm, rồi đánh dấu “x” vào cột Đạt hoặc Không đạt cho từng chức năng:'),
    table(['STT', 'Chức năng (user story)', 'Đạt', 'Không đạt', 'Ghi chú'],
      storiesOf(n).map((s, k) => [String(k + 1), `${s.code} — ${s.story}`, '', '', '']),
      [7, 55, 9, 11, 18]),

    h1('3. Lỗi phát hiện trong sprint'),
    p(fixed.length
      ? `${fixed.map((d) => `${d.id} — ${d.summary}`).join('; ')}: đã sửa và kiểm thử lại đạt trước buổi nghiệm thu.`
      : 'Không có lỗi mới.'),
    ...(carried.length ? [p(`${carried.map((d) => `${d.id} — ${d.summary}`).join('; ')}: chưa sửa xong, chuyển sang Sprint ${n + 1}.`)] : []),

    h1('4. Kết luận'),
    p('Khách hàng đồng ý / không đồng ý (gạch phần không chọn) nghiệm thu các chức năng đánh dấu Đạt ở mục 2.'),
    p('Ý kiến khác của khách hàng: ........................................................................'),
    spacer(),
    p('..........................................................................................................'),
    spacer(),
    spacer(),
    p(`HCMC, ......../......../${SPRINTS[n].to.slice(-4)}`),
    spacer(),
    table(['ĐẠI DIỆN NHÓM THỰC HIỆN', 'ĐẠI DIỆN KHÁCH HÀNG'], [
      ['(Ký và ghi rõ họ tên)', '(Ký và ghi rõ họ tên)'],
      ['\n\n\n', '\n\n\n'],
      [SCRUM_MASTER, PROJECT.customer],
    ], [50, 50]),
  ]);
}

/* ---- Xuất --------------------------------------------------------------- */

export async function buildSprints(dirs) {
  for (const sd of SPRINT_DOCS) {
    await sprintPlan(dirs.planning, sd);
    await retrospective(dirs.tracking, sd);
    await backlogItems(dirs.tracking, sd);
    await defectReport(dirs.defect, sd);
    await testReport(dirs.testReport, sd);
    await userAcceptance(dirs.acceptance, sd);
  }
  return SPRINT_DOCS.length * 6;
}

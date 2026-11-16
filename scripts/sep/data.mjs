/**
 * Nguồn dữ liệu duy nhất cho toàn bộ bộ tài liệu SEP của Nhóm 11.
 *
 * Bộ mẫu nhấn mạnh một nguyên tắc: mọi tài liệu phải khớp nhau — tên chức năng
 * trong Function List phải trùng Traceability Matrix, trùng Test Case, trùng
 * schema trong Database Design. Gom hết vào một file để không thể lệch nhau.
 */

/* ---- Thông tin chung ------------------------------------------------------ */

export const PROJECT = {
  code: 'Nhom11',
  name: 'Hệ thống Quản lý Cho thuê Máy tính & Boxphone – Thuê Máy Hub',
  shortName: 'Thuê Máy Hub',
  org: 'Nhóm 11 - CTIN',
  className: 'Nhóm 11',
  mentor: '[Giảng viên hướng dẫn]',
  customer: 'Ông/Bà [Tên khách hàng] – Chủ tiệm cho thuê máy Thuê Máy Hub',
  customerShort: 'Chủ tiệm cho thuê máy',
  tech: {
    frontend: 'ReactJS + TypeScript (TanStack Start, Tailwind CSS)',
    // Bản desktop Electron vẫn đóng gói giao diện thế hệ đầu trong src/.
    frontendDesktop: 'ReactJS + TypeScript (Vite)',
    backend: 'Node.js (Express)',
    database: 'SQLite (node:sqlite)',
    desktop: 'Electron',
  },
  weeks: 12,
  memberCount: 5,
};

/* ---- Thành viên ----------------------------------------------------------- */

/**
 * `email` là email tài khoản Jira của từng người. Điền đúng thì file nhập Jira tự
 * gán người thực hiện; để `[email]` thì Jira để trống, gán lại theo nhãn sau.
 * `alias` là tên không dấu dùng làm nhãn Jira (nhãn không được có dấu cách).
 */
export const TEAM = [
  { no: 1, name: 'Phạm Văn Đức Phú', alias: 'Phu', mssv: '1822031444', skill: 'UX/UI, Backend', scrum: 'Scrum Master', role: 'Backend, UX/UI', email: '[email]', phone: '[SĐT]' },
  { no: 2, name: 'Đỗ Tuấn Thành', alias: 'Thanh', mssv: '1822031313', skill: 'Backend', scrum: 'Product Owner', role: 'Backend', email: '[email]', phone: '[SĐT]' },
  { no: 3, name: 'Đào Việt Anh', alias: 'VietAnh', mssv: '1822031301', skill: 'Frontend, Tester', scrum: 'Developer Team', role: 'Frontend', email: '[email]', phone: '[SĐT]' },
  { no: 4, name: 'Hồ Sỹ Vinh', alias: 'Vinh', mssv: '1822041511', skill: 'Tester', scrum: 'Tester', role: 'Tester', email: '[email]', phone: '[SĐT]' },
  { no: 5, name: 'Nguyễn Minh Phát', alias: 'Phat', mssv: '1822041808', skill: 'Database', scrum: 'Developer Team', role: 'Database, Frontend', email: '[email]', phone: '[SĐT]' },
];

/**
 * Loại việc, hiện thành nhãn [BE]/[DB]/… ở đầu tiêu đề việc trên Jira.
 *
 * Nhóm tự chốt: Phú + Thành làm Backend, Việt Anh làm Frontend, Phát làm Database
 * và một phần Frontend, Vinh test. Phú kiêm UX/UI theo đúng thế mạnh đã khai. Việc
 * quy trình (Retrospective, Backlog, nghiệm thu) mang mã `PM`, rải cho người đang
 * ít điểm hơn để tổng điểm mỗi người gần bằng nhau.
 */
export const JOBS = {
  BE: { name: 'Backend', label: 'BE', mo: 'Endpoint Express, quy tắc nghiệp vụ, luồng tiền, phân quyền, API cổng khách, khoá mạng, Telegram' },
  DB: { name: 'Database', label: 'DB', mo: 'Thiết kế bảng SQLite, khoá ngoại, chỉ mục, truy vấn báo cáo và tồn kho, sao lưu và phục hồi' },
  UI: { name: 'UX/UI', label: 'UI', mo: 'Prototype, màu/chữ/CSS, khung trang dùng chung, khung cổng khách hàng và trang giới thiệu' },
  FE: { name: 'Frontend', label: 'FE', mo: 'Các trang React của quản trị và cổng khách hàng, trạng thái tải/lỗi/rỗng, bản desktop Electron' },
  QA: { name: 'Tester', label: 'QA', mo: 'Test case, test tự động trong scripts/, dữ liệu test, defect, test report từng sprint' },
  PM: { name: 'Quản lý dự án', label: 'PM', mo: 'Retrospective, cập nhật Product Backlog và Traceability Matrix, nghiệm thu' },
};

export const member = (alias) => TEAM.find((m) => m.alias === alias);
const ten = (alias) => member(alias).name;

export const SCRUM_MASTER = ten('Phu');
export const PRODUCT_OWNER = ten('Thanh');
export const TESTER = ten('Vinh');
/** Tài liệu gọi theo chỉ số: [0] lo luồng tiền, [2] lo thiết bị & kiến trúc. */
export const DEVS = [ten('Thanh'), ten('VietAnh'), ten('Phat')];
export const DESIGNER = ten('Phu');
export const DBA = ten('Phat');

/** Nhãn vai trò đầy đủ; tránh lặp kiểu "Tester / Tester". */
export function roleLabel(m) {
  return m.scrum === m.role ? m.scrum : `${m.scrum} / ${m.role}`;
}

/** Bảng "Đối tượng đọc" lặp ở đầu gần như mọi tài liệu. */
export const READERS = [
  ...TEAM.map((m) => [m.name, 'Toàn bộ tài liệu']),
  [`${PROJECT.mentor} (Mentor)`, 'Toàn bộ tài liệu'],
  [`${PROJECT.customer} (Khách hàng)`, 'Toàn bộ tài liệu'],
];

/* ---- Lịch dự án ----------------------------------------------------------- */

/** Dự án 12 tuần, bắt đầu thứ Hai 03/08/2026. Sprint 1 vừa kết thúc. */
const START = new Date(2026, 7, 3);

export function dmy(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Ngày thứ `n` của dự án (0 = ngày bắt đầu), dạng dd/mm/yyyy. */
export const projectDay = (n) => dmy(addDays(START, n));

export const WEEKS = Array.from({ length: PROJECT.weeks }, (_, i) => {
  const from = addDays(START, i * 7);
  return {
    week: i + 1,
    from: dmy(from),
    to: dmy(addDays(from, 6)),
    sprint: `Sprint ${Math.floor(i / 3)}`,
  };
});

export const SPRINTS = [0, 1, 2, 3].map((n) => {
  const from = addDays(START, n * 21);
  return {
    no: n,
    name: `Sprint ${n}`,
    days: 21,
    from: dmy(from),
    to: dmy(addDays(from, 20)),
    weekFrom: String(n * 3 + 1).padStart(2, '0'),
    weekTo: String(n * 3 + 3).padStart(2, '0'),
  };
});

/** Ngày tạo từng tài liệu — rải trong Sprint 0 và Sprint 1 cho hợp lý. */
export const DOC_DATE = {
  teamCharter: dmy(addDays(START, 1)),
  projectPlan: dmy(addDays(START, 2)),
  configMgmt: dmy(addDays(START, 2)),
  riskPlan: dmy(addDays(START, 3)),
  riskList: dmy(addDays(START, 3)),
  milestone: dmy(addDays(START, 4)),
  productBacklog: dmy(addDays(START, 5)),
  conops: dmy(addDays(START, 8)),
  functionList: dmy(addDays(START, 9)),
  archDriver: dmy(addDays(START, 10)),
  archDesign: dmy(addDays(START, 12)),
  dbDesign: dmy(addDays(START, 13)),
  testPlan: dmy(addDays(START, 15)),
  sprint1Plan: dmy(addDays(START, 21)),
  meeting: dmy(addDays(START, 30)),
  testCase: dmy(addDays(START, 32)),
  testExecute1: dmy(addDays(START, 36)),
  testExecute2: dmy(addDays(START, 38)),
  defect: dmy(addDays(START, 36)),
  testReport: dmy(addDays(START, 39)),
  traceability: dmy(addDays(START, 40)),
  retrospective: dmy(addDays(START, 41)),
  acceptance: dmy(addDays(START, 41)),
  classDiagram: dmy(addDays(START, 66)),
};

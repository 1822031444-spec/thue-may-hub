/** Phần 3 — SOFTWARE ARCHITECTURE & DESIGN (3 tài liệu). */

import { join } from 'node:path';
import { DBA, DEVS, DOC_DATE, PROJECT, READERS, roleLabel, TEAM } from './data.mjs';
import { DB_RELATIONS, DB_TABLES, FRS, MODULES } from './domain.mjs';
import { bullet, h1, h2, p, readersTable, revisionHistory, subtitle, table, title, writeDocx } from './docx-kit.mjs';

const N = PROJECT.code;

/* ---- Nội dung dùng chung với báo cáo hoàn chỉnh --------------------------- */

export const QUALITY_ATTRIBUTES = [
  ['1', 'Integrity (Toàn vẹn dữ liệu tiền)', 'Không bao giờ được thu vượt số còn nợ hay để số dư ví âm, kể cả khi hai người thao tác cùng lúc trên một đơn', 'High'],
  ['2', 'Security', 'Mật khẩu băm bằng scrypt, cookie phiên không đọc được bằng JavaScript, nhân viên không thấy số liệu tiền tổng', 'High'],
  ['3', 'Usability', 'Giao diện dùng được trên cả máy tính và điện thoại; mọi thao tác tiền đều có xác nhận rõ ràng', 'High'],
  ['4', 'Performance', 'Thao tác tạo đơn và thu tiền phản hồi dưới 1 giây trên máy tính thông thường', 'Medium'],
  ['5', 'Portability', 'Chạy được cả dạng web lẫn ứng dụng desktop offline; dữ liệu mang được sang máy khác', 'Medium'],
  ['6', 'Availability', 'Hệ thống hoạt động ổn định trong giờ mở cửa của tiệm', 'Medium'],
];

export const QA_SCENARIOS = [
  [
    ['Title', 'QAs1 — Không thu vượt số tiền còn nợ của đơn'],
    ['Quality attribute', 'Integrity (Toàn vẹn dữ liệu tiền)'],
    ['Source of stimulus', 'Nhân viên thu ngân'],
    ['Stimulus', 'Bấm nút "Xác nhận thu" hai lần liên tiếp trên cùng một đơn thuê'],
    ['Environment', 'Giờ cao điểm, nhiều khách đến trả tiền cùng lúc'],
    ['System response', 'Hệ thống chỉ ghi nhận một bút toán; yêu cầu thứ hai bị từ chối kèm thông báo rõ ràng'],
    ['Response measure', 'Tổng số tiền đã thu của đơn không bao giờ vượt quá tổng tiền của đơn đó'],
  ],
  [
    ['Title', 'QAs2 — Nhân viên không xem được số liệu tiền tổng của tiệm'],
    ['Quality attribute', 'Security'],
    ['Source of stimulus', 'Tài khoản nhân viên'],
    ['Stimulus', 'Nhân viên gọi trực tiếp API trang Tài chính'],
    ['Environment', 'Vận hành bình thường'],
    ['System response', 'Máy chủ trả về lỗi 403 và loại bỏ các trường tiền khỏi dữ liệu trả về'],
    ['Response measure', 'Không có con số doanh thu, lợi nhuận hay công nợ nào rời khỏi máy chủ'],
  ],
];

export const PHYSICAL_COMPONENTS = [
  ['Client', 'Trình duyệt của người dùng, hoặc cửa sổ ứng dụng desktop'],
  ['Electron Main Process', 'Khởi động máy chủ nội bộ, quản lý cửa sổ và thư mục dữ liệu (chỉ có ở bản desktop)'],
  ['Web Server (Node.js/Express)', 'Xử lý request, kiểm tra quyền, trả dữ liệu qua REST API'],
  ['Bộ quét khoá mạng', 'Chạy định kỳ mỗi phút, tìm đơn quá hạn và chạy lệnh khoá mạng do chủ tiệm cấu hình'],
  ['Database (SQLite)', 'Lưu toàn bộ dữ liệu trong một file duy nhất, bật chế độ WAL'],
];

export const STATIC_LAYERS = [
  ['React View', 'Hiển thị dữ liệu, nhận tương tác người dùng, hiển thị trạng thái đang tải và lỗi'],
  ['Router (Express)', 'Định tuyến request và gắn middleware xác thực'],
  ['Middleware phân quyền', 'Chặn theo vai trò; nhân viên bị chặn ở đây trước khi chạm tới dữ liệu tiền'],
  ['Handler nghiệp vụ', 'Kiểm tra quy tắc nghiệp vụ và ghi dữ liệu'],
  ['Database Layer', 'Mở kết nối SQLite, bật khoá ngoại và chế độ WAL'],
];

export const ARCH_DECISIONS = [
  ['Dùng SQLite thay vì máy chủ cơ sở dữ liệu riêng', 'Tiệm chỉ có một máy vận hành; SQLite chạy trong tiến trình, không cần cài đặt thêm, sao lưu chỉ là chép file'],
  ['Dùng API đồng bộ của node:sqlite', 'Nhờ không có điểm chờ giữa bước đọc và bước ghi, hai yêu cầu thu tiền cùng lúc không thể xen vào nhau'],
  ['Ghi sổ theo ba giá trị thay vì một cột số tiền', 'Tiền thực thu, biến động ví và doanh thu là ba khái niệm khác nhau; gộp một cột sẽ không thể đối chiếu sổ sách'],
  ['Lọc số liệu tiền ngay tại máy chủ', 'Ẩn ở giao diện là không đủ; số liệu tiền không được rời khỏi máy chủ khi người gọi là nhân viên'],
  ['Chỉ thay {ip} và {code} trong lệnh khoá mạng', 'Ghép thẳng dữ liệu người dùng vào câu lệnh hệ thống là lỗ hổng chèn lệnh nghiêm trọng'],
  ['Giao diện mới (ThueMayHub-FE) build thành trang tĩnh, máy chủ Express phục vụ chung một cổng với API', 'Một nguồn duy nhất nên cookie phiên HttpOnly hoạt động mà không cần mở CORS; khi phát triển, route /api/$ của TanStack Start chuyển tiếp yêu cầu sang backend'],
  ['Một màn đăng nhập chung cho ba vai trò, nhưng phiên quản trị và phiên khách vẫn tách biệt', 'Người dùng không phải chọn vai trò; server giữ hai cookie riêng nên mọi quy tắc phân quyền cũ không đổi'],
  ['Giao diện mới dùng lại API sẵn có, chỉ thêm một nhóm nhỏ endpoint /api/hub (đăng nhập chung, đăng ký, hồ sơ, phiếu thu, lịch sử ví, thông tin cửa hàng)', 'Quy tắc tiền, khoá máy và phân quyền chỉ nằm một nơi ở server; đổi giao diện không phải viết lại nghiệp vụ'],
];

/* ---- 3.1 Architecture Driver ---------------------------------------------- */

async function driver(dir) {
  /** Use case sinh thẳng từ Function List để hai tài liệu không bao giờ lệch nhau. */
  const useCases = MODULES.flatMap((m) => m.functions.map(([id, , feature], i) => [
    i === 0 ? String(m.no) : '',
    i === 0 ? m.name : '',
    id.replace('F.', 'UC.'),
    feature,
    i === 0 ? `FR${String(m.no).padStart(2, '0')}` : '',
  ]));

  await writeDocx(join(dir, `3.1 SEP_${N}_ArchitectureDriver_Ver1.0.docx`), [
    title('ARCHITECTURE DRIVER'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.archDriver, DEVS[0], 'Tạo tài liệu']]),

    h1('I. Giới thiệu'),
    h2('1. Mục đích'),
    p('Tài liệu liệt kê và mô tả các architectural driver cho hệ thống Thuê Máy Hub: yêu cầu chức năng ở mức cao, thuộc tính chất lượng và các ràng buộc. Tài liệu này là nguồn tham chiếu chính cho toàn bộ dự án.'),
    h2('2. Đối tượng đọc'),
    readersTable(READERS),

    h1('II. Tổng quan'),
    p('Xây dựng hệ thống giúp tiệm cho thuê máy tính và boxphone quản lý tập trung kho máy, đơn thuê, dòng tiền và chi phí sửa chữa, thay cho cách ghi sổ tay và file Excel rời rạc hiện nay. Hệ thống đồng thời mở một cổng riêng để khách hàng tự đặt thuê, thanh toán và xin gia hạn.'),

    h1('III. Architectural Driver'),
    h2('1. Yêu cầu chức năng'),
    h2('a. Đặc tả'),
    table(['Chức năng', 'ID', 'Độ ưu tiên', 'Mô tả'],
      FRS.map((fr) => [fr.name, fr.id, String(fr.priority), fr.desc]),
      [24, 8, 10, 58]),

    h2('b. Thực thể (Entities)'),
    table(['Thực thể', 'Mô tả'], [
      ['Chủ hệ thống (E01)', 'Chủ tiệm; toàn quyền trên kho máy, khách hàng, đơn thuê, sổ tiền, tài khoản nhân viên và cấu hình khoá mạng'],
      ['Nhân viên (E02)', 'Người làm việc hằng ngày: tạo đơn, thu tiền, quản lý máy và phiếu sửa; không xem được sổ tiền tổng của tiệm'],
      ['Khách hàng (E03)', 'Người thuê máy; đăng nhập cổng riêng để đặt thuê, thanh toán bằng ví, xin gia hạn và gửi ticket'],
      ['Thiết bị (E04)', 'Máy PC hoặc boxphone cho thuê, có giá thuê, trạng thái và lịch sử sửa chữa riêng'],
    ], [22, 78]),

    h2('c. Danh sách Use Case'),
    table(['STT', 'Module', 'UC ID', 'Tên Use Case', 'FR ID'], useCases, [7, 22, 12, 45, 14]),

    h2('2. Yêu cầu thuộc tính chất lượng'),
    h2('a. Danh sách thuộc tính chất lượng'),
    table(['STT', 'Thuộc tính chất lượng', 'Mô tả', 'Độ ưu tiên'], QUALITY_ATTRIBUTES, [7, 24, 55, 14]),

    h2('b. Kịch bản thuộc tính chất lượng'),
    table(['Trường', 'Nội dung'], QA_SCENARIOS[0], [26, 74]),

    table(['Trường', 'Nội dung'], QA_SCENARIOS[1], [26, 74]),

    h2('3. Ràng buộc'),
    h2('a. Ràng buộc kỹ thuật'),
    table(['ID', 'Ràng buộc kỹ thuật', 'Mô tả'], [
      ['1', 'Frontend (bản web)', `${PROJECT.tech.frontend} — thư mục ThueMayHub-FE, build thành trang tĩnh do máy chủ phục vụ`],
      ['2', 'Frontend (bản desktop)', `${PROJECT.tech.frontendDesktop} — thư mục src`],
      ['3', 'Backend', PROJECT.tech.backend],
      ['4', 'Database', PROJECT.tech.database],
      ['5', 'Đóng gói desktop', PROJECT.tech.desktop],
    ], [8, 26, 66]),
    h2('b. Ràng buộc nghiệp vụ'),
    table(['ID', 'Ràng buộc nghiệp vụ', 'Mô tả'], [
      ['1', 'Nhân lực', `${PROJECT.memberCount} thành viên`],
      ['2', 'Thời lượng', `${PROJECT.weeks} tuần`],
      ['3', 'Quy mô sử dụng', 'Một tiệm, một máy vận hành tại một thời điểm; chưa yêu cầu nhiều chi nhánh dùng chung'],
    ], [8, 26, 66]),
  ]);
}

/* ---- 3.2 Architecture Design ---------------------------------------------- */

async function design(dir) {
  await writeDocx(join(dir, `3.2 SEP_${N}_ArchitectureDesign_Ver1.0.docx`), [
    title('ARCHITECTURE DESIGN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.archDesign, DEVS[2], 'Tạo tài liệu']]),

    h1('I. Giới thiệu'),
    p('Tài liệu mô tả kiến trúc phần mềm của hệ thống Thuê Máy Hub. Người đọc nên tham khảo tài liệu Architecture Driver trước khi đọc tài liệu này.'),
    h2('Đối tượng đọc'),
    readersTable(READERS),

    h1('II. Tài liệu kiến trúc'),
    h2('1. Sơ đồ ngữ cảnh (Context Diagram)'),
    p('Hệ thống phục vụ 3 nhóm actor: Chủ hệ thống, Nhân viên và Khách hàng. Chủ hệ thống và Nhân viên dùng khu quản trị; Khách hàng dùng cổng khách hàng riêng. Cùng một mã nguồn phục vụ hai cách chạy: mở bằng trình duyệt (bản web) hoặc mở bằng ứng dụng desktop, trong đó ứng dụng desktop tự khởi động máy chủ bên trong và chỉ nghe trên 127.0.0.1.'),

    h2('2. Phân rã Component-and-Connector'),
    h2('2.1 Góc nhìn vật lý (Physical Perspective)'),
    table(['Thành phần', 'Trách nhiệm'], PHYSICAL_COMPONENTS, [30, 70]),

    h2('2.2 Góc nhìn động — Luồng Tạo đơn thuê'),
    table(['Thành phần', 'Trách nhiệm'], [
      ['React View (Trang Đơn thuê)', 'Hiển thị form chọn khách, chọn máy và thời hạn; tính tạm thành tiền để người dùng xem trước'],
      ['Rental Router (Express)', 'Nhận request, kiểm tra quyền của tài khoản đang đăng nhập'],
      ['Zod Schema', 'Kiểm tra dữ liệu đầu vào trước khi chạm vào cơ sở dữ liệu'],
      ['Rental Handler', 'Kiểm tra máy còn trống, tính thành tiền, ghi đơn và đổi trạng thái máy sang Đang thuê'],
      ['SQLite (node:sqlite)', 'Ghi bản ghi đơn thuê; API đồng bộ nên toàn bộ bước đọc–kiểm tra–ghi diễn ra liền mạch'],
    ], [30, 70]),

    h2('2.3 Góc nhìn động — Luồng Thu tiền đơn thuê'),
    p('Đây là luồng nhạy cảm nhất của hệ thống vì liên quan trực tiếp tới tiền. Mỗi lần thu ghi đồng thời ba giá trị: tiền thực nhận, biến động ví khách và doanh thu ghi nhận.'),
    table(['Thành phần', 'Trách nhiệm'], [
      ['React View (Form thu tiền)', 'Nhận số tiền và phương thức; khoá nút ngay sau lần bấm đầu để không gửi trùng yêu cầu'],
      ['Payment Handler', 'Đọc số đã thu, so với tổng tiền đơn, từ chối nếu vượt; nếu trừ ví thì kiểm tra số dư trước'],
      ['Sổ giao dịch (financial_transactions)', 'Ghi một bút toán bất biến, không cho sửa hay xoá'],
      ['Audit Log', 'Ghi lại ai đã thu tiền, đơn nào, số tiền bao nhiêu'],
    ], [30, 70]),

    h2('2.4 Góc nhìn động — Bộ quét khoá mạng'),
    table(['Thành phần', 'Trách nhiệm'], [
      ['Scheduler', 'Kích hoạt mỗi 60 giây khi chức năng khoá mạng được bật'],
      ['Lock Sweeper', 'Tìm đơn đã quá hạn quá thời gian ân hạn và máy chưa bị khoá'],
      ['Command Builder', 'Thay {ip} và {code} vào câu lệnh mẫu; kiểm tra giá trị đúng khuôn, sai khuôn thì từ chối chạy'],
      ['Shell Runner', 'Chạy câu lệnh với giới hạn thời gian; ghi kết quả vào nhật ký khoá mạng'],
    ], [30, 70]),

    h2('3. Góc nhìn tĩnh (Static Perspective)'),
    table(['Thành phần', 'Trách nhiệm'], STATIC_LAYERS, [30, 70]),

    h2('4. Quyết định kiến trúc đáng chú ý'),
    table(['Quyết định', 'Lý do'], ARCH_DECISIONS, [34, 66]),
  ]);
}

/* ---- 3.3 Database Analysis and Design ------------------------------------- */

async function database(dir) {
  const tableSections = DB_TABLES.flatMap((t, i) => [
    h2(`${i + 1}. ${t.name}`),
    p(t.desc),
    table(['Trường', 'Mô tả', 'Kiểu dữ liệu', 'Cho phép Null'], t.fields, [20, 46, 20, 14]),
  ]);

  await writeDocx(join(dir, `3.3 SEP-${N}-DatabaseAnalysisAndDesign-ver1.0.docx`), [
    title('DATABASE ANALYSIS AND DESIGN'),
    subtitle(PROJECT.name),
    ...revisionHistory([['1.0', DOC_DATE.dbDesign, DBA, 'Tạo tài liệu']]),

    h1('I. Giới thiệu'),
    h2('1. Mục tiêu'),
    p('Tài liệu mô tả cơ sở dữ liệu SQLite của hệ thống Thuê Máy Hub.'),
    h2('2. Nhóm thực hiện'),
    table(['Họ và tên', 'Vai trò'], TEAM.map((m) => [m.name, roleLabel(m)]), [50, 50]),
    h2('3. Đối tượng đọc'),
    readersTable(READERS),

    h1('II. Lựa chọn hệ quản trị cơ sở dữ liệu'),
    p('Hệ thống dùng SQLite thông qua module node:sqlite có sẵn của Node.js. Lý do:'),
    bullet('Tiệm chỉ có một máy vận hành tại một thời điểm, chưa cần máy chủ cơ sở dữ liệu riêng.'),
    bullet('Toàn bộ dữ liệu nằm trong một file duy nhất nên sao lưu chỉ là chép file, phù hợp với người dùng không rành kỹ thuật.'),
    bullet('Không cần cài đặt thêm phần mềm, giúp đóng gói được thành ứng dụng desktop chạy offline.'),
    p('Ba thiết lập được bật ngay khi mở kết nối: PRAGMA foreign_keys để chặn dữ liệu mồ côi, PRAGMA journal_mode = WAL để đọc và ghi không chặn nhau, và PRAGMA busy_timeout = 5000 để thao tác đến sau chờ thay vì báo lỗi ngay.'),

    h1('III. Cấu trúc cơ sở dữ liệu (Bảng)'),
    table(['Bảng', 'Mô tả'], DB_TABLES.map((t) => [t.name, t.desc]), [26, 74]),
    p('Quan hệ chính:'),
    p(DB_RELATIONS),

    h1('IV. Sơ đồ dữ liệu logic (Logic Data Diagram)'),
    ...tableSections,
  ]);
}

export async function buildArchitecture(dir) {
  await driver(dir);
  await design(dir);
  await database(dir);
  return 3;
}

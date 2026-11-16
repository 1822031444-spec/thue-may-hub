/**
 * Số liệu cho tài liệu Sprint 2 và Sprint 3: lịch, lỗi, kết quả kiểm thử, nội dung
 * Retrospective.
 *
 * Việc của từng sprint không khai ở đây mà lấy từ tasks.mjs, nên Sprint Plan,
 * Sprint Backlog Items và Jira luôn khớp nhau.
 *
 * Lỗi DF.04–DF.13 là lỗi có thật, đã gặp khi làm và đã có bài test canh giữ.
 * Số điểm kiểm tra lấy từ lần chạy toàn bộ bài test ngày 22/10/2026: bài .mjs đếm
 * số dòng OK in ra; bài .ps1 không in từng dòng nên đếm số lệnh kiểm tra trong file.
 */

import { DEFECTS } from './tests.mjs';
import { member, projectDay } from './data.mjs';

const ten = (alias) => member(alias).name;

/* ---- Nhật ký lỗi xuyên suốt dự án ----------------------------------------- */

/** Sprint đã sửa xong từng lỗi của Sprint 1 (tests.mjs chỉ ghi trạng thái lúc chốt Sprint 1). */
const CLOSED_IN = { 'DF.01': 1, 'DF.02': 1, 'DF.03': 2 };

/**
 * `release` là sprint phát hiện, `closedIn` là sprint sửa xong. Defect Report của
 * Sprint n gồm mọi lỗi có release ≤ n, lỗi sửa sau sprint đó thì ghi Open.
 */
export const DEFECT_LOG = [
  ...DEFECTS.map(([id, module, release, summary, desc, steps, expected, actual, severity, priority, owner]) => ({
    id, module, release, summary, desc, steps, expected, actual, severity, priority, owner, closedIn: CLOSED_IN[id],
  })),
  {
    id: 'DF.04', module: 'Tài chính', release: 2, closedIn: 2, severity: 'High', priority: 'High', owner: ten('Phat'),
    summary: 'Sổ giao dịch chỉ hiện tối đa 300 dòng, khoản cũ hơn biến mất mà không báo',
    desc: 'API sổ tiền chặn cứng 300 dòng gần nhất. Kỳ lọc có hơn 300 bút toán thì các khoản cũ nhất bị cắt bỏ âm thầm, tổng tiền trên màn hình lệch với sổ thật. Phát hiện bằng bài test lọc kỳ (finance-period-test).',
    steps: '1. Đăng nhập Chủ hệ thống\n2. Tạo hơn 300 khoản chi trong cùng một tháng\n3. Mở trang "Tài chính", chọn kỳ tháng đó',
    expected: 'Hiện đủ mọi khoản trong kỳ, chia trang; tổng không đổi giữa các trang',
    actual: 'Chỉ hiện 300 khoản mới nhất, không có trang tiếp theo, các khoản cũ không xuất hiện',
  },
  {
    id: 'DF.05', module: 'Sửa chữa & kho linh kiện', release: 2, closedIn: 2, severity: 'Low', priority: 'Medium', owner: ten('Vinh'),
    summary: 'Bài test sửa chữa ghi tên linh kiện tiếng Việt bị lỗi dấu vào database',
    desc: 'Windows PowerShell 5.1 gửi nội dung yêu cầu bằng bảng mã mặc định của hệ thống thay vì UTF-8, nên dữ liệu bài test tạo ra (tên linh kiện, ghi chú phiếu sửa) bị lỗi dấu. Lỗi nằm ở bài test, chức năng không lỗi. Sửa: tự mã hoá nội dung sang UTF-8 rồi gửi dạng byte.',
    steps: '1. Chạy server thử ở cổng 8788\n2. Chạy npm run test:repair trên Windows PowerShell 5.1\n3. Mở tab Kho linh kiện xem tên linh kiện vừa tạo',
    expected: 'Tên linh kiện hiển thị đúng tiếng Việt có dấu',
    actual: 'Tên linh kiện có ký tự lạ thay cho chữ có dấu',
  },
  {
    id: 'DF.06', module: 'Yêu cầu & hỗ trợ', release: 2, closedIn: 3, severity: 'Medium', priority: 'High', owner: ten('Phu'),
    summary: 'Huy hiệu số việc chờ trên menu đếm thiếu khi danh sách vượt ngưỡng',
    desc: 'Danh sách phiếu sửa (300 dòng), lịch sử kho (100 dòng), yêu cầu thuê và ticket (200 dòng) bị cắt cứng giống DF.04. Huy hiệu việc chờ đếm trên mảng đã bị cắt nên báo thiếu số yêu cầu cần xử lý. Phát hiện khi rà soát mã sau DF.04; chuyển sang Sprint 3 vì phải sửa đồng loạt nhiều danh sách.',
    steps: '1. Đăng nhập Chủ hệ thống\n2. Tạo hơn 200 yêu cầu thuê đang chờ duyệt\n3. Xem huy hiệu số việc chờ ở menu "Yêu cầu & hỗ trợ"',
    expected: 'Huy hiệu hiện đúng tổng số yêu cầu đang chờ',
    actual: 'Huy hiệu dừng ở số dòng của lần tải đầu, các yêu cầu cũ hơn không được đếm',
  },
  {
    id: 'DF.07', module: 'Giao diện mới (US.27)', release: 3, closedIn: 3, severity: 'High', priority: 'High', owner: ten('VietAnh'),
    summary: 'Giao diện mới chạy ở cổng 5274 gọi /api đều nhận 404',
    desc: 'Ở bản phát triển, khung TanStack Start nhận đường dẫn trước proxy của Vite nên mọi lời gọi /api bị trả 404, giao diện không tải được dữ liệu. Sửa: thêm route src/routes/api/$.ts chuyển tiếp /api sang backend.',
    steps: '1. Chạy npm run hub\n2. Mở http://127.0.0.1:5274\n3. Đăng nhập admin / demo123',
    expected: 'Đăng nhập thành công, trang Tổng quan hiện số liệu',
    actual: 'Báo lỗi đăng nhập; tab Network cho thấy POST /api/hub/login trả 404',
  },
  {
    id: 'DF.08', module: 'Cài đặt & phân quyền', release: 3, closedIn: 3, severity: 'Medium', priority: 'Medium', owner: ten('Thanh'),
    summary: 'Trang Nhân viên của giao diện mới không hiện tên đăng nhập',
    desc: 'API /api/admins không trả cột username nên cột "Tên đăng nhập" trống, chủ tiệm không biết nhân viên đăng nhập bằng tên nào.',
    steps: '1. Đăng nhập admin\n2. Mở menu "Nhân viên"',
    expected: 'Mỗi dòng có tên đăng nhập (admin, phat, thanh, vinh, anh)',
    actual: 'Cột tên đăng nhập trống',
  },
  {
    id: 'DF.09', module: 'Đăng nhập/Đăng xuất', release: 3, closedIn: 3, severity: 'Low', priority: 'Low', owner: ten('Thanh'),
    summary: 'Mở trang lần đầu khi chưa đăng nhập, console báo lỗi 401',
    desc: 'Giao diện gọi /api/hub/me để kiểm tra phiên; chưa đăng nhập thì API trả 401 nên trình duyệt ghi lỗi đỏ trong console dù đây là tình huống bình thường. Sửa: trả 200 kèm role rỗng.',
    steps: '1. Xoá cookie của trang\n2. Mở trang chủ giao diện mới\n3. Mở DevTools > Console',
    expected: 'Hiện màn đăng nhập, console không có lỗi',
    actual: 'Console có dòng "Failed to load resource: 401 (Unauthorized)"',
  },
  {
    id: 'DF.10', module: 'Cổng khách hàng', release: 3, closedIn: 3, severity: 'High', priority: 'High', owner: ten('VietAnh'),
    summary: 'Giá tạm tính của yêu cầu thuê lệch 10 lần giữa form và danh sách',
    desc: 'Form gửi yêu cầu tính theo ngày (giá tháng / 30 × số ngày), còn danh sách đơn chưa có giá tháng của máy nên hiện nguyên giá tháng. Sửa: API trả thêm giá tháng của máy, giao diện tính chung một công thức.',
    steps: '1. Đăng nhập khách 0902345678\n2. Chọn máy 4.200.000đ/tháng, gửi yêu cầu thuê 3 ngày\n3. So giá ở form với giá ở tab "Đơn thuê của bạn"',
    expected: 'Hai nơi hiện cùng số tiền tạm tính 420.000đ',
    actual: 'Form hiện 420.000đ, danh sách hiện 4.200.000đ',
  },
  {
    id: 'DF.11', module: 'Giao diện mới (US.27)', release: 3, closedIn: 3, severity: 'High', priority: 'High', owner: ten('Thanh'),
    summary: 'Bản build của giao diện mới trả lỗi 500 ở mọi trang',
    desc: 'Server trả trang giao diện bằng res.sendFile với đường dẫn nằm trong thư mục .output; Express từ chối gửi file trong thư mục bắt đầu bằng dấu chấm nên trả 500. Sửa: truyền thư mục gốc qua tuỳ chọn root.',
    steps: '1. Chạy npm run hub:start\n2. Mở http://127.0.0.1:8789/',
    expected: 'Hiện màn đăng nhập',
    actual: 'Trang báo Internal Server Error (500)',
  },
  {
    id: 'DF.12', module: 'Yêu cầu & hỗ trợ', release: 3, closedIn: 3, severity: 'Low', priority: 'Medium', owner: ten('Vinh'),
    summary: 'Bài test cổng khách báo lỗi sau khi danh sách yêu cầu có phân trang',
    desc: 'Sau khi sửa DF.06, API tổng quan trả danh sách yêu cầu dạng { rows, total } thay vì mảng. Bài test portal-smoke-test vẫn đọc kiểu cũ nên không thấy yêu cầu vừa tạo và dừng với lỗi, dù chức năng chạy đúng.',
    steps: '1. Chạy server thử ở cổng 8788\n2. Chạy npm run test:portal',
    expected: 'Bài test chạy hết, in số dư ví và số tin nhắn ticket',
    actual: 'Dừng ở bước kiểm tra yêu cầu thuê, báo "Booking is missing from service desk overview"',
  },
  {
    id: 'DF.13', module: 'Quản lý đơn thuê', release: 3, closedIn: 3, severity: 'Low', priority: 'Low', owner: ten('Vinh'),
    summary: 'Bài test nhắc hạn báo sai khi chạy sau 18 giờ',
    desc: 'Bài test tạo đơn "hết hạn hôm nay" bằng cách cộng cứng 6 giờ. Nhóm "hôm nay" của hệ thống tính tới nửa đêm, nên chạy sau 18h thì hạn rơi sang ngày mai và kiểm tra đếm đơn hôm nay báo sai. Chức năng không lỗi; sửa bài test để hạn luôn nằm trong ngày.',
    steps: '1. Chạy server thử ở cổng 8788 sau 18h\n2. Chạy npm run test:expiring',
    expected: 'Tất cả kiểm tra đạt',
    actual: 'Kiểm tra "đếm ít nhất 1 đơn hết hạn hôm nay" báo 0, Result: FAIL (1 lỗi)',
  },
];

/* ---- Bài test tự động ----------------------------------------------------- */

/** Mỗi bài: lệnh chạy và số điểm kiểm tra (xem chú thích đầu file). */
const T = {
  smoke: { file: 'smoke-test.ps1', cmd: 'test:smoke', checks: 7 },
  portal: { file: 'portal-smoke-test.ps1', cmd: 'test:portal', checks: 14 },
  repair: { file: 'repair-smoke-test.ps1', cmd: 'test:repair', checks: 18 },
  lock: { file: 'network-lock-smoke-test.ps1', cmd: 'test:lock', checks: 19 },
  perm: { file: 'permission-smoke-test.ps1', cmd: 'test:perm', checks: 35 },
  race: { file: 'race-test.mjs', cmd: 'test:race', checks: 7 },
  finance: { file: 'finance-period-test.mjs', cmd: 'test:finance', checks: 19 },
  csv: { file: 'csv-test.mjs', cmd: 'test:csv', checks: 8 },
  backup: { file: 'backup-test.mjs', cmd: 'test:backup', checks: 21 },
  paging: { file: 'paging-test.mjs', cmd: 'test:paging', checks: 20 },
  renew: { file: 'renew-test.mjs', cmd: 'test:renew', checks: 26 },
  expiring: { file: 'expiring-test.mjs', cmd: 'test:expiring', checks: 17 },
  sort: { file: 'sort-test.mjs', cmd: 'test:sort', checks: 9 },
  device: { file: 'device-test.mjs', cmd: 'test:device', checks: 18 },
  notify: { file: 'notify-test.mjs', cmd: 'test:notify', checks: 13 },
  hubFlow: { file: 'hub-flow-test.mjs', cmd: 'test:hub', checks: 40 },
  hubUi: { file: 'hub-ui-test.mjs', cmd: 'test:hub-ui', checks: 12 },
};

/** Một dòng Test Report: chức năng, story, các bài test, và lỗi làm lần chạy 1 báo Failed. */
const row = (fn, stories, tests, defects = []) => ({
  fn, stories,
  files: tests.map((t) => t.file),
  cmds: tests.map((t) => `npm run ${t.cmd}`),
  checks: tests.reduce((s, t) => s + t.checks, 0),
  defects,
});

/* ---- Hai sprint ------------------------------------------------------------ */

export const SPRINT_DOCS = [
  {
    no: 2,
    goal: 'Hoàn thiện dòng tiền (ví, sổ giao dịch, chi phí), sửa chữa và kho linh kiện; mở cổng khách hàng để khách tự gửi yêu cầu thuê, trả bằng ví và xin gia hạn.',
    plan: { version: '1.0', revisions: [['1.0', projectDay(42), ten('Phu'), 'Tạo tài liệu']] },
    date: { exec1: projectDay(57), exec2: projectDay(59), defect: projectDay(57), report: projectDay(61), retro: projectDay(62), acceptance: projectDay(62) },
    retroAuthor: ten('Thanh'),
    draft: false,
    tests: [
      row('Hồi quy Sprint 1: đăng nhập, khách hàng, thiết bị, đơn thuê, thu tiền', 'US.01–US.08', [T.smoke]),
      row('Ví khách: nạp ví, trừ ví, hoàn tiền, chống bấm trùng', 'US.09', [T.race]),
      row('Sổ giao dịch & sổ chi phí theo kỳ, phân trang', 'US.10, US.11', [T.finance], ['DF.04']),
      row('Phiếu sửa chữa & kho linh kiện', 'US.12, US.13', [T.repair], ['DF.05']),
      row('Cổng khách hàng: đặt thuê, trả ví, gia hạn, ticket; quản trị duyệt yêu cầu', 'US.14–US.17', [T.portal]),
    ],
    retro: {
      good: [
        ['Tiến độ', 'Hoàn thành toàn bộ story của Sprint 2 (US.09–US.17) cùng việc chuyển từ Sprint 1 (US.08)'],
        ['Chất lượng', 'Luồng tiền chịu được nhiều yêu cầu song song: bài test bắn yêu cầu đồng thời chỉ cho đúng một lần thu, ví không bao giờ âm'],
        ['Kiểm thử', 'Đã viết test song song lúc code đúng như cam kết ở Retrospective Sprint 1; mỗi story có ít nhất một bài test tự động'],
        ['Sản phẩm', 'Cổng khách hàng cài được như ứng dụng trên điện thoại, khách tự gửi yêu cầu thuê không cần gọi điện'],
      ],
      improve: [
        ['Thiết kế API', 'Sổ tiền chặn cứng 300 dòng (DF.04) — dữ liệu cũ biến mất mà không báo, phát hiện muộn ở cuối sprint'],
        ['Công cụ test', 'Bài test PowerShell làm lỗi dấu tiếng Việt (DF.05), mất nửa ngày mới tìm ra nguyên nhân nằm ở bảng mã'],
        ['Tiến độ', 'DF.06 (các danh sách khác cũng bị cắt cứng) chưa kịp sửa, chuyển sang Sprint 3'],
        ['Backlog', 'Một số phần đã code (Tổng quan, nhắc hạn, gia hạn, sao lưu, bản cài) chưa thuộc story nào, phải bổ sung US.22–US.26 giữa sprint'],
      ],
      lessons: [
        ['Thiết kế API', 'Không chặn cứng số dòng; mọi danh sách có thể dài ra theo thời gian đều phải phân trang ngay từ đầu'],
        ['Quản lý backlog', 'Khai story trước khi code, rà Product Backlog mỗi tuần để không còn code “mồ côi”'],
        ['Quản lý chất lượng', 'Bài test phải in rõ từng bước đạt/lỗi để lần ra nguyên nhân nhanh'],
        ['Quản lý rủi ro', 'Rủi ro R.02 (sai sót tiền) vẫn giữ mức ưu tiên cao: DF.04 là lỗi số liệu tiền dù không mất tiền thật'],
      ],
      keep: 'Viết test song song lúc code; review chéo phần tiền trước khi gộp',
      change: 'Rà Product Backlog hằng tuần; danh sách mới nào cũng phải có phân trang và bài test phân trang',
    },
  },
  {
    no: 3,
    goal: 'Hoàn thiện vận hành: khoá mạng khi hết hạn, phân quyền nhân viên, nhắc hạn, gia hạn tại quầy, sao lưu tự động, bản cài Windows; giữa sprint bổ sung giao diện mới theo thiết kế Figma (US.27).',
    plan: {
      version: '1.1',
      revisions: [
        ['1.0', projectDay(63), ten('Phu'), 'Tạo tài liệu'],
        ['1.1', projectDay(73), ten('Phu'), 'Bổ sung US.27 (giao diện mới theo Figma, 13 điểm) và 6 việc T.93–T.98'],
      ],
    },
    date: { exec1: projectDay(78), exec2: projectDay(80), defect: projectDay(78), report: projectDay(80), retro: projectDay(83), acceptance: projectDay(83) },
    retroAuthor: ten('Thanh'),
    draft: true,
    tests: [
      row('Khoá mạng khi hết hạn, chặn lệnh sai khuôn', 'US.18', [T.lock]),
      row('Phân quyền nhân viên, nhật ký thao tác, Tổng quan ẩn số tiền', 'US.19, US.20, US.22', [T.perm]),
      row('Xuất sổ tiền ra CSV', 'US.21', [T.csv]),
      row('Danh sách đơn sắp hết hạn', 'US.23', [T.expiring], ['DF.13']),
      row('Nhắc hạn qua Telegram', 'US.23', [T.notify]),
      row('Gia hạn tại quầy, lịch sử kỳ thuê', 'US.24', [T.renew]),
      row('Sao lưu tự động và phục hồi', 'US.25', [T.backup]),
      row('Phân trang danh sách dài, huy hiệu việc chờ', 'US.25', [T.paging], ['DF.06']),
      row('Giao diện mới — API đăng nhập chung, đăng ký, hồ sơ, phiếu thu', 'US.27', [T.hubFlow], ['DF.08', 'DF.10']),
      row('Giao diện mới — chạy thử 4 vai trò trên trình duyệt (12 màn hình)', 'US.27', [T.hubUi], ['DF.07', 'DF.09', 'DF.11']),
      row('Hồi quy Sprint 1–2: đơn thuê, ví, sổ tiền, sửa chữa, cổng khách, thiết bị', 'US.01–US.17',
        [T.smoke, T.race, T.finance, T.repair, T.portal, T.device, T.sort], ['DF.12']),
    ],
    retro: {
      good: [
        ['Tiến độ', 'Hoàn thành mọi việc có code của Sprint 3 (US.18–US.26) cùng story bổ sung US.27'],
        ['Sản phẩm', 'Giao diện mới theo thiết kế Figma đã nối với backend thật: một màn đăng nhập chung cho Chủ, Nhân viên và Khách'],
        ['Kiểm thử', 'Toàn bộ 17 bài test tự động đạt ở lần chạy cuối; giao diện mới có bài chạy thử trên trình duyệt thật'],
        ['Làm việc nhóm', 'Story US.27 thêm giữa sprint vẫn chia đều cho cả 5 người (Frontend, Backend, Tester, UX/UI)'],
      ],
      improve: [
        ['Phạm vi', 'US.27 (13 điểm) thêm giữa sprint làm khối lượng Sprint 3 tăng, thời gian cho Retrospective và nghiệm thu bị dồn về cuối'],
        ['Tích hợp', 'Giao diện mới ghép với API muộn nên phát sinh 5 lỗi tích hợp cùng lúc (DF.07–DF.11)'],
        ['Kiểm thử', 'Bài test phụ thuộc giờ chạy (DF.13) và bài test đọc cấu trúc dữ liệu cũ (DF.12) báo lỗi giả, làm mất thời gian dò'],
        ['Sản phẩm', 'Bản cài Windows (US.26) vẫn đóng gói giao diện thế hệ đầu, chưa dùng giao diện mới'],
      ],
      lessons: [
        ['Tích hợp', 'Nối giao diện với API thật ngay từ màn hình đầu tiên thay vì dựng xong toàn bộ bằng dữ liệu giả rồi mới ghép'],
        ['Quản lý chất lượng', 'Bài test không được phụ thuộc giờ chạy hay ngày chạy; đổi cấu trúc API thì sửa bài test trong cùng một việc'],
        ['Quản lý phạm vi', 'Thêm story giữa sprint phải ước lượng lại và báo khách hàng ngay, không lấy thời gian của việc quy trình'],
        ['Quản lý rủi ro', 'Rủi ro R.04 (yêu cầu thay đổi) đã xảy ra với US.27; cần ghi vào Issue Log ở bản Risk List kế tiếp'],
      ],
      keep: 'Mỗi story có bài test tự động; chạy lại toàn bộ bài test trước mỗi buổi demo',
      change: 'Ghép giao diện với backend sớm; story thêm giữa sprint phải qua họp ước lượng lại',
    },
  },
];

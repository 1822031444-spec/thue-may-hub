/**
 * Số liệu cho báo cáo hoàn chỉnh: lần chạy toàn bộ bài test cuối cùng và phần
 * việc làm sau khi đóng Sprint 3.
 *
 * Lần chạy ngày 14/11/2026, server và database tạm (không dùng dữ liệu demo đang
 * mở): 15 bài test cũ trên server thử cổng 8788, bài API giao diện mới và bài
 * trình duyệt mỗi bài một database mẫu mới. Cả 17 bài đạt.
 *
 * Cách đếm điểm kiểm tra giống sprints.mjs: bài .mjs đếm số dòng OK in ra; bài
 * .ps1 không in từng dòng nên đếm số lệnh kiểm tra trong file; bài trình duyệt
 * đếm số màn hình đã bấm qua và chụp lại.
 */

export const FINAL_RUN_DATE = '14/11/2026';

/** [file, lệnh npm, nội dung kiểm tra, user story, số điểm kiểm tra] */
export const FINAL_TESTS = [
  ['smoke-test.ps1', 'test:smoke', 'Hồi quy luồng chính: đăng nhập, khách hàng, thiết bị, đơn thuê, thu tiền, chi phí', 'US.01–US.08', 7],
  ['portal-smoke-test.ps1', 'test:portal', 'Cổng khách: đăng ký, gửi yêu cầu, duyệt, trả bằng ví, gia hạn, ticket, thông báo', 'US.14–US.17', 14],
  ['repair-smoke-test.ps1', 'test:repair', 'Phiếu sửa chữa, nhập kho, lắp linh kiện, giá vốn, cảnh báo tồn kho', 'US.12, US.13', 18],
  ['network-lock-smoke-test.ps1', 'test:lock', 'Khoá/mở mạng, nhật ký lệnh, chặn chèn lệnh lạ', 'US.18', 19],
  ['permission-smoke-test.ps1', 'test:perm', 'Phân quyền Chủ/Nhân viên, ẩn số tiền, khoá tài khoản thì cắt phiên', 'US.19, US.20, US.22', 35],
  ['race-test.mjs', 'test:race', 'Bắn nhiều yêu cầu song song: không thu trùng, ví không âm', 'US.07, US.09', 7],
  ['finance-period-test.mjs', 'test:finance', 'Sổ giao dịch và sổ chi phí theo kỳ, phân trang', 'US.10, US.11', 19],
  ['csv-test.mjs', 'test:csv', 'Xuất sổ tiền ra CSV mở được bằng Excel', 'US.21', 8],
  ['backup-test.mjs', 'test:backup', 'Sao lưu tự động và diễn tập phục hồi', 'US.25', 21],
  ['paging-test.mjs', 'test:paging', 'Phân trang danh sách dài, huy hiệu số việc chờ', 'US.25', 20],
  ['renew-test.mjs', 'test:renew', 'Gia hạn tại quầy, lịch sử các kỳ thuê', 'US.24', 26],
  ['expiring-test.mjs', 'test:expiring', 'Danh sách đơn sắp hết hạn', 'US.23', 17],
  ['sort-test.mjs', 'test:sort', 'Sắp xếp máy theo hạn thuê gần nhất', 'US.23', 9],
  ['device-test.mjs', 'test:device', 'Vòng đời thiết bị, ngừng dùng vẫn giữ lịch sử đơn', 'US.04, US.05', 18],
  ['notify-test.mjs', 'test:notify', 'Nhắc hạn qua Telegram, nhân viên bị chặn cấu hình', 'US.23', 13],
  ['hub-flow-test.mjs', 'test:hub', 'API giao diện mới: đăng nhập chung, đăng ký, hồ sơ, sửa từng phần, gia hạn, hoàn tiền, lịch sử ví, hỗ trợ, thông tin cửa hàng, cổng khách', 'US.27', 64],
  ['hub-ui-test.mjs', 'test:hub-ui', 'Chạy 4 vai trò trên Microsoft Edge thật, bấm qua các màn và thao tác chính', 'US.27', 21],
];

/** Giai đoạn hoàn thiện sau Sprint 3: ứng dụng nối đủ mọi màn của giao diện Figma. */
export const POST_SPRINT = {
  from: '26/10/2026',
  to: FINAL_RUN_DATE,
  admin: [
    'Dashboard: danh sách việc cần xử lý, đơn sắp hết hạn và quá hạn có nút gia hạn, thu tiền ngay trên dòng; nhân viên không thấy số tiền.',
    'Máy: lọc theo trạng thái; sửa, chuyển bảo trì hoặc sẵn sàng, báo hỏng, ngừng dùng, xoá; cột doanh thu và tiền sửa của từng máy.',
    'Khách hàng: sửa hồ sơ (cả địa chỉ, CCCD), khoá hoặc mở khoá, xem chi tiết đơn thuê và lịch sử ví.',
    'Đơn thuê: lọc theo trạng thái; gia hạn tại quầy, thu tiền, hoàn tiền; duyệt hoặc từ chối yêu cầu gia hạn khách gửi.',
    'Sửa chữa: lắp linh kiện từ kho, đánh dấu không sửa được. Linh kiện: thêm, nhập kho, lịch sử nhập xuất.',
    'Nhân viên: thêm tài khoản có tên đăng nhập, đổi vai trò, khoá, đặt lại mật khẩu.',
    'Trang Hỗ trợ khách (mới): nhân viên trả lời ticket, đổi trạng thái.',
    'Cài đặt: thông tin cửa hàng, khoá mạng, sao lưu, Telegram, nhật ký thao tác; chuông việc cần làm và menu đổi mật khẩu ở thanh trên.',
  ],
  customer: [
    'Trả đơn bằng ví, xin gia hạn, huỷ yêu cầu chưa duyệt.',
    'Xem lịch sử ví; gửi ticket và nhắn qua lại với cửa hàng.',
    'Sửa hồ sơ, đổi mật khẩu; chuông thông báo; tự làm mới dữ liệu mỗi 30 giây.',
  ],
  backend: [
    '`PATCH /api/customers/:id` và `PATCH /api/devices/:id` chỉ đổi trường được gửi lên, lưu được các cột mới.',
    'Tài khoản nhân viên có tên đăng nhập (`admins.username`), chặn trùng, đăng nhập bằng tên đăng nhập.',
    'Endpoint mới: `GET /api/hub/wallet` (lịch sử ví), `GET` và `PUT /api/hub/shop` (thông tin cửa hàng, chỉ chủ được sửa).',
    'Danh sách thanh toán hiện cả phiếu hoàn tiền (số âm), tổng thực thu là số ròng.',
    'Dữ liệu mẫu có sẵn một yêu cầu gia hạn (GH-1001) và một ticket (HT-1001) để demo có việc xử lý ngay.',
  ],
  delivery: [
    'Gói demo cho tester: `npm run hub:pack` tạo `release/tester/ThueMayHub-Demo-Tester.zip` (khoảng 31 MB) gồm Node, server đã gộp, giao diện đã build, file chạy và hướng dẫn; tester chỉ cần giải nén và double-click, không cần cài gì.',
    'Gói không mang theo thư mục `data/` của dự án; dữ liệu mẫu được tạo mới trên máy tester ở lần chạy đầu.',
  ],
};

/** Lỗi phát hiện và sửa trong giai đoạn hoàn thiện, nối tiếp DF.01–DF.13. */
export const POST_DEFECTS = [
  ['DF.14', 'Quản lý khách hàng, thiết bị', 'API sửa khách hàng và sửa máy xoá trắng những trường không được gửi lên', 'High',
    'Sửa từng phần (ví dụ chỉ đổi vị trí máy) làm mất các trường còn lại. Sửa: gộp dữ liệu gửi lên với bản ghi hiện có trước khi ghi; bài hub-flow-test kiểm tra sửa từng phần và khoá khách không mất địa chỉ.'],
  ['DF.15', 'Giao diện mới (US.27)', 'Bản build báo lỗi React #418 (lệch HTML khi hydrate) mỗi lần mở trang', 'Medium',
    'Trang khung dựng sẵn bọc route trong một Suspense mà lần hydrate đầu không có. Sửa: route "/" khai báo `ssr: false`, `wrapInSuspense: true` và bọc ứng dụng trong `ClientOnly`.'],
  ['DF.16', 'Hỗ trợ khách', 'Khung hội thoại hỗ trợ bị gắn lại liên tục, console báo TypeError', 'Medium',
    'Effect cuộn xuống tin mới trả về Promise của `scrollIntoView` (Edge bản mới), React coi đó là hàm dọn dẹp. Sửa: bọc thân effect trong ngoặc nhọn để không trả về gì.'],
];

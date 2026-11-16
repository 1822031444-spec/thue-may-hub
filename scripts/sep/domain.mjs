/**
 * Nội dung nghiệp vụ của hệ thống Thuê Máy Hub.
 *
 * Mọi số liệu ở đây bám theo mã nguồn thật trong `server/` và `src/`, không bịa:
 * tên bảng, tên cột, quy tắc nghiệp vụ và danh sách chức năng đều đối chiếu được
 * với code. Nhờ vậy khi giảng viên hỏi "chỗ này code ở đâu" thì chỉ được ngay.
 */

/* ---- Danh sách chức năng -------------------------------------------------- */

export const MODULES = [
  {
    no: 1,
    name: 'Đăng nhập/Đăng xuất',
    actor: 'Chủ hệ thống, Nhân viên, Khách hàng',
    functions: [
      ['F.1.1', 1, 'Đăng nhập/Đăng xuất quản trị', 'Cao', 'Chủ hệ thống và Nhân viên đăng nhập bằng email, phiên lưu bằng cookie HttpOnly'],
      ['F.1.2', 2, 'Đăng ký/Đăng nhập cổng khách hàng', 'Cao', 'Khách hàng tự đăng ký tài khoản bằng email và đăng nhập vào cổng khách hàng'],
      ['F.1.3', 1, 'Đổi mật khẩu', 'Cao', 'Người dùng đổi mật khẩu; đổi xong mọi phiên đăng nhập khác bị đăng xuất'],
      ['F.1.4', 3, 'Đăng nhập chung cho ba vai trò', 'Cao', 'Một màn đăng nhập bằng username, email hoặc số điện thoại; hệ thống tự nhận ra quản trị, nhân viên hay khách'],
    ],
  },
  {
    no: 2,
    name: 'Quản lý khách hàng',
    actor: 'Chủ hệ thống, Nhân viên',
    functions: [
      ['F.2.1', 1, 'Xem danh sách khách hàng', 'Cao', 'Xem danh sách khách hàng kèm số dư ví, tổng đã chi, số đơn đã thuê'],
      ['F.2.2', 1, 'Tìm kiếm & lọc khách hàng', 'TB', 'Tìm theo tên/mã/điện thoại, lọc theo trạng thái Hoạt động/Hạn chế/Đã khoá'],
      ['F.2.3', 1, 'Thêm khách hàng', 'Cao', 'Tạo hồ sơ khách hàng mới, hệ thống tự sinh mã khách hàng'],
      ['F.2.4', 1, 'Sửa hồ sơ khách hàng', 'Cao', 'Chỉnh sửa thông tin liên hệ, hạn mức công nợ, ghi chú'],
      ['F.2.5', 1, 'Đổi trạng thái khách hàng', 'TB', 'Khoá khách hàng; khách bị khoá không đăng nhập cổng được và bị cắt phiên'],
      ['F.2.6', 2, 'Nạp tiền vào ví khách hàng', 'Cao', 'Chủ hệ thống nạp tiền vào ví, sinh bút toán trong sổ giao dịch'],
    ],
  },
  {
    no: 3,
    name: 'Quản lý thiết bị',
    actor: 'Chủ hệ thống, Nhân viên',
    functions: [
      ['F.3.1', 1, 'Xem danh sách thiết bị', 'Cao', 'Xem kho máy dạng thẻ hoặc dạng bảng, kèm doanh thu và tiền sửa của từng máy'],
      ['F.3.2', 1, 'Tìm kiếm & lọc thiết bị', 'TB', 'Tìm theo tên/mã, lọc theo loại PC hoặc Boxphone'],
      ['F.3.3', 1, 'Thêm thiết bị', 'Cao', 'Nhập máy mới: tên, loại, cấu hình, địa chỉ IP, giá thuê giờ/tháng, giá mua'],
      ['F.3.4', 1, 'Sửa thiết bị', 'Cao', 'Chỉnh sửa thông tin và giá thuê của máy'],
      ['F.3.5', 1, 'Đổi trạng thái thiết bị', 'Cao', 'Sẵn sàng / Đang thuê / Bảo trì / Ngừng dùng'],
      ['F.3.6', 2, 'Xem lịch sử sửa chữa của máy', 'TB', 'Xem các phiếu sửa và tổng tiền đã chi cho riêng máy đó'],
    ],
  },
  {
    no: 4,
    name: 'Quản lý đơn thuê',
    actor: 'Chủ hệ thống, Nhân viên',
    functions: [
      ['F.4.1', 1, 'Xem danh sách đơn thuê', 'Cao', 'Xem đơn kèm tiến độ thanh toán, lọc theo Đang mở/Quá hạn/Hoàn tất'],
      ['F.4.2', 1, 'Tạo đơn thuê', 'Cao', 'Chọn khách, chọn máy còn trống, chọn thời hạn; hệ thống tự tính thành tiền'],
      ['F.4.3', 1, 'Thu tiền đơn thuê', 'Cao', 'Thu tiền mặt/chuyển khoản hoặc trừ ví khách, không cho thu vượt số còn nợ'],
      ['F.4.4', 1, 'Kích hoạt & hoàn tất đơn', 'Cao', 'Chuyển đơn Giữ chỗ sang Đang thuê và Đang thuê sang Hoàn tất'],
      ['F.4.5', 2, 'Hoàn tiền đơn thuê', 'Cao', 'Hoàn tiền về ví hoặc tiền mặt, không hoàn quá số đã thu'],
      ['F.4.6', 1, 'Huỷ đơn thuê', 'TB', 'Huỷ đơn chưa thu tiền, trả máy về trạng thái Sẵn sàng'],
      ['F.4.7', 3, 'Nhắc đơn sắp hết hạn', 'Cao', 'Liệt kê đơn sắp hết hạn, soạn sẵn tin nhắn nhắc khách, gửi bản tóm tắt cho chủ qua Telegram'],
      ['F.4.8', 3, 'Gia hạn đơn tại quầy', 'Cao', 'Gia hạn đơn đang thuê; mỗi lần gia hạn lưu thành một kỳ thuê riêng'],
    ],
  },
  {
    no: 5,
    name: 'Tài chính',
    actor: 'Chủ hệ thống',
    functions: [
      ['F.5.1', 2, 'Xem sổ giao dịch', 'Cao', 'Xem toàn bộ bút toán tiền thực thu, biến động ví và doanh thu'],
      ['F.5.2', 2, 'Ghi nhận chi phí', 'Cao', 'Ghi các khoản chi: điện, Internet, mặt bằng, nhân sự, linh kiện…'],
      ['F.5.3', 2, 'Lọc sổ tiền theo kỳ', 'Cao', 'Xem số liệu theo Tháng này / Tháng trước / Năm nay / Khoảng ngày tuỳ chọn'],
      ['F.5.4', 3, 'Xuất sổ tiền ra CSV', 'TB', 'Xuất dữ liệu đang xem ra file CSV để đối chiếu sổ sách bằng Excel'],
      ['F.5.5', 3, 'Xem trang Tổng quan', 'TB', 'Máy đang thuê, đơn sắp hết hạn, doanh thu tháng; nhân viên không thấy các số tiền'],
    ],
  },
  {
    no: 6,
    name: 'Sửa chữa & kho linh kiện',
    actor: 'Chủ hệ thống, Nhân viên',
    functions: [
      ['F.6.1', 2, 'Tạo phiếu sửa chữa', 'Cao', 'Ghi nhận máy hỏng; máy tự chuyển trạng thái Bảo trì'],
      ['F.6.2', 2, 'Xử lý & đóng phiếu sửa', 'Cao', 'Báo hỏng → Đang sửa → Đã sửa xong / Không sửa được'],
      ['F.6.3', 2, 'Nhập kho linh kiện', 'Cao', 'Nhập mua linh kiện, hệ thống tính giá vốn bình quân và sinh khoản chi'],
      ['F.6.4', 2, 'Lắp linh kiện vào máy', 'Cao', 'Trừ tồn kho và quy chi phí linh kiện về đúng thiết bị'],
      ['F.6.5', 2, 'Trả linh kiện về kho', 'TB', 'Gỡ linh kiện khỏi phiếu sửa, hoàn lại tồn kho'],
      ['F.6.6', 2, 'Cảnh báo tồn kho tối thiểu', 'TB', 'Cảnh báo khi số lượng linh kiện xuống dưới mức tồn tối thiểu'],
    ],
  },
  {
    no: 7,
    name: 'Yêu cầu & hỗ trợ',
    actor: 'Chủ hệ thống, Nhân viên',
    functions: [
      ['F.7.1', 2, 'Duyệt yêu cầu thuê máy', 'Cao', 'Duyệt hoặc từ chối yêu cầu khách gửi; duyệt thì sinh đơn giữ chỗ'],
      ['F.7.2', 2, 'Báo giá & duyệt gia hạn', 'Cao', 'Báo giá phần gia hạn và duyệt yêu cầu gia hạn của khách'],
      ['F.7.3', 2, 'Trả lời ticket hỗ trợ', 'Cao', 'Trao đổi với khách trong ticket, đánh dấu ticket đã xử lý'],
    ],
  },
  {
    no: 8,
    name: 'Cổng khách hàng',
    actor: 'Khách hàng',
    functions: [
      ['F.8.1', 2, 'Xem danh mục máy cho thuê', 'Cao', 'Khách xem các máy đang sẵn sàng kèm giá thuê giờ/tháng'],
      ['F.8.2', 2, 'Gửi yêu cầu thuê máy', 'Cao', 'Khách chọn máy và thời gian mong muốn, hệ thống tính tạm tính'],
      ['F.8.3', 2, 'Theo dõi & huỷ yêu cầu', 'TB', 'Khách xem trạng thái duyệt và huỷ yêu cầu chưa được duyệt'],
      ['F.8.4', 2, 'Thanh toán đơn bằng ví', 'Cao', 'Khách tự trả tiền đơn thuê bằng số dư ví'],
      ['F.8.5', 2, 'Gửi yêu cầu gia hạn', 'Cao', 'Khách xin gia hạn thời gian thuê, chờ tiệm báo giá'],
      ['F.8.6', 2, 'Gửi & theo dõi ticket hỗ trợ', 'TB', 'Khách gửi yêu cầu hỗ trợ và trao đổi với tiệm'],
      ['F.8.7', 2, 'Nhận thông báo', 'TB', 'Khách nhận thông báo đơn sắp hết hạn, yêu cầu được duyệt, bảo mật'],
    ],
  },
  {
    no: 9,
    name: 'Khoá mạng khi hết hạn',
    actor: 'Chủ hệ thống',
    functions: [
      ['F.9.1', 3, 'Cấu hình lệnh khoá/mở mạng', 'Cao', 'Chủ khai báo câu lệnh; hệ thống chỉ thay {ip} và {code} vào lệnh'],
      ['F.9.2', 3, 'Tự động khoá khi quá hạn', 'Cao', 'Mỗi phút quét một lần, khoá máy của đơn quá hạn quá thời gian ân hạn'],
      ['F.9.3', 3, 'Khoá/Mở mạng thủ công', 'TB', 'Chủ tự bấm khoá hoặc mở mạng cho một máy cụ thể'],
      ['F.9.4', 3, 'Nhật ký chạy lệnh khoá mạng', 'TB', 'Ghi lại đúng câu lệnh đã chạy và kết quả trả về'],
    ],
  },
  {
    no: 10,
    name: 'Cài đặt & phân quyền',
    actor: 'Chủ hệ thống',
    functions: [
      ['F.10.1', 3, 'Quản lý tài khoản nhân viên', 'Cao', 'Tạo, sửa, khoá tài khoản và đặt lại mật khẩu cho nhân viên'],
      ['F.10.2', 3, 'Phân quyền theo vai trò', 'Cao', 'Nhân viên không xem được trang Tài chính, không nạp ví, không hoàn tiền'],
      ['F.10.3', 3, 'Xem nhật ký thao tác', 'TB', 'Xem audit log các thao tác quản trị đã thực hiện'],
      ['F.10.4', 3, 'Đổi thư mục dữ liệu', 'TB', 'Trỏ database sang thư mục khác, ví dụ USB, để mang sang máy khác'],
      ['F.10.5', 3, 'Sao lưu dữ liệu tự động', 'Cao', 'Chụp bản sao nhất quán của database theo lịch, giữ số bản gần nhất do chủ chọn'],
      ['F.10.6', 3, 'Ứng dụng desktop Windows', 'TB', 'Cài phần mềm như ứng dụng Windows, server chạy nội bộ trong máy'],
    ],
  },
];

/** Bảng chức năng phẳng, dùng cho Function List và Test Report. */
export const FUNCTION_ROWS = MODULES.flatMap((m) =>
  m.functions.map(([id, release, feature, priority, desc], i) => ({
    module: m.name,
    moduleNo: m.no,
    isFirst: i === 0,
    id,
    release,
    feature,
    priority,
    desc,
    actor: m.actor,
  })),
);

/* ---- Yêu cầu chức năng mức cao (FR) --------------------------------------- */

export const FRS = [
  { id: 'FR01', name: 'Đăng nhập/Đăng xuất & Đổi mật khẩu', priority: 1, sprint: 1, status: 'Done',
    desc: 'Chủ hệ thống, Nhân viên và Khách hàng đăng nhập bằng email; phiên lưu bằng cookie HttpOnly; đổi mật khẩu sẽ đăng xuất các phiên khác.',
    design: 'Architecture Design - II.2.1', test: 'Test Case Sprint 1' },
  { id: 'FR02', name: 'Quản lý khách hàng & ví tiền', priority: 1, sprint: 1, status: 'Done',
    desc: 'Xem, tìm kiếm, thêm, sửa, đổi trạng thái khách hàng và nạp tiền vào ví.',
    design: 'Database Design - bảng customers, financial_transactions', test: 'Test Case Sprint 1' },
  { id: 'FR03', name: 'Quản lý thiết bị', priority: 1, sprint: 1, status: 'Done',
    desc: 'Xem, tìm kiếm, thêm, sửa và đổi trạng thái PC/Boxphone; theo dõi doanh thu và tiền sửa của từng máy.',
    design: 'Database Design - bảng devices', test: 'Test Case Sprint 1 (Quản lý thiết bị)' },
  { id: 'FR04', name: 'Quản lý đơn thuê', priority: 1, sprint: 1, status: 'Done',
    desc: 'Tạo đơn, thu tiền, kích hoạt, hoàn tất, hoàn tiền và huỷ đơn thuê.',
    design: 'Architecture Design - II.2.2 (Luồng Tạo đơn thuê)', test: 'Test Case Sprint 1 (Tạo đơn thuê, Thu tiền đơn)' },
  { id: 'FR05', name: 'Tài chính & sổ tiền', priority: 2, sprint: 2, status: 'Planned',
    desc: 'Sổ giao dịch, sổ chi phí, lọc theo kỳ và xuất CSV đối chiếu sổ sách.',
    design: 'Database Design - bảng financial_transactions, expenses', test: 'Test Case Sprint 2' },
  { id: 'FR06', name: 'Sửa chữa & kho linh kiện', priority: 2, sprint: 2, status: 'Planned',
    desc: 'Phiếu sửa có vòng đời, nhập kho, lắp linh kiện vào máy và quy chi phí về đúng thiết bị.',
    design: 'Database Design - bảng repairs, parts, part_movements', test: 'Test Case Sprint 2' },
  { id: 'FR07', name: 'Yêu cầu & hỗ trợ khách hàng', priority: 2, sprint: 2, status: 'Planned',
    desc: 'Duyệt yêu cầu thuê, báo giá gia hạn và trả lời ticket hỗ trợ.',
    design: 'Database Design - bảng booking_requests, extension_requests, support_tickets', test: 'Test Case Sprint 2' },
  { id: 'FR08', name: 'Cổng khách hàng', priority: 2, sprint: 2, status: 'Planned',
    desc: 'Khách tự xem danh mục máy, gửi yêu cầu thuê, trả tiền bằng ví, xin gia hạn và gửi ticket.',
    design: 'Architecture Design - II.2.3 (Luồng Cổng khách hàng)', test: 'Test Case Sprint 2' },
  { id: 'FR09', name: 'Khoá mạng khi hết hạn thuê', priority: 3, sprint: 3, status: 'Planned',
    desc: 'Cấu hình lệnh khoá/mở, tự động quét và khoá máy quá hạn, ghi nhật ký lệnh đã chạy.',
    design: 'Architecture Design - II.2.4 (Bộ quét khoá mạng)', test: 'Test Case Sprint 3' },
  { id: 'FR10', name: 'Cài đặt & phân quyền', priority: 3, sprint: 3, status: 'Planned',
    desc: 'Quản lý tài khoản nhân viên, phân quyền theo vai trò, nhật ký thao tác, đổi thư mục dữ liệu.',
    design: 'Architecture Design - II.3 (Tầng phân quyền)', test: 'Test Case Sprint 3' },
  { id: 'FR11', name: 'Tổng quan, nhắc hạn & gia hạn tại quầy', priority: 3, sprint: 3, status: 'Planned',
    desc: 'Trang Tổng quan trong ngày, nhắc đơn sắp hết hạn trên màn hình và qua Telegram, gia hạn đơn tại quầy theo từng kỳ thuê.',
    design: 'Database Design - bảng rentals, financial_transactions', test: 'Test Case Sprint 3' },
  { id: 'FR12', name: 'Sao lưu dữ liệu & ứng dụng desktop', priority: 3, sprint: 3, status: 'Planned',
    desc: 'Sao lưu database tự động, diễn tập phục hồi và đóng gói thành ứng dụng Windows.',
    design: 'Architecture Design - II.2.1 (Góc nhìn vật lý)', test: 'Test Case Sprint 3' },
];

/* ---- Quy tắc nghiệp vụ ---------------------------------------------------- */

export const BUSINESS_RULES = [
  ['BR.01', 'Quản lý đơn thuê', 'Một thiết bị ở trạng thái "Đang thuê" không được gán cho đơn thuê thứ hai cùng lúc'],
  ['BR.02', 'Quản lý đơn thuê', 'Ngày kết thúc thuê phải sau ngày bắt đầu thuê'],
  ['BR.03', 'Quản lý đơn thuê', 'Số tiền thu của một đơn không được vượt quá số tiền còn nợ của đơn đó'],
  ['BR.04', 'Quản lý đơn thuê', 'Số tiền hoàn không được vượt quá số tiền đã thu thực tế của đơn'],
  ['BR.05', 'Quản lý đơn thuê', 'Chỉ được huỷ đơn thuê khi đơn chưa thu đồng nào và đang ở trạng thái Giữ chỗ'],
  ['BR.06', 'Quản lý khách hàng', 'Số dư ví của khách hàng không bao giờ được phép âm'],
  ['BR.07', 'Quản lý khách hàng', 'Khách hàng bị khoá không đăng nhập được cổng khách hàng và bị cắt mọi phiên đang mở'],
  ['BR.08', 'Quản lý thiết bị', 'Thiết bị đang có phiếu sửa chưa đóng phải ở trạng thái Bảo trì, không cho thuê'],
  ['BR.09', 'Sửa chữa & linh kiện', 'Chi phí chỉ phát sinh khi mua linh kiện nhập kho và khi đóng phiếu sửa (tiền công); lắp linh kiện từ kho không sinh chi phí mới'],
  ['BR.10', 'Sửa chữa & linh kiện', 'Không được lắp số lượng linh kiện vượt quá tồn kho hiện có'],
  ['BR.11', 'Tài chính', 'Mỗi giao dịch ghi đồng thời 3 giá trị: tiền thực, biến động ví và doanh thu; sổ không cho sửa hay xoá bút toán'],
  ['BR.12', 'Tài chính', 'Số dư ví và công nợ là số tại thời điểm hiện tại, không thay đổi theo kỳ lọc'],
  ['BR.13', 'Cài đặt & phân quyền', 'Hệ thống phải luôn còn ít nhất một tài khoản Chủ hệ thống đang hoạt động'],
  ['BR.14', 'Cài đặt & phân quyền', 'Nhân viên không được xem trang Tài chính, không nạp ví và không hoàn tiền'],
  ['BR.15', 'Khoá mạng', 'Lệnh khoá/mở chỉ được thay hai chỗ trống {ip} và {code}; giá trị phải đúng khuôn IP hoặc mã máy, sai khuôn thì từ chối chạy'],
  ['BR.16', 'Khoá mạng', 'Chỉ khoá máy của đơn đã quá hạn quá thời gian ân hạn do chủ cấu hình'],
];

/* ---- Cơ sở dữ liệu -------------------------------------------------------- */

export const DB_TABLES = [
  { name: 'admins', desc: 'Tài khoản quản trị (Chủ hệ thống / Nhân viên), phân biệt bằng cột role', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['name', 'Họ tên', 'TEXT', 'Not null'],
    ['email', 'Email đăng nhập, không trùng', 'TEXT', 'Not null'],
    ['password_hash', 'Mật khẩu đã băm bằng scrypt', 'TEXT', 'Not null'],
    ['role', 'OWNER / STAFF', 'TEXT', 'Not null'],
    ['status', 'ACTIVE / DISABLED', 'TEXT', 'Null'],
    ['created_at', 'Ngày tạo', 'TEXT', 'Not null'],
  ]},
  { name: 'sessions', desc: 'Phiên đăng nhập của tài khoản quản trị', fields: [
    ['id', 'Khoá chính, cũng là giá trị cookie phiên', 'TEXT', 'Not null'],
    ['admin_id', 'Tham chiếu admins(id)', 'TEXT (FK)', 'Not null'],
    ['expires_at', 'Thời điểm hết hạn phiên', 'TEXT', 'Not null'],
    ['created_at', 'Ngày tạo', 'TEXT', 'Not null'],
  ]},
  { name: 'customers', desc: 'Hồ sơ khách hàng thuê máy', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã khách hàng, không trùng', 'TEXT', 'Not null'],
    ['name', 'Tên khách hàng', 'TEXT', 'Not null'],
    ['phone', 'Số điện thoại', 'TEXT', 'Null'],
    ['email', 'Email liên hệ', 'TEXT', 'Null'],
    ['company', 'Tên công ty (nếu có)', 'TEXT', 'Null'],
    ['credit_limit', 'Hạn mức công nợ cho phép', 'INTEGER', 'Null'],
    ['status', 'ACTIVE / LIMITED / BLOCKED', 'TEXT', 'Not null'],
    ['notes', 'Ghi chú', 'TEXT', 'Null'],
  ]},
  { name: 'customer_accounts', desc: 'Tài khoản đăng nhập cổng khách hàng, gắn 1-1 với customers', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['customer_id', 'Tham chiếu customers(id), duy nhất', 'TEXT (FK)', 'Not null'],
    ['email', 'Email đăng nhập, không trùng', 'TEXT', 'Not null'],
    ['password_hash', 'Mật khẩu đã băm', 'TEXT', 'Not null'],
    ['status', 'ACTIVE / BLOCKED', 'TEXT', 'Not null'],
    ['last_login_at', 'Lần đăng nhập gần nhất', 'TEXT', 'Null'],
  ]},
  { name: 'devices', desc: 'Kho thiết bị PC và Boxphone cho thuê', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã máy, không trùng', 'TEXT', 'Not null'],
    ['name', 'Tên máy', 'TEXT', 'Not null'],
    ['type', 'PC / BOXPHONE', 'TEXT', 'Not null'],
    ['specs', 'Cấu hình máy', 'TEXT', 'Null'],
    ['ip_address', 'Địa chỉ IP dùng cho lệnh khoá mạng', 'TEXT', 'Null'],
    ['hourly_rate', 'Giá thuê theo giờ', 'INTEGER', 'Null'],
    ['monthly_rate', 'Giá thuê theo tháng', 'INTEGER', 'Null'],
    ['purchase_price', 'Giá mua máy, dùng tính lãi/lỗ', 'INTEGER', 'Null'],
    ['status', 'AVAILABLE / RENTED / MAINTENANCE / RETIRED', 'TEXT', 'Not null'],
    ['network_status', 'OPEN / LOCKED — trạng thái khoá mạng', 'TEXT', 'Null'],
  ]},
  { name: 'rentals', desc: 'Đơn thuê máy', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã đơn, không trùng', 'TEXT', 'Not null'],
    ['customer_id', 'Tham chiếu customers(id)', 'TEXT (FK)', 'Not null'],
    ['device_id', 'Tham chiếu devices(id)', 'TEXT (FK)', 'Not null'],
    ['start_at', 'Thời điểm bắt đầu thuê', 'TEXT', 'Not null'],
    ['end_at', 'Thời điểm hết hạn thuê', 'TEXT', 'Not null'],
    ['base_amount', 'Tiền thuê gốc', 'INTEGER', 'Null'],
    ['surcharge', 'Phụ thu', 'INTEGER', 'Null'],
    ['discount', 'Giảm giá', 'INTEGER', 'Null'],
    ['total_amount', 'Thành tiền phải thu', 'INTEGER', 'Not null'],
    ['status', 'RESERVED / ACTIVE / COMPLETED / CANCELLED', 'TEXT', 'Not null'],
  ]},
  { name: 'financial_transactions', desc: 'Sổ giao dịch — bút toán bất biến, không sửa không xoá', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã bút toán', 'TEXT', 'Not null'],
    ['customer_id', 'Tham chiếu customers(id)', 'TEXT (FK)', 'Null'],
    ['rental_id', 'Tham chiếu rentals(id)', 'TEXT (FK)', 'Null'],
    ['kind', 'DEPOSIT / RENTAL_PAYMENT / REFUND / ADJUSTMENT', 'TEXT', 'Not null'],
    ['payment_method', 'CASH / BANK / WALLET / OTHER', 'TEXT', 'Not null'],
    ['cash_change', 'Biến động tiền thực (+ thu, − chi)', 'INTEGER', 'Not null'],
    ['wallet_change', 'Biến động số dư ví khách', 'INTEGER', 'Not null'],
    ['revenue_change', 'Biến động doanh thu ghi nhận', 'INTEGER', 'Not null'],
    ['occurred_at', 'Thời điểm phát sinh', 'TEXT', 'Not null'],
  ]},
  { name: 'expenses', desc: 'Sổ chi phí vận hành', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã khoản chi', 'TEXT', 'Not null'],
    ['category', 'ELECTRICITY / INTERNET / RENT / SALARY / PARTS / …', 'TEXT', 'Not null'],
    ['amount', 'Số tiền chi', 'INTEGER', 'Not null'],
    ['vendor', 'Nhà cung cấp', 'TEXT', 'Null'],
    ['occurred_at', 'Ngày chi', 'TEXT', 'Not null'],
  ]},
  { name: 'repairs', desc: 'Phiếu sửa chữa thiết bị', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã phiếu sửa', 'TEXT', 'Not null'],
    ['device_id', 'Tham chiếu devices(id)', 'TEXT (FK)', 'Not null'],
    ['title', 'Tiêu đề hỏng hóc', 'TEXT', 'Not null'],
    ['status', 'REPORTED / IN_PROGRESS / DONE / UNREPAIRABLE', 'TEXT', 'Not null'],
    ['service_cost', 'Tiền công thợ', 'INTEGER', 'Null'],
    ['reported_at', 'Ngày báo hỏng', 'TEXT', 'Not null'],
  ]},
  { name: 'parts', desc: 'Danh mục linh kiện trong kho', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã linh kiện', 'TEXT', 'Not null'],
    ['name', 'Tên linh kiện', 'TEXT', 'Not null'],
    ['unit', 'Đơn vị tính', 'TEXT', 'Null'],
    ['min_quantity', 'Mức tồn tối thiểu để cảnh báo', 'INTEGER', 'Null'],
  ]},
  { name: 'part_movements', desc: 'Xuất nhập kho linh kiện; tồn kho là tổng cột quantity', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['part_id', 'Tham chiếu parts(id)', 'TEXT (FK)', 'Not null'],
    ['repair_id', 'Tham chiếu repairs(id) nếu lắp vào phiếu sửa', 'TEXT (FK)', 'Null'],
    ['kind', 'PURCHASE / CONSUME / RETURN / ADJUST', 'TEXT', 'Not null'],
    ['quantity', 'Số lượng (+ nhập, − xuất)', 'INTEGER', 'Not null'],
    ['unit_cost', 'Giá vốn đơn vị', 'INTEGER', 'Not null'],
  ]},
  { name: 'booking_requests', desc: 'Yêu cầu thuê máy khách gửi từ cổng khách hàng', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã yêu cầu', 'TEXT', 'Not null'],
    ['customer_id', 'Tham chiếu customers(id)', 'TEXT (FK)', 'Not null'],
    ['device_id', 'Tham chiếu devices(id)', 'TEXT (FK)', 'Not null'],
    ['status', 'PENDING / APPROVED / REJECTED / CANCELLED', 'TEXT', 'Not null'],
    ['estimated_amount', 'Tiền tạm tính', 'INTEGER', 'Null'],
  ]},
  { name: 'support_tickets', desc: 'Ticket hỗ trợ giữa khách và tiệm', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['code', 'Mã ticket', 'TEXT', 'Not null'],
    ['customer_id', 'Tham chiếu customers(id)', 'TEXT (FK)', 'Not null'],
    ['subject', 'Tiêu đề', 'TEXT', 'Not null'],
    ['status', 'OPEN / WAITING_CUSTOMER / RESOLVED / CLOSED', 'TEXT', 'Not null'],
  ]},
  { name: 'audit_logs', desc: 'Nhật ký thao tác quản trị', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['admin_id', 'Tham chiếu admins(id)', 'TEXT (FK)', 'Null'],
    ['action', 'LOGIN / CREATE / UPDATE / PAYMENT / REFUND …', 'TEXT', 'Not null'],
    ['entity_type', 'Loại đối tượng bị tác động', 'TEXT', 'Not null'],
    ['created_at', 'Thời điểm thao tác', 'TEXT', 'Not null'],
  ]},
  { name: 'network_lock_events', desc: 'Nhật ký chạy lệnh khoá/mở mạng', fields: [
    ['id', 'Khoá chính', 'TEXT', 'Not null'],
    ['device_id', 'Tham chiếu devices(id)', 'TEXT (FK)', 'Not null'],
    ['action', 'LOCK / UNLOCK', 'TEXT', 'Not null'],
    ['command', 'Câu lệnh thực tế đã chạy', 'TEXT', 'Null'],
    ['success', 'Lệnh chạy thành công hay không', 'INTEGER', 'Not null'],
  ]},
];

export const DB_RELATIONS =
  'rentals.customer_id → customers.id; rentals.device_id → devices.id; '
  + 'customer_accounts.customer_id → customers.id; '
  + 'financial_transactions.customer_id → customers.id và .rental_id → rentals.id; '
  + 'repairs.device_id → devices.id; part_movements.part_id → parts.id và .repair_id → repairs.id; '
  + 'booking_requests.customer_id → customers.id và .device_id → devices.id; '
  + 'support_tickets.customer_id → customers.id; network_lock_events.device_id → devices.id.';

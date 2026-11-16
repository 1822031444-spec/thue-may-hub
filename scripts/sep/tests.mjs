/**
 * Kịch bản kiểm thử cho 3 chức năng đại diện của Sprint 1.
 *
 * Các defect dưới đây là lỗi có thật đã gặp khi làm dự án này, không bịa:
 * bấm nút hai lần sinh hai bút toán, và lỗi tải dữ liệu bị hiển thị nhầm thành
 * "chưa có dữ liệu". Nhờ vậy phần Test Execute và Defect Report khớp với lịch sử
 * sửa lỗi thật của mã nguồn.
 */

const PRE_ADMIN = 'Đã đăng nhập bằng tài khoản Chủ hệ thống';

/* ---- 1. Tạo đơn thuê ------------------------------------------------------ */

const TAO_DON_THUE = {
  key: 'TaoDonThue',
  fn: 'Tạo đơn thuê',
  module: 'Quản lý đơn thuê',
  requirements: [
    ['T.R.01', 'Tạo thành công đơn thuê khi nhập đủ thông tin hợp lệ', 'Positive', 'High'],
    ['T.R.02', 'Bấm "Huỷ" thì quay lại danh sách và không lưu dữ liệu vừa nhập', 'Positive', 'High'],
    ['T.R.03', 'Hệ thống báo lỗi khi chưa chọn khách hàng', 'Negative', 'High'],
    ['T.R.04', 'Hệ thống báo lỗi khi ngày kết thúc không sau ngày bắt đầu', 'Negative', 'High'],
    ['T.R.05', 'Máy đang được thuê không xuất hiện trong danh sách máy chọn được', 'Negative', 'High'],
    ['T.R.06', 'Thuê đúng 1 giờ thì tính đúng tiền của 1 giờ (biên)', 'Boundary', 'Medium'],
  ],
  cases: [
    { tr: 'T.R.01', tc: 'T.C.s.01', goal: 'Tạo thành công 1 đơn thuê mới, đơn hiển thị đầu danh sách', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm vào menu "Đơn thuê"', '', 'Hệ thống hiển thị trang "Đơn thuê"'],
      ['Bấm "Tạo đơn thuê"', '', 'Hệ thống hiển thị form tạo đơn thuê'],
      ['Chọn khách hàng', 'Khách hàng: Nguyễn Văn Khách', 'Ô khách hàng hiển thị đúng tên đã chọn'],
      ['Chọn thiết bị còn trống', 'Thiết bị: PC-001', 'Ô thiết bị hiển thị đúng máy đã chọn'],
      ['Chọn thời hạn thuê', 'Từ 01/09/2026 08:00 đến 01/10/2026 08:00', 'Hệ thống tự tính và hiển thị thành tiền'],
      ['Bấm "Lưu"', '', 'Hệ thống tạo đơn thành công, đơn mới hiển thị đầu danh sách, máy chuyển trạng thái Đang thuê'],
    ]},
    { tr: 'T.R.02', tc: 'T.C.s.02', goal: 'Hệ thống quay lại trang "Đơn thuê" khi bấm "Huỷ"', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm vào menu "Đơn thuê"', '', 'Hệ thống hiển thị trang "Đơn thuê"'],
      ['Bấm "Tạo đơn thuê"', '', 'Hệ thống hiển thị form tạo đơn thuê'],
      ['Chọn khách hàng và thiết bị', 'Khách hàng: Nguyễn Văn Khách', 'Form hiển thị dữ liệu đã chọn'],
      ['Bấm "Huỷ"', '', 'Hệ thống quay về trang "Đơn thuê", không tạo đơn nào'],
    ]},
    { tr: 'T.R.03', tc: 'T.C.s.03', goal: 'Hệ thống báo lỗi khi không chọn khách hàng mà bấm "Lưu"', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Đơn thuê" rồi bấm "Tạo đơn thuê"', '', 'Hệ thống hiển thị form tạo đơn thuê'],
      ['Bỏ trống khách hàng, chọn thiết bị và thời hạn', 'Khách hàng: (để trống)', 'Form vẫn ở trạng thái đang nhập'],
      ['Bấm "Lưu"', '', 'Hệ thống hiển thị thông báo "Vui lòng chọn khách hàng", không tạo đơn'],
    ]},
    { tr: 'T.R.04', tc: 'T.C.s.04', goal: 'Hệ thống báo lỗi khi ngày kết thúc trước hoặc bằng ngày bắt đầu', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Đơn thuê" rồi bấm "Tạo đơn thuê"', '', 'Hệ thống hiển thị form tạo đơn thuê'],
      ['Chọn khách hàng và thiết bị hợp lệ', 'Khách hàng: Nguyễn Văn Khách, Thiết bị: PC-001', 'Form nhận dữ liệu'],
      ['Nhập thời hạn không hợp lệ', 'Từ 01/09/2026 08:00 đến 31/08/2026 08:00', 'Form vẫn ở trạng thái đang nhập'],
      ['Bấm "Lưu"', '', 'Hệ thống báo lỗi "Ngày kết thúc phải sau ngày bắt đầu", không tạo đơn'],
    ]},
    { tr: 'T.R.05', tc: 'T.C.s.05', goal: 'Máy đang được thuê không nằm trong danh sách chọn', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Tạo một đơn thuê cho máy PC-001', 'Thiết bị: PC-001', 'Máy PC-001 chuyển sang trạng thái Đang thuê'],
      ['Bấm "Tạo đơn thuê" lần nữa', '', 'Hệ thống hiển thị form tạo đơn thuê'],
      ['Mở danh sách chọn thiết bị', '', 'Máy PC-001 không xuất hiện trong danh sách máy chọn được'],
    ]},
    { tr: 'T.R.06', tc: 'T.C.s.06', goal: 'Thuê đúng 1 giờ thì thành tiền bằng đúng giá thuê 1 giờ', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Đơn thuê" rồi bấm "Tạo đơn thuê"', '', 'Hệ thống hiển thị form tạo đơn thuê'],
      ['Chọn máy có giá thuê giờ là 20.000đ', 'Thiết bị: PC-001, giá giờ 20.000đ', 'Form hiển thị giá thuê của máy'],
      ['Chọn thời hạn đúng 1 giờ', 'Từ 01/09/2026 08:00 đến 01/09/2026 09:00', 'Hệ thống hiển thị thành tiền 20.000đ'],
      ['Bấm "Lưu"', '', 'Đơn được tạo với thành tiền đúng 20.000đ'],
    ]},
  ],
  /** Kết quả lần chạy 1 theo Test Case ID; thiếu nghĩa là Pass. */
  run1: {},
};

/* ---- 2. Thu tiền đơn thuê ------------------------------------------------- */

const THU_TIEN_DON = {
  key: 'ThuTienDon',
  fn: 'Thu tiền đơn thuê',
  module: 'Quản lý đơn thuê',
  requirements: [
    ['T.R.01', 'Thu đúng số tiền còn nợ thì đơn chuyển sang đã thu đủ', 'Positive', 'High'],
    ['T.R.02', 'Thu một phần thì hệ thống hiển thị đúng số tiền còn lại', 'Positive', 'High'],
    ['T.R.03', 'Hệ thống không cho thu vượt quá số tiền còn nợ của đơn', 'Negative', 'High'],
    ['T.R.04', 'Trừ ví khi số dư ví không đủ thì hệ thống báo lỗi và không ghi bút toán', 'Negative', 'High'],
    ['T.R.05', 'Thu đúng bằng số còn nợ (giá trị biên) vẫn được chấp nhận', 'Boundary', 'High'],
    ['T.R.06', 'Bấm nút "Xác nhận thu" hai lần liên tiếp chỉ ghi nhận một bút toán', 'Negative', 'High'],
  ],
  cases: [
    { tr: 'T.R.01', tc: 'T.C.s.01', goal: 'Thu đủ tiền, đơn hiển thị đã thanh toán đủ', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Mở trang "Đơn thuê", chọn đơn còn nợ 500.000đ', 'Đơn: HD-0001, còn nợ 500.000đ', 'Hệ thống hiển thị đơn với số còn nợ 500.000đ'],
      ['Bấm "Thu tiền"', '', 'Hệ thống hiển thị form thu tiền'],
      ['Nhập số tiền và chọn phương thức', 'Số tiền: 500.000đ, Phương thức: Tiền mặt', 'Form nhận dữ liệu'],
      ['Bấm "Xác nhận thu"', '', 'Hệ thống ghi nhận thanh toán, đơn hiển thị đã thu đủ, sổ giao dịch có 1 bút toán mới'],
    ]},
    { tr: 'T.R.02', tc: 'T.C.s.02', goal: 'Thu một phần, hệ thống hiển thị đúng số tiền còn lại', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Mở trang "Đơn thuê", chọn đơn còn nợ 500.000đ', 'Đơn: HD-0002, còn nợ 500.000đ', 'Hệ thống hiển thị đơn với số còn nợ 500.000đ'],
      ['Bấm "Thu tiền", nhập 200.000đ', 'Số tiền: 200.000đ', 'Form nhận dữ liệu'],
      ['Bấm "Xác nhận thu"', '', 'Hệ thống ghi nhận 200.000đ, đơn hiển thị còn nợ 300.000đ'],
    ]},
    { tr: 'T.R.03', tc: 'T.C.s.03', goal: 'Hệ thống chặn khi thu vượt số còn nợ', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Mở đơn còn nợ 500.000đ, bấm "Thu tiền"', 'Đơn: HD-0003, còn nợ 500.000đ', 'Hệ thống hiển thị form thu tiền'],
      ['Nhập số tiền lớn hơn số còn nợ', 'Số tiền: 600.000đ', 'Form nhận dữ liệu'],
      ['Bấm "Xác nhận thu"', '', 'Hệ thống báo lỗi "Số tiền thu vượt quá số còn nợ", không ghi bút toán nào'],
    ]},
    { tr: 'T.R.04', tc: 'T.C.s.04', goal: 'Trừ ví khi số dư không đủ thì báo lỗi', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Mở đơn của khách có ví 100.000đ, còn nợ 500.000đ', 'Ví khách: 100.000đ', 'Hệ thống hiển thị số dư ví của khách'],
      ['Bấm "Thu tiền", chọn phương thức "Trừ ví"', 'Số tiền: 500.000đ, Phương thức: Trừ ví', 'Form nhận dữ liệu'],
      ['Bấm "Xác nhận thu"', '', 'Hệ thống báo lỗi "Số dư ví không đủ", ví khách vẫn còn nguyên 100.000đ'],
    ]},
    { tr: 'T.R.05', tc: 'T.C.s.05', goal: 'Thu đúng bằng số còn nợ (biên) được chấp nhận', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Mở đơn còn nợ đúng 1đ', 'Đơn: HD-0004, còn nợ 1đ', 'Hệ thống hiển thị số còn nợ 1đ'],
      ['Bấm "Thu tiền", nhập đúng 1đ', 'Số tiền: 1đ', 'Form nhận dữ liệu'],
      ['Bấm "Xác nhận thu"', '', 'Hệ thống ghi nhận thành công, đơn hiển thị đã thu đủ'],
    ]},
    { tr: 'T.R.06', tc: 'T.C.s.06', goal: 'Bấm "Xác nhận thu" hai lần liên tiếp chỉ ghi một bút toán', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Mở đơn còn nợ 500.000đ, bấm "Thu tiền"', 'Đơn: HD-0005, còn nợ 500.000đ', 'Hệ thống hiển thị form thu tiền'],
      ['Nhập 500.000đ', 'Số tiền: 500.000đ', 'Form nhận dữ liệu'],
      ['Bấm "Xác nhận thu" hai lần thật nhanh', '', 'Nút bị khoá ngay sau lần bấm đầu; sổ giao dịch chỉ có đúng 1 bút toán 500.000đ'],
    ]},
  ],
  run1: {
    'T.C.s.06': { result: 'Fail', note: 'Bấm nhanh 2 lần sinh 2 bút toán, đơn bị thu thành 1.000.000đ trên tổng tiền 500.000đ -> xem Defect Report DF.01' },
  },
};

/* ---- 3. Thêm thiết bị ----------------------------------------------------- */

const THEM_THIET_BI = {
  key: 'ThemThietBi',
  fn: 'Thêm thiết bị',
  module: 'Quản lý thiết bị',
  requirements: [
    ['T.R.01', 'Thêm thành công thiết bị mới khi nhập đủ thông tin hợp lệ', 'Positive', 'High'],
    ['T.R.02', 'Bấm "Huỷ" thì quay lại kho thiết bị và không lưu dữ liệu', 'Positive', 'High'],
    ['T.R.03', 'Hệ thống báo lỗi khi bỏ trống tên thiết bị', 'Negative', 'High'],
    ['T.R.04', 'Hệ thống báo lỗi khi mã thiết bị bị trùng với máy đã có', 'Negative', 'High'],
    ['T.R.05', 'Thiết bị có giá thuê bằng 0 vẫn lưu được (biên dưới)', 'Boundary', 'Medium'],
    ['T.R.06', 'Hệ thống báo lỗi khi nhập giá thuê âm', 'Negative', 'Medium'],
  ],
  cases: [
    { tr: 'T.R.01', tc: 'T.C.s.01', goal: 'Thêm thành công 1 máy mới, máy hiển thị trong kho thiết bị', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm vào menu "Kho thiết bị"', '', 'Hệ thống hiển thị trang "Kho thiết bị"'],
      ['Bấm "Thêm thiết bị"', '', 'Hệ thống hiển thị form thêm thiết bị'],
      ['Nhập thông tin máy', 'Tên: PC Gaming 01, Loại: PC, Giá tháng: 3.000.000đ', 'Form nhận dữ liệu'],
      ['Bấm "Lưu"', '', 'Hệ thống tạo máy thành công, máy mới hiển thị trong kho với trạng thái Sẵn sàng'],
    ]},
    { tr: 'T.R.02', tc: 'T.C.s.02', goal: 'Hệ thống quay lại kho thiết bị khi bấm "Huỷ"', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Kho thiết bị" rồi bấm "Thêm thiết bị"', '', 'Hệ thống hiển thị form thêm thiết bị'],
      ['Nhập tên máy', 'Tên: PC Gaming 02', 'Form nhận dữ liệu'],
      ['Bấm "Huỷ"', '', 'Hệ thống quay về kho thiết bị, không tạo máy nào'],
    ]},
    { tr: 'T.R.03', tc: 'T.C.s.03', goal: 'Hệ thống báo lỗi khi bỏ trống tên thiết bị', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Kho thiết bị" rồi bấm "Thêm thiết bị"', '', 'Hệ thống hiển thị form thêm thiết bị'],
      ['Bỏ trống tên máy, nhập các thông tin còn lại', 'Tên: (để trống)', 'Form vẫn ở trạng thái đang nhập'],
      ['Bấm "Lưu"', '', 'Hệ thống hiển thị thông báo "Không được để trống" dưới ô Tên thiết bị'],
    ]},
    { tr: 'T.R.04', tc: 'T.C.s.04', goal: 'Hệ thống báo lỗi khi mã thiết bị bị trùng', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Kho thiết bị" rồi bấm "Thêm thiết bị"', '', 'Hệ thống hiển thị form thêm thiết bị'],
      ['Nhập mã máy trùng với máy đã có', 'Mã: PC-001 (đã tồn tại)', 'Form nhận dữ liệu'],
      ['Bấm "Lưu"', '', 'Hệ thống báo lỗi "Mã thiết bị đã tồn tại", không tạo máy mới'],
    ]},
    { tr: 'T.R.05', tc: 'T.C.s.05', goal: 'Máy có giá thuê bằng 0 vẫn lưu được', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Kho thiết bị" rồi bấm "Thêm thiết bị"', '', 'Hệ thống hiển thị form thêm thiết bị'],
      ['Nhập máy với giá thuê bằng 0', 'Tên: Máy dự phòng, Giá giờ: 0, Giá tháng: 0', 'Form nhận dữ liệu'],
      ['Bấm "Lưu"', '', 'Hệ thống tạo máy thành công với giá thuê 0đ'],
    ]},
    { tr: 'T.R.06', tc: 'T.C.s.06', goal: 'Hệ thống báo lỗi khi nhập giá thuê âm', steps: [
      ['Đăng nhập bằng tài khoản Chủ hệ thống', '', 'Hệ thống hiển thị trang Tổng quan'],
      ['Bấm "Kho thiết bị" rồi bấm "Thêm thiết bị"', '', 'Hệ thống hiển thị form thêm thiết bị'],
      ['Nhập giá thuê âm', 'Giá tháng: -100.000', 'Form nhận dữ liệu'],
      ['Bấm "Lưu"', '', 'Hệ thống báo lỗi "Giá thuê không được âm", không tạo máy mới'],
    ]},
  ],
  run1: {
    'T.C.s.04': { result: 'Fail', note: 'Khi mã trùng, hệ thống hiện màn hình trống báo "Chưa có thiết bị" thay vì báo lỗi trùng mã -> xem Defect Report DF.02' },
  },
};

export const SUITES = [TAO_DON_THUE, THU_TIEN_DON, THEM_THIET_BI];
export { PRE_ADMIN };

/* ---- Defect Report -------------------------------------------------------- */

export const DEFECTS = [
  ['DF.01', 'Quản lý đơn thuê', 1,
    'Bấm "Xác nhận thu" hai lần liên tiếp làm đơn bị thu tiền hai lần',
    'Nút xác nhận thu tiền không bị khoá sau lần bấm đầu, nên bấm nhanh hai lần sẽ gửi hai yêu cầu và ghi hai bút toán, khiến số đã thu vượt quá tổng tiền của đơn',
    '1. Đăng nhập Chủ hệ thống\n2. Mở đơn còn nợ 500.000đ\n3. Bấm "Thu tiền", nhập 500.000đ\n4. Bấm "Xác nhận thu" hai lần thật nhanh',
    'Sổ giao dịch chỉ có đúng 1 bút toán 500.000đ, đơn hiển thị đã thu đủ',
    'Sổ giao dịch có 2 bút toán, đơn hiển thị đã thu 1.000.000đ trên tổng tiền 500.000đ',
    'High', 'High', 'Đỗ Tuấn Thành', 'Done'],
  ['DF.02', 'Quản lý thiết bị', 1,
    'Lỗi khi lưu bị hiển thị nhầm thành "Chưa có thiết bị"',
    'Khi lời gọi API thất bại, giao diện vẫn hiển thị trạng thái rỗng "Chưa có thiết bị" thay vì báo lỗi, khiến người dùng tưởng mất sạch dữ liệu',
    '1. Đăng nhập Chủ hệ thống\n2. Ngắt kết nối tới server\n3. Mở trang "Kho thiết bị"',
    'Hệ thống hiển thị thông báo lỗi kèm nút "Thử lại"',
    'Hệ thống hiển thị "Chưa có thiết bị" như thể kho máy đang trống',
    'High', 'High', 'Đào Việt Anh', 'Done'],
  ['DF.03', 'Tài chính', 2,
    'Ô lọc nhóm chi chiếm trọn một dòng làm vỡ bố cục thanh công cụ',
    'Quy tắc CSS chung đặt chiều rộng 100% cho thẻ select, nên ô lọc trong thanh công cụ bị kéo dài hết dòng và đẩy số đếm xuống dưới',
    '1. Đăng nhập Chủ hệ thống\n2. Mở trang "Tài chính"\n3. Chọn tab "Sổ chi phí"',
    'Ô tìm kiếm, ô lọc nhóm chi và số đếm nằm gọn trên cùng một dòng',
    'Ô lọc nhóm chi chiếm trọn một dòng riêng, số đếm bị đẩy xuống dòng thứ ba',
    'Low', 'Low', 'Phạm Văn Đức Phú', 'Open'],
];

/* ---- Số liệu Test Report Sprint 1 ----------------------------------------- */

/** Các chức năng đã kiểm thử trong Sprint 1 và số test case tương ứng. */
export const TEST_REPORT_ROWS = [
  ['Đăng nhập/Đăng xuất quản trị', 6, 6, 0],
  ['Đổi mật khẩu', 5, 5, 0],
  ['Xem danh sách khách hàng', 5, 5, 0],
  ['Tìm kiếm & lọc khách hàng', 4, 4, 0],
  ['Thêm khách hàng', 6, 6, 0],
  ['Sửa hồ sơ khách hàng', 5, 5, 0],
  ['Đổi trạng thái khách hàng', 4, 4, 0],
  ['Xem danh sách thiết bị', 5, 5, 0],
  ['Tìm kiếm & lọc thiết bị', 4, 4, 0],
  ['Thêm thiết bị', 6, 5, 1],
  ['Sửa thiết bị', 5, 5, 0],
  ['Đổi trạng thái thiết bị', 4, 4, 0],
  ['Xem danh sách đơn thuê', 5, 5, 0],
  ['Tạo đơn thuê', 6, 6, 0],
  ['Thu tiền đơn thuê', 6, 5, 1],
  ['Kích hoạt & hoàn tất đơn', 5, 5, 0],
  ['Huỷ đơn thuê', 4, 4, 0],
];

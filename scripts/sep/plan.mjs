/** Backlog, rủi ro và số liệu theo dõi tiến độ của Nhóm 11. */

import { DBA, DEVS, member, PRODUCT_OWNER, SCRUM_MASTER, TEAM, TESTER } from './data.mjs';
import { TASKS } from './tasks.mjs';

/* ---- Product Backlog ------------------------------------------------------ */

export const PRODUCT_BACKLOG = [
  ['US.01', 'Là người dùng, tôi muốn đăng nhập/đăng xuất bằng email để sử dụng hệ thống', 'Đăng nhập/Đăng xuất', 5, 'High', 'Sprint 1'],
  ['US.02', 'Là Chủ hệ thống, tôi muốn xem/tìm/thêm/sửa hồ sơ khách hàng', 'Quản lý khách hàng', 13, 'High', 'Sprint 1'],
  ['US.03', 'Là Chủ hệ thống, tôi muốn khoá khách hàng vi phạm để họ không thuê tiếp được', 'Quản lý khách hàng', 5, 'Medium', 'Sprint 1'],
  ['US.04', 'Là Chủ hệ thống, tôi muốn quản lý kho máy PC/Boxphone (xem/tìm/thêm/sửa)', 'Quản lý thiết bị', 13, 'High', 'Sprint 1'],
  ['US.05', 'Là Chủ hệ thống, tôi muốn biết mỗi máy đã thu về bao nhiêu và tốn bao nhiêu tiền sửa', 'Quản lý thiết bị', 8, 'High', 'Sprint 1'],
  ['US.06', 'Là Nhân viên, tôi muốn tạo đơn thuê cho khách và hệ thống tự tính thành tiền', 'Quản lý đơn thuê', 21, 'High', 'Sprint 1'],
  ['US.07', 'Là Nhân viên, tôi muốn thu tiền đơn thuê bằng tiền mặt, chuyển khoản hoặc trừ ví', 'Quản lý đơn thuê', 13, 'High', 'Sprint 1'],
  ['US.08', 'Là Nhân viên, tôi muốn kích hoạt và hoàn tất đơn thuê theo đúng vòng đời', 'Quản lý đơn thuê', 8, 'High', 'Sprint 1'],
  ['US.09', 'Là Chủ hệ thống, tôi muốn nạp tiền vào ví khách và hoàn tiền khi cần', 'Tài chính', 13, 'High', 'Sprint 2'],
  ['US.10', 'Là Chủ hệ thống, tôi muốn xem sổ giao dịch và sổ chi phí theo từng kỳ', 'Tài chính', 13, 'High', 'Sprint 2'],
  ['US.11', 'Là Chủ hệ thống, tôi muốn ghi nhận chi phí vận hành (điện, mạng, mặt bằng)', 'Tài chính', 8, 'Medium', 'Sprint 2'],
  ['US.12', 'Là Nhân viên, tôi muốn lập phiếu sửa chữa khi máy hỏng', 'Sửa chữa & kho linh kiện', 13, 'High', 'Sprint 2'],
  ['US.13', 'Là Nhân viên, tôi muốn quản lý kho linh kiện và lắp linh kiện vào máy', 'Sửa chữa & kho linh kiện', 21, 'High', 'Sprint 2'],
  ['US.14', 'Là Khách hàng, tôi muốn xem danh mục máy và gửi yêu cầu thuê từ xa', 'Cổng khách hàng', 13, 'High', 'Sprint 2'],
  ['US.15', 'Là Khách hàng, tôi muốn thanh toán đơn bằng ví và xin gia hạn trực tuyến', 'Cổng khách hàng', 13, 'High', 'Sprint 2'],
  ['US.16', 'Là Khách hàng, tôi muốn gửi ticket hỗ trợ và theo dõi phản hồi', 'Cổng khách hàng', 8, 'Medium', 'Sprint 2'],
  ['US.17', 'Là Chủ hệ thống, tôi muốn duyệt yêu cầu thuê và báo giá gia hạn cho khách', 'Yêu cầu & hỗ trợ', 13, 'High', 'Sprint 2'],
  ['US.18', 'Là Chủ hệ thống, tôi muốn máy tự bị khoá mạng khi khách hết hạn thuê', 'Khoá mạng khi hết hạn', 21, 'High', 'Sprint 3'],
  ['US.19', 'Là Chủ hệ thống, tôi muốn tạo tài khoản cho nhân viên và giới hạn quyền của họ', 'Cài đặt & phân quyền', 13, 'High', 'Sprint 3'],
  ['US.20', 'Là Chủ hệ thống, tôi muốn xem nhật ký thao tác để biết ai đã làm gì', 'Cài đặt & phân quyền', 8, 'Medium', 'Sprint 3'],
  ['US.21', 'Là Chủ hệ thống, tôi muốn xuất sổ tiền ra CSV để đối chiếu sổ sách', 'Tài chính', 5, 'Medium', 'Sprint 3'],
  // Bổ sung khi rà backlog giữa Sprint 2: phần mã nguồn đã có nhưng chưa thuộc story nào.
  ['US.22', 'Là Chủ hệ thống, tôi muốn xem trang Tổng quan: máy đang thuê, đơn sắp hết hạn, doanh thu tháng', 'Tài chính', 8, 'Medium', 'Sprint 3'],
  ['US.23', 'Là Chủ hệ thống, tôi muốn được nhắc các đơn sắp hết hạn trên màn hình và qua Telegram', 'Quản lý đơn thuê', 13, 'High', 'Sprint 3'],
  ['US.24', 'Là Nhân viên, tôi muốn gia hạn đơn ngay tại quầy và xem lịch sử các kỳ thuê', 'Quản lý đơn thuê', 8, 'High', 'Sprint 3'],
  ['US.25', 'Là Chủ hệ thống, tôi muốn dữ liệu được sao lưu tự động và đổi được thư mục dữ liệu', 'Cài đặt & phân quyền', 8, 'High', 'Sprint 3'],
  ['US.26', 'Là Chủ hệ thống, tôi muốn cài phần mềm như một ứng dụng trên máy Windows', 'Cài đặt & phân quyền', 13, 'Medium', 'Sprint 3'],
  // Bổ sung giữa Sprint 3: giao diện mới theo thiết kế Figma (ThueMayHub-FE).
  ['US.27', 'Là người dùng, tôi muốn dùng giao diện mới theo thiết kế Figma và đăng nhập một màn hình chung cho cả ba vai trò', 'Đăng nhập/Đăng xuất', 13, 'High', 'Sprint 3'],
];

/* ---- Sprint 1 Backlog Items ----------------------------------------------- */

/**
 * Ảnh chụp lúc chốt Sprint 1 cho tài liệu 1.2.6, lấy từ danh sách việc chung
 * trong tasks.mjs. Dùng `snap` (trạng thái ngày 13/09) chứ không phải trạng thái
 * hiện tại trên Jira, vì tài liệu ghi lại đúng thời điểm đóng sprint.
 */
export const SPRINT1_TASKS = TASKS
  .filter((t) => t.sprint === 1)
  .map((t) => [t.code, t.story, t.title, member(t.who).name, t.snap ?? t.status, t.points]);

/* ---- Rủi ro --------------------------------------------------------------- */

export const RISKS = [
  ['R.01', 'Thành viên chưa quen React/TypeScript/Electron', 'Chậm tiến độ code do phải học công nghệ mới', 'Technical Risk', TEAM[4].name, 'Cả nhóm', 0.5, 5, 2.5, 'Mitigate', 'Tự học qua tài liệu chính thức, nhờ mentor hỗ trợ, pair-programming giữa các thành viên', 'Open'],
  ['R.02', 'Sai sót trong tính tiền đơn thuê và số dư ví', 'Thu sai tiền khách, mất uy tín và thất thoát doanh thu', 'Technical Risk', DEVS[0], 'Developer Team', 0.4, 5, 2.0, 'Mitigate', 'Ghi sổ theo bút toán bất biến 3 giá trị, viết test tự động cho mọi luồng tiền, review chéo code phần tiền', 'Open'],
  ['R.03', 'Hai người cùng thao tác trên một đơn thuê cùng lúc', 'Thu vượt tiền hoặc ví bị âm mà không báo lỗi', 'Technical Risk', DEVS[0], 'Developer Team', 0.3, 5, 1.5, 'Mitigate', 'Dùng API đồng bộ của node:sqlite, viết bài test bắn nhiều yêu cầu song song để kiểm chứng', 'Open'],
  ['R.04', 'Yêu cầu nghiệp vụ thay đổi từ phía chủ tiệm', 'Phải chỉnh sửa lại chức năng đã làm', 'Project Risk', PRODUCT_OWNER, 'Product Owner', 0.5, 4, 2.0, 'Mitigate', 'Xác nhận rõ yêu cầu với khách hàng trước mỗi sprint, ghi nhận thay đổi vào Change Log', 'Open'],
  ['R.05', 'Thiết kế cơ sở dữ liệu thiếu ràng buộc khoá ngoại', 'Dữ liệu mồ côi, sai số liệu báo cáo', 'Technical Risk', DBA, 'Cả nhóm', 0.3, 4, 1.2, 'Mitigate', 'Bật PRAGMA foreign_keys, review ERD với mentor trước khi code', 'Open'],
  ['R.06', 'Mất dữ liệu kinh doanh do hỏng file database', 'Mất toàn bộ lịch sử thuê và sổ tiền', 'Technical Risk', DBA, 'Cả nhóm', 0.3, 5, 1.5, 'Mitigate', 'Bật chế độ WAL, hướng dẫn sao lưu định kỳ, tuyệt đối không đặt file database trên ổ đồng bộ đám mây', 'Open'],
  ['R.07', 'Lệnh khoá mạng bị lợi dụng để chạy lệnh khác', 'Máy chủ bị chiếm quyền điều khiển', 'Technical Risk', DEVS[0], 'Developer Team', 0.2, 5, 1.0, 'Mitigate', 'Chỉ thay {ip} và {code}, kiểm tra giá trị đúng khuôn bằng biểu thức chính quy, sai khuôn thì từ chối chạy', 'Open'],
  ['R.08', 'Tiến độ Sprint bị trễ do khối lượng lớn hơn ước lượng', 'Không hoàn thành backlog đúng hạn', 'Project Risk', SCRUM_MASTER, 'Cả nhóm', 0.5, 3, 1.5, 'Mitigate', 'Ước lượng lại story point sát hơn, dời việc ít ưu tiên sang sprint sau', 'Open'],
  ['R.09', 'Thành viên vắng họp, chậm cập nhật tiến độ', 'Ảnh hưởng phối hợp và tiến độ chung', 'Project Risk', SCRUM_MASTER, 'Cả nhóm', 0.3, 2, 0.6, 'Mitigate', 'Áp dụng nội quy trong Team Charter, người vắng phải xem lại biên bản họp', 'Open'],
  ['R.10', 'Viết thiếu test case cho luồng tiền', 'Bỏ sót lỗi nghiêm trọng về tiền bạc', 'Technical Risk', TESTER, 'Tester', 0.4, 5, 2.0, 'Mitigate', 'Cho 2 thành viên review chéo test case trước khi thực thi, bắt buộc có ca kiểm thử biên', 'Open'],
];

export const ISSUES = [
  ['ISE.01', 'Thành viên chưa rõ cách dùng cookie HttpOnly nên phiên đăng nhập bị mất khi tải lại trang', 'R.01', 'Technical risk', DEVS[0], 'occurred', 2, 'Dành 1 buổi học nhóm về cookie phiên và middleware xác thực', 'Closed'],
  ['ISE.02', 'Thu tiền đơn thuê hai lần liên tiếp làm số đã thu vượt tổng tiền đơn', 'R.02', 'Technical risk', DEVS[0], 'occurred', 4, 'Bổ sung kiểm tra số còn nợ trước khi ghi bút toán, viết test tự động canh lỗi này', 'Closed'],
  ['ISE.03', 'Thành viên vào họp trễ 15 phút', 'R.09', 'Project risk', SCRUM_MASTER, 'occurred', 1, 'Nhắc nhở và trừ điểm theo nội quy Team Charter', 'Closed'],
];

/* ---- Sản phẩm bàn giao ---------------------------------------------------- */

export const DELIVERABLES = [
  ['Project Plan', 'Tổng quan mục tiêu, phạm vi, phương pháp, deliverable của dự án'],
  ['Team Charter', 'Thông tin thành viên và nội quy hoạt động nhóm'],
  ['Risk Management Plan', 'Quy trình nhận diện, đánh giá, xử lý rủi ro'],
  ['Risk List', 'Danh sách rủi ro cụ thể kèm mức ưu tiên và cách xử lý'],
  ['Configuration Management Plan', 'Quy ước đặt tên file, nơi lưu trữ tài liệu và mã nguồn'],
  ['Milestone', 'Mốc thời gian 12 tuần và 4 sprint của dự án'],
  ['Product Backlog', 'Danh sách user story của toàn bộ sản phẩm'],
  ['Concept of Operations', 'Mô tả cách quản lý cho thuê máy hiện tại và hệ thống đề xuất'],
  ['Function List', 'Danh sách chức năng chi tiết của hệ thống'],
  ['Business Rule', 'Các quy tắc nghiệp vụ hệ thống phải tuân thủ'],
  ['Traceability Matrix', 'Truy vết từ yêu cầu sang thiết kế, test case và test report'],
  ['Architecture Driver', 'Yêu cầu chức năng, thuộc tính chất lượng và ràng buộc'],
  ['Architecture Design', 'Thiết kế kiến trúc hệ thống ở 3 góc nhìn'],
  ['Database Analysis and Design', 'Thiết kế cơ sở dữ liệu SQLite'],
  ['Test Plan', 'Chiến lược kiểm thử tổng thể'],
  ['Test Case / Test Execute', 'Kịch bản kiểm thử và kết quả thực thi từng chức năng'],
  ['Defect Report', 'Danh sách lỗi phát hiện trong quá trình kiểm thử'],
  ['Test Report', 'Báo cáo tổng hợp kết quả kiểm thử mỗi sprint'],
  ['User Acceptance', 'Biên bản khách hàng nghiệm thu từng chức năng'],
  ['Source Code', 'Mã nguồn hệ thống Thuê Máy Hub'],
];

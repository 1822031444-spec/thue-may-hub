# Thuê Máy Operations Hub

Hệ thống vận hành dịch vụ cho thuê PC và boxphone: website giới thiệu, cổng quản trị, cổng tự phục vụ cho khách hàng, yêu cầu thuê/gia hạn, hỗ trợ, ví khách, thanh toán, hoàn tiền, chi phí, dashboard và nhật ký thao tác.

Hệ thống chạy được theo hai cách, dùng chung một mã nguồn và một database:

- **Ứng dụng desktop Windows** — dành cho người quản lý. Mở từ shortcut, có sẵn server bên trong, không cần trình duyệt.
- **Bản web** — dành cho khách hàng truy cập cổng tự phục vụ, và cho việc phát triển.

## Cách 1: dùng ứng dụng desktop

Yêu cầu: Node.js 22 trở lên.

```powershell
npm install
npm run desktop:package
```

Mở thư mục `release` và chạy `ThueMayHub-Setup-0.1.0.exe` để cài, hoặc
`ThueMayHub-Portable-0.1.0.exe` để chạy trực tiếp không cần cài.

Chi tiết về đóng gói, vị trí dữ liệu, cách chuyển dữ liệu cũ sang app và cách xử
lý khi app không mở được nằm trong [Ứng dụng desktop cho Windows](UNG-DUNG-DESKTOP.md).

## Cách 2: chạy bản web

```powershell
npm install
npm run dev
```

- Website phát triển: `http://localhost:5173`
- API: `http://localhost:8787`
- Cổng khách hàng: `http://localhost:5173/portal/login`

Chạy bản production cục bộ:

```powershell
npm run build
npm start
```

Mở `http://localhost:8787`. Bản production cũng là PWA và có thể cài lên màn hình chính từ trình duyệt.

## Tài khoản lần đầu

Dù chạy theo cách nào, lần khởi động đầu tiên trên một database trống sẽ tạo sẵn:

- Email: `admin@thuemay.local`
- Mật khẩu tạm: `Admin@123`

Sau khi đăng nhập, mở **Cài đặt & nhật ký** và đổi mật khẩu ngay.

## Cấu hình

Sao chép `.env.example` thành `.env` và thay các giá trị trước khi triển khai server thật:

```env
PORT=8787
ADMIN_EMAIL=admin@tenmien.vn
ADMIN_INITIAL_PASSWORD=MatKhauKhoiTaoRatManh123
SESSION_DAYS=7
CUSTOMER_SESSION_DAYS=14
DATABASE_PATH=./data/thue-may.db
```

Biến môi trường chỉ dùng khi tạo tài khoản lần đầu. Nếu database đã tồn tại, hãy đổi mật khẩu trong màn hình cài đặt.

## Dữ liệu minh họa

Khi cần xem nhanh dashboard với dữ liệu mẫu:

```powershell
npm run seed:demo
```

Tài khoản khách minh họa: `demo@example.com` / `Demo@12345`.

Không chạy lệnh này trên database đang dùng để kinh doanh.

## Kiểm tra chất lượng

```powershell
npm run typecheck
npm run build
```

Kiểm thử nghiệp vụ tự động cần server đang chạy tại cổng 8787:

```powershell
npm run test:smoke     # luồng nghiệp vụ chính
npm run test:portal    # cổng khách hàng
npm run test:repair    # phiếu sửa và kho linh kiện
npm run test:lock      # khoá mạng khi hết hạn
npm run test:perm      # phân quyền nhân viên
npm run test:race      # đường tiền khi nhiều người bấm cùng lúc
npm run test:finance   # lọc theo kỳ và phân trang sổ tiền
npm run test:backup    # sao lưu database và phân quyền sao lưu
npm run test:paging    # phân trang các danh sách dài, số việc chờ không bị cắt cụt
npm run test:renew     # gia hạn đơn thuê và phép cộng ngày/tuần/tháng
npm run test:expiring  # danh sách sắp hết hạn và công nợ kèm theo
```

Riêng `npm run test:csv` (kiểm tra file CSV xuất ra) không cần server.

`test:lock` ghi đè cấu hình khoá mạng và chạy vài câu lệnh `echo` vô hại, nên
tuyệt đối không chạy trên database đang kinh doanh.

Smoke test tạo dữ liệu kiểm thử. Chỉ nên chạy trên database thử nghiệm, không chạy trên dữ liệu kinh doanh.

## Lưu trữ và sao lưu

Khi chạy bản web hoặc chạy từ mã nguồn, database nằm tại `data/thue-may.db`. Bản
desktop đã cài đặt dùng thư mục riêng của Windows — xem
[Ứng dụng desktop cho Windows](UNG-DUNG-DESKTOP.md#dữ-liệu-nằm-ở-đâu).
SQLite có thể tạo thêm file `-wal` và `-shm` khi ứng dụng chạy.

Để sao lưu thủ công an toàn ở giai đoạn MVP:

1. Dừng ứng dụng.
2. Sao chép toàn bộ thư mục `data` sang ổ đĩa hoặc kho lưu trữ khác.
3. Khởi động lại và kiểm tra đăng nhập.
4. Định kỳ thử phục hồi bản sao trên một thư mục riêng.

Không đồng bộ trực tiếp database đang mở bằng ứng dụng cloud drive thông thường. Khi đưa lên VPS, nên dùng backup tự động hằng ngày và giữ ít nhất 7–30 phiên bản.

## Tài liệu

- [Ứng dụng desktop cho Windows](UNG-DUNG-DESKTOP.md)
- [Kiến trúc và nguyên tắc sổ tiền](KIEN-TRUC-HE-THONG.md)
- [Hướng dẫn vận hành](HUONG-DAN-VAN-HANH.md)
- [Lộ trình phát triển](LO-TRINH-PHAT-TRIEN.md)

## Các cổng sử dụng

Trong app desktop, cửa sổ mở thẳng vào `/admin`; các địa chỉ còn lại dành cho bản web.

- `/`: website giới thiệu.
- `/portal/register`: khách tự tạo tài khoản.
- `/portal/login`: khách đăng nhập, xem máy, yêu cầu thuê, thanh toán ví, gia hạn và hỗ trợ.
- `/login`: nhân viên/chủ hệ thống đăng nhập.
- `/admin/service-desk`: duyệt yêu cầu thuê, gia hạn và trả lời ticket.

## Giới hạn hiện tại

- Việc cấp hoặc thu hồi quyền truy cập thiết bị vẫn thực hiện thủ công.
- Chưa tích hợp ngân hàng, VietQR động hoặc hóa đơn điện tử.
- Đăng ký khách chưa gửi email/OTP xác minh vì chưa kết nối nhà cung cấp email/SMS.
- Chưa thay thế phần mềm kế toán và hóa đơn theo quy định pháp luật.
- SQLite phù hợp thử nghiệm một server; khi cần nhiều server ứng dụng nên chuyển sang PostgreSQL.

# Ảnh xuất từ Figma

Thư mục này chứa ảnh các màn hình trong bản Figma, để sửa giao diện app cho giống
thiết kế. Figma chỉ là bản vẽ — không "nhập" thẳng vào code được. Code React đã có
sẵn và **đã nối backend rồi**: mỗi trang đã gọi đúng API (bảng dưới). Việc còn lại
là sửa phần giao diện của từng trang cho khớp bản vẽ, dữ liệu vẫn lấy từ database.

## Cách xuất từ Figma

1. Chọn một frame (một màn hình) → khung bên phải kéo xuống *Export* → bấm **+** →
   chọn **PNG**, cỡ **2x** → *Export*.
2. Lưu vào thư mục này, **đặt tên đúng cột "Tên file" bên dưới** để biết ảnh nào
   ứng với trang nào. Màn hình có nhiều trạng thái (hộp thoại mở, danh sách trống…)
   thì thêm hậu tố: `khach-hang--form-them.png`, `khach-hang--trong.png`.
3. Ghi màu và chữ vào `mau-va-chu.txt` trong thư mục này: mã màu (#hex) của màu
   chính, nền, chữ, viền, màu xanh/đỏ/vàng báo trạng thái; tên font, cỡ chữ tiêu đề
   và chữ thường; độ bo góc. Lấy ở khung bên phải khi chọn một phần tử (hoặc tab
   *Dev Mode* nếu tài khoản có). Chỉ riêng file này đã đổi được màu và chữ cho cả
   app, vì mọi màu đều dùng chung từ `src/styles/tokens.css`.

Không cần dùng plugin chuyển Figma sang code (Anima, Locofy…): code chúng sinh ra
không gọi API nào, còn trang hiện có đã gọi đủ.

## Màn hình ↔ code ↔ API

| Tên file | Màn hình | File code | API đã nối |
| --- | --- | --- | --- |
| `mau-va-chu.txt` | Màu, font, bo góc dùng chung | `src/styles/tokens.css` | — |
| `khung-quan-tri.png` | Thanh bên, thanh trên của trang quản trị | `src/components/AppLayout.tsx`, `AppChrome.tsx`, `src/styles/shell.css` | `/api/dashboard`, `/api/service-desk/overview` |
| `dang-nhap.png` | Đăng nhập quản trị | `src/pages/LoginPage.tsx` | `/api/auth/login` |
| `tong-quan.png` | Tổng quan | `src/pages/DashboardPage.tsx` | `/api/dashboard`, `/api/rentals/expiring` |
| `khach-hang.png` | Khách hàng | `src/pages/CustomersPage.tsx` | `/api/customers` |
| `thiet-bi.png` | Thiết bị | `src/pages/DevicesPage.tsx` | `/api/devices` |
| `don-thue.png` | Đơn thuê | `src/pages/RentalsPage.tsx` | `/api/rentals`, `/api/customers`, `/api/devices` |
| `sua-chua.png` | Sửa chữa & kho linh kiện | `src/pages/RepairsPage.tsx` | `/api/repairs`, `/api/parts` |
| `tai-chinh.png` | Tài chính | `src/pages/FinancePage.tsx` | `/api/finance/*`, `/api/dashboard` |
| `yeu-cau-ho-tro.png` | Yêu cầu & hỗ trợ | `src/pages/ServiceDeskPage.tsx` | `/api/service-desk/*` |
| `cai-dat.png` | Cài đặt | `src/pages/SettingsPage.tsx` và các `src/components/*Panel.tsx` | `/api/admins`, `/api/network-lock`, `/api/backups`, `/api/telegram` |
| `gioi-thieu.png` | Trang giới thiệu tiệm | `src/pages/LandingPage.tsx`, `src/styles/public.css` | — |
| `khach-dang-nhap.png` | Cổng khách: đăng nhập / đăng ký | `src/customer/CustomerAccessPage.tsx` | `/api/customer/auth/*` |
| `khach-khung.png` | Cổng khách: khung, menu, thông báo | `src/customer/CustomerLayout.tsx`, `src/styles/portal.css` | `/api/customer/notifications` |
| `khach-trang-chu.png` | Cổng khách: trang chủ | `src/customer/CustomerHomePage.tsx` | `/api/customer/rentals`, `/bookings`, `/tickets` |
| `khach-danh-muc.png` | Cổng khách: danh mục máy | `src/customer/CatalogPage.tsx` | `/api/customer/catalog`, `/api/customer/bookings` |
| `khach-yeu-cau.png` | Cổng khách: yêu cầu thuê | `src/customer/CustomerBookingsPage.tsx` | `/api/customer/bookings` |
| `khach-don-thue.png` | Cổng khách: đơn thuê, trả ví, gia hạn | `src/customer/CustomerRentalsPage.tsx` | `/api/customer/rentals`, `/api/customer/extensions` |
| `khach-ho-tro.png` | Cổng khách: hỗ trợ | `src/customer/CustomerSupportPage.tsx` | `/api/customer/tickets` |

Figma có màn hình nào không nằm trong bảng thì vẫn cứ xuất, đặt tên tự do — đó là
tính năng mới, cần làm thêm cả API.

## Thứ tự nên làm

1. `mau-va-chu.txt` → sửa `tokens.css`: đổi một chỗ, cả app đổi theo.
2. `khung-quan-tri.png` và `khach-khung.png`: khung dùng chung cho mọi trang.
3. Từng trang một, trang nào xong thì chạy app kiểm tra (`npm run dev`, mở
   http://localhost:5273) và chạy lại các bài test trong `scripts/`.

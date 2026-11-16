# Thuê Máy Hub — giao diện nối với backend nào

Giao diện này không còn dữ liệu giả. Mọi thao tác đi qua REST API của backend
Express ở thư mục gốc dự án (`server/`), dữ liệu lưu trong SQLite.

## Chạy

Từ **thư mục gốc dự án** (không phải thư mục này):

| Lệnh | Việc |
| --- | --- |
| `npm run hub` | Phát triển: API cổng 8789 + giao diện http://localhost:5274 |
| `npm run hub:start` | Chạy thật: build giao diện rồi một cổng http://localhost:8789 phục vụ tất cả |
| `npm run hub:reset` | Xoá và tạo lại dữ liệu mẫu (`data/hub-demo.db`) |

Khi chạy `vite dev`, `src/routes/api/$.ts` chuyển tiếp mọi yêu cầu `/api/*` sang
backend (biến `HUB_API`, mặc định `http://127.0.0.1:8789`). Bản build là SPA tĩnh,
Express phục vụ qua biến `STATIC_DIR`.

## Vai trò

- Admin = tài khoản `OWNER`, Staff = tài khoản `STAFF` trong bảng `admins`.
- Customer = `customer_accounts`, gắn 1–1 với hồ sơ `customers`.
- Quyền của Staff chặn tại API (`server/permissions.ts`), không chỉ ẩn menu: gọi
  `/api/admins`, `/api/customers/:id/deposit`, `/api/finance/*` sẽ nhận 403.

## API mỗi màn hình gọi

| Màn hình / thao tác | API |
| --- | --- |
| Đăng nhập chung (username, email hoặc SĐT) | `POST /api/hub/login` |
| Kiểm tra phiên khi mở trang | `GET /api/hub/me` |
| Đăng ký khách | `POST /api/hub/register` |
| Hoàn thiện hồ sơ khách | `PATCH /api/hub/profile` |
| Đăng xuất | `POST /api/hub/logout` |
| Máy (xem / thêm) | `GET`, `POST /api/devices` |
| Khách hàng (xem / thêm) | `GET`, `POST /api/customers` |
| Đơn thuê (xem / tạo) | `GET`, `POST /api/rentals` |
| Yêu cầu thuê chờ duyệt | `GET /api/service-desk/overview` |
| Duyệt / từ chối yêu cầu | `POST /api/service-desk/bookings/:id/approve` · `/reject` |
| Giao máy / nhận lại máy / huỷ | `PATCH /api/rentals/:id/status` |
| Thanh toán (xem / thu tiền) | `GET /api/hub/payments`, `POST /api/rentals/:id/payment` |
| Sửa chữa (xem / tạo / đóng phiếu) | `GET`, `POST /api/repairs`, `PATCH /api/repairs/:id/status` |
| Ví khách, nạp ví (Admin) | `GET /api/customers`, `POST /api/customers/:id/deposit` |
| Linh kiện (Admin) | `GET /api/parts` |
| Nhân viên (Admin) | `GET /api/admins` |
| Sửa máy, đổi trạng thái, xoá (chỉ gửi trường cần đổi) | `PATCH`, `DELETE /api/devices/:id` |
| Sửa / khoá khách (chỉ gửi trường cần đổi) | `PATCH /api/customers/:id` |
| Chi tiết khách: lịch sử ví | `GET /api/hub/wallet?customerId=` |
| Gia hạn tại quầy, hoàn tiền (Admin) | `POST /api/rentals/:id/renew`, `POST /api/rentals/:id/refund` |
| Duyệt / từ chối gia hạn khách xin | `POST /api/service-desk/extensions/:id/approve` · `/reject` |
| Hỗ trợ khách: hội thoại, trả lời, trạng thái | `GET`, `POST /api/service-desk/tickets/:id/messages`, `PATCH …/status` |
| Lắp linh kiện, không sửa được | `POST /api/repairs/:id/parts`, `PATCH /api/repairs/:id/status` |
| Linh kiện: thêm, nhập kho, lịch sử (Admin) | `POST /api/parts`, `POST`, `GET /api/parts/:id/movements` |
| Nhân viên: thêm (có username), vai trò, khoá, đặt lại mật khẩu (Admin) | `POST /api/admins`, `PATCH /api/admins/:id`, `POST /api/admins/:id/password` |
| Đổi mật khẩu của tôi | `POST /api/auth/change-password` · khách: `POST /api/customer/auth/change-password` |
| Cài đặt: cửa hàng | `GET`, `PUT /api/hub/shop` |
| Cài đặt: khoá mạng, sao lưu, Telegram, nhật ký | `/api/network-lock`, `/api/backups`, `/api/telegram`, `GET /api/audit-logs` |
| Cổng khách: máy trống, đơn, yêu cầu | `GET /api/customer/catalog`, `/rentals`, `/bookings`, `/extensions` |
| Cổng khách: gửi yêu cầu thuê, huỷ yêu cầu | `POST /api/customer/bookings`, `PATCH /api/customer/bookings/:id/cancel` |
| Cổng khách: trả bằng ví, xin gia hạn | `POST /api/customer/rentals/:id/pay-with-wallet`, `/extensions` |
| Cổng khách: ví, hỗ trợ, thông báo | `GET /api/hub/wallet`, `/api/customer/tickets`, `/api/customer/notifications` |

## Quy tắc server tự giữ

- Tạo đơn: máy phải `AVAILABLE`, khách không bị chặn; tạo xong máy chuyển `RENTED`.
- Thu tiền không vượt số còn nợ; trả bằng ví thì ví phải đủ, không bao giờ âm.
- Khách gửi yêu cầu thì chưa giữ máy; chỉ khi quản trị duyệt mới tạo đơn và giữ máy.
- Mọi biến động tiền ghi thành bút toán không sửa không xoá; số dư ví, số đã thu
  đều tính lại từ sổ.

Mã nguồn chính phía giao diện: `src/lib/tmh-store.ts`.

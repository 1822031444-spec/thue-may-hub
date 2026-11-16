# 💻 Thuê Máy Hub — Nền Tảng Quản Lý & Thuê Máy Tính, Boxphone

> Hệ thống quản lý cho thuê máy tính (PC Gaming, Đồ hoạ, Văn phòng) và dàn Boxphone tích hợp đa vai trò: **Quản trị viên (Admin)**, **Nhân viên (Staff)** và **Khách hàng (Customer)**.

---

## 📌 1. Danh sách tài khoản trải nghiệm (Demo có sẵn)

Hệ thống đã chuẩn bị sẵn tài khoản mẫu để bạn có thể đăng nhập và trải nghiệm ngay:

| Vai trò | Tên đăng nhập (Username) | Mật khẩu | Phạm vi quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `demo123` | Toàn quyền: Vận hành, Báo cáo doanh thu, Ví khách, Nhân viên, Cài đặt |
| **Nhân viên (Staff)** | `phat` hoặc `thanh` hoặc `vinh` hoặc `anh` | `demo123` | Vận hành: Máy, Khách hàng, Đơn thuê, Thu tiền, Sửa chữa, Hỗ trợ khách |
| **Khách hàng (Customer)** | Đăng ký tài khoản mới hoặc SĐT: `0902345678` | `demo123` | Cổng khách: Máy trống, Đơn của tôi, Ví tiền, Hỗ trợ, Hồ sơ |

---

## 🚀 2. Hướng dẫn cài đặt và khởi chạy

Giao diện này chạy cùng backend Express + SQLite ở **thư mục gốc dự án**
(`server/`). Mọi lệnh dưới đây chạy ở thư mục gốc, không phải trong `ThueMayHub-FE/`.

### Yêu cầu môi trường:
* **Node.js** 22 trở lên (backend dùng `node:sqlite` có sẵn trong Node 22)
* **npm**

### Các bước khởi chạy:

1. **Cài thư viện** (lần đầu):
   ```bash
   npm install
   ```
   Thư viện của giao diện được `npm run hub` tự cài nếu chưa có.

2. **Chạy chế độ phát triển:**
   ```bash
   npm run hub
   ```
   Mở **[http://localhost:5274/](http://localhost:5274/)**. Backend chạy ở cổng 8789;
   sửa code bên nào thì bên đó tự tải lại.

3. **Chạy như sản phẩm thật** (một cổng phục vụ cả giao diện lẫn API):
   ```bash
   npm run hub:start
   ```
   Mở **[http://localhost:8789/](http://localhost:8789/)**.

4. **Kiểm tra kiểu TypeScript của giao diện:**
   ```bash
   npm --prefix ThueMayHub-FE run typecheck
   ```

---
## 📖 3. Hướng dẫn sử dụng các tính năng chính

### A. Dành cho Khách hàng (Customer Portal)
1. **Đăng ký tài khoản:** 
   * Tại màn hình đăng nhập, bấm tab **Đăng ký**.
   * Nhập số điện thoại, email và mật khẩu (tối thiểu 6 ký tự).
2. **Hoàn thiện hồ sơ bắt buộc (Profile Gate):**
   * Hệ thống yêu cầu cung cấp Họ tên, Số điện thoại và CCCD trước khi được cấp quyền thuê máy nhằm đảm bảo an toàn thiết bị.
3. **Xem máy và gửi yêu cầu thuê:**
   * Tab **Máy trống**: Xem danh sách máy tính/Boxphone đang sẵn sàng (`AVAILABLE`), giá theo giờ và giá theo tháng.
   * Bấm **Gửi yêu cầu thuê** ➔ Chọn số ngày thuê ➔ Gửi yêu cầu.
   * Yêu cầu ở trạng thái *Chờ xác nhận* cho đến khi cửa hàng duyệt và chốt giá; máy chỉ được giữ cho bạn sau khi duyệt.
4. **Đơn của tôi:** xem yêu cầu và đơn thuê; **Huỷ yêu cầu** chưa duyệt, **Trả bằng ví** phần còn nợ,
   **Xin gia hạn** (cửa hàng báo phí rồi duyệt).
5. **Ví tiền:** số dư và lịch sử nạp, trả đơn, hoàn tiền về ví. Nạp tiền tại quầy.
6. **Hỗ trợ:** thông tin liên hệ cửa hàng, gửi yêu cầu hỗ trợ (có thể gắn đơn thuê), nhắn qua lại với cửa hàng.
7. **Hồ sơ:** sửa họ tên, SĐT, email, địa chỉ, CCCD; đổi mật khẩu.
8. **Chuông thông báo:** yêu cầu được duyệt / từ chối, cửa hàng trả lời, đơn sắp hết hạn.

---

### B. Dành cho Nhân viên vận hành (Staff)
1. **Dashboard:** máy trống, đơn đang thuê, việc cần xử lý (bấm là tới trang xử lý), đơn sắp hết hạn
   hoặc quá hạn kèm nút **Gia hạn** / **Thu tiền**. Nhân viên không thấy số tiền doanh thu (BR.14).
2. **Máy:** lọc theo trạng thái; **+ Thêm máy**, **Sửa**, chuyển **Bảo trì** / **Sẵn sàng**, **Báo hỏng**
   (tạo phiếu sửa ngay cho máy đó). Mỗi máy hiện doanh thu và tiền sửa đã tốn.
3. **Khách hàng:** lọc đang thuê / còn nợ / đã khoá; **+ Thêm**, **Sửa** (cả địa chỉ, CCCD), **Khoá** /
   **Mở khoá**, **Chi tiết** (đơn thuê và lịch sử ví của khách).
4. **Đơn thuê:** lọc theo trạng thái; **+ Tạo đơn thuê** (giao ngay hoặc giữ chỗ); yêu cầu từ cổng khách:
   **Duyệt** / **Từ chối**; đơn: **Giao máy**, **Thu tiền**, **Gia hạn** (theo ngày / tuần / tháng, thu
   ngay hoặc ghi nợ), **Nhận lại máy**, **Huỷ**. Khu **Yêu cầu gia hạn chờ duyệt** ở đầu trang.
5. **Thanh toán:** lịch sử thu và hoàn tiền, thực thu ròng; **+ Thu tiền**.
6. **Sửa chữa:** lọc phiếu đang mở / đã đóng; **+ Tạo phiếu sửa**, **Lắp linh kiện** từ kho,
   **Đóng phiếu** (ghi tiền công), **Không sửa được** (máy chuyển Ngừng dùng).
7. **Hỗ trợ khách:** yêu cầu hỗ trợ khách gửi; mở hội thoại để trả lời, **Đánh dấu đã xử lý**, **Đóng**.
8. **Chuông thông báo** và **menu tài khoản** (đổi mật khẩu, đăng xuất) trên thanh trên.

---

### C. Dành riêng cho Quản trị viên (Admin)
Ngoài các chức năng vận hành của nhân viên, Admin có thêm:
1. **Hoàn tiền** trên đơn đã thu tiền (về ví, tiền mặt hoặc chuyển khoản), **Ngừng dùng** / **Xoá** máy.
2. **Ví khách:** số dư ví, **Nạp ví**, **Lịch sử** ví từng khách.
3. **Linh kiện:** **+ Thêm linh kiện**, **Nhập kho** (ghi khoản chi), **Lịch sử** nhập xuất; cảnh báo dưới mức tối thiểu.
4. **Nhân viên:** **+ Thêm nhân viên** (có username đăng nhập), **Đặt lại mật khẩu**, đổi vai trò, **Khoá** / **Mở khoá**.
5. **Báo cáo:** doanh thu hợp đồng, thực thu, công nợ, chi phí sửa chữa, tỷ lệ theo hình thức thanh toán.
6. **Cài đặt:** thông tin cửa hàng (hiện ở trang Hỗ trợ của khách), đổi mật khẩu, khoá mạng khi hết hạn
   (lệnh khoá/mở, thời gian ân hạn, quét ngay, nhật ký lệnh), sao lưu (sao lưu ngay, lịch tự động),
   nhắc hạn qua Telegram (gửi thử), nhật ký thao tác.

---

## 🗂️ 4. Cấu trúc thư mục mã nguồn (Codebase)

Dự án được cấu trúc dạng mô-đun hoá giúp bạn dễ dàng mở rộng thêm giao diện:

```
src/
├── components/
│   ├── ui/                           # Các component UI cơ bản dùng chung
│   │   ├── badge.tsx                 # Huy hiệu màu thể hiện trạng thái
│   │   ├── buttons.ts                # Kiểu nút thao tác dùng chung
│   │   ├── dialog.tsx                # Hộp thoại xem chi tiết
│   │   ├── filter-tabs.tsx           # Nút lọc nhanh kèm số lượng
│   │   ├── form-field.tsx            # Ô nhập, ô chọn, ô nhiều dòng
│   │   ├── list-card.tsx             # Khung danh sách tích hợp tìm kiếm
│   │   ├── table.tsx                 # Bảng hiển thị dữ liệu responsive
│   │   └── toast.tsx                 # Popup thông báo góc màn hình
│   ├── auth/                         # Giao diện xác thực
│   │   ├── auth-screen.tsx           # Màn hình Đăng nhập / Đăng ký
│   │   └── profile-gate.tsx          # Cửa kiểm tra hoàn thiện CCCD/SĐT
│   ├── customer/                     # Cổng dịch vụ khách hàng
│   │   ├── customer-portal.tsx       # Khung cổng khách, các tab
│   │   ├── home-tab.tsx              # Máy trống, gửi yêu cầu thuê
│   │   ├── orders-tab.tsx            # Đơn của tôi: trả ví, gia hạn, huỷ yêu cầu
│   │   ├── wallet-tab.tsx            # Ví tiền và lịch sử ví
│   │   ├── support-tab.tsx           # Liên hệ, gửi và theo dõi yêu cầu hỗ trợ
│   │   ├── profile-tab.tsx           # Sửa hồ sơ, đổi mật khẩu
│   │   └── notice-bell.tsx           # Thông báo của khách
│   ├── support/
│   │   └── ticket-thread.tsx         # Hội thoại hỗ trợ, dùng chung cho quầy và khách
│   ├── admin/                        # Bảng điều khiển quản trị & nhân viên
│   │   ├── admin-layout.tsx          # Thanh Sidebar, Menu di động, Topbar
│   │   ├── notice-menu.tsx           # Chuông việc cần làm
│   │   ├── modals/
│   │   │   └── action-modal.tsx      # Mọi form thao tác: tạo/sửa, gia hạn, hoàn tiền, duyệt…
│   │   ├── settings/
│   │   │   └── panels.tsx            # Các khối Cài đặt: cửa hàng, khoá mạng, sao lưu, Telegram, nhật ký
│   │   └── views/                    # Các trang nghiệp vụ riêng biệt
│   │       ├── overview-view.tsx     # Dashboard tổng quan
│   │       ├── devices-view.tsx      # Quản lý thiết bị
│   │       ├── customers-view.tsx    # Quản lý khách hàng
│   │       ├── customer-detail.tsx   # Chi tiết khách: đơn và lịch sử ví
│   │       ├── orders-view.tsx       # Quản lý đơn thuê, duyệt gia hạn
│   │       ├── payments-view.tsx     # Thu và hoàn tiền
│   │       ├── repairs-view.tsx      # Quản lý sửa chữa
│   │       ├── support-view.tsx      # Hỗ trợ khách
│   │       ├── wallets-view.tsx      # Quản lý ví khách (Admin)
│   │       ├── staff-view.tsx        # Quản lý nhân viên (Admin)
│   │       ├── reports-view.tsx      # Báo cáo doanh thu (Admin)
│   │       ├── parts-view.tsx        # Quản lý linh kiện (Admin)
│   │       └── settings-view.tsx     # Cài đặt (Admin)
│   └── hub-app.tsx                   # Điều phối chính giữa Auth, Customer và Admin
├── lib/
│   └── tmh-store.ts                  # Kho dữ liệu Zustand, mọi lời gọi API
├── routes/
│   ├── __root.tsx                    # Layout gốc của TanStack Router
│   └── index.tsx                     # Route trang chủ ("/")
├── router.tsx                        # Cấu hình TanStack Router
└── styles.css                        # Hệ màu & Font chữ Tailwind CSS v4
```

---

## 💾 5. Cơ chế lưu trữ dữ liệu

* Dữ liệu lưu trên máy chủ, trong cơ sở dữ liệu SQLite `data/hub-demo.db` ở thư mục
  gốc dự án — riêng biệt với database của bản thử và bản đang kinh doanh.
* Lần chạy đầu tự tạo dữ liệu mẫu (tài khoản ở mục 1, 7 máy, 5 khách, 6 đơn, 1 yêu cầu thuê,
  1 yêu cầu gia hạn, 1 yêu cầu hỗ trợ đang chờ, thông tin cửa hàng).
* **Đặt lại dữ liệu gốc:** tắt app rồi chạy `npm run hub:reset` ở thư mục gốc.
* Mật khẩu băm bằng scrypt; phiên đăng nhập giữ bằng cookie HttpOnly do máy chủ cấp.
  API mỗi màn hình gọi: xem [BACKEND.md](BACKEND.md).
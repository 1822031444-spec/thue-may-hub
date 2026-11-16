# Bảng phân công — Nhóm 11 - CTIN

**Dự án:** Hệ thống Quản lý Cho thuê Máy tính & Boxphone – Thuê Máy Hub

Phú và Thành làm **Backend** (Phú kiêm **UX/UI**), Việt Anh làm **Frontend**, Phát làm
**Database** và một phần Frontend, Vinh làm **Tester**. Mỗi người nắm trọn một khu vực
chức năng; việc quản lý dự án (Retrospective, Backlog, nghiệm thu) rải cho người đang
ít điểm hơn để tổng điểm mỗi người gần bằng nhau.

Sinh từ `scripts/sep/tasks.mjs` — muốn đổi người, đổi trạng thái thì sửa ở đó
rồi chạy lại `npm run sep:phancong` và `npm run sep:jira`, đừng sửa tay file này.

## Ai làm gì

| Thành viên | MSSV | Mảng | Vai trò Scrum | Số việc | Điểm | Đã xong | File Jira |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Phạm Văn Đức Phú | 1822031444 | **Backend, UX/UI** | Scrum Master | 20 | 128 | 100% | `jira/2-Phu.csv` |
| Đỗ Tuấn Thành | 1822031313 | **Backend** | Product Owner | 15 | 122 | 92% | `jira/1-Thanh.csv` |
| Đào Việt Anh | 1822031301 | **Frontend** | Developer Team | 18 | 129 | 100% | `jira/3-VietAnh.csv` |
| Hồ Sỹ Vinh | 1822041511 | **Tester** | Tester | 23 | 121 | 100% | `jira/4-Vinh.csv` |
| Nguyễn Minh Phát | 1822041808 | **Database, Frontend** | Developer Team | 22 | 133 | 100% | `jira/5-Phat.csv` |

| Mảng | Nội dung |
| --- | --- |
| **Backend** | Endpoint Express, quy tắc nghiệp vụ, luồng tiền, phân quyền, API cổng khách, khoá mạng, Telegram |
| **Database** | Thiết kế bảng SQLite, khoá ngoại, chỉ mục, truy vấn báo cáo và tồn kho, sao lưu và phục hồi |
| **UX/UI** | Prototype, màu/chữ/CSS, khung trang dùng chung, khung cổng khách hàng và trang giới thiệu |
| **Frontend** | Các trang React của quản trị và cổng khách hàng, trạng thái tải/lỗi/rỗng, bản desktop Electron |
| **Tester** | Test case, test tự động trong scripts/, dữ liệu test, defect, test report từng sprint |
| **Quản lý dự án** | Retrospective, cập nhật Product Backlog và Traceability Matrix, nghiệm thu |

## Tiến độ theo sprint

| Sprint | Thời gian | Story | Việc | Xong | Đang làm | Chưa làm | Điểm xong / tổng |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sprint 1 | 24/08/2026 – 13/09/2026 | 7 | 25 | 25 | 0 | 0 | 211 / 211 |
| Sprint 2 | 14/09/2026 – 04/10/2026 | 10 | 34 | 34 | 0 | 0 | 221 / 221 |
| Sprint 3 | 05/10/2026 – 25/10/2026 | 10 | 39 | 37 | 2 | 0 | 191 / 201 |

Việc chưa xong ở Sprint 1 đã chuyển sang Sprint 2 nên được tính ở Sprint 2.

## Việc của từng người

### 1. Phạm Văn Đức Phú — Backend, UX/UI

20 việc · 128 điểm · nhập file `jira/2-Phu.csv`

**File mã nguồn (34):** `ThueMayHub-FE/public/`, `ThueMayHub-FE/src/styles.css`, `design/figma/README.md`, `public/fonts/`, `public/icon-256.png`, `public/icon.svg`, `public/manifest.webmanifest`, `public/sw.js`, `scripts/make-icon.mjs`, `server/customer.ts`, `server/index.ts`, `server/network-lock.ts`, `server/telegram.ts`, `src/components/AppChrome.tsx`, `src/components/AppLayout.tsx`, `src/components/UI.tsx`, `src/customer/CustomerAccessPage.tsx`, `src/customer/CustomerHomePage.tsx`, `src/customer/CustomerLayout.tsx`, `src/customer/CustomerRentalsPage.tsx`, `src/lib/commandBus.ts`, `src/lib/desktop.ts`, `src/lib/pendingAction.ts`, `src/lib/theme.tsx`, `src/lib/toast.tsx`, `src/pages/LandingPage.tsx`, `src/styles/admin.css`, `src/styles/base.css`, `src/styles/components.css`, `src/styles/index.css`, `src/styles/portal.css`, `src/styles/public.css`, `src/styles/shell.css`, `src/styles/tokens.css`

| Mã | Sprint | Story | Việc | Điểm | Trạng thái |
| --- | :---: | --- | --- | ---: | --- |
| T.01 | 1 | US.01 | [UI] Thiết kế prototype màn hình đăng nhập & khung giao diện quản trị | 5 | Xong |
| T.04 | 1 | US.02 | [UI] Thiết kế giao diện danh sách & form hồ sơ khách hàng | 8 | Xong |
| T.06 | 1 | US.03 | [BE] Hiện thực khoá khách hàng và cắt phiên đăng nhập của khách bị khoá | 5 | Xong |
| T.16 | 1 | - | [PM] Viết Retrospective Sprint 1 | 5 | Xong |
| T.25 | 1 | US.04 | [UI] Thiết kế giao diện kho thiết bị (thẻ/bảng) và form tạo đơn thuê | 8 | Xong |
| T.33 | 2 | US.11 | [UI] Thiết kế form chi phí và thẻ số liệu trang Tài chính | 3 | Xong |
| T.35 | 2 | US.12 | [BE] API phiếu sửa: tạo, cập nhật, đổi trạng thái, ghi tiền công khi đóng phiếu | 8 | Xong |
| T.39 | 2 | US.13 | [BE] Nhập kho, lắp linh kiện vào phiếu sửa, trả linh kiện về kho bằng bút toán RETURN | 8 | Xong |
| T.42 | 2 | US.14 | [BE] API cổng khách: đăng ký/đăng nhập, danh mục máy, gửi và huỷ yêu cầu thuê | 8 | Xong |
| T.43 | 2 | US.14 | [UI] Dựng khung cổng khách hàng, trang giới thiệu tiệm, cài như ứng dụng trên điện thoại (PWA) | 13 | Xong |
| T.45 | 2 | US.15 | [BE] API khách trả đơn bằng ví và gửi yêu cầu gia hạn | 5 | Xong |
| T.47 | 2 | US.15 | [FE] Dựng trang Đơn thuê của khách: trả bằng ví, xin gia hạn | 5 | Xong |
| T.50 | 2 | US.16 | [BE] API ticket hỗ trợ và thông báo cho khách | 5 | Xong |
| T.54 | 2 | US.17 | [UI] Bảng lệnh nhanh (Ctrl+K) và huy hiệu số việc chờ trên menu | 5 | Xong |
| T.59 | 3 | US.18 | [BE] Dựng lệnh khoá/mở an toàn (chỉ thay IP và mã máy, sai khuôn thì từ chối) và bộ quét mỗi phút | 13 | Xong |
| T.69 | 3 | US.22 | [BE] API trang Tổng quan, bỏ các trường tiền khi là tài khoản nhân viên | 5 | Xong |
| T.71 | 3 | US.22 | [UI] Chế độ sáng/tối và thông báo nổi (toast) | 3 | Xong |
| T.73 | 3 | US.23 | [BE] Gửi bản tóm tắt đơn sắp hết hạn cho chủ tiệm qua Telegram | 5 | Xong |
| T.85 | 3 | US.26 | [UI] Thanh tiêu đề riêng cho bản desktop và icon ứng dụng | 3 | Xong |
| T.98 | 3 | US.27 | [UI] Thiết kế giao diện mới trên Figma, chuyển màu và chữ sang Tailwind | 8 | Xong |

### 2. Đỗ Tuấn Thành — Backend

15 việc · 122 điểm · nhập file `jira/1-Thanh.csv` (nhập **đầu tiên**)

**File mã nguồn (5):** `server/customer.ts`, `server/hub.ts`, `server/index.ts`, `server/permissions.ts`, `server/rental-period.ts`

| Mã | Sprint | Story | Việc | Điểm | Trạng thái |
| --- | :---: | --- | --- | ---: | --- |
| T.02 | 1 | US.01 | [BE] Hiện thực API đăng nhập/đăng xuất, băm mật khẩu bằng scrypt | 8 | Xong |
| T.05 | 1 | US.02 | [BE] Hiện thực API xem/tìm/thêm/sửa khách hàng | 13 | Xong |
| T.09 | 1 | US.06 | [BE] Hiện thực API tạo đơn thuê, tự tính thành tiền theo giờ/tháng | 21 | Xong |
| T.11 | 1 | US.07 | [BE] Hiện thực API thu tiền đơn, chặn thu vượt số còn nợ | 13 | Xong |
| T.17 | 1 | - | [PM] Cập nhật Traceability Matrix Sprint 1 | 5 | Xong |
| T.22 | 1 | US.08 | [BE] API đổi trạng thái đơn theo vòng đời, trả máy về Sẵn sàng khi hoàn tất/huỷ | 5 | Xong |
| T.26 | 2 | US.09 | [BE] API nạp tiền vào ví và hoàn tiền đơn (bút toán đối ứng, không hoàn quá số đã thu) | 8 | Xong |
| T.32 | 2 | US.11 | [BE] API ghi nhận chi phí vận hành | 5 | Xong |
| T.52 | 2 | US.17 | [BE] API duyệt/từ chối yêu cầu thuê (sinh đơn giữ chỗ) và duyệt gia hạn kèm phí | 8 | Xong |
| T.56 | 2 | - | [PM] Viết Retrospective Sprint 2 | 5 | Xong |
| T.62 | 3 | US.19 | [BE] Bảng quyền OWNER/STAFF, middleware requirePermission, quản lý tài khoản nhân viên | 8 | Xong |
| T.77 | 3 | US.24 | [BE] API gia hạn đơn tại quầy, cộng tháng không tràn ngày | 5 | Xong |
| T.88 | 3 | - | [PM] Viết Retrospective Sprint 3 | 5 | Đang làm |
| T.89 | 3 | - | [PM] Demo nghiệm thu với khách hàng (UAT) và chốt Traceability Matrix | 5 | Đang làm |
| T.96 | 3 | US.27 | [BE] API cho giao diện mới: đăng nhập chung ba vai trò, đăng ký, hồ sơ khách, danh sách phiếu thu | 8 | Xong |

### 3. Đào Việt Anh — Frontend

18 việc · 129 điểm · nhập file `jira/3-VietAnh.csv`

**File mã nguồn (40):** `ThueMayHub-FE/package.json`, `ThueMayHub-FE/src/components/admin/admin-layout.tsx`, `ThueMayHub-FE/src/components/admin/modals/action-modal.tsx`, `ThueMayHub-FE/src/components/admin/views/customers-view.tsx`, `ThueMayHub-FE/src/components/admin/views/devices-view.tsx`, `ThueMayHub-FE/src/components/admin/views/orders-view.tsx`, `ThueMayHub-FE/src/components/admin/views/overview-view.tsx`, `ThueMayHub-FE/src/components/admin/views/payments-view.tsx`, `ThueMayHub-FE/src/components/admin/views/repairs-view.tsx`, `ThueMayHub-FE/src/components/ui/`, `ThueMayHub-FE/src/lib/tmh-store.ts`, `ThueMayHub-FE/src/routes/api/$.ts`, `ThueMayHub-FE/tsconfig.json`, `ThueMayHub-FE/vite.config.ts`, `index.html`, `package.json`, `scripts/hub.mjs`, `src/App.tsx`, `src/api.ts`, `src/components/BackupPanel.tsx`, `src/components/NetworkLockPanel.tsx`, `src/customer/CatalogPage.tsx`, `src/customer/CustomerAuth.tsx`, `src/customer/CustomerBookingsPage.tsx`, `src/lib/rental-period.ts`, `src/main.tsx`, `src/pages/CustomersPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/DevicesPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RentalsPage.tsx`, `src/pages/RepairsPage.tsx`, `src/pages/ServiceDeskPage.tsx`, `src/pages/SettingsPage.tsx`, `src/types.ts`, `src/vite-env.d.ts`, `tsconfig.app.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`

| Mã | Sprint | Story | Việc | Điểm | Trạng thái |
| --- | :---: | --- | --- | ---: | --- |
| T.18 | 1 | US.01 | [FE] Khởi tạo khung React + Vite + TypeScript, định tuyến và trang Đăng nhập | 8 | Xong |
| T.19 | 1 | US.02 | [FE] Dựng trang Khách hàng: danh sách, tìm kiếm, form thêm/sửa | 8 | Xong |
| T.20 | 1 | US.04 | [FE] Dựng trang Thiết bị: dạng thẻ/dạng bảng, lọc theo loại | 8 | Xong |
| T.21 | 1 | US.06 | [FE] Dựng form Tạo đơn thuê và hộp thoại Thu tiền | 13 | Xong |
| T.13 | 1 → 2 | US.08 | [FE] Dựng thao tác Kích hoạt / Hoàn tất / Huỷ đơn trên trang Đơn thuê | 8 | Xong |
| T.27 | 2 | US.09 | [FE] Hộp thoại Nạp ví (trang Khách hàng) và Hoàn tiền (trang Đơn thuê) | 5 | Xong |
| T.36 | 2 | US.12 | [FE] Dựng trang Sửa chữa: danh sách phiếu, chi tiết phiếu, đổi trạng thái | 13 | Xong |
| T.40 | 2 | US.13 | [FE] Dựng tab Kho linh kiện và cảnh báo tồn kho tối thiểu | 8 | Xong |
| T.44 | 2 | US.14 | [FE] Dựng trang Danh mục máy và Yêu cầu thuê của khách | 8 | Xong |
| T.53 | 2 | US.17 | [FE] Dựng trang Yêu cầu & hỗ trợ cho quản trị | 8 | Xong |
| T.57 | 2 | - | [PM] Cập nhật Product Backlog (thêm US.22–US.26) và Traceability Matrix | 5 | Xong |
| T.60 | 3 | US.18 | [FE] Panel cấu hình khoá mạng, xem trước lệnh và nhật ký chạy lệnh | 8 | Xong |
| T.66 | 3 | US.20 | [FE] Màn hình nhật ký thao tác trong Cài đặt | 3 | Xong |
| T.70 | 3 | US.22 | [FE] Dựng trang Tổng quan | 5 | Xong |
| T.78 | 3 | US.24 | [FE] Hộp thoại gia hạn và lịch sử kỳ thuê trên trang Đơn thuê | 3 | Xong |
| T.82 | 3 | US.25 | [FE] Panel sao lưu trong Cài đặt | 5 | Xong |
| T.93 | 3 | US.27 | [FE] Giao diện mới theo Figma: khung quản trị, Dashboard, Máy, Khách hàng, Đơn thuê, Thanh toán, Sửa chữa | 8 | Xong |
| T.95 | 3 | US.27 | [FE] Nối giao diện mới với API thật: kho dữ liệu, chuyển tiếp /api, lệnh chạy chung một cổng | 5 | Xong |

### 4. Hồ Sỹ Vinh — Tester

23 việc · 121 điểm · nhập file `jira/4-Vinh.csv`

**File mã nguồn (21):** `scripts/backup-test.mjs`, `scripts/csv-test.mjs`, `scripts/device-test.mjs`, `scripts/expiring-test.mjs`, `scripts/finance-period-test.mjs`, `scripts/hub-flow-test.mjs`, `scripts/hub-ui-test.mjs`, `scripts/network-lock-smoke-test.ps1`, `scripts/nhap-khach-ban-dau.mjs`, `scripts/notify-test.mjs`, `scripts/paging-test.mjs`, `scripts/permission-smoke-test.ps1`, `scripts/portal-smoke-test.ps1`, `scripts/race-test.mjs`, `scripts/renew-test.mjs`, `scripts/repair-smoke-test.ps1`, `scripts/smoke-test.ps1`, `scripts/sort-test.mjs`, `scripts/them-may-hang-loat.mjs`, `server/seed-demo.ts`, `server/seed-hub.ts`

| Mã | Sprint | Story | Việc | Điểm | Trạng thái |
| --- | :---: | --- | --- | ---: | --- |
| T.03 | 1 | US.01 | [QA] Viết & thực thi test case đăng nhập | 5 | Xong |
| T.10 | 1 | US.06 | [QA] Viết & thực thi test case Tạo đơn thuê | 13 | Xong |
| T.12 | 1 | US.07 | [QA] Viết & thực thi test case Thu tiền đơn, bắn 8 yêu cầu song song | 8 | Xong |
| T.14 | 1 | US.04 | [QA] Viết & thực thi test case Quản lý thiết bị | 8 | Xong |
| T.15 | 1 | - | [QA] Viết Test Report Sprint 1 | 5 | Xong |
| T.90 | 1 | - | [QA] Cập nhật Defect Report Sprint 1 (DF.01–DF.03) | 5 | Xong |
| T.28 | 2 | US.09 | [QA] Test luồng ví: nạp, trừ ví, hoàn tiền, ví không bao giờ âm | 5 | Xong |
| T.31 | 2 | US.10 | [QA] Test lọc sổ tiền theo kỳ (tháng này, tháng trước, khoảng ngày) | 5 | Xong |
| T.37 | 2 | US.12 | [QA] Test phiếu sửa: vòng đời phiếu và trạng thái máy | 5 | Xong |
| T.48 | 2 | US.15 | [QA] Test cổng khách: khách chỉ xem và trả được đơn của chính mình | 5 | Xong |
| T.55 | 2 | - | [QA] Viết Test Report Sprint 2 | 5 | Xong |
| T.91 | 2 | - | [QA] Cập nhật Defect Report Sprint 2 | 5 | Xong |
| T.61 | 3 | US.18 | [QA] Test khoá mạng: giá trị sai khuôn bị từ chối, đơn quá hạn thì khoá | 5 | Xong |
| T.64 | 3 | US.19 | [QA] Test phân quyền: nhân viên gọi API tiền bị chặn, luôn còn ít nhất một Chủ | 5 | Xong |
| T.68 | 3 | US.21 | [QA] Test xuất CSV: dấu phẩy, ngoặc kép, tiếng Việt | 2 | Xong |
| T.75 | 3 | US.23 | [QA] Test nhắc hạn và gửi Telegram | 3 | Xong |
| T.79 | 3 | US.24 | [QA] Test gia hạn: 31/01 cộng 1 tháng phải ra 28/02 | 3 | Xong |
| T.81 | 3 | US.25 | [QA] Script nạp dữ liệu test: dữ liệu mẫu, khách đang thuê, thêm máy hàng loạt | 3 | Xong |
| T.83 | 3 | US.25 | [QA] Test sao lưu và phân trang danh sách dài | 3 | Xong |
| T.86 | 3 | US.26 | [QA] Kiểm thử hồi quy toàn bộ trước khi đóng gói bản cài | 5 | Xong |
| T.87 | 3 | - | [QA] Viết Test Report Sprint 3 | 5 | Xong |
| T.92 | 3 | - | [QA] Cập nhật Defect Report Sprint 3 | 5 | Xong |
| T.97 | 3 | US.27 | [QA] Kiểm thử giao diện mới: 40 bước API và chạy thử bốn vai trò trên trình duyệt | 8 | Xong |

### 5. Nguyễn Minh Phát — Database, Frontend

22 việc · 133 điểm · nhập file `jira/5-Phat.csv`

**File mã nguồn (31):** `ThueMayHub-FE/src/components/admin/views/parts-view.tsx`, `ThueMayHub-FE/src/components/admin/views/reports-view.tsx`, `ThueMayHub-FE/src/components/admin/views/settings-view.tsx`, `ThueMayHub-FE/src/components/admin/views/staff-view.tsx`, `ThueMayHub-FE/src/components/admin/views/wallets-view.tsx`, `ThueMayHub-FE/src/components/auth/`, `ThueMayHub-FE/src/components/customer/customer-portal.tsx`, `ThueMayHub-FE/src/components/hub-app.tsx`, `ThueMayHub-FE/src/router.tsx`, `ThueMayHub-FE/src/routes/__root.tsx`, `ThueMayHub-FE/src/routes/index.tsx`, `electron/main.ts`, `electron/preload.ts`, `scripts/build-electron.mjs`, `scripts/dev-electron.mjs`, `scripts/dien-tap-phuc-hoi.mjs`, `server/backup.ts`, `server/database.ts`, `server/expiring.ts`, `server/index.ts`, `server/sort.ts`, `src/components/AccountsPanel.tsx`, `src/components/ExpiringPanel.tsx`, `src/components/NotifyPanel.tsx`, `src/customer/CustomerSupportPage.tsx`, `src/lib/csv.ts`, `src/lib/message-template.ts`, `src/lib/permissions.ts`, `src/pages/FinancePage.tsx`, `src/pages/SettingsPage.tsx`, `tsconfig.electron.json`

| Mã | Sprint | Story | Việc | Điểm | Trạng thái |
| --- | :---: | --- | --- | ---: | --- |
| T.07 | 1 | US.04 | [DB] Thiết kế bảng devices và hiện thực CRUD thiết bị | 13 | Xong |
| T.08 | 1 | US.05 | [DB] Tính doanh thu và tiền sửa quy về từng thiết bị, sắp tên máy theo số tự nhiên | 8 | Xong |
| T.23 | 1 | US.02 | [DB] Khởi tạo database (khoá ngoại, WAL) và bảng admins, sessions, customers | 5 | Xong |
| T.24 | 1 | US.06 | [DB] Thiết kế bảng rentals, financial_transactions (3 giá trị tiền) và khoá ngoại | 8 | Xong |
| T.29 | 2 | US.10 | [DB] Truy vấn sổ giao dịch & sổ chi phí theo kỳ, chỉ mục theo thời gian | 8 | Xong |
| T.30 | 2 | US.10 | [FE] Dựng trang Tài chính: sổ giao dịch, sổ chi phí, bộ lọc kỳ | 13 | Xong |
| T.34 | 2 | US.12 | [DB] Thiết kế bảng repairs; máy có phiếu mở tự chuyển Bảo trì | 5 | Xong |
| T.38 | 2 | US.13 | [DB] Thiết kế bảng parts, part_movements; tồn kho và giá vốn tính từ lịch sử nhập xuất | 8 | Xong |
| T.41 | 2 | US.14 | [DB] Thiết kế bảng customer_accounts, customer_sessions, booking_requests | 5 | Xong |
| T.46 | 2 | US.15 | [DB] Thiết kế bảng extension_requests | 3 | Xong |
| T.49 | 2 | US.16 | [DB] Thiết kế bảng support_tickets, ticket_messages, customer_notifications | 3 | Xong |
| T.51 | 2 | US.16 | [FE] Dựng trang Hỗ trợ của khách: gửi ticket, hội thoại, thông báo | 5 | Xong |
| T.58 | 3 | US.18 | [DB] Thiết kế bảng app_settings, network_lock_events và cột devices.network_status | 3 | Xong |
| T.63 | 3 | US.19 | [FE] Trang Cài đặt, panel tài khoản nhân viên, ẩn menu và nút theo quyền | 5 | Xong |
| T.65 | 3 | US.20 | [DB] Bảng audit_logs và truy vấn nhật ký có phân trang | 3 | Xong |
| T.67 | 3 | US.21 | [FE] Xuất sổ tiền đang xem ra CSV, mở bằng Excel không lỗi tiếng Việt | 3 | Xong |
| T.72 | 3 | US.23 | [DB] Truy vấn dùng chung danh sách đơn sắp hết hạn | 3 | Xong |
| T.74 | 3 | US.23 | [FE] Panel đơn sắp hết hạn, mẫu tin nhắn nhắc khách, cài đặt Telegram | 8 | Xong |
| T.76 | 3 | US.24 | [DB] Thiết kế bảng rental_periods: mỗi lần gia hạn là một kỳ thuê | 3 | Xong |
| T.80 | 3 | US.25 | [DB] Sao lưu tự động bằng VACUUM INTO và diễn tập phục hồi | 5 | Xong |
| T.84 | 3 | US.26 | [FE] Đóng gói bản desktop Windows bằng Electron: cửa sổ app, bộ cài, đổi thư mục dữ liệu | 8 | Xong |
| T.94 | 3 | US.27 | [FE] Giao diện mới theo Figma: đăng nhập chung, hồ sơ khách, cổng khách, Ví khách, Linh kiện, Nhân viên, Báo cáo, Cài đặt | 8 | Xong |


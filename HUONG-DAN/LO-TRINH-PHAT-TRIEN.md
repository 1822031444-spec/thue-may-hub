# Lộ trình sau MVP

Cập nhật trạng thái ngày 14/09/2026. Thứ tự ưu tiên các giai đoạn giữ nguyên như bản gốc; chỉ phần đánh dấu hoàn thành được sửa cho khớp thực tế, và bổ sung những việc đã làm nằm ngoài lộ trình.

## Giai đoạn 1 — Hoàn thành

- Website giới thiệu responsive.
- PWA có thể cài trên máy tính/điện thoại.
- Đăng nhập và đổi mật khẩu.
- Quản lý khách hàng và số dư ví.
- Quản lý PC/boxphone và trạng thái.
- Đơn thuê, thanh toán từng phần và hoàn tiền.
- Chi phí, doanh thu, tiền thực, công nợ và lợi nhuận quản trị.
- Audit log.
- SQLite, build production và kiểm thử nghiệp vụ.

## Giai đoạn 2 — Hoàn thành

- Khách tự đăng ký và đăng nhập bằng tài khoản riêng.
- Xem máy trống và gửi yêu cầu đặt máy.
- Theo dõi đơn, số dư và thời gian còn lại.
- Tạo ticket hỗ trợ.
- Thanh toán đơn bằng số dư ví.
- Gửi yêu cầu gia hạn có quy trình duyệt và báo phí.
- Trung tâm thông báo, gồm cảnh báo trước khi hết hạn.
- Bàn xử lý riêng cho quản trị: duyệt thuê, gia hạn và ticket.

Phần xác minh email/OTP và tải biên nhận PDF được chuyển sang Giai đoạn 3 vì cần nhà cung cấp gửi mail/SMS và mẫu chứng từ chính thức.

## Ngoài lộ trình — Hoàn thành

Những việc dưới đây phát sinh theo nhu cầu thực tế, không nằm trong kế hoạch 5 giai đoạn ban đầu.

### Ứng dụng desktop cho Windows

- Đóng gói Electron: bản cài đặt và bản portable, mở từ shortcut, không cần trình duyệt.
- Server Express + SQLite chạy nhúng trong app, chỉ nghe `127.0.0.1`.
- Ghi nhớ kích thước cửa sổ, thanh tiêu đề tự vẽ, nhật ký lỗi khởi động.
- Font đóng gói sẵn nên chạy offline không đổi chữ.
- Chi tiết trong [Ứng dụng desktop cho Windows](UNG-DUNG-DESKTOP.md).

Lưu ý: bộ quét tự động chỉ chạy khi app đang mở. Muốn chạy thường trú phải dùng bản web `npm start` trên một máy luôn bật.

### Viết lại toàn bộ giao diện

- Hệ thống thiết kế thống nhất, có nền sáng và nền tối.
- Bảng lệnh `Ctrl` + `K` để nhảy trang và mở nhanh form tạo mới.
- Thông báo dạng toast, huy hiệu việc tồn trên menu, menu thu gọn được.
- Kho thiết bị xem theo thẻ hoặc theo bảng.

### Sửa chữa và kho linh kiện

- Phiếu sửa có vòng đời: Báo hỏng → Đang sửa → Đã sửa xong / Không sửa được.
- Máy đang sửa tự chuyển Bảo trì và tự trở lại Sẵn sàng khi đóng phiếu.
- Kho phụ tùng: nhập mua, lắp vào máy, gỡ về kho, kiểm kê, cảnh báo tồn tối thiểu.
- Tiền sửa quy về từng thiết bị, kèm cột *Còn lại* để so doanh thu với chi phí sửa.
- Kiểm thử `npm run test:repair`.

### Tài khoản nhân viên và phân quyền

- Hai vai trò: chủ hệ thống và nhân viên.
- Chủ tạo, sửa, khoá tài khoản và đặt lại mật khẩu cho nhân viên.
- Nhân viên làm việc hằng ngày nhưng không xem được trang Tài chính, không nạp ví, không hoàn tiền, không đụng cấu hình khoá mạng, nhật ký thao tác hay tài khoản.
- Các con số tiền được lọc ngay tại server trước khi trả về, không chỉ ẩn ở giao diện.
- Kiểm thử `npm run test:perm`.

### Khoá mạng khi hết hạn thuê

- Chủ hệ thống khai báo lệnh khoá và lệnh mở, app thay `{ip}` / `{code}` rồi chạy.
- Tự khoá khi đơn quá hạn quá thời gian ân hạn, tự mở khi có đơn còn hạn trở lại.
- Nhật ký ghi đúng câu lệnh đã chạy và kết quả trả về.
- Kiểm thử `npm run test:lock`, gồm ca chặn chèn lệnh qua trường IP.

Đây là một phần của gạch đầu dòng "Khóa… từ xa" trong Giai đoạn 4, nhưng làm theo hướng chạy lệnh router thay vì cài agent lên máy. Các mục còn lại của Giai đoạn 4 vẫn chưa bắt đầu.

### Dữ liệu mang được sang máy khác

- Bản portable lưu database ngay cạnh file chạy, chép cả thư mục sang USB hay máy
  khác là mở ra đúng dữ liệu cũ.
- Bản đã cài đặt đổi được thư mục dữ liệu từ **Cài đặt → Thư mục dữ liệu → Đổi**.
  Thư mục đích trống thì dữ liệu hiện tại được chép sang; đã có dữ liệu thì dùng
  luôn — đó là cách máy thứ hai mở chung một USB.
- Quên cắm USB thì app dừng lại hỏi chứ không âm thầm mở một database trống khác.
- Chi tiết và giới hạn "mỗi lúc chỉ một máy được mở" trong
  [Ứng dụng desktop cho Windows](UNG-DUNG-DESKTOP.md).

### Rà soát và vá giao diện

Làm theo 5 nhóm, từ thứ gây sai dữ liệu tới thứ chỉ khó nhìn:

1. **Chống thao tác trùng.** Kích hoạt/hoàn tất đơn thuê, trả linh kiện về kho,
   đóng ticket, đánh dấu thông báo đã đọc — trước đây bấm hai lần là gửi hai lệnh.
   Riêng trả linh kiện hai lần làm tồn kho lệch hẳn so với thực tế.
2. **Phân biệt "lỗi tải" với "chưa có dữ liệu".** Trước đây mất kết nối cũng hiện
   "Chưa có khách hàng", dễ tưởng mất sạch dữ liệu. Nay có trạng thái lỗi riêng
   kèm nút *Thử lại* ở mọi trang. Panel khoá mạng không còn kẹt vĩnh viễn ở
   khung chờ khi tải hỏng.
3. **Không lẫn nội dung giữa các ticket.** Mở ticket khác giờ xoá hội thoại cũ
   trước khi tải, tránh trả lời nhầm khách.
4. **Bàn phím.** Hộp thoại giữ tiêu điểm bên trong (Tab không lọt ra nền sau),
   trả con trỏ về đúng nút đã mở, không đóng được khi đang gửi dữ liệu. Hàng thiết
   bị ở dạng bảng mở được bằng Enter. Nút chỉ có icon đã có nhãn cho trình đọc
   màn hình.
5. **Lọc và tìm kiếm.** Sổ giao dịch, sổ chi phí (kèm lọc nhóm chi), nhật ký thao
   tác (xem thêm thay vì cắt cứng 40 dòng), và bộ lọc *Đang chờ* mặc định ở trang
   Yêu cầu & hỗ trợ.

### Sổ tiền dùng được lâu dài

Hai chỗ sẽ hỏng khi vận hành thật vài tháng, cả hai đều nằm trên số liệu tiền:

- **Dữ liệu cũ biến mất lặng lẽ.** Sổ giao dịch và sổ chi phí trước đây chặn cứng
  300 dòng, quá ngưỡng là phần cũ không còn cách nào xem, mà giao diện cũng không
  báo gì. Nay hai endpoint nhận `from`, `to`, `limit`, `offset` và trả kèm tổng số
  dòng; giao diện hiện rõ *100 / 150 khoản chi* và có nút **Xem thêm**.
- **Không xem được kỳ khác.** Mọi con số trước đây tính cứng từ mùng 1 tháng hiện
  tại. Nay có bộ chọn kỳ: Tháng này / Tháng trước / Năm nay / Tất cả / Tuỳ chọn
  ngày. `GET /api/dashboard` nhận cùng `from`, `to` và trả lại kỳ đang tính.

Lưu ý khi đọc số: **số dư ví** và **công nợ** là số đang nợ tại thời điểm hiện
tại, không phải số của một kỳ, nên chúng cố tình không đổi khi bạn đổi kỳ lọc.

Thêm nút **Xuất CSV** để đối chiếu sổ sách bằng Excel (có BOM nên tiếng Việt
không bị hỏng chữ).

Kiểm thử: `npm run test:finance` (lọc kỳ, phân trang, số dư ví không bị kỳ làm
sai) và `npm run test:csv` (dấu phẩy, dấu nháy, BOM trong file xuất ra).

### Sao lưu tự động

Trước đây không có dòng mã sao lưu nào — hỏng file database là mất sạch lịch sử
thuê và sổ tiền. Nay:

- App tự sao lưu theo lịch (mặc định mỗi ngày, giữ 14 bản), có cả nút *Sao lưu
  ngay*. Cấu hình ở **Cài đặt → Sao lưu**.
- Sao lưu bằng `VACUUM INTO` của SQLite, ra **một file duy nhất** và là ảnh chụp
  đúng thời điểm. Chép tay ba file lúc app đang chạy dễ ra bản dở dang mà không
  báo lỗi.
- Bản sao chứa toàn bộ dữ liệu tiền nên **nhân viên bị chặn** ở cả ba endpoint.
- Giao diện **cảnh báo thẳng** khi bản sao còn nằm cùng ổ với dữ liệu gốc: cứu
  được file hỏng và xoá nhầm, nhưng không cứu được hỏng ổ cứng.
- Thư mục sao lưu không ghi được thì bị từ chối **ngay lúc lưu cấu hình**, chứ
  không phải tới lúc chạy mới hỏng âm thầm.

Kiểm thử: `npm run test:backup` — mở lại bản sao bằng SQLite và đếm đủ 20 bảng,
dọn bản cũ đúng số, đổi thư mục, từ chối thư mục hỏng, chặn nhân viên.

### Vá nốt các giới hạn còn chặn cứng

Sau khi sửa sổ tiền, còn bốn danh sách vẫn cắt dữ liệu mà không báo gì. Nay tất cả
đều phân trang thật và có nút **Xem thêm** kèm số dòng còn lại:

| Danh sách | Trước | Sau |
| --- | --- | --- |
| Phiếu sửa chữa | cắt ở 300 | phân trang, mỗi lần 100 |
| Lịch sử xuất nhập kho | cắt ở 100 | phân trang, mỗi lần 50 |
| Yêu cầu thuê / gia hạn / ticket | cắt ở 200 | phân trang, mỗi lần 100 |
| Nhật ký thao tác | cắt ở 200 | phân trang, mỗi lần 100 |

Riêng nhật ký khoá mạng vẫn chỉ giữ 50 lần chạy gần nhất — đó là chủ ý, nên tiêu đề
panel ghi thẳng **"50 lần chạy lệnh gần nhất"** thay vì để người dùng tưởng là toàn bộ.

**Một lỗi nặng hơn được tìm ra trong lúc làm.** Huy hiệu *việc chờ* trên menu đếm
bằng cách lọc mảng trả về từ `/service-desk/overview`. Mảng đó bị cắt ở 200, nên
quá ngưỡng là huy hiệu **báo thiếu việc** — mà người dùng lại tin vào con số đó để
biết còn bao nhiêu yêu cầu phải xử lý. Nay server đếm bằng câu lệnh riêng và trả về
khối `pending`; giao diện chỉ hiển thị lại, không tự đếm.

Kiểm thử: `npm run test:paging` — phân trang không trùng không sót ở cả bốn danh
sách, và ca quan trọng nhất: gọi `?limit=1` với `?limit=500` phải cho ra cùng một
số việc chờ.

### Gia hạn đơn thuê

Nhìn dữ liệu thật của tiệm mới lộ ra: app thiết kế cho **thuê trọn gói có kỳ hạn
cố định**, còn tiệm chạy theo kiểu **thuê bao** — khách trả tiền kỳ nào thì đẩy hạn
ra kỳ đó. Ba chỗ tắc: không có nút gia hạn ở phía quản trị (`end_at` chỉ đổi được
qua luồng khách tự yêu cầu ở cổng web, mà khách thì liên hệ qua Zalo), thu tiền bị
chặn ở tổng đơn ban đầu, và không biết khoản tiền nào ứng với kỳ nào.

Nay có `POST /api/rentals/:id/renew`:

- Chọn đơn vị **giờ / ngày / tuần / tháng** rồi nhập số kỳ, không khoá cứng theo tháng.
- Gia hạn và thu tiền trong **cùng một transaction**, không có cảnh đẩy hạn xong mà
  tiền chưa ghi. Bỏ chọn *Thu tiền luôn* thì ghi nợ.
- Chọn **nối tiếp hạn cũ** hay **tính từ hôm nay** — khách trả trễ thì mỗi tiệm tính
  một kiểu, để người dùng quyết thay vì đoán hộ.
- Thiết bị có thêm cột `daily_rate`, `weekly_rate` để giá tự điền sẵn theo đơn vị.

Mỗi lần gia hạn ghi một dòng vào bảng mới `rental_periods` thay vì chỉ cộng dồn vào
`total_amount` — cùng nguyên tắc với kho linh kiện và sổ tiền: giữ bút toán để sau
này còn biết con số tổng từ đâu ra. Xem qua `GET /api/rentals/:id/periods`.

Chỗ dễ sai nhất là **phép cộng tháng**: `setMonth` của JavaScript tự tràn, 31/01 cộng
1 tháng ra 03/03. Với đơn thuê thì đó là cho không khách mấy ngày mà không ai nhận
ra, nên logic tách riêng ra `server/rental-period.ts` và có test riêng cho từng ca
biên (ngày 31, năm nhuận, bắc cầu sang năm mới).

Kiểm thử: `npm run test:renew`.

### Màn hình "Sắp hết hạn"

Câu hỏi đầu tiên mỗi sáng mở app là *hôm nay cần nhắc ai đóng tiền*. Panel cũ trên
trang Tổng quan chỉ liệt kê 6 đơn gần hạn nhất kèm tên máy — thiếu đúng hai thứ
cần để hành động: **gọi cho ai** và **đòi bao nhiêu**.

Panel mới `GET /api/rentals/expiring?days=7` trả về:

- Số điện thoại khách và số tiền còn nợ của từng đơn.
- Phân nhóm sẵn theo mức gấp: **đã quá hạn / trong 24 giờ / trong N ngày**, cộng
  tổng tiền chưa thu của cả nhóm.
- Gồm cả đơn **đã quá hạn** — nhóm gấp nhất, vì máy vẫn đang chạy mà tiền chưa thu.

Giao diện có nút **Gia hạn** ngay trên từng dòng, bấm là nhảy sang trang Đơn thuê
và mở sẵn form của đúng đơn đó (qua `usePendingAction` kèm payload). Trang Đơn thuê
cũng có thêm bộ lọc **Sắp hết hạn**.

Kiểm thử: `npm run test:expiring` — lọc đúng khoảng ngày, phân nhóm đúng mức gấp,
tính đúng công nợ, và đơn đã hoàn tất/huỷ không lọt vào danh sách.

## Giai đoạn 3 — Thanh toán và kế toán — Chưa bắt đầu

Toàn bộ mục dưới đây chưa có dòng mã nào trong `server/`.

- VietQR động/cổng thanh toán có webhook.
- Chống callback trùng và đối soát tự động.
- Hóa đơn điện tử qua nhà cung cấp được lựa chọn.
- Xác minh email/OTP và khôi phục mật khẩu.
- Tải biên nhận PDF.
- Xuất Excel/CSV cho kế toán.
- Báo cáo doanh thu theo ca, nhân viên và kênh bán.
- Khấu hao tài sản và phân bổ điện theo thiết bị.

Riêng mục cuối đã có sẵn nền móng: chi phí sửa chữa và linh kiện được quy về từng thiết bị, còn thiếu phần khấu hao theo giá mua và phân bổ tiền điện.

## Giai đoạn 4 — Agent PC — Chưa bắt đầu

- Windows Service báo online, CPU, RAM, ổ đĩa và nhiệt độ.
- Đổi thông tin truy cập theo phiên.
- Khóa, khởi động lại và phục hồi image từ xa. *(Phần khóa đã làm theo hướng lệnh router, xem mục Ngoài lộ trình.)*
- Gateway thay cho mở RDP trực tiếp ra Internet.
- Cảnh báo mất điện, mất mạng và downtime.

## Giai đoạn 5 — Agent boxphone — Chưa bắt đầu

- Theo dõi pin, nhiệt độ, USB và mạng.
- Tạo phiên điều khiển có thời hạn.
- Khởi động lại và reset theo chính sách.
- ADB chỉ hoạt động trong mạng quản trị.
- Nhật ký lệnh điều khiển và cảnh báo thiết bị bất thường.

## Đã gác lại

- **Thông báo qua bot Zalo** cho khách và admin về ngày thuê, ngày hết hạn. Tạm dừng, chưa chọn kênh (Zalo OA chính thức hay nhóm nội bộ qua webhook).

## Trước khi triển khai Internet công khai

Trạng thái từng mục:

| Việc cần làm | Trạng thái |
|---|---|
| Dùng domain và HTTPS | Chưa |
| Đặt ứng dụng sau reverse proxy/firewall | Chưa |
| Chuyển mật khẩu mặc định sang biến môi trường mạnh | **Chưa — vẫn còn `Admin@123`** |
| Backup tự động sang vị trí thứ hai | **Xong phần tự động.** Mỗi ngày một bản, giữ 14 bản, chỉnh ở Cài đặt → Sao lưu. Còn lại: trỏ thư mục sao lưu sang ổ khác/USB thì mới chống được hỏng ổ cứng |
| Kiểm thử phục hồi dữ liệu | Chưa |
| Rà soát phân quyền nhân viên | **Xong.** Hai vai trò, tạo được tài khoản riêng cho từng nhân viên, chặn ở tầng API |
| Hoàn thiện điều khoản dịch vụ và chính sách dữ liệu cá nhân | Chưa |
| Đánh giá chuyển SQLite sang PostgreSQL theo quy mô | Chưa cần ở quy mô hiện tại |

Mật khẩu mặc định là việc gấp nhất trong bảng này: chỉ cần mở cổng ra Internet mà chưa đổi thì ai biết địa chỉ cũng vào được khu quản trị.

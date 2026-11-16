# Hướng dẫn vận hành Thuê Máy Hub

## 0. Làm quen giao diện

Vài thứ giúp thao tác hằng ngày nhanh hơn, có ở cả bản desktop lẫn bản web:

- **Bảng lệnh `Ctrl` + `K`.** Gõ vài chữ để nhảy sang bất kỳ trang nào, hoặc mở
  thẳng form *Thêm khách hàng*, *Thêm thiết bị*, *Tạo đơn thuê*, *Ghi chi phí*
  mà không phải bấm qua nhiều bước.
- **Huy hiệu đỏ trên menu "Yêu cầu & hỗ trợ".** Hiện tổng số yêu cầu thuê, gia
  hạn và ticket đang chờ xử lý, tự cập nhật mỗi phút. Không cần mở trang mới biết
  có việc tồn.
- **Nút thu gọn menu** ở đầu thanh trên cùng. Thu gọn còn dải biểu tượng để lấy
  thêm chỗ cho bảng dữ liệu rộng. Lựa chọn được ghi nhớ cho lần mở sau.
- **Nền sáng/tối.** Đổi bằng nút hình mặt trăng, hoặc vào **Cài đặt & nhật ký →
  Hiển thị** để chọn *Sáng*, *Tối* hay *Theo máy*.
- **Kho thiết bị xem theo thẻ hoặc theo bảng.** Dạng thẻ tiện lúc nhìn nhanh
  trạng thái; dạng bảng tiện lúc so giá và doanh thu nhiều máy cùng lúc.
- **Cột thời hạn của đơn thuê** hiển thị "Còn 3 ngày" hoặc "Quá hạn 5 giờ" thay
  vì bắt bạn tự nhẩm từ ngày kết thúc. Đơn sắp đến hạn và đơn quá hạn có màu chấm
  khác nhau trên bảng Tổng quan.

## 1. Thiết lập lần đầu

1. Chạy ứng dụng và mở trang đăng nhập.
2. Đăng nhập bằng tài khoản khởi tạo.
3. Vào **Cài đặt & nhật ký**, đổi mật khẩu tối thiểu 10 ký tự có chữ hoa, chữ thường và số.
4. Tạo tài khoản riêng cho từng nhân viên ở tab **Tài khoản** (xem mục 2).
5. Sao lưu thư mục `data` sau khi cấu hình xong.
6. Không chia sẻ tài khoản chủ hệ thống cho kỹ thuật viên hoặc cộng tác viên.

Trước khi bán dịch vụ, cập nhật email liên hệ và nội dung website trong `src/pages/LandingPage.tsx`. Bảng giá cụ thể có thể được bổ sung sau khi chốt gói kinh doanh.

## 2. Tài khoản và phân quyền

Mở **Cài đặt & nhật ký → Tài khoản**. Mục này chỉ chủ hệ thống nhìn thấy.

Hệ thống có hai vai trò:

| Việc | Chủ hệ thống | Nhân viên |
|---|:---:|:---:|
| Khách hàng, thiết bị, đơn thuê, thu tiền | ✔ | ✔ |
| Sửa chữa và kho linh kiện | ✔ | ✔ |
| Duyệt yêu cầu thuê, gia hạn và chốt giá | ✔ | ✔ |
| Đổi giá thuê của máy | ✔ | ✔ |
| Xem trang Tài chính, doanh thu, lợi nhuận | ✔ | ✖ |
| Nạp ví cho khách | ✔ | ✖ |
| Hoàn tiền đơn thuê | ✔ | ✖ |
| Cấu hình khoá mạng | ✔ | ✖ |
| Nhật ký thao tác | ✔ | ✖ |
| Quản lý tài khoản | ✔ | ✖ |

### Tạo tài khoản cho nhân viên

Bấm **Thêm tài khoản**, nhập tên, email đăng nhập và mật khẩu. Mật khẩu hiện rõ để bạn chép gửi cho nhân viên — dặn họ vào Cài đặt đổi lại ngay sau lần đăng nhập đầu.

### Khi nhân viên nghỉ việc

Mở tài khoản đó, chọn **Sửa** và đổi trạng thái sang *Đã khoá*. Người đó bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập lại được.

Không xoá tài khoản, vì xoá sẽ làm mất dấu vết người đó trong nhật ký thao tác. Khoá lại là đủ.

### Quên mật khẩu

Chủ mở tài khoản đó, bấm **Đặt mật khẩu** và nhập mật khẩu mới. Người dùng bị đăng xuất khỏi mọi thiết bị và phải đăng nhập lại bằng mật khẩu mới.

### Hai ràng buộc luôn đúng

- Không ai tự đổi vai trò hay tự khoá tài khoản của chính mình. Cần đổi thì nhờ một tài khoản chủ khác.
- Hệ thống không bao giờ còn lại 0 tài khoản chủ đang hoạt động.

Ẩn nút trên màn hình chỉ để đỡ rối mắt; mọi yêu cầu vẫn được kiểm tra lại ở máy chủ, nên nhân viên gõ thẳng địa chỉ trang Tài chính cũng không vào được.

## 3. Nhập kho thiết bị

Mở **Kho thiết bị → Thêm thiết bị** và nhập:

- Tên dễ nhận biết, ví dụ `PC Render 01` hoặc `Boxphone Samsung A23-01`.
- Cấu hình phần cứng/Android.
- IP hoặc hostname nội bộ.
- Giá theo giờ và giá theo tháng.
- Giá mua để phục vụ báo cáo hiệu quả tài sản sau này.
- Thông tin truy cập nội bộ và vị trí rack.

Ý nghĩa trạng thái:

| Trạng thái | Cách sử dụng |
|---|---|
| Sẵn sàng | Có thể tạo đơn thuê mới |
| Đã giữ chỗ | Đã có đơn nhưng chưa bàn giao |
| Đang thuê | Khách đang có quyền sử dụng |
| Bảo trì | Chủ động ngừng bán để sửa chữa |
| Mất kết nối | Máy không phản hồi hoặc mất mạng |
| Ngừng dùng | Không còn đưa vào khai thác |

Chỉ thiết bị ở trạng thái **Sẵn sàng** mới xuất hiện trong form tạo đơn.

## 4. Tạo khách hàng

Mở **Khách hàng → Thêm khách hàng**. Nên lưu ít nhất tên, số điện thoại và một kênh liên lạc có thể xác minh.

- Hạn mức công nợ bằng `0`: khách phải thanh toán trước hoặc trả ngay.
- Hạn mức lớn hơn `0`: chỉ dùng cho khách doanh nghiệp đã được phê duyệt.
- Ghi chú không nên chứa mật khẩu hoặc dữ liệu nhạy cảm không cần thiết.

### Sửa hồ sơ và chặn khách

Bấm **Sửa** ở cuối mỗi dòng để đổi tên, số điện thoại, email, công ty, hạn mức và trạng thái.

| Trạng thái | Hiệu lực thật |
|---|---|
| Hoạt động | Bình thường |
| Hạn chế | **Chỉ là nhãn nhắc nhở.** Hệ thống không tự chặn gì |
| Đã khoá | Ba tác dụng cùng lúc, xem bên dưới |

**Đã khoá** làm ba việc:

1. Khách biến mất khỏi danh sách chọn khi tạo đơn thuê mới.
2. Khách không đăng nhập được cổng khách hàng nữa.
3. Phiên đang mở của khách bị cắt ngay lập tức.

Đơn thuê đang chạy của họ **không** bị ảnh hưởng — máy vẫn dùng được tới hết hạn. Đây là trạng thái nặng, dùng khi khách quỵt tiền hoặc làm hỏng máy, không phải để nhắc nhở nhẹ.

## 5. Nạp ví khách hàng

Tại danh sách khách, chọn **Nạp ví** sau khi đã nhìn thấy giao dịch trên ngân hàng hoặc nhận đủ tiền mặt.

Ví dụ khách chuyển 5.000.000 đồng:

| Chỉ tiêu | Thay đổi |
|---|---:|
| Tiền thực thu | +5.000.000 |
| Số dư ví khách | +5.000.000 |
| Doanh thu | 0 |

Tiền nạp chưa phải doanh thu vì bạn vẫn còn nghĩa vụ cung cấp dịch vụ cho khách. Luôn nhập mã giao dịch ngân hàng vào trường tham chiếu để tránh ghi nhận hai lần.

## 6. Tạo và bàn giao đơn thuê

Mở **Đơn thuê → Tạo đơn thuê**:

1. Chọn khách hàng.
2. Chọn thiết bị đang sẵn sàng.
3. Nhập thời gian bắt đầu và kết thúc.
4. Nhập tiền thuê, phụ phí và giảm giá.
5. Chọn `Giữ chỗ` nếu chưa bàn giao; chọn `Đang thuê` nếu khách đã nhận quyền truy cập.
6. Lưu thông tin bàn giao nội bộ.

Tạo đơn không tự động thu tiền. Sau khi tạo, chọn **Thu tiền**.

### Bộ lọc Quá hạn

Thanh lọc trên trang Đơn thuê có mục **Quá hạn** kèm số lượng, gom những đơn còn mở nhưng đã qua giờ kết thúc. Đây là danh sách cần gọi khách mỗi sáng.

Lưu ý: hệ thống không tự đổi trạng thái đơn thành "Quá hạn" — đơn vẫn là *Hoạt động* cho tới khi bạn bấm Hoàn tất. Làm vậy để cơ chế khoá mạng còn nhận ra đơn đó mà khoá máy.

### Huỷ đơn giữ chỗ

Khách đặt giữ chỗ rồi đổi ý thì bấm **Huỷ đơn**. Thiết bị lập tức trở lại danh sách máy sẵn sàng.

Nút này chỉ hiện với đơn **Đã giữ chỗ và chưa thu đồng nào**. Đơn đã thu tiền thì phải **Hoàn tiền** trước, tránh trường hợp huỷ đơn xong tiền của khách còn treo trong sổ.

## 7. Ghi nhận thanh toán

Có bốn nguồn thanh toán:

- **Chuyển khoản trực tiếp:** tăng tiền thực và tăng doanh thu.
- **Tiền mặt trực tiếp:** tăng tiền thực và tăng doanh thu.
- **Trừ ví:** giảm số dư ví và tăng doanh thu, không làm tăng tiền thực lần nữa.
- **Khác:** chỉ dùng khi đã có quy trình đối soát rõ ràng.

Ví dụ khách dùng 3.200.000 đồng trong ví:

| Chỉ tiêu | Thay đổi |
|---|---:|
| Tiền thực thu | 0 |
| Số dư ví khách | −3.200.000 |
| Doanh thu | +3.200.000 |

Thanh toán có thể chia thành nhiều lần nhưng tổng thanh toán ròng không vượt tổng đơn.

## 8. Kích hoạt và kết thúc đơn

Khi giao quyền truy cập:

1. Kiểm tra thiết bị online.
2. Đổi mật khẩu hoặc tạo thông tin truy cập riêng cho phiên thuê.
3. Xác nhận thời gian kết thúc với khách.
4. Chuyển đơn từ **Đã giữ chỗ** sang **Hoạt động**.

Khi kết thúc:

1. Thu hồi mật khẩu/quyền truy cập.
2. Sao lưu dữ liệu nếu khách đã mua dịch vụ backup.
3. Khôi phục máy về image sạch theo chính sách.
4. Chuyển đơn sang **Hoàn tất**; thiết bị tự trở lại **Sẵn sàng**.
5. Nếu máy cần xử lý, chuyển thiết bị sang **Bảo trì** ngay sau đó.

## 9. Khoá mạng khi hết hạn thuê

Mở **Cài đặt & nhật ký → Khoá mạng khi hết hạn**.

App không tự biết cách chặn một IP, vì mỗi nhà dùng một router khác nhau. Bạn khai báo sẵn hai câu lệnh, app thay chỗ trống rồi chạy đúng lệnh đó và ghi lại kết quả.

### Khai báo lệnh

Chỉ hai chỗ trống được thay:

| Chỗ trống | Thay bằng |
|---|---|
| `{ip}` | IP hoặc hostname trong hồ sơ thiết bị |
| `{code}` | Mã máy, ví dụ `PC-260914-FA8FA4` |

Tên thiết bị **không** bao giờ được ghép vào lệnh. Đó là ô chữ tự do, nếu ghép vào thì một cái tên chứa ký tự lạ có thể biến thành lệnh khác chạy trên máy bạn. Vì lý do đó, IP sai khuôn cũng bị từ chối thay vì cắt gọt cho vừa — nhật ký sẽ ghi rõ máy nào bị từ chối và vì sao.

Bấm một trong ba **mẫu có sẵn** (MikroTik qua SSH, tường lửa Windows, gọi API riêng) để điền nhanh rồi sửa lại địa chỉ router cho đúng nhà bạn.

Dùng **Xem trước câu lệnh sẽ chạy**: chọn một máy rồi bấm *Dựng thử* để thấy đúng chuỗi app sắp chạy, trước khi bật cơ chế.

### Hai công tắc

- **Bật cơ chế khoá mạng** — tắt thì app không chạy bất kỳ lệnh nào, kể cả đơn đã quá hạn.
- **Tự động khoá khi hết hạn** — app quét mỗi phút. Tắt mục này thì bạn tự bấm khoá bằng tay.

**Ân hạn (phút)** là khoảng chờ thêm sau giờ hết hạn rồi mới khoá, để khách chậm vài phút không bị cắt ngang.

### Máy tự khoá và tự mở lúc nào

- Đơn thuê ở trạng thái *Hoạt động* và đã quá hạn quá thời gian ân hạn → app chạy lệnh khoá.
- Máy đang bị khoá mà có đơn *Hoạt động* còn hạn trở lại (khách gia hạn hoặc thuê tiếp) → app chạy lệnh mở.

Trạng thái mạng chỉ đổi khi lệnh chạy **thành công**. Lệnh lỗi thì máy vẫn hiện là đang mở, để màn hình không bao giờ báo "đã khoá" trong khi thực tế chưa khoá.

Trạng thái mạng tách riêng khỏi trạng thái khai thác. Một máy có thể *Sẵn sàng* cho thuê nhưng vẫn *Đã khoá mạng* nếu lệnh mở chưa chạy — thẻ máy và bảng trong **Kho thiết bị** đều hiện dấu khoá để bạn thấy.

### Khi khách kêu máy vẫn vào được

Xem **Nhật ký → Lần chạy lệnh gần đây**. Mỗi dòng ghi đúng câu lệnh đã chạy, kết quả router trả về, do người bấm hay do luật tự chạy. Đây là chỗ duy nhất trả lời được lệnh đã chạy chưa và báo lỗi gì.

## 10. Hoàn tiền

Tại đơn đã thanh toán, chọn **Hoàn tiền**, nhập số tiền và bắt buộc ghi lý do.

- Hoàn về ví: tăng số dư ví, giảm doanh thu, không chi tiền ra ngay.
- Hoàn qua ngân hàng/tiền mặt: giảm tiền thực và giảm doanh thu.

Không xóa giao dịch cũ để sửa sai. Bút toán hoàn tiền giữ nguyên lịch sử và người thao tác trong audit log.

## 11. Ghi chi phí

Mở **Tài chính → Ghi chi phí**. Nhập chi phí vào đúng ngày phát sinh:

- Điện.
- Internet.
- Mặt bằng.
- Nhân sự.
- Marketing.
- Phần mềm/server.
- Thuế và phí.
- Chi phí khác.

Hai nhóm **Sửa chữa** và **Linh kiện** do trang Sửa chữa tự ghi vào, đừng nhập tay ở đây kẻo tính hai lần.

Nên lưu nhà cung cấp, mã hóa đơn hoặc mã chuyển khoản để đối soát cuối tháng.

## 12. Sửa chữa thiết bị và kho linh kiện

Mở **Sửa chữa**. Trang này có hai tab: *Phiếu sửa chữa* theo dõi máy đang hỏng, *Kho linh kiện* quản lý phụ tùng trữ sẵn.

### Nguyên tắc tiền

Tiền chỉ được ghi vào sổ chi phí ở đúng hai thời điểm:

| Việc bạn làm | Ghi chi phí? | Nhóm chi phí |
|---|---|---|
| Nhập mua linh kiện vào kho | Có, ngay lúc nhập | Linh kiện |
| Lắp linh kiện từ kho vào máy | **Không** | — |
| Đóng phiếu sửa với tiền công thợ | Có, lúc đóng phiếu | Sửa chữa |

Lắp linh kiện không ghi chi phí lần nữa vì tiền đã chi khi mua. Thao tác đó chỉ trừ tồn kho và cộng giá vốn vào **tiền sửa của máy**, để bạn biết máy nào đang ngốn tiền. Vì vậy đừng ghi tay khoản mua linh kiện hay tiền công ở trang Tài chính — sẽ bị tính hai lần.

### Vòng đời một phiếu sửa

1. **Báo hỏng** — tạo phiếu, chọn máy, mô tả hiện tượng.
2. **Đang sửa** — máy tự chuyển sang *Bảo trì* và biến mất khỏi danh sách cho thuê. Nếu khách đang cầm máy, hệ thống giữ nguyên trạng thái đơn thuê.
3. Trong lúc sửa: lắp linh kiện từ kho, gỡ ra nếu lắp nhầm. Lắp sai rồi gỡ vẫn để lại dấu vết trong lịch sử kho.
4. **Đã sửa xong** — nhập tiền công, phương thức trả và mô tả đã xử lý gì. Hệ thống ghi chi phí và trả máy về *Sẵn sàng*.
5. **Không sửa được** — vẫn ghi tiền công đã bỏ ra, máy chuyển sang *Ngừng dùng*.

Phiếu đã đóng thì khoá lại: không sửa nội dung, không lắp thêm linh kiện. Máy hỏng lại thì tạo phiếu mới, để lịch sử từng lần sửa còn nguyên.

Phiếu chưa lắp linh kiện nào có thể **Huỷ**. Nếu đã lắp, hãy gỡ linh kiện về kho trước khi huỷ.

Gõ nhầm hoặc cần bổ sung mô tả thì bấm **Sửa nội dung** trong phiếu, sửa được khi phiếu còn mở.

### Kho linh kiện

- **Thêm linh kiện** chỉ khai báo loại phụ tùng, chưa có số lượng.
- **Nhập kho** nhập số lượng và đơn giá. Giá vốn của kho là bình quân các lần nhập mua, và đây là giá dùng để tính tiền linh kiện cho máy.
- **Kiểm kê** chỉnh số lượng cho khớp thực tế khi phát hiện thừa thiếu. Kiểm kê không sinh chi phí và không đổi giá vốn.
- Đặt **tồn tối thiểu** cho những món hay dùng. Xuống dưới mức đó, hệ thống cảnh báo ở trang Sửa chữa và trên trang Tổng quan.
- **Sửa** đổi tên, nhóm, đơn vị, tồn tối thiểu và vị trí cất. Số lượng tồn và giá vốn không sửa ở đây vì chúng tính từ lịch sử nhập xuất — muốn chỉnh số lượng thì dùng *Nhập kho → Kiểm kê*.
- **Lịch sử** của từng linh kiện cho biết đã nhập bao nhiêu, lắp vào máy nào, phiếu nào.

### Quyết định giữ hay thanh lý một máy

Mở **Kho thiết bị**, bấm vào máy cần xem. Ngay đầu hộp thoại có ba con số: doanh thu máy đã mang lại, tiền đã sửa, và phần còn lại. Bảng thiết bị dạng danh sách cũng có cột *Tiền sửa* và *Còn lại* để so nhanh giữa các máy.

Máy có tiền sửa tiệm cận doanh thu, hoặc đã vượt, là ứng viên để thanh lý hoặc đổi cấu hình.

## 13. Hiểu dashboard tài chính

- **Doanh thu tháng:** tiền thuê đã được ghi nhận qua thanh toán, sau hoàn tiền.
- **Tiền thực thu:** tiền đi vào thực tế trong tháng, gồm cả tiền khách nạp ví.
- **Số dư ví khách:** tổng dịch vụ bạn còn phải cung cấp cho khách.
- **Công nợ đơn thuê:** tổng giá trị đơn chưa ghi nhận đủ thanh toán.
- **Lợi nhuận quản trị:** doanh thu tháng trừ chi phí đã nhập trong tháng.

Lợi nhuận quản trị chưa bao gồm khấu hao tự động, thuế phải nộp hoặc các khoản chi chưa nhập. Vì vậy không dùng con số này thay cho báo cáo của kế toán.

## 14. Checklist đầu và cuối ngày

### Đầu ngày

- Kiểm tra số thiết bị mất kết nối hoặc bảo trì.
- Kiểm tra đơn hết hạn trong 24 giờ.
- Đối chiếu khách đã chuyển tiền nhưng chưa được ghi nhận.
- Kiểm tra dung lượng ổ đĩa và bản backup gần nhất.

### Cuối ngày

- So khớp tiền thực thu trên app với ngân hàng và tiền mặt.
- Xác nhận mọi đơn đã bàn giao có trạng thái **Hoạt động**.
- Hoàn tất các đơn đã thu hồi máy.
- Ghi đủ chi phí phát sinh.
- Kiểm tra các thao tác bất thường trong **Cài đặt & nhật ký**.

## 15. Checklist cuối tháng

- Xuất hoặc tổng hợp giao dịch cho kế toán.
- Đối chiếu số dư ví của từng khách lớn.
- Rà soát công nợ chưa thu.
- So sánh doanh thu từng thiết bị với điện, sửa chữa và khấu hao.
- Đưa thiết bị doanh thu thấp vào kế hoạch bán, đổi cấu hình hoặc điều chỉnh giá.
- Kiểm tra phục hồi một bản backup ngẫu nhiên.

## 16. Quy trình khách tự đăng ký và yêu cầu thuê

Khách truy cập `/portal/register` và nhập tên, số điện thoại, email cùng mật khẩu. Hệ thống tự tạo hồ sơ khách hàng trong khu vực quản trị.

Sau khi đăng nhập, khách thực hiện:

1. Mở **Thuê thiết bị**.
2. Chọn PC hoặc boxphone đang sẵn sàng.
3. Chọn cách tính theo giờ hoặc theo tháng.
4. Nhập thời gian mong muốn và nhu cầu phần mềm/cấu hình.
5. Gửi yêu cầu.

Gửi yêu cầu chưa giữ thiết bị và chưa trừ tiền. Khách chỉ nhận được đơn sau khi quản trị duyệt.

## 17. Duyệt yêu cầu thuê từ quản trị

Mở **Yêu cầu & hỗ trợ → Yêu cầu thuê**:

1. Kiểm tra khách, số điện thoại, thiết bị và mục đích sử dụng.
2. Kiểm tra thiết bị vẫn ở trạng thái sẵn sàng.
3. Chọn **Duyệt**.
4. Nhập giá xác nhận.
5. Nhập thông tin bàn giao hoặc thời điểm dự kiến cấp quyền.
6. Ghi chú cho khách và xác nhận.

Sau khi duyệt:

- Hệ thống tạo đơn ở trạng thái giữ chỗ.
- Thiết bị không còn xuất hiện trong danh mục máy trống.
- Khách nhận thông báo và thấy đơn trong **Đơn đang thuê**.
- Khách có thể thanh toán phần còn lại bằng số dư ví.

Nếu không thể đáp ứng, chọn **Từ chối** và nhập lý do cụ thể. Khách sẽ nhận lý do trong cổng của họ.

## 18. Xử lý yêu cầu gia hạn

Khách chọn **Yêu cầu gia hạn** tại đơn đang mở và nhập thời hạn mới. Trong quản trị:

1. Mở tab **Gia hạn**.
2. Kiểm tra lịch sử dụng máy.
3. Nhập phí bổ sung.
4. Duyệt hoặc từ chối kèm ghi chú.

Khi duyệt, hệ thống tự cập nhật ngày kết thúc và cộng phí vào tổng đơn. Phần phí chưa thanh toán xuất hiện trong công nợ để khách trả bằng ví hoặc nhân viên ghi nhận phương thức khác.

## 19. Vận hành ticket hỗ trợ

Khách có thể tạo ticket kỹ thuật, thanh toán, đơn thuê hoặc vấn đề chung. Ticket có thể gắn với một đơn cụ thể.

Tại **Yêu cầu & hỗ trợ → Hỗ trợ**:

1. Mở ticket ưu tiên cao trước.
2. Đọc toàn bộ lịch sử trao đổi.
3. Phản hồi bằng thông tin có thể thực hiện được.
4. Khi xử lý xong, chọn **Đánh dấu đã xử lý**.

Mỗi phản hồi của quản trị tạo thông báo cho khách. Nếu khách nhắn lại, ticket tự trở về trạng thái mở.

Không gửi mật khẩu quản trị, mật khẩu dùng chung hoặc bí mật hệ thống qua ticket.

## 20. Thông báo cho khách

Hệ thống hiện tạo thông báo khi:

- Khách đăng ký thành công.
- Gửi yêu cầu thuê hoặc gia hạn.
- Yêu cầu được duyệt/từ chối.
- Đội vận hành phản hồi ticket.
- Ticket được đánh dấu hoàn tất.
- Đơn đang mở sẽ hết hạn trong vòng 24 giờ.

Thông báo hết hạn được tạo khi khách mở cổng. Để gửi chủ động qua email/Zalo/SMS ngay cả khi khách không đăng nhập, cần bổ sung worker và nhà cung cấp gửi tin ở giai đoạn tiếp theo.

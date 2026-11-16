# Thiết kế MVP Thuê Máy Hub

## Mục tiêu

Hệ thống phục vụ vận hành một cơ sở cho thuê PC và boxphone. Chủ hệ thống quản lý khách hàng, thiết bị, đơn thuê, ví, thanh toán, chi phí và báo cáo; khách có cổng riêng để đặt máy, gia hạn, thanh toán ví, nhận thông báo và yêu cầu hỗ trợ. Việc cấp quyền truy cập thiết bị vẫn được thực hiện thủ công trong giai đoạn đầu.

## Luồng nghiệp vụ

1. Nhân viên tạo khách hàng.
2. Nhân viên thêm PC hoặc boxphone vào kho thiết bị.
3. Tạo đơn thuê, chọn khách, thiết bị, thời gian và giá.
4. Ghi nhận tiền thuê từ ví, tiền mặt hoặc chuyển khoản; hoàn tiền bằng bút toán đối ứng khi cần.
5. Kích hoạt đơn; thiết bị chuyển sang trạng thái đang thuê.
6. Gia hạn hoặc hoàn tất đơn khi kết thúc.
7. Ghi chi phí vận hành và xem lợi nhuận quản trị.

## Luồng cổng khách hàng

1. Khách đăng ký tài khoản riêng; tài khoản được liên kết một-một với hồ sơ khách hàng.
2. Khách xem thiết bị ở trạng thái sẵn sàng và gửi yêu cầu thuê.
3. Quản trị xác nhận giá. Chỉ khi duyệt, hệ thống mới tạo đơn giữ chỗ và khóa thiết bị khỏi danh mục.
4. Khách thanh toán công nợ bằng số dư ví hoặc nhân viên đối soát phương thức trực tiếp.
5. Yêu cầu gia hạn phải được quản trị duyệt và nhập phí bổ sung.
6. Ticket hỗ trợ lưu hội thoại hai chiều và sinh thông báo cho khách.

Cookie phiên quản trị và cookie phiên khách hàng được tách biệt. Tất cả API khách chỉ truy vấn bản ghi thuộc `customer_id` của phiên hiện tại.

## Nguyên tắc tài chính

Mọi biến động tiền được lưu thành bút toán bất biến với ba giá trị:

- `cash_change`: tiền thực nhận hoặc thực chi.
- `wallet_change`: nghĩa vụ còn phải cung cấp dịch vụ cho khách.
- `revenue_change`: doanh thu dịch vụ đã ghi nhận.

Ví dụ khách nạp 1.000.000 đồng: `cash +1.000.000`, `wallet +1.000.000`, `revenue 0`. Khi khách dùng 300.000 đồng trong ví để trả đơn: `cash 0`, `wallet -300.000`, `revenue +300.000`.

Không xóa bút toán tài chính. Sai sót được xử lý bằng một bút toán điều chỉnh đối ứng và audit log.

### Vì sao đường tiền an toàn khi nhiều người bấm cùng lúc

Các endpoint tiền đều theo khuôn: **đọc số đã thu → kiểm tra không vượt → ghi bút toán**. Ba bước này **không** nằm trong cùng một transaction.

Nhìn qua thì đó là lỗi tranh chấp kinh điển: hai người bấm "Thu tiền" cùng lúc, cả hai đọc thấy "chưa thu đồng nào", cả hai qua cửa kiểm tra, cả hai cùng ghi, thành ra thu vượt.

Thực tế không xảy ra, vì hai lý do cộng lại:

- `node:sqlite` là API **đồng bộ**.
- Giữa lúc đọc và lúc ghi **không có `await` nào**.

Node chạy một luồng, nên cả đoạn đọc–kiểm tra–ghi chạy trọn vẹn, không có chỗ cho yêu cầu khác chen vào. Tính nguyên tử ở đây đến từ kiến trúc chứ không từ transaction. Điều này đã được kiểm chứng bằng thực nghiệm: bắn 8 yêu cầu song song vào cùng một đơn, chỉ một yêu cầu được chấp nhận.

> **Đây là ràng buộc ẩn, phải giữ.** Đổi sang PostgreSQL hay bất kỳ client bất đồng bộ nào sẽ chèn `await` vào giữa đọc và ghi, mở ra khe tranh chấp, và hệ thống bắt đầu thu vượt tiền hoặc cho ví âm — âm thầm, không báo lỗi nào.
>
> Nếu buộc phải chuyển, **trước tiên** bọc đọc–kiểm tra–ghi của mọi endpoint tiền vào một transaction, rồi mới đổi driver.

`npm run test:race` canh đúng ràng buộc này. Ngày nào nó đỏ là ngày phải dừng lại xử lý trước khi chạy tiền thật.

### Thiết lập SQLite

```
PRAGMA foreign_keys = ON;      -- chặn bản ghi mồ côi, đã kiểm chứng là thực sự thi hành
PRAGMA journal_mode = WAL;     -- đọc và ghi không chặn nhau
PRAGMA busy_timeout = 5000;    -- chờ tối đa 5 giây thay vì báo lỗi ngay khi trùng ghi
```

`busy_timeout` cần thiết vì bộ quét khoá mạng ghi database mỗi phút, có lúc trùng đúng thao tác của người dùng. Không đặt thì bên đến sau nhận lỗi `SQLITE_BUSY` ngay lập tức.

`foreign_keys` và `busy_timeout` là thiết lập **theo từng kết nối**, không lưu trong file — mở file bằng công cụ khác sẽ thấy giá trị mặc định của công cụ đó, không phải của server.

### Chi phí sửa chữa và linh kiện

Sửa chữa có thể sinh chi phí ở hai chỗ, nên quy tắc phải rõ để không tính hai lần:

- **Nhập mua linh kiện** ghi ngay một khoản chi nhóm `PARTS`. Đây là lúc tiền thật rời khỏi túi.
- **Đóng phiếu sửa** ghi một khoản chi nhóm `MAINTENANCE` cho tiền công thợ.
- **Lắp linh kiện từ kho vào máy** không sinh chi phí. Nó chỉ trừ tồn kho và quy giá vốn về đúng thiết bị.

Vì vậy `monthExpenses` chỉ cộng từ bảng `expenses`, còn "tiền sửa của một máy" là con số quản trị tính riêng: tiền công của các phiếu đã đóng cộng giá vốn linh kiện đã lắp. Hai con số này phục vụ hai câu hỏi khác nhau — tháng này chi bao nhiêu, và máy nào đang ngốn tiền — nên không được cộng dồn vào nhau.

Tồn kho và giá vốn bình quân không lưu thành cột mà luôn tính lại từ bảng `part_movements`, để số liệu không lệch với lịch sử nhập xuất. Gỡ một linh kiện đã lắp cũng tạo bút toán đối ứng `RETURN` thay vì xoá dòng cũ, giống cách sổ tiền xử lý hoàn tiền.

## Kiến trúc

- React/Vite: website công khai, cổng khách hàng và dashboard quản trị.
- Express: REST API, xác thực và nghiệp vụ.
- SQLite: dữ liệu MVP chạy trên một máy/VPS.
- Electron: vỏ ứng dụng desktop cho Windows.
- Cookie phiên đăng nhập `HttpOnly`, mật khẩu băm bằng `scrypt`.

### Hai cách đóng gói, một mã nguồn

Bản web và bản desktop dùng chung toàn bộ React và toàn bộ server. Khác biệt chỉ
nằm ở lớp ngoài cùng:

| | Bản web | Bản desktop |
| --- | --- | --- |
| Server | `npm start` chạy `server/index.ts` | Tiến trình chính Electron fork `server.cjs` đã gộp sẵn |
| Cổng | `PORT` cố định, nghe mọi card mạng | Cổng trống ngẫu nhiên, chỉ nghe `127.0.0.1` |
| Giao diện tĩnh | `./dist` | `resources/renderer` cạnh file thực thi |
| Database | `data/thue-may.db` | Thư mục dữ liệu của Windows |
| Trang chủ | Website giới thiệu | Chuyển thẳng vào `/admin` |

Giao diện phân biệt hai môi trường qua `src/lib/desktop.ts`. File này đọc
`window.thueMay` do preload của Electron gắn vào; khi chạy trên trình duyệt, đối
tượng đó không tồn tại và mọi lệnh điều khiển cửa sổ trở thành no-op, nên không
phải rẽ nhánh ở từng chỗ gọi.

Server chỉ nhận hai biến môi trường mới: `STATIC_DIR` cho đường dẫn giao diện và
`HOST` để giới hạn địa chỉ lắng nghe. Ngoài ra mã server không biết gì về Electron.

### Phân quyền

Hai vai trò: `OWNER` và `STAFF`. Bảng quyền nằm ở `server/permissions.ts` và được khai báo theo hướng **liệt kê quyền của nhân viên**, không liệt kê quyền của chủ. Thêm một quyền mới mà quên khai báo thì mặc định nhân viên không có — sai về phía an toàn.

Chặn được thực hiện ở ba tầng, và chỉ tầng giữa là bắt buộc:

1. Giao diện ẩn menu, nút và lệnh trong bảng lệnh cho đỡ rối mắt.
2. **Middleware `requirePermission` trên từng endpoint** — đây mới là chỗ thật sự chặn.
3. Trang `/admin/finance` có thêm guard ở tầng route để người gõ thẳng địa chỉ nhận được lời giải thích thay vì trang lỗi.

`src/lib/permissions.ts` là bản sao của bảng quyền phía server. Sửa file đó không mở thêm được quyền nào, nhưng khi thêm quyền mới thì phải khai báo ở cả hai nơi.

Riêng `/api/dashboard` không chỉ ẩn ở giao diện mà **lọc luôn các trường tiền trước khi trả về**, kèm cờ `canSeeMoney`. Dữ liệu doanh thu không bao giờ rời máy chủ với tài khoản nhân viên.

Hai ràng buộc được kiểm tra ở server chứ không phải ở form: không ai tự đổi vai trò hay tự khoá chính mình, và không bao giờ còn lại 0 tài khoản `OWNER` đang hoạt động. Khoá một tài khoản sẽ xoá mọi phiên của người đó, và `requireAuth` kiểm tra `status` mỗi lần gọi API nên hiệu lực là tức thì.

### Khoá mạng khi hết hạn

App không nhúng sẵn cách chặn IP nào, vì mỗi cơ sở dùng một thiết bị mạng khác nhau. Thay vào đó chủ hệ thống khai báo hai câu lệnh trong `app_settings`, app thay chỗ trống rồi chạy bằng shell và ghi mọi lần chạy vào `network_lock_events`.

Đây là cơ chế chạy lệnh tuỳ ý nên phần dựng lệnh được siết chặt:

- Chỉ `{ip}` và `{code}` được thay. Tên thiết bị là ô chữ tự do nên không bao giờ được ghép vào lệnh.
- `{ip}` phải khớp khuôn IP/hostname, `{code}` phải là chữ, số và dấu gạch ngang. Sai khuôn thì **từ chối chạy** và ghi nhật ký, chứ không cắt gọt cho vừa.
- Lệnh có giới hạn thời gian; quá hạn thì bị dừng và tính là thất bại.
- `devices.network_status` chỉ đổi khi lệnh trả mã thành công, để giao diện không bao giờ báo "đã khoá" trong khi thực tế chưa khoá.

Trạng thái mạng tách khỏi trạng thái khai thác (`devices.status`). Một máy có thể vừa *Sẵn sàng* cho thuê vừa *Đã khoá mạng* nếu lệnh mở chưa chạy được — gộp hai thứ này vào một cột sẽ che mất đúng tình huống cần người xử lý.

Bộ quét chạy mỗi phút trong tiến trình server, khoá máy có đơn *Hoạt động* đã quá hạn quá thời gian ân hạn, và mở lại máy đang khoá khi có đơn *Hoạt động* còn hạn. Nút "Quét ngay" gọi đúng hàm đó, và vẫn ghi nguồn `AUTO` vì bản chất là luật hết hạn chạy sớm, khác với việc người tự tay khoá một máy cụ thể (`MANUAL`).

### Bảo mật của bản desktop

- `contextIsolation` bật, `nodeIntegration` tắt. Trang web chỉ chạm được vào các
  hàm khai báo tường minh trong preload.
- Server chỉ nghe loopback nên máy khác trong mạng không gọi được API.
- Link ra ngoài mở bằng trình duyệt mặc định thay vì biến cửa sổ app thành browser.
- Cookie phiên không đặt cờ `secure` vì app phục vụ qua `http://127.0.0.1`; tiến
  trình chính truyền `NODE_ENV=desktop` để phân biệt với triển khai production thật.

Khi hệ thống vượt khoảng 100 thiết bị hoặc cần nhiều máy chủ ứng dụng, SQLite sẽ được chuyển sang PostgreSQL và agent thiết bị được bổ sung qua hàng đợi công việc.

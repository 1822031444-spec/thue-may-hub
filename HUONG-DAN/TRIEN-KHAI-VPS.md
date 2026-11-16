# Triển khai lên VPS

Tài liệu này ghi lại những gì đã bàn để dùng khi thật sự triển khai. **Chưa làm gì cả** — đây là danh sách kiểm tra, không phải nhật ký.

Bối cảnh: VPS đang chạy sẵn một website khác, muốn đặt thêm Thuê Máy Hub lên cùng máy đó.

## 1. Khi nào mới cần VPS

Chưa cần thì đừng dựng. App desktop gọn hơn, không tốn tiền thuê máy chủ, không phải lo tên miền và chứng chỉ.

Chuyển sang VPS khi **một trong hai** điều sau thành thật:

- **Có nhân viên ngồi máy riêng.** Mỗi bản desktop giữ database riêng trong máy đó, nên hai máy là hai kho dữ liệu tách biệt. Không có server chung thì tính năng phân quyền nhân viên vô nghĩa.
- **Muốn khách tự phục vụ:** tự đăng ký, xem máy trống, gửi yêu cầu thuê, gia hạn, mở ticket.

Nếu vẫn một mình quản lý và khách nhắn Zalo để thuê, desktop là đủ.

## 2. Địa chỉ web trông như thế nào

Khách gõ một địa chỉ dạng:

```
https://thuemay.tenmiencuaban.com
```

Không có cổng, không có tài khoản hay mật khẩu trong địa chỉ. Chuỗi dạng `host:port:user:pass` là **định dạng proxy**, không phải địa chỉ web — trình duyệt không hiểu.

Dịch vụ kiểu `duckdns.org` chỉ dành cho IP nhà thay đổi liên tục. VPS có IP tĩnh rồi thì không cần.

### Ba cách đặt cạnh web cũ

| Cách | Địa chỉ | Nhận xét |
|---|---|---|
| **Tên miền con** | `thuemay.tenmiencu.com` | **Nên dùng.** Web cũ không đụng gì, HTTPS sạch |
| Thư mục con | `tenmiencu.com/thuemay` | App dùng đường dẫn tuyệt đối, phải sửa base path — thêm việc mà không lợi |
| Cổng riêng | `tenmiencu.com:10001` | Chạy ngay nhưng không có HTTPS đẹp, nhiều mạng chặn cổng lạ |

Cách 1 chỉ cần thêm một bản ghi DNS trỏ tên miền con về IP VPS, rồi thêm một khối `server_name` vào Nginx đang có.

## 3. Bốn thứ phải kiểm tra trước

### Phiên bản Node — chỗ dễ vướng nhất

App bắt buộc **Node 22 trở lên** vì dùng `node:sqlite` có sẵn trong Node, không cài thư viện ngoài. VPS chạy Node 18 hoặc 20 sẽ không khởi động được.

**Đừng nâng cấp Node của web cũ** — dễ làm hỏng nó. Hai cách an toàn:

- Dùng `nvm` để mỗi app một phiên bản.
- Tải riêng một bản Node 22 về thư mục riêng, trỏ systemd vào đúng bản đó.

### Cổng

Mặc định app nghe cổng `8787`. Trùng với web cũ thì đổi bằng biến `PORT`, không phải sửa code.

### Web server đang dùng là gì

Nginx hay Apache đều được. Quan trọng: **thêm khối cấu hình vào cái đang có**, không dựng thêm web server thứ hai. Hai web server cùng giành cổng 443 là hỏng cả hai.

### RAM còn trống

App chiếm khoảng 80–150 MB. Chạy `free -m`, còn dư ít nhất ~300 MB là thoải mái.

## 4. Biến môi trường khi chạy trên VPS

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=8787
DATABASE_PATH=/duong/dan/rieng/data/thue-may.db
SESSION_DAYS=7
CUSTOMER_SESSION_DAYS=14
```

Hai biến đầu là bắt buộc, và vì lý do khác nhau:

- **`NODE_ENV=production`** — cookie phiên đăng nhập chỉ bật cờ `Secure` khi biến này đúng bằng `production`. Quên đặt thì cookie đi qua đường không được bảo vệ.
- **`HOST=127.0.0.1`** — app chỉ nghe loopback, mọi truy cập bắt buộc qua Nginx. Không ai gõ thẳng `ip:8787` để lách vào được.

Danh sách đầy đủ biến app nhận: `PORT`, `HOST`, `NODE_ENV`, `DATABASE_PATH`, `STATIC_DIR`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `SESSION_DAYS`, `CUSTOMER_SESSION_DAYS`.

## 5. Database: giữ SQLite

**Không đổi sang PostgreSQL khi lên VPS.** SQLite đúng về kỹ thuật cho quy mô này, không phải giải pháp tạm.

Giới hạn thật của SQLite không nằm ở lượng dữ liệu mà ở **số tiến trình cùng ghi**. Một VPS chạy một tiến trình server thì không chạm tới giới hạn đó.

### Ba mốc mới phải đổi, và chỉ ba

| Dấu hiệu | Vì sao SQLite hết dùng được |
|---|---|
| Chạy **2 tiến trình server trở lên** | SQLite là một file, một tiến trình ghi |
| Báo cáo nặng chạy song song lúc đang bán hàng | Truy vấn dài khoá ghi lâu |
| Nối công cụ BI hoặc phần mềm kế toán đọc trực tiếp từ xa | SQLite không có cổng mạng |

Lượng dữ liệu **không** nằm trong danh sách. File lên vài GB SQLite vẫn chạy tốt.

### Giá phải trả nếu đổi — đọc kỹ trước khi quyết

Code dùng `node:sqlite` với API **đồng bộ**. Mọi client PostgreSQL đều **bất đồng bộ**. Đổi database không phải sửa một dòng kết nối mà là sửa cả 69 endpoint thành `async`.

Nguy hiểm hơn: tính an toàn của đường tiền hiện đang **dựa vào việc API đồng bộ** — xem mục *Vì sao đường tiền an toàn khi nhiều người bấm cùng lúc* trong [Kiến trúc hệ thống](KIEN-TRUC-HE-THONG.md). Thêm `await` vào giữa đọc và ghi là mở ra lỗi thu vượt tiền, âm thầm không báo lỗi.

Nếu buộc phải chuyển: **bọc transaction cho mọi endpoint tiền trước**, đổi driver sau, và chạy `npm run test:race` để xác nhận.

### Tuyệt đối đừng làm

> Đừng đặt file SQLite lên ổ mạng, Google Drive, Dropbox hay OneDrive để hai máy dùng chung.

SQLite khoá file theo cơ chế mà các ổ mạng và ứng dụng đồng bộ không hỗ trợ đúng. Kết quả không phải chậm mà là **hỏng dữ liệu**, thường hỏng âm thầm.

Muốn dùng chung dữ liệu chỉ có một cách đúng: một server chung. Không có đường tắt.

### Sao lưu khi đang chạy WAL

Database ở chế độ WAL sinh thêm hai file `-wal` và `-shm`. Chép thiếu là mất các thay đổi gần nhất. Hai cách an toàn:

- Dừng app rồi chép cả ba file.
- Hoặc dùng `sqlite3 thue-may.db ".backup ban-sao.db"` — lệnh này chép an toàn ngay cả khi app đang chạy.

## 6. Đừng làm sập web cũ

Rủi ro lớn nhất **không phải** app này ngốn tài nguyên, mà là gõ sai cấu hình Nginx rồi reload.

Sửa xong luôn chạy `nginx -t` trước. Thấy `syntax is ok` mới `reload`. Sai thì nó báo lỗi và web cũ vẫn chạy nguyên.

Cho app chạy bằng **một tài khoản hệ thống riêng**, không dùng chung với web cũ. Hai bên không đọc ghi được file của nhau.

## 7. Khoá mạng: để ở quầy, đừng để trên VPS

Tính năng khoá mạng chạy lệnh hệ thống do bạn khai báo. Hai lý do không nên chạy nó từ VPS:

1. **VPS ở xa, không với tới router nhà bạn.** Lệnh chặn IP phải chạy trong mạng phòng máy mới có tác dụng.
2. **Đừng chạy app bằng quyền root** chỉ để lệnh `iptables` hoạt động. Đó là trao quyền root cho một tiến trình web đang mở ra Internet, và web cũ cũng nằm trong tầm ảnh hưởng.

Cách hợp lý: VPS lo phần khách truy cập, còn khoá mạng để bản chạy ở máy quầy.

## 8. Trước khi trỏ tên miền

- **Đổi mật khẩu `Admin@123`.** Lên Internet mà còn mật khẩu mặc định thì ai biết địa chỉ cũng vào được khu quản trị.
- Bật HTTPS bằng Let's Encrypt cho tên miền con mới. Chứng chỉ của web cũ không bị ảnh hưởng.
- Sao lưu `data/` trước và sau khi chuyển.
- Đăng nhập thử cả khu quản trị lẫn cổng khách trước khi đưa địa chỉ cho khách.

## 9. Một điểm lợi khi lên VPS

Hạn chế "khoá mạng tự động chỉ chạy khi app desktop đang mở" **biến mất**: server chạy thường trú 24/7 nên bộ quét hết hạn làm việc kể cả lúc tắt máy đi ngủ. Các thông báo nhắc hết hạn cho khách cũng vậy.

Vẫn dùng app desktop để quản lý hằng ngày, VPS lo phần khách và phần tự động — hai bản dùng chung mã nguồn nên không phải làm thêm gì.

## 10. Khi sẵn sàng làm thật

Cho biết ba thông tin này để viết sẵn file cấu hình đúng cho máy đó:

1. VPS đang dùng **Nginx hay Apache**
2. Đang chạy **Node phiên bản mấy** (`node -v`)
3. **Tên miền con** muốn dùng

Sẽ cần: file cấu hình reverse proxy, file systemd service, lệnh xin chứng chỉ Let's Encrypt, và quy trình chuyển dữ liệu từ máy hiện tại lên.

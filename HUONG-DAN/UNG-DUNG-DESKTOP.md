# Ứng dụng desktop cho Windows

Từ bản này, Thuê Máy Hub chạy được như một ứng dụng Windows thật: mở từ Start
Menu hoặc shortcut ngoài desktop, không cần mở trình duyệt và không cần nhớ địa
chỉ `localhost`.

Nghiệp vụ không đổi. App desktop vẫn dùng đúng server Express và database SQLite
như bản web — chỉ khác ở chỗ server được nhúng vào bên trong app.

## Cách hoạt động

Khi bạn mở app, tiến trình chính của Electron sẽ:

1. Chọn một cổng trống trên máy.
2. Chạy server Express + SQLite trong một tiến trình Node con, chỉ nghe trên
   `127.0.0.1` nên Windows không hỏi quyền tường lửa và dữ liệu không lộ ra mạng.
3. Mở cửa sổ trỏ thẳng vào khu quản trị.
4. Tắt server khi bạn đóng cửa sổ.

Website giới thiệu và cổng khách hàng chỉ xuất hiện ở bản web. Trong app desktop,
`/` được chuyển thẳng vào `/admin` vì đây là công cụ vận hành nội bộ.

## Tạo file cài đặt

Yêu cầu: Node.js 22 trở lên.

```powershell
npm install
npm run desktop:package
```

Kết quả nằm trong thư mục `release`:

| File | Dùng khi nào |
| --- | --- |
| `ThueMayHub-Setup-0.1.0.exe` | Bản cài đặt bình thường, tạo shortcut và mục gỡ cài đặt. |
| `ThueMayHub-Portable-0.1.0.exe` | Chạy trực tiếp không cần cài, tiện khi mang theo USB. |

Cả hai đều khoảng 90 MB vì có sẵn Chromium và Node bên trong — đó là mức bình
thường của ứng dụng Electron.

File cài đặt chưa được ký số, nên lần đầu chạy Windows SmartScreen có thể hiện
cảnh báo "Windows protected your PC". Chọn **More info → Run anyway**. Muốn bỏ
hẳn cảnh báo thì cần mua chứng thư ký mã (code signing certificate).

## Chạy thử khi đang phát triển

```powershell
npm run desktop:dev
```

Lệnh này chạy song song ba việc: server API bằng `tsx watch`, vite dev server, và
cửa sổ Electron trỏ vào vite. Sửa code giao diện là thấy đổi ngay trong cửa sổ
app, không phải build lại.

Muốn thử đúng cách app hoạt động sau khi đóng gói (server nhúng, không có vite):

```powershell
npm run desktop:start
```

## Dữ liệu nằm ở đâu

| Cách chạy | Đường dẫn database |
| --- | --- |
| App đã cài đặt | `%APPDATA%\thue-may-hub\data\thue-may.db` |
| **Bản portable** (`ThueMayHub-Portable-*.exe`) | `thuemay-data\thue-may.db` **ngay cạnh file .exe** |
| `npm run desktop:dev`, `npm run dev`, `npm start` | `data\thue-may.db` trong thư mục dự án |

Bản đã cài đặt cố tình dùng thư mục riêng của Windows để gỡ hay cài lại app
không làm mất dữ liệu.

Không cần nhớ đường dẫn: mở **Cài đặt & nhật ký**, mục **Hiển thị** có dòng
*Thư mục dữ liệu* kèm nút **Mở** (và nút **Đổi** ở bản đã cài đặt).

## Mang app sang máy khác

Mục tiêu: dùng app bình thường, lúc cần thì chép sang máy khác mở ra vẫn đúng
dữ liệu đó, không phải đồng bộ tay từng file.

### Cách 1 — bản portable (khuyên dùng khi hay đổi máy)

Bản portable luôn lưu dữ liệu ngay cạnh file chạy, nên cả app lẫn dữ liệu nằm
gọn trong một thư mục:

1. Chép `ThueMayHub-Portable-0.1.0.exe` vào một thư mục trên USB.
2. Chạy lần đầu — app tự tạo `thuemay-data` bên cạnh, chứa 3 file database.
3. Dùng bình thường. Đóng app trước khi rút USB.
4. Cắm USB sang máy khác, chạy đúng file .exe đó — mở ra đúng dữ liệu cũ.

Chép cả thư mục (`.exe` + `thuemay-data`) sang máy khác cũng cho kết quả y hệt,
không cần cài gì trên máy đó.

### Cách 2 — bản đã cài đặt, trỏ dữ liệu ra USB

Dùng khi muốn cài app trên nhiều máy nhưng chung một kho dữ liệu:

1. Máy thứ nhất: **Cài đặt & nhật ký → Thư mục dữ liệu → Đổi**, chọn một thư mục
   trống trên USB. App khởi động lại và chép dữ liệu hiện tại sang đó.
2. Máy thứ hai: cài app, rồi cũng **Đổi** và chọn **đúng thư mục đó** trên USB.
   Thư mục đã có database nên app dùng luôn, không chép đè.

Nút **Đổi** không có ở bản portable, vì bản đó luôn lưu cạnh file chạy.

### Luật quan trọng

**Mỗi lúc chỉ một máy được mở.** SQLite không phải database dùng chung qua mạng
hay qua ổ đám mây. Hai máy mở cùng một file database cùng lúc là hỏng file, mất
dữ liệu. Luôn đóng hẳn app ở máy này rồi mới mở ở máy kia.

Vì thế cũng **đừng để OneDrive / Google Drive đồng bộ thư mục dữ liệu** khi app
đang mở. Muốn nhiều người dùng cùng lúc thì phải chuyển sang mô hình server —
xem [TRIEN-KHAI-VPS.md](TRIEN-KHAI-VPS.md).

### Khi quên cắm USB

App không tự ý mở database khác. Nó dừng lại và hiện hộp thoại *Không mở được
thư mục dữ liệu* với ba lựa chọn:

| Nút | Ý nghĩa |
| --- | --- |
| **Thử lại** | Cắm USB vào rồi bấm nút này |
| **Dùng thư mục mặc định** | Mở một database trống trong `%APPDATA%` — **không phải** dữ liệu cũ |
| **Thoát** | Đóng app, không đụng gì tới dữ liệu |

Chọn *Dùng thư mục mặc định* khi chưa cắm USB là cách dễ nhập nhầm dữ liệu vào
database rỗng nhất, nên chỉ chọn khi bạn thật sự muốn bắt đầu lại từ đầu.

## Chuyển dữ liệu đang có sang app

Nếu bạn đã dùng bản web và muốn app cài đặt kế thừa dữ liệu đó:

1. Đóng app và dừng mọi tiến trình `npm run dev` / `npm start`.
2. Mở **Cài đặt & nhật ký → Thư mục dữ liệu → Mở** (hoặc gõ
   `%APPDATA%\thue-may-hub\data` vào thanh địa chỉ Explorer).
3. Chép đè ba file `thue-may.db`, `thue-may.db-shm`, `thue-may.db-wal` từ thư mục
   `data` của dự án sang đó.
4. Mở lại app và đăng nhập kiểm tra.

Chép thiếu file `-wal` có thể làm mất các thay đổi gần nhất, nên hãy chép cả ba.

## Sao lưu

App **tự sao lưu**, mặc định mỗi ngày một bản và giữ lại 14 bản gần nhất. Xem và
chỉnh ở **Cài đặt & nhật ký → Sao lưu**. Ở đó có cả nút *Sao lưu ngay* nếu bạn
muốn tạo bản trước khi làm việc gì rủi ro.

Bản sao là **một file duy nhất**, tên dạng `thue-may-20260915-210322.db`. App tạo
bằng câu lệnh `VACUUM INTO` của SQLite — đây là cách duy nhất chép được database
đang mở mà chắc chắn ra bản dùng được. Chép tay ba file lúc app đang chạy thì dễ
ra bản dở dang mà không hề báo lỗi.

### Một điều phải hiểu đúng

Mặc định bản sao nằm **cùng ổ đĩa** với database gốc. Như vậy:

| Tình huống | Có cứu được không |
| --- | --- |
| File database hỏng, app không mở được | **Có** |
| Lỡ xoá nhầm, nhập nhầm hàng loạt | **Có** |
| Ổ cứng chết, máy mất cắp, cháy nổ | **Không** |

Muốn chống được cả hàng cuối, vào **Cài đặt → Sao lưu → Thư mục lưu bản sao** và
trỏ sang **ổ khác hoặc USB cắm sẵn**. App sẽ cảnh báo ngay trên màn hình khi bản
sao còn nằm chung ổ với dữ liệu gốc.

### Phục hồi từ bản sao

1. Đóng hẳn app.
2. Mở thư mục dữ liệu (**Cài đặt → Thư mục dữ liệu → Mở**).
3. Xoá hoặc đổi tên `thue-may.db` cùng hai file `thue-may.db-wal` và
   `thue-may.db-shm` nếu có.
4. Chép file sao lưu vào đó, đổi tên thành `thue-may.db`.
5. Mở lại app và đăng nhập kiểm tra.

> Nên thử phục hồi vào một thư mục riêng **ít nhất một lần** để chắc chắn bản sao
> dùng được thật. Bản sao chưa từng thử phục hồi thì chưa gọi là có bản sao.

Không để ứng dụng cloud drive đồng bộ trực tiếp database đang mở. Riêng thư mục
`backups` thì đồng bộ lên đám mây được, vì mỗi file ở đó đã đóng hẳn.

## Bàn phím

| Phím | Tác dụng |
| --- | --- |
| `Ctrl` + `K` | Mở bảng lệnh: nhảy nhanh sang trang hoặc mở form tạo mới. |
| `↑` `↓` rồi `Enter` | Chọn lệnh trong bảng lệnh. |
| `Esc` | Đóng bảng lệnh hoặc hộp thoại đang mở. |
| `F5` / `Ctrl` + `R` | Tải lại giao diện nếu màn hình bị treo hiển thị. |
| `F12` | Mở DevTools khi cần xem lỗi kỹ thuật. |

## Khi app không mở được

Lỗi lúc khởi động được ghi vào `%APPDATA%\thue-may-hub\thuemay-startup-error.log`.
Mở file này trước khi báo lỗi — nội dung trong đó cho biết app dừng ở bước nào.

Vài nguyên nhân thường gặp:

- **Đã có một cửa sổ đang chạy.** App chỉ cho phép mở một cửa sổ; lần mở thứ hai
  sẽ đưa cửa sổ cũ lên trước thay vì tạo cửa sổ mới.
- **Thư mục dữ liệu bị khoá quyền ghi.** Kiểm tra quyền trên
  `%APPDATA%\thue-may-hub`.
- **Biến môi trường `ELECTRON_RUN_AS_NODE` đang được đặt.** Trường hợp này app
  thoát ngay và *không* ghi log, vì Electron từ chối khởi động trước khi mã của
  app kịp chạy. Chỉ xảy ra khi mở app từ một cửa sổ terminal có sẵn biến đó —
  bấm shortcut ngoài desktop hoặc Start Menu thì không gặp. Kiểm tra bằng
  `echo $env:ELECTRON_RUN_AS_NODE` trong PowerShell; nếu ra `1` thì chạy
  `Remove-Item Env:\ELECTRON_RUN_AS_NODE` rồi mở lại, hoặc đơn giản là mở app từ
  shortcut.

## Bản web có còn dùng được không

Còn nguyên. `npm run dev`, `npm run build` và `npm start` hoạt động như trước, và
khách hàng vẫn truy cập cổng riêng qua trình duyệt. Cùng một mã nguồn phục vụ cả
hai: giao diện tự nhận biết đang chạy trong app hay trên trình duyệt để bật/tắt
thanh tiêu đề riêng và website giới thiệu.

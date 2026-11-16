# Kế hoạch nộp và đưa lên Jira — Nhóm 11

> File này để ở **thư mục gốc**, không để trong `SEP_Nhom11_ThueMayHub/`, vì
> `npm run sep` dọn sạch thư mục đó mỗi lần chạy và sẽ xoá mất.

---

## 1. Thứ tự chạy lệnh

```powershell
cd "C:\Users\Admin\Desktop\Thue May Hub - Ban thu"
npm run sep            # sinh 44 file Word/Excel và 2 bản PDF — CHẠY TRƯỚC, nó xoá sạch thư mục
npm run sep:phancong   # bảng phân công từng người
npm run sep:jira       # 5 file CSV nhập Jira (mỗi người một file) + 1 file bổ sung
```

Chạy sai thứ tự là hai phần sau bị xoá mất.

Hai lệnh phụ, chỉ chạy khi cần:

- `npm run sep:uml` — vẽ lại 11 sơ đồ (use case, tuần tự, trạng thái, hoạt động, kiến trúc) vào `design/uml/`. Chỉ chạy khi sửa sơ đồ trong `scripts/sep/gen-uml.mjs`.
- `npm run sep:pdf` — xuất lại bản PDF bằng Microsoft Word. `npm run sep` đã tự gọi lệnh này ở bước cuối.

Hai file dùng riêng, nằm ngay ở gốc `SEP_Nhom11_ThueMayHub/`, mỗi file có cả bản Word và PDF:

- `00_BAO-CAO-TIEN-DO` — báo cáo tiến độ gửi giảng viên: số liệu, tiến độ từng sprint, phân công, kiểm thử, lỗi, rủi ro, việc còn lại.
- `00_HUONG-DAN-THUYET-TRINH` — cho cả nhóm: chương trình, lời nói gợi ý, kịch bản demo, hỏi đáp và 18 sơ đồ, mỗi sơ đồ một trang.

---

## 2. Chia đôi để nộp

Bộ tài liệu có 42 file. Nguyên tắc chia: **đợt 1 là những gì phải chốt trước khi
viết code**, **đợt 2 là những gì chỉ có sau khi đã làm**. Nộp ngược thứ tự này là
cố vấn hỏi ngay "chưa có yêu cầu sao đã có kết quả test".

### Đợt 1 — 14 file

| # | File | Trả lời câu hỏi |
| --- | --- | --- |
| — | `00_GIOI_THIEU.md` | Đề tài, thành viên, cấu trúc bộ tài liệu |
| 1.1.1 | ConfigurationManagementPlan | Quản lý phiên bản mã nguồn và tài liệu |
| 1.1.2 | Milestone | Các mốc chính của 12 tuần |
| 1.1.4 | ProductBacklog | 27 user story, chia 3 sprint |
| 1.1.5 | ProjectPlan | Kế hoạch tổng thể, nguồn lực, lịch |
| 1.1.7 | RiskList | 10 rủi ro đã nhận diện |
| 1.1.8 | RiskManagementPlan | Cách theo dõi và xử lý rủi ro |
| 1.1.10 | Sprint1Plan | Sprint 1 làm gì, ai làm |
| 1.1.13 | TeamCharter | Cam kết nhóm, vai trò, quy tắc làm việc |
| 1.3 | MeetingReport Week5 | Biên bản họp |
| 2.1 | FunctionList | Danh sách chức năng |
| 2.2 | TraceabilityMatrix | Nối yêu cầu ↔ chức năng ↔ test case |
| 2.3 | ConceptOfOperation | Hệ thống vận hành ra sao |
| 2.4 | BusinessRule | Quy tắc nghiệp vụ bắt buộc |

Kèm `00_PHAN-CONG-THEO-CONG-DOAN.md` để cố vấn thấy nhóm đã chia việc: ai làm
mảng nào, tổng điểm, danh sách việc và file mã nguồn của từng người.

### Đợt 2 — 28 file

Phần Sprint 1 (16 file):

- mục **3**: Architecture Driver, Architecture Design, Database Design, Class Diagram;
- mục **1.2**: Retrospective Sprint 1, Sprint 1 Backlog Items;
- mục **4**: Test Plan, 3 Test Case, 3 Test Execute, Defect Report, Test Report,
  User Acceptance.

Phần Sprint 2 và 3 (12 file, mỗi sprint 6 file):

| # | File | Ghi chú |
| --- | --- | --- |
| 1.1.11 / 1.1.12 | Sprint2Plan, Sprint3Plan | Sprint 3 là bản 1.1: thêm US.27 giữa sprint |
| 1.2.2 | Retrospective Sprint 2, Sprint 3 | **Sprint 3 là bản nháp**, chốt ở buổi họp 25/10 |
| 1.2.6 | Sprint 2, Sprint 3 Backlog Items | Sprint 3 còn T.88, T.89 ở Doing |
| 4.5 | DefectReport Sprint 2, Sprint 3 | Cộng dồn: Sprint 2 tới DF.06, Sprint 3 tới DF.13 |
| 4.6 | TestReport Sprint 2, Sprint 3 | Dựng từ bài test tự động; có sheet ghi lệnh chạy lại |
| 4.7 | USER-ACCEPTANCE Sprint 2, Sprint 3 | **Để trống** cột Đạt/Không đạt, khách đánh dấu và ký |

Lỗi DF.04–DF.13 là lỗi có thật, đã sửa, mỗi lỗi có bài test canh giữ. Ở Test Report,
lần chạy 2 của Sprint 3 là kết quả chạy thật ngày 22/10/2026: 17 bài test, 303 điểm
kiểm tra, đạt hết.

Nộp phần Sprint 3 sau buổi 25/10: Retrospective đã chốt, biên bản nghiệm thu đã có chữ
ký, sheet *Acceptance Test Report* trong Test Report đã điền (xem mục 6).

---

## 3. Đưa lên Jira — 5 người, 5 file

Project: **Nhom11 - Phần Mềm Thuê Máy** · site `nhom11.atlassian.net` ·
loại **team-managed**.

### 3.1 Chia việc

| Thứ tự nhập | File | Người nhập | Mảng | Số việc | Điểm |
| :---: | --- | --- | --- | ---: | ---: |
| **1** | `jira/1-Thanh.csv` | Đỗ Tuấn Thành | Backend (+ Product Backlog) | 15 | 122 |
| 2 | `jira/2-Phu.csv` | Phạm Văn Đức Phú | Backend, UX/UI | 20 | 128 |
| 3 | `jira/3-VietAnh.csv` | Đào Việt Anh | Frontend | 18 | 129 |
| 4 | `jira/4-Vinh.csv` | Hồ Sỹ Vinh | Tester | 23 | 121 |
| 5 | `jira/5-Phat.csv` | Nguyễn Minh Phát | Database, Frontend | 22 | 133 |

Số trên đã gồm 6 việc giao diện mới T.93–T.98 (story US.27). **Nhóm đã nhập 5 file
trước đó thì đừng nhập lại** — nhập file bổ sung theo mục 3.7.

Mỗi người nắm trọn một khu vực code:

- **Thành**: API đăng nhập, khách hàng, đơn thuê, luồng tiền, chi phí, duyệt yêu
  cầu, phân quyền, gia hạn tại quầy; API cho giao diện mới (`server/hub.ts`).
- **Phú**: API khoá khách hàng, sửa chữa & kho linh kiện, cổng khách hàng, khoá
  mạng, Telegram, trang Tổng quan; kiêm UX/UI — prototype, CSS, khung cổng khách,
  thiết kế Figma của giao diện mới.
- **Việt Anh**: khung React, trang Khách hàng, Thiết bị, Đơn thuê, Sửa chữa, Yêu
  cầu & hỗ trợ, các panel trong Cài đặt; giao diện mới: khung quản trị, 6 màn và
  phần nối với API thật.
- **Phát**: toàn bộ Database — 15 việc thiết kế bảng, truy vấn, sao lưu (`server/database.ts`,
  `server/backup.ts`, `server/expiring.ts`, `server/sort.ts`); cộng trang Tài chính,
  trang Cài đặt, panel nhắc hạn, bản desktop Electron; giao diện mới: đăng nhập
  chung, cổng khách và 5 màn quản trị.
- **Vinh**: test case, 17 bài test tự động trong `scripts/` (gồm 2 bài cho giao diện
  mới), dữ liệu test, Defect Report và Test Report từng sprint.

Retrospective, cập nhật Backlog và nghiệm thu được rải cho người ít điểm hơn để
tổng điểm đều nhau. Chi tiết từng việc: `00_PHAN-CONG-THEO-CONG-DOAN.md`.

### 3.2 Chuẩn bị (một người làm, trước khi ai nhập)

1. **Bật Sprints** — Project settings → Features → bật *Sprints* và *Backlog*.
2. **Xoá 3 việc mẫu** KAN-1, KAN-2, KAN-3 do Jira tự tạo, và sprint trống
   "KAN Sprint 1" nếu có.
3. **Nếu đã nhập bản nào trước đây thì xoá sạch rồi làm lại từ đầu** — nhập chồng
   sẽ ra việc trùng, mà bản cũ lại sai người làm:
   - *Filters* → tìm `project = KAN` (đổi `KAN` thành mã project của nhóm) → ⋯ →
     *Bulk change all* → tick chọn tất cả → *Delete work items* → bỏ tick gửi email
     → *Confirm*.
   - Vào *Backlog*, sprint nào trống (Sprint 1/2/3 của lần nhập trước) thì ⋯ →
     *Delete sprint*. Sprint đang chạy thì *Complete sprint* trước rồi mới xoá.
   - Kiểm tra lại: tìm `project = KAN` phải ra 0 việc.
4. **Cấp quyền để 4 bạn còn lại tự nhập được file:**
   - Mời vào site: nút *Invite people* (hoặc ⚙ → *User management* → *Invite
     users*), nhập email từng người.
   - Thêm vào project: Project settings → *Access* → *Add people*. Thành chọn
     **Administrator** vì Thành nhập Product Backlog và mở/đóng sprint. Phú, Việt
     Anh, Vinh, Phát chọn **Member**, đủ để tạo việc, đặt trạng thái và gán người.
   - Nếu không thấy mục *Access*, site đang ở gói Free: không có vai trò riêng, ai
     được mời vào site là có quyền trên project, bỏ qua bước này.

### 3.3 Mỗi người nhập file của mình

**Thành nhập đầu tiên** vì file của Thành có 10 epic và 27 user story. Bốn người
còn lại nhập sau, theo thứ tự nào cũng được. Việc nhập **không** xếp việc vào
sprint — Jira hoặc bỏ qua cột Sprint, hoặc tạo sprint không gắn vào board nên không
thấy. Xếp sprint làm một lần ở mục 3.4.

Mỗi người:

1. Vào *Filters* → *View all work items* (bản cũ ghi là *Issues*) → ⋯ góc trên
   bên phải → *Import work items from CSV*, chọn file của mình. Đây là đường nhập
   dành cho thành viên thường. Đừng dùng ⚙ → *System* → *External system import*:
   đường đó chỉ admin của cả site mới vào được.
2. Ở bước ghép cột: `Summary`, `Description`, `Issue Type`, `Priority`, `Labels`
   ghép vào trường cùng tên; `Story Points` → *Story point estimate*; `Assignee`,
   `Status` và `Sprint` để *Don't map* (trạng thái nằm trong nhãn `TT-…`, sprint
   suy ra từ nhãn mã story — cả hai xử lý ở mục 3.4). Riêng file của Thành:
   `Issue ID` → *Issue ID*, `Parent ID` → *Parent ID*.

   Không thấy *Story point estimate*? Project settings → *Features* → bật
   *Estimation*, chọn *Story points*, rồi làm lại bước ghép cột.
3. Nhập xong, gán việc cho mình: *Filters* → tìm `labels = <nhãn của mình>` (ví dụ
   `labels = Phat`) → ⋯ → *Bulk change all* → *Edit* → Assignee = mình.

### 3.4 Xếp sprint, đặt trạng thái, chạy sprint (Thành làm, sau khi cả 5 đã nhập)

Đổi `KAN` trong các câu tìm dưới đây thành mã project của nhóm.

**a. Tạo 3 sprint trên board.** Vào *Backlog* → *Create sprint* ba lần, Jira đặt
tên "KAN Sprint 1/2/3". Nếu Backlog đã có sprint trống thì dùng luôn, không cần tạo.

Nếu Backlog có **hai sprint trùng tên** (mỗi lần nhập có ghép cột Sprint, Jira lại tạo
thêm một bộ), gộp lại:

1. Ở một trong hai cái → ⋯ → *Edit sprint* → đổi tên thành `XOA Sprint 2`.
2. *Filters* → tìm `sprint = "XOA Sprint 2"` → ⋯ → *Bulk change all* → *Edit work
   items* → *Change Sprint* → chọn `Sprint 2` còn lại.
3. Quay lại *Backlog*, `XOA Sprint 2` giờ trống → ⋯ → *Delete sprint*.

Làm tương tự cho Sprint 3. Từ lần nhập sau để cột Sprint là *Don't map* thì hết bị.

**b. Xếp việc vào sprint theo nhãn mã story.** Với từng dòng: *Filters* → dán câu
tìm → ⋯ → *Bulk change all* → *Edit work items* → tick *Change Sprint* → chọn sprint
trên board (loại tên "KAN Sprint …", không chọn "Sprint …" mà lần nhập tự tạo).

| Sprint | Câu tìm |
| --- | --- |
| 1 | `project = KAN AND labels in ("US.01","US.02","US.03","US.04","US.05","US.06","US.07")` |
| 2 | `project = KAN AND labels in ("US.08","US.09","US.10","US.11","US.12","US.13","US.14","US.15","US.16","US.17")` |
| 3 | `project = KAN AND labels in ("US.18","US.19","US.20","US.21","US.22","US.23","US.24","US.25","US.26","US.27")` |

Câu tìm lấy cả story lẫn mọi việc của story đó. Còn lại 12 việc quản lý (nhãn
`QuanLyDuAn`) không thuộc story nào — tìm `labels = QuanLyDuAn`, rồi trong *Backlog*
kéo tay vào sprint:

- Sprint 1: T.15, T.16, T.17, T.90 — và kéo **T.22** từ Sprint 2 về Sprint 1 (việc
  này xong trong Sprint 1, chỉ story US.08 của nó bị dời sang Sprint 2).
- Sprint 2: T.55, T.56, T.57, T.91
- Sprint 3: T.87, T.88, T.89, T.92

Epic không xếp vào sprint. Nếu có sprint tên "Sprint 1/2/3" do lần nhập tự tạo
hiện ra sau bước này, xoá đi cho gọn.

**c. Đặt lại trạng thái.** Mọi việc vào Jira đều ở To Do; trạng thái thật nằm trong
nhãn:

1. *Filters* → tìm `labels = TT-Done AND status != Done` → ⋯ → *Bulk change all* →
   *Transition work items* → **Done**.
2. Tìm `labels = TT-InProgress AND status = "To Do"` → làm y như trên → **In Progress**.

Các bước b và c chạy lại bao nhiêu lần cũng được: nhóm nhập file theo từng đợt thì
sau mỗi đợt chạy lại, việc đã xếp/đã chuyển trạng thái không bị ảnh hưởng.

**d. Chạy sprint.** Làm sau bước c, vì Sprint 1 chỉ đóng gọn khi mọi việc đã Done.
Vào *Backlog*:

- Sprint 1: *Start sprint* với ngày 24/08 – 13/09, rồi *Complete sprint* (mọi việc
  đã Done).
- Sprint 2: *Start sprint* với ngày 14/09 – 04/10, rồi *Complete sprint* (mọi việc
  đã Done).
- Sprint 3: *Start sprint* với ngày 05/10 – 25/10. Đây là sprint đang chạy, cố vấn
  mở *Board* là thấy. Đóng sau buổi nghiệm thu 25/10.

### 3.5 Trong file có gì

| | Số lượng | Ghi chú |
| --- | ---: | --- |
| Epic | 10 | Chỉ trong file Thành. Mỗi nhóm chức năng một epic, mô tả liệt kê chức năng F.x.x |
| Story | 27 | Chỉ trong file Thành. Toàn bộ Product Backlog, mô tả liệt kê việc của từng người |
| Task | 98 | Rải trong 5 file. Mỗi việc ghi người làm, file mã nguồn, endpoint |

Mỗi việc có tới ba nhãn: **tên người** (`Thanh`, `Phu`, `VietAnh`, `Vinh`, `Phat`),
**mã story** (`US.06`…) và, nếu không phải To Do, **trạng thái** (`TT-Done`,
`TT-InProgress`). Bấm vào nhãn `US.06` là thấy story cùng mọi việc của nó.
Tiêu đề việc có dạng `T.09 [BE] US.06 · Hiện thực API tạo đơn thuê…`.

Việc là **Task** chứ không phải Sub-task: Jira chỉ nối cha con được trong cùng một
lần nhập, mà story nằm ở file của Thành. Điểm chỉ ghi ở việc, không ghi ở story, để
tổng điểm sprint không bị nhân đôi.

Lệnh `npm run sep:jira` đối chiếu với thư mục mã nguồn thật: 146 file trong `src/`,
`server/`, `electron/`, `public/`, `scripts/`, `ThueMayHub-FE/src`, `ThueMayHub-FE/public`
và file cấu hình đều đã thuộc ít nhất một việc.

### 3.6 Sau khi nhập

File CSV chỉ nhập **một lần**; nhập lại sẽ sinh việc trùng. Từ đó ai làm xong việc
thì tự kéo thẻ trên Jira. Muốn tài liệu Word/Excel khớp trạng thái mới thì sửa
`status` trong `scripts/sep/tasks.mjs` rồi chạy `npm run sep`.

Cố vấn xem tiến độ ở: *Board* (sprint đang chạy), *Backlog* (cả 3 sprint),
*Timeline* (epic và story), *Reports* → Burnup / Sprint report, và lọc theo nhãn tên
để xem riêng từng người.

### 3.7 Nhóm đã nhập từ trước: cập nhật tiến độ tới 22/10

Jira của nhóm đã có 26 story và 92 việc từ lần nhập trước. Không nhập lại 5 file;
chỉ làm 4 bước sau (Thành làm, đổi `KAN` thành mã project):

1. **Nhập file bổ sung** `jira/6-bo-sung-giao-dien-moi.csv` theo đúng cách ở mục 3.3,
   ghép cột như bước 2 ở đó. File có 1 story US.27 và 6 việc T.93–T.98 của cả 5 người.
   Nhập xong:
   - gán người: tìm `labels = "US.27" AND labels = Phat` → *Bulk change all* →
     Assignee = Phát, làm lần lượt cho `Thanh`, `Phu`, `VietAnh`, `Vinh`;
   - nối story vào epic: mở US.27 → *Parent* → chọn epic *Đăng nhập/Đăng xuất*.
2. **Xếp vào Sprint 3:** tìm `project = KAN AND labels = "US.27"` → *Bulk change all*
   → *Change Sprint* → `KAN Sprint 3`.
3. **Kéo trạng thái:** tìm `project = KAN AND issuetype in (Story, Task) AND status != Done`
   → *Bulk change all* → *Transition work items* → **Done**. Sau đó mở hai việc
   **T.88** (Viết Retrospective Sprint 3) và **T.89** (Demo nghiệm thu) kéo về **In
   Progress** — đây là hai việc duy nhất chưa xong, chốt ở buổi 25/10.
4. **Chạy sprint:** Sprint 2 nếu còn chạy thì *Complete sprint*; Sprint 3 → *Start
   sprint* với ngày 05/10 – 25/10.

---

## 4. Còn thiếu — cần đối chiếu yêu cầu của môn

Số thứ tự trong bộ này nhảy cóc, và bộ mẫu Nhóm 05 cũng nhảy cóc y hệt — nghĩa là
bộ mẫu vốn chỉ là một phần.

| Mục | Đang có | **Thiếu** |
| --- | --- | --- |
| 1.1 Project Planning | 1, 2, 4, 5, 7, 8, 10, 11, 12, 13 | **3, 6, 9** |
| 1.2 Project Tracking | 2, 6 (đủ Sprint 1, 2, 3) | **1, 3, 4, 5** |
| 4. Testing | 1, 3, 4, 5, 6, 7 | **2** |

Thường là: bảng theo dõi tiến độ, timesheet, và Test Design cho mục 4.2. **Chưa sinh
vì chưa biết tên chính xác** — gửi tài liệu yêu cầu của môn (chụp màn hình checklist
cũng được) là sinh nốt được.

---

## 5. Bốn chỗ còn để trống

| Tìm | Thay bằng |
| --- | --- |
| `[email]` | Email sinh viên từng người |
| `[SĐT]` | Số điện thoại từng người |
| `[Giảng viên hướng dẫn]` | Tên giảng viên |
| `[Tên khách hàng]` | Tên chủ tiệm đóng vai khách hàng |

Mục **Lớp** đã điền là `Nhóm 11`.

Sửa trong `scripts/sep/data.mjs` rồi chạy lại ba lệnh ở mục 1 — đừng sửa tay trong
Word, vì lần chạy sau sẽ ghi đè. Điền email xong thì 5 file Jira cũng tự gán đúng
người, khỏi phải làm bước 3 ở mục 3.3.

---

## 6. Việc còn lại tới 25/10 (đóng Sprint 3)

1. **Họp Retrospective Sprint 3.** Cả nhóm rà bản nháp, sửa nội dung trong
   `scripts/sep/sprints.mjs` (phần `retro` của Sprint 3), đổi `draft: true` thành
   `draft: false` để bỏ dòng "BẢN NHÁP".
2. **Nghiệm thu với khách.** In biên bản User Acceptance Sprint 2 và Sprint 3, khách
   đánh dấu Đạt/Không đạt và ký. Bản đã ký thì scan, nộp kèm. Sheet *Acceptance Test
   Report* trong hai file Test Report điền theo biên bản. Điền sau lần chạy
   `npm run sep` cuối cùng, vì lệnh đó ghi đè file.
3. **Đóng việc.** T.88 và T.89 xong thì sửa `status: 'Done'` trong
   `scripts/sep/tasks.mjs`, kéo thẻ trên Jira, chạy lại ba lệnh ở mục 1, rồi *Complete
   sprint* Sprint 3.
4. **Điền bốn chỗ trống** ở mục 5 trước khi chạy lần cuối.

Lưu ý khi demo: bản cài Windows (`npm run desktop:package`) vẫn dùng giao diện thế
hệ đầu trong `src/`; giao diện mới chạy bằng `npm run hub` hoặc `npm run hub:start`.

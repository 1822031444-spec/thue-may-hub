# Bộ tài liệu SEP — Nhóm 11 - CTIN

**Đề tài:** Hệ thống Quản lý Cho thuê Máy tính & Boxphone – Thuê Máy Hub
**Nhóm thực hiện:** Nhóm 11 - CTIN (5 thành viên)
**Phạm vi:** Quản lý kho máy, khách hàng, đơn thuê, dòng tiền, sửa chữa, cổng khách hàng và khoá mạng khi hết hạn
**Công nghệ:** ReactJS + TypeScript (TanStack Start, Tailwind CSS) + Node.js (Express) + SQLite (node:sqlite), đóng gói desktop bằng Electron
**Thời gian:** 12 tuần (03/08/2026 – 25/10/2026)

## Thành viên

| MSSV | Họ và tên | Vai trò |
| --- | --- | --- |
| 1822031444 | Phạm Văn Đức Phú | Scrum Master / Backend, UX/UI |
| 1822031313 | Đỗ Tuấn Thành | Product Owner / Backend |
| 1822031301 | Đào Việt Anh | Developer Team / Frontend |
| 1822041511 | Hồ Sỹ Vinh | Tester |
| 1822041808 | Nguyễn Minh Phát | Developer Team / Database, Frontend |

## Bốn chỗ còn để trống

Những thông tin sau nhóm chưa cung cấp nên tài liệu để trống ở dạng dễ tìm. Điền
vào `scripts/sep/data.mjs` rồi chạy lại `npm run sep` — sửa tay trong Word thì lần
chạy sau bị ghi đè:

| Tìm | Thay bằng |
| --- | --- |
| `[email]` | Email sinh viên của từng thành viên |
| `[SĐT]` | Số điện thoại của từng thành viên |
| `[Giảng viên hướng dẫn]` | Tên giảng viên |
| `[Tên khách hàng]` | Tên chủ tiệm đóng vai khách hàng |

## Cấu trúc thư mục

Giữ đúng 4 phần như bộ mẫu:

```
00_BAO-CAO-TIEN-DO          Báo cáo tiến độ gửi giảng viên (.docx và .pdf)
00_HUONG-DAN-THUYET-TRINH   Hướng dẫn thuyết trình và bộ sơ đồ (.docx và .pdf)
1. PROJECT MANAGEMENT/
   1.1 PROJECT PLANNING/      Team Charter, Project Plan, Risk Management Plan,
                              Risk List, Milestone, Product Backlog,
                              Configuration Management Plan, Sprint 1/2/3 Plan
   1.2 PROJECT TRACKING/      Retrospective và Sprint Backlog Items
                              của Sprint 1, 2, 3
   1.3 MEETING/               Biên bản họp tuần 5
2. CONTEXT AND SYSTEM REQUIREMENT/
                              Function List, Traceability Matrix,
                              Concept of Operations, Business Rule
3. SOFTWARE ARCHITECTURE & DESIGN/
                              Architecture Driver, Architecture Design,
                              Database Analysis and Design, Class Diagram
4. TESTING/
   4.1 Test Plan
   4.3 TEST CASE/             Test case cho 3 chức năng đại diện
   4.4 TEST EXECUTE/          Kết quả chạy 2 lần (lần 1 có lỗi, lần 2 đạt)
   4.5 DEFECT REPORT/         Defect Report Sprint 1, 2, 3 (cộng dồn DF.01–DF.13)
   4.6 TEST REPORT/           Test Report Sprint 1, 2, 3
   4.7 USER ACCEPTANCE/       Biên bản nghiệm thu Sprint 1, 2, 3
```

Từ Sprint 2, Test Report dựng từ các bài test tự động trong `scripts/` (mỗi dòng
ghi bài test và lệnh chạy lại), không còn test case viết tay. Retrospective Sprint 3
và biên bản nghiệm thu Sprint 2, 3 để trống phần cả nhóm và khách hàng phải tự chốt.

## Vài điểm nên biết trước khi nộp

- **Ba chức năng được làm test chi tiết:**   **Tạo đơn thuê**,   **Thu tiền đơn thuê**,   **Thêm thiết bị**. Các tài liệu còn lại
  phủ toàn bộ hệ thống, giống cách bộ mẫu làm.
- **Nội dung bám mã nguồn thật.** Tên bảng và tên cột trong Database Design lấy
  đúng từ `server/database.ts`; quy tắc nghiệp vụ lấy từ code thật. Giảng viên
  hỏi "chỗ này code ở đâu" thì chỉ được ngay.
- **Defect là lỗi có thật.** DF.01 (bấm nút hai lần sinh hai bút toán) và DF.02
  (lỗi tải dữ liệu bị hiển thị nhầm thành "chưa có dữ liệu") là lỗi đã thực sự
  gặp và đã sửa trong dự án này. Từ DF.04 tới DF.13 cũng vậy, mỗi lỗi đều có bài
  test canh giữ để không tái phát.
- **Sinh lại được.** Toàn bộ bộ tài liệu sinh ra từ `scripts/sep/`. Muốn sửa nội
  dung thì sửa ở đó rồi chạy `npm run sep`, đừng sửa tay vào file Word/Excel vì
  lần chạy sau sẽ ghi đè.
- **Vai trò Scrum** (Scrum Master, Product Owner) do nhóm tự gán dựa trên vai trò
  kỹ thuật các bạn đã có. Muốn đổi thì sửa trong `scripts/sep/data.mjs`.

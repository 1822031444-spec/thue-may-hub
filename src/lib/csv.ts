/**
 * Xuất CSV để mở bằng Excel.
 *
 * Tách riêng khỏi trang vì hai chỗ dễ sai âm thầm: dấu phẩy trong tên nhà cung
 * cấp làm lệch cột, và tiếng Việt không có BOM thì Excel trên Windows đọc ra chữ
 * hỏng. Cả hai chỉ lộ ra khi mở file thật, nên phần này cần test riêng.
 */

/** Excel hiểu dấu phẩy là cột, nên mọi ô đều bọc ngoặc kép; nháy bên trong nhân đôi. */
function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/** Dựng nội dung CSV hoàn chỉnh, đã kèm BOM và xuống dòng kiểu Windows. */
export function buildCsv(header: string[], lines: string[][]) {
  const body = [header, ...lines].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return `﻿${body}`;
}

/**
 * Đẩy nội dung xuống máy người dùng thành một file.
 *
 * Hai chi tiết bắt buộc, thiếu cái nào cũng hỏng âm thầm trong cửa sổ Electron:
 * thẻ <a> phải nằm trong DOM lúc bấm, và blob chỉ được thu hồi sau khi trình
 * duyệt đã kịp đọc — revoke ngay sau click() là huỷ mất file đang tải.
 */
export function downloadCsv(name: string, header: string[], lines: string[][]) {
  const url = URL.createObjectURL(new Blob([buildCsv(header, lines)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

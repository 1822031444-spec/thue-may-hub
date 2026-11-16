/**
 * Bộ dựng bảng tính Excel cho bộ SEP.
 *
 * Định dạng bám mục 3.4 của Configuration Management Plan: Calibri cỡ 12, tiêu
 * đề Calibri cỡ 22 màu xanh dương, Heading 1 cỡ 14.
 */

import ExcelJS from 'exceljs';

const FONT = 'Calibri';
const TITLE_COLOR = 'FF1F4E79';
const HEADER_BG = 'FFD9E2F3';

export function newBook() {
  const book = new ExcelJS.Workbook();
  book.creator = 'Nhóm 11';
  book.created = new Date();
  return book;
}

/** Dòng tiêu đề lớn, gộp ô ngang theo số cột của bảng bên dưới. */
export function sheetTitle(sheet, text, span) {
  const row = sheet.addRow([text]);
  row.font = { name: FONT, size: 22, bold: true, color: { argb: TITLE_COLOR } };
  row.height = 30;
  if (span > 1) sheet.mergeCells(row.number, 1, row.number, span);
  return row;
}

export function subTitle(sheet, text, span) {
  const row = sheet.addRow([text]);
  row.font = { name: FONT, size: 14, bold: true };
  if (span > 1) sheet.mergeCells(row.number, 1, row.number, span);
  return row;
}

export function blank(sheet) {
  sheet.addRow([]);
}

/** Cặp nhãn – giá trị dùng cho khối "Thông tin chung". */
export function infoRows(sheet, pairs) {
  for (const [label, value] of pairs) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { name: FONT, size: 12, bold: true };
    row.getCell(2).font = { name: FONT, size: 12 };
  }
}

const THIN = { style: 'thin', color: { argb: 'FF999999' } };

function border(cell) {
  cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
}

/** Hàng tiêu đề bảng: in đậm, tô nền, cố định để cuộn vẫn thấy. */
export function headerRow(sheet, headers) {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { name: FONT, size: 12, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    border(cell);
  });
  row.height = 28;
  return row;
}

export function dataRow(sheet, values, opts = {}) {
  const row = sheet.addRow(values);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: FONT, size: 12, bold: opts.bold };
    cell.alignment = { vertical: 'top', wrapText: true };
    border(cell);
  });
  return row;
}

export function setWidths(sheet, widths) {
  widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
}

/** Danh sách chọn trong ô, dùng cho cột Kết quả Pass/Fail. */
export function dropdown(sheet, range, values) {
  sheet.dataValidations.add(range, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${values.join(',')}"`],
  });
}

/** Sheet phụ chứa các giá trị hợp lệ, giống bộ mẫu. */
export function lookupSheet(book) {
  const sheet = book.addWorksheet('Sheet2');
  headerRow(sheet, ['Priority', 'Status', 'Type']);
  dataRow(sheet, ['High', 'Not Executed', 'Positive']);
  dataRow(sheet, ['Medium', 'Passed', 'Negative']);
  dataRow(sheet, ['Low', 'Failed', 'Boundary']);
  setWidths(sheet, [14, 16, 14]);
  return sheet;
}

export async function save(book, path) {
  await book.xlsx.writeFile(path);
}

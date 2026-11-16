/**
 * Bộ dựng tài liệu Word cho bộ SEP.
 *
 * Định dạng bám đúng mục 3.3 của Configuration Management Plan: Times New Roman
 * cỡ 13, tiêu đề tài liệu cỡ 36, Heading 1 cỡ 16 màu xanh lá, Heading 2 cỡ 14,
 * bảng cỡ 12. Đặt ở một chỗ để 12 file Word không bị mỗi file một kiểu.
 */

import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, NumberFormat, Packer, PageBorderDisplay,
  PageBorderOffsetFrom, PageNumber, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableOfContents,
  TableRow, TextRun, WidthType,
} from 'docx';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const FONT = 'Times New Roman';
const GREEN = '2E7D32';
const HEADER_BG = 'D9E2F3';

/** docx tính cỡ chữ theo nửa point, nên mọi con số phải nhân đôi. */
const pt = (size) => size * 2;

export function title(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text, bold: true, size: pt(36), font: FONT })],
  });
}

export function subtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 2400 },
    children: [new TextRun({ text, size: pt(16), font: FONT, italics: true })],
  });
}

// keepNext: tiêu đề luôn đứng cùng trang với đoạn hoặc bảng ngay sau nó.
export function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: pt(16), font: FONT, color: GREEN })],
  });
}

export function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: pt(14), font: FONT })],
  });
}

export function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: pt(13), font: FONT, bold: opts.bold, italics: opts.italics })],
  });
}

export function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: pt(13), font: FONT })],
  });
}

export function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'sep-numbering', level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: pt(13), font: FONT })],
  });
}

function cell(text, { bold = false, bg = null, width = null, compact = false } = {}) {
  // Ô bảng có thể chứa nhiều dòng: tách theo \n thành nhiều đoạn cho dễ đọc.
  // Chữ trong ô cũng nhận `code` và **đậm** như đoạn văn (xem rich bên dưới).
  const lines = String(text ?? '').split('\n');
  return new TableCell({
    shading: bg ? { type: ShadingType.CLEAR, fill: bg, color: 'auto' } : undefined,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    margins: compact ? { top: 20, bottom: 20, left: 80, right: 80 } : { top: 60, bottom: 60, left: 100, right: 100 },
    children: lines.map((line) => new Paragraph({ children: rich(line, { size: compact ? 11 : 12, bold }) })),
  });
}

/**
 * Bảng có hàng tiêu đề tô nền; `widths` là phần trăm, tổng nên bằng 100.
 * `compact`: chữ 11pt, lề ô hẹp — cho bảng dài cần gói trong ít trang.
 */
export function table(headers, rows, widths = null, { compact = false } = {}) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border, bottom: border, left: border, right: border,
      insideHorizontal: border, insideVertical: border,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, { bold: true, bg: HEADER_BG, width: widths?.[i], compact })),
      }),
      ...rows.map((r) => new TableRow({
        children: r.map((c, i) => cell(c, { width: widths?.[i], compact })),
      })),
    ],
  });
}

/** Bảng "LỊCH SỬ CHỈNH SỬA" đứng đầu mọi tài liệu. */
export function revisionHistory(rows) {
  return [
    h1('LỊCH SỬ CHỈNH SỬA'),
    table(
      ['Phiên bản', 'Ngày', 'Người thực hiện', 'Ghi chú'],
      rows,
      [12, 18, 30, 40],
    ),
  ];
}

/** Bảng "Đối tượng đọc" lặp ở đầu mọi tài liệu. */
export function readersTable(readers) {
  return table(['Đối tượng đọc', 'Gợi ý đọc'], readers, [60, 40]);
}

export function spacer() {
  return new Paragraph({ children: [] });
}

/* ---- Đoạn có định dạng, hình ảnh ------------------------------------------ */

/**
 * Chữ có định dạng trong một dòng: `…` in Consolas như code, **…** in đậm.
 * Dùng cho tài liệu cần nhắc tên lệnh, tên file giữa câu.
 */
export function rich(text, { size = 13, bold = false, italics = false, color } = {}) {
  return String(text).split(/(`[^`]*`|\*\*[^*]*\*\*)/).filter(Boolean).map((part) => {
    if (part.startsWith('`')) {
      return new TextRun({ text: part.slice(1, -1), font: 'Consolas', size: pt(size - 1.5), bold, italics, color });
    }
    if (part.startsWith('**')) return new TextRun({ text: part.slice(2, -2), font: FONT, size: pt(size), bold: true, italics, color });
    return new TextRun({ text: part, font: FONT, size: pt(size), bold, italics, color });
  });
}

export const para = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: rich(text, opts) });
export const item = (text, opts = {}) => new Paragraph({ bullet: { level: opts.level ?? 0 }, spacing: { after: 70 }, children: rich(text, opts) });
export const caption = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60, after: 180 },
  children: rich(text, { size: 12, italics: true }),
});

/** Heading 1 bắt đầu trang mới. */
export function h1Page(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { after: 160 },
    children: [new TextRun({ text, bold: true, size: pt(16), font: FONT, color: GREEN })],
  });
}

/** Heading 2 bắt đầu trang mới — mỗi hình một trang. */
export function h2Page(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    pageBreakBefore: true,
    spacing: { after: 100 },
    children: [new TextRun({ text, bold: true, size: pt(14), font: FONT })],
  });
}

/**
 * Word bỏ trắng cả hình nếu SVG không phải XML hợp lệ, còn trình duyệt thì vẫn vẽ
 * bình thường — nên lỗi kiểu này chỉ lộ ra khi mở file Word. Lỗi hay gặp nhất là một
 * thẻ có thuộc tính lặp (fill="none" fill="none"); bắt ngay lúc sinh tài liệu.
 */
export function checkSvg(text, path) {
  for (const [tag] of text.matchAll(/<[a-zA-Z][^>]*>/g)) {
    const names = [...tag.matchAll(/\s([a-zA-Z:-]+)=/g)].map((m) => m[1]);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) throw new Error(`${path}: thuộc tính "${dup}" bị lặp trong thẻ ${tag.slice(0, 60)}… — Word sẽ không vẽ được hình này.`);
  }
}

const centered = (run) => new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [run] });

/**
 * Hình SVG nhúng dạng vector, kèm PNG làm ảnh dự phòng cho Word bản cũ. Kích thước
 * tính theo viewBox của SVG, thu nhỏ cho vừa khung `maxW × maxH` (px).
 */
export function svgFigure(svgPath, pngPath, maxW, maxH, { rasterOnly = false } = {}) {
  const svg = readFileSync(svgPath);
  checkSvg(svg.toString('utf8'), svgPath);
  const [, w, h] = svg.toString('utf8').match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  const s = Math.min(1, maxW / w, maxH / h);
  if (rasterOnly) {
    return centered(new ImageRun({
      type: 'png',
      data: readFileSync(pngPath),
      transformation: { width: Math.round(w * s), height: Math.round(h * s) },
    }));
  }
  return centered(new ImageRun({
    type: 'svg',
    data: svg,
    transformation: { width: Math.round(w * s), height: Math.round(h * s) },
    fallback: { type: 'png', data: readFileSync(pngPath) },
  }));
}

/** Ảnh PNG (ảnh chụp màn hình), thu nhỏ cho vừa khung. */
export function pngFigure(pngPath, maxW, maxH) {
  const data = readFileSync(pngPath);
  const w = data.readUInt32BE(16);
  const h = data.readUInt32BE(20);
  const s = Math.min(1, maxW / w, maxH / h);
  return centered(new ImageRun({ type: 'png', data, transformation: { width: Math.round(w * s), height: Math.round(h * s) } }));
}

/** Gói các phần tử thành một file .docx hoàn chỉnh. */
export async function writeDocx(path, children) {
  await writeDocxSections(path, [{ children }]);
}

/**
 * Mục lục kiểu field của Word, lấy Heading 1–2. docx chỉ ghi khung field; nội dung
 * và số trang do Word điền khi cập nhật field (to-pdf.ps1 cập nhật rồi lưu lại).
 */
export function toc(heading = 'MỤC LỤC') {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { after: 240 },
      children: [new TextRun({ text: heading, bold: true, size: pt(16), font: FONT, color: GREEN })],
    }),
    new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-2' }),
  ];
}

/** Chân trang có số trang ở giữa. */
const pageFooter = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: pt(11) })],
  })],
});

/** Viền đôi quanh trang, dùng cho trang bìa. */
const coverBorder = (() => {
  const side = { style: BorderStyle.THICK_THIN_MEDIUM_GAP, size: 24, color: '1F3864', space: 24 };
  return {
    pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE },
    pageBorderTop: side, pageBorderRight: side, pageBorderBottom: side, pageBorderLeft: side,
  };
})();

/**
 * Như writeDocx nhưng chia nhiều section, mỗi section có thể xoay ngang
 * (`landscape: true`) — dùng cho trang hình rộng như sơ đồ lớp. Section ngang
 * lề hẹp 1,27 cm (kiểu "Narrow" của Word) để hình được to nhất có thể.
 *
 * Tuỳ chọn thêm của từng section (báo cáo hoàn chỉnh dùng):
 *   footer: true          đánh số trang ở chân trang
 *   pageStart: n          bắt đầu đánh số lại từ n
 *   pageFormat: 'roman'   số La Mã thường (i, ii, …) cho phần mở đầu
 *   cover: true           viền đôi quanh trang (trang bìa)
 */
export async function writeDocxSections(path, sections) {
  const portrait = { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } };
  const landscape = {
    size: { orientation: PageOrientation.LANDSCAPE },
    margin: { top: 720, bottom: 720, left: 720, right: 720 },
  };
  const page = (s) => ({
    ...(s.landscape ? landscape : portrait),
    ...(s.pageStart || s.pageFormat ? {
      pageNumbers: {
        ...(s.pageStart ? { start: s.pageStart } : {}),
        formatType: s.pageFormat === 'roman' ? NumberFormat.LOWER_ROMAN : NumberFormat.DECIMAL,
      },
    } : {}),
    ...(s.cover ? { borders: coverBorder } : {}),
  });
  const doc = new Document({
    styles: {
      default: {
        // noProof: Word không chạy kiểm tra chính tả/ngữ pháp trên tài liệu này. Bản
        // Word không có bộ kiểm tra tiếng Việt thì gạch đỏ gần như mọi chữ, và lúc
        // xuất PDF ở chế độ mở để ghi, việc kiểm tra cả trăm trang làm Word treo rất lâu.
        document: { run: { font: FONT, size: pt(13), color: '000000', noProof: true } },
      },
    },
    numbering: {
      config: [{
        reference: 'sep-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
      }],
    },
    sections: sections.map((s) => ({
      properties: { page: page(s) },
      ...(s.footer ? { footers: { default: pageFooter() } } : {}),
      children: s.children,
    })),
  });
  await writeFile(path, await Packer.toBuffer(doc));
}

/**
 * Xuất PDF dự phòng khi Microsoft Word bị treo ở bước ExportAsFixedFormat.
 *
 * Script đọc chính nội dung Open XML trong DOCX (đoạn, tiêu đề, bảng, hình), dựng
 * HTML và in bằng Chrome headless. Vì đầu vào là DOCX vừa sinh nên PDF luôn có đủ
 * nội dung; không cần cài thêm package hay tải dữ liệu từ mạng.
 *
 * Chạy:
 *   node scripts/sep/docx-pdf-fallback.mjs file1.docx file2.docx
 */

import { copyFile, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { chromium } from '../../ThueMayHub-FE/node_modules/playwright/index.mjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const elements = (node, name = null) => [...(node?.childNodes ?? [])]
  .filter((n) => n.nodeType === 1 && (!name || n.nodeName === name));
const first = (node, name) => node?.getElementsByTagName(name)?.[0] ?? null;
const attr = (node, name) => node?.getAttribute(name) ?? '';

function relationshipMap(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return new Map([...doc.getElementsByTagName('Relationship')]
    .map((r) => [attr(r, 'Id'), attr(r, 'Target')]));
}

async function imageData(zip, rels, paragraph) {
  const out = [];
  for (const blip of [...paragraph.getElementsByTagName('a:blip')]) {
    const id = attr(blip, 'r:embed');
    const target = rels.get(id);
    if (!target) continue;
    const path = normalize(join('word', target)).replaceAll('\\', '/');
    const file = zip.file(path);
    if (!file) continue;
    const data = await file.async('base64');
    const ext = extname(path).toLowerCase();
    const mime = ext === '.svg' ? 'image/svg+xml'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : 'image/png';
    out.push(`<img src="data:${mime};base64,${data}" alt="Hình minh hoạ">`);
  }
  return out;
}

function renderRun(run) {
  const rPr = first(run, 'w:rPr');
  let html = '';
  for (const node of elements(run)) {
    if (node.nodeName === 'w:t') html += esc(node.textContent);
    else if (node.nodeName === 'w:tab') html += '&emsp;';
    else if (node.nodeName === 'w:br') html += '<br>';
  }
  if (!html) return '';
  const fonts = first(rPr, 'w:rFonts');
  const isCode = /Consolas/i.test(attr(fonts, 'w:ascii'));
  const isOn = (name) => {
    const node = first(rPr, name);
    if (!node) return false;
    return !/^(0|false|off|none)$/i.test(attr(node, 'w:val'));
  };
  if (isCode) html = `<code>${html}</code>`;
  if (isOn('w:i')) html = `<em>${html}</em>`;
  if (isOn('w:b')) html = `<strong>${html}</strong>`;
  return html;
}

function directRuns(paragraph) {
  const runs = [];
  const walk = (node) => {
    for (const child of elements(node)) {
      if (child.nodeName === 'w:r') runs.push(child);
      else if (child.nodeName === 'w:hyperlink' || child.nodeName === 'w:smartTag') walk(child);
    }
  };
  walk(paragraph);
  return runs;
}

async function renderParagraph(zip, rels, p) {
  const pPr = first(p, 'w:pPr');
  const style = attr(first(pPr, 'w:pStyle'), 'w:val');
  const align = attr(first(pPr, 'w:jc'), 'w:val');
  const pageBreak = Boolean(first(pPr, 'w:pageBreakBefore'));
  const numbered = Boolean(first(pPr, 'w:numPr'));
  const runs = directRuns(p);
  const text = runs.map(renderRun).join('');
  const images = await imageData(zip, rels, p);
  const size = Number(attr(first(first(runs[0], 'w:rPr'), 'w:sz'), 'w:val') || 0) / 2;
  const classes = [pageBreak ? 'page-break' : '', align === 'center' ? 'center' : ''].filter(Boolean).join(' ');
  let tag = 'p';
  if (/Heading1/i.test(style)) tag = 'h1';
  else if (/Heading2/i.test(style)) tag = 'h2';
  else if (size >= 30) tag = 'div';
  const titleClass = size >= 30 ? 'title' : size >= 15 && align === 'center' ? 'subtitle' : '';
  const bullet = numbered ? '<span class="bullet">•</span>' : '';
  const body = text || images.length ? `${bullet}${text}${images.length ? `<div class="figure">${images.join('')}</div>` : ''}` : '&nbsp;';
  return `<${tag} class="${classes} ${titleClass}">${body}</${tag}>`;
}

async function renderTable(zip, rels, tbl) {
  const rows = elements(tbl, 'w:tr');
  const rendered = [];
  for (let ri = 0; ri < rows.length; ri++) {
    const cells = elements(rows[ri], 'w:tc');
    const renderedCells = [];
    for (const tc of cells) {
      const blocks = [];
      for (const child of elements(tc)) {
        if (child.nodeName === 'w:p') blocks.push(await renderParagraph(zip, rels, child));
        else if (child.nodeName === 'w:tbl') blocks.push(await renderTable(zip, rels, child));
      }
      const span = Number(attr(first(first(tc, 'w:tcPr'), 'w:gridSpan'), 'w:val') || 1);
      const tag = ri === 0 ? 'th' : 'td';
      renderedCells.push(`<${tag}${span > 1 ? ` colspan="${span}"` : ''}>${blocks.join('')}</${tag}>`);
    }
    rendered.push(`<tr>${renderedCells.join('')}</tr>`);
  }
  const head = rendered[0] ?? '';
  const body = rendered.slice(1).join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

async function docxToHtml(docxPath) {
  const zip = await JSZip.loadAsync(await readFile(docxPath));
  const documentXml = await zip.file('word/document.xml').async('string');
  const relsXml = await zip.file('word/_rels/document.xml.rels').async('string');
  const rels = relationshipMap(relsXml);
  const doc = new DOMParser().parseFromString(documentXml, 'application/xml');
  const body = first(doc, 'w:body');
  const blocks = [];
  for (const child of elements(body)) {
    if (child.nodeName === 'w:p') blocks.push(await renderParagraph(zip, rels, child));
    else if (child.nodeName === 'w:tbl') blocks.push(await renderTable(zip, rels, child));
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 12mm 10mm 15mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font: 12.2pt/1.34 "Times New Roman", serif; }
    p { margin: 0 0 6pt; text-align: justify; orphans: 2; widows: 2; }
    h1 { margin: 14pt 0 7pt; color: #2e7d32; font-size: 16pt; line-height: 1.18; }
    h2 { margin: 10pt 0 5pt; color: #111; font-size: 14pt; line-height: 1.2; }
    .page-break { break-before: page; }
    .center { text-align: center; }
    .title { margin: 30mm 0 5mm; text-align: center; font-size: 30pt; font-weight: 700; line-height: 1.15; }
    .subtitle { margin: 0 0 22mm; text-align: center; font-size: 16pt; font-style: italic; }
    .bullet { display: inline-block; width: 5mm; font-weight: 700; }
    code { font: 10.5pt Consolas, monospace; overflow-wrap: anywhere; }
    table { width: 100%; margin: 4pt 0 10pt; border-collapse: collapse; table-layout: fixed; font-size: 8.4pt; line-height: 1.22; }
    th, td { border: .5pt solid #888; padding: 3.5pt 4pt; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #d9e2f3; text-align: left; font-weight: 700; }
    td p, th p { margin: 0 0 2pt; text-align: left; }
    thead { display: table-header-group; break-inside: avoid; break-after: avoid; }
    thead tr { break-after: avoid; }
    tr { break-inside: avoid; }
    .figure { margin: 5pt 0; text-align: center; }
    .figure img { max-width: 100%; max-height: 168mm; object-fit: contain; }
  </style></head><body>${blocks.join('\n')}</body></html>`;
}

async function exportPdf(browser, docxPath) {
  const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');
  const tmpHtml = join(dirname(docxPath), `.${basename(docxPath)}.${process.pid}.html`);
  const tmpPdf = join(dirname(docxPath), `.${basename(pdfPath)}.${process.pid}.tmp.pdf`);
  const html = await docxToHtml(docxPath);
  await writeFile(tmpHtml, html, 'utf8');
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: tmpPdf,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:8px;text-align:center;color:#666"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: '12mm', right: '10mm', bottom: '15mm', left: '10mm' },
    });
    await copyFile(tmpPdf, pdfPath);
    console.log(`  PDF  ${basename(pdfPath)}`);
  } finally {
    await page.close();
    await unlink(tmpHtml).catch(() => {});
    await unlink(tmpPdf).catch(() => {});
  }
}

const files = process.argv.slice(2);
if (!files.length) throw new Error('Cần truyền ít nhất một file DOCX.');
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  for (const file of files) await exportPdf(browser, file);
} finally {
  await browser.close();
}

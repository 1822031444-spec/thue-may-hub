/**
 * Sinh lại riêng hai báo cáo và bản PDF, không đụng các tài liệu SEP khác.
 *
 * Chạy: npm run sep:baocao
 *
 *   00_BAO-CAO-TIEN-DO.docx      báo cáo tiến độ (gen-baocao.mjs)
 *   00_BAO-CAO-HOAN-CHINH.docx   báo cáo hoàn chỉnh (gen-baocao-hoanchinh.mjs)
 *
 * Khác `npm run sep`: lệnh này không xoá rồi tạo lại cả thư mục SEP, nên file do
 * nhóm tự thêm vào thư mục đó vẫn còn nguyên.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT } from './data.mjs';
import { buildProgressReport } from './gen-baocao.mjs';
import { buildFinalReport } from './gen-baocao-hoanchinh.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(process.cwd(), `SEP_${PROJECT.code}_ThueMayHub`);

if (!existsSync(ROOT)) {
  console.error(`Chưa có ${ROOT}. Chạy "npm run sep" một lần để sinh bộ tài liệu trước.`);
  process.exit(1);
}

await buildProgressReport(ROOT);
console.log('  00_BAO-CAO-TIEN-DO.docx');
await buildFinalReport(ROOT);
console.log('  00_BAO-CAO-HOAN-CHINH.docx');

if (process.platform === 'win32' && !process.argv.includes('--no-pdf')) {
  const pdf = spawnSync('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'to-pdf.ps1'),
    join(ROOT, '00_BAO-CAO-TIEN-DO.docx'), join(ROOT, '00_BAO-CAO-HOAN-CHINH.docx'),
  ], { stdio: 'inherit' });
  if (pdf.status !== 0) console.log('   (chưa xuất được PDF — chạy lại bằng npm run sep:pdf)');
}

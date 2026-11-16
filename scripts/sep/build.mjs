/**
 * Sinh toàn bộ bộ tài liệu SEP của Nhóm 11.
 *
 * Chạy: npm run sep
 *
 * Mọi nội dung lấy từ data.mjs / domain.mjs / plan.mjs / tests.mjs nên các tài
 * liệu luôn khớp nhau. Sửa nội dung thì sửa ở đó rồi chạy lại, đừng sửa tay vào
 * file Word/Excel đã sinh vì lần chạy sau sẽ ghi đè.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT } from './data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(process.cwd(), `SEP_${PROJECT.code}_ThueMayHub`);

const DIRS = {
  planning: join(ROOT, '1. PROJECT MANAGEMENT', '1.1 PROJECT PLANNING'),
  tracking: join(ROOT, '1. PROJECT MANAGEMENT', '1.2 PROJECT TRACKING'),
  meeting: join(ROOT, '1. PROJECT MANAGEMENT', '1.3 MEETING'),
  req: join(ROOT, '2. CONTEXT AND SYSTEM REQUIREMENT'),
  arch: join(ROOT, '3. SOFTWARE ARCHITECTURE & DESIGN'),
  test: join(ROOT, '4. TESTING'),
  testCase: join(ROOT, '4. TESTING', '4.3 TEST CASE'),
  testExec: join(ROOT, '4. TESTING', '4.4 TEST EXECUTE'),
  defect: join(ROOT, '4. TESTING', '4.5 DEFECT REPORT'),
  testReport: join(ROOT, '4. TESTING', '4.6 TEST REPORT'),
  acceptance: join(ROOT, '4. TESTING', '4.7 USER ACCEPTANCE'),
};

async function main() {
  // Xoá rồi tạo lại để không còn sót file của lần sinh trước khi đổi tên tài liệu.
  if (existsSync(ROOT)) await rm(ROOT, { recursive: true, force: true });
  for (const dir of Object.values(DIRS)) await mkdir(dir, { recursive: true });

  let count = 0;
  const step = async (label, fn) => {
    const n = await fn();
    count += n;
    console.log(`  ${String(n).padStart(2)} file  ${label}`);
  };

  console.log(`\nSinh bo tai lieu SEP cho ${PROJECT.org}\n`);

  const { buildPlanning, buildTracking, buildMeeting } = await import('./gen-pm.mjs');
  const { buildRequirements } = await import('./gen-req.mjs');
  const { buildArchitecture } = await import('./gen-arch.mjs');
  const { buildTesting } = await import('./gen-test.mjs');

  await step('1.1 PROJECT PLANNING', () => buildPlanning(DIRS.planning));
  await step('1.2 PROJECT TRACKING', () => buildTracking(DIRS.tracking));
  await step('1.3 MEETING', () => buildMeeting(DIRS.meeting));
  await step('2. CONTEXT AND SYSTEM REQUIREMENT', () => buildRequirements(DIRS.req));
  await step('3. SOFTWARE ARCHITECTURE & DESIGN', () => buildArchitecture(DIRS.arch));
  const { buildClassDiagram } = await import('./gen-class.mjs');
  await step('3.4 CLASS DIAGRAM', () => buildClassDiagram(DIRS.arch));
  await step('4. TESTING', () => buildTesting(DIRS));
  const { buildSprints } = await import('./gen-sprints.mjs');
  await step('SPRINT 2 & 3 (plan, tracking, testing)', () => buildSprints(DIRS));

  // Hai file này đứng sau cùng: báo cáo tiến độ liệt kê các tài liệu đã sinh ở trên.
  const { buildProgressReport } = await import('./gen-baocao.mjs');
  const { buildFinalReport } = await import('./gen-baocao-hoanchinh.mjs');
  const { buildPresentationGuide } = await import('./gen-thuyettrinh.mjs');
  await step('00_BAO-CAO-TIEN-DO', () => buildProgressReport(ROOT));
  await step('00_BAO-CAO-HOAN-CHINH', () => buildFinalReport(ROOT));
  await step('00_HUONG-DAN-THUYET-TRINH', () => buildPresentationGuide(ROOT));

  const { writeReadme } = await import('./gen-readme.mjs');
  await writeReadme(ROOT);
  count += 1;
  console.log(`   1 file  00_GIOI_THIEU.md`);

  // Bản PDF xuất bằng Microsoft Word nên chỉ chạy được trên Windows có cài Word.
  if (process.platform === 'win32') {
    const pdf = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'to-pdf.ps1')], { stdio: 'inherit' });
    if (pdf.status === 0) count += 3;
    else console.log('   (chưa xuất được PDF — chạy lại bằng npm run sep:pdf)');
  }

  console.log(`\nXong: ${count} file trong ${ROOT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

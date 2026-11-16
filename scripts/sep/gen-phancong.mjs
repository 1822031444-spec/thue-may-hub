/**
 * Sinh bảng phân công: ai làm mảng nào, tổng điểm từng người, và danh sách việc
 * kèm file mã nguồn của từng người qua cả ba sprint.
 *
 * Lấy từ tasks.mjs — cùng nguồn với 5 file nhập Jira và tài liệu Sprint 1
 * Backlog Items — nên đổi người hay đổi trạng thái ở đó thì cả ba cùng đổi theo.
 *
 * Chạy: npm run sep:phancong
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOBS, PROJECT, SPRINTS, TEAM } from './data.mjs';
import { sprintNow, STORIES } from './progress.mjs';
import { TASKS } from './tasks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'SEP_Nhom11_ThueMayHub');

const TRANG_THAI = { Done: 'Xong', 'In Progress': 'Đang làm', 'To Do': 'Chưa làm' };
const tong = (list) => list.reduce((s, t) => s + t.points, 0);
const xong = (list) => list.filter((t) => t.status === 'Done');
const cuaNguoi = (m) => TASKS.filter((t) => t.who === m.alias);

/** Thứ tự nhập Jira: Product Owner trước vì file của họ chứa Product Backlog. */
const po = TEAM.find((m) => m.scrum === 'Product Owner');
const thuTu = [po, ...TEAM.filter((m) => m !== po)];
const tenFile = (m) => `${thuTu.indexOf(m) + 1}-${m.alias}.csv`;

const L = [];
L.push(`# Bảng phân công — ${PROJECT.org}`);
L.push('');
L.push(`**Dự án:** ${PROJECT.name}`);
L.push('');
L.push('Phú và Thành làm **Backend** (Phú kiêm **UX/UI**), Việt Anh làm **Frontend**, Phát làm');
L.push('**Database** và một phần Frontend, Vinh làm **Tester**. Mỗi người nắm trọn một khu vực');
L.push('chức năng; việc quản lý dự án (Retrospective, Backlog, nghiệm thu) rải cho người đang');
L.push('ít điểm hơn để tổng điểm mỗi người gần bằng nhau.');
L.push('');
L.push('Sinh từ `scripts/sep/tasks.mjs` — muốn đổi người, đổi trạng thái thì sửa ở đó');
L.push('rồi chạy lại `npm run sep:phancong` và `npm run sep:jira`, đừng sửa tay file này.');
L.push('');

/* Ai làm gì */
L.push('## Ai làm gì');
L.push('');
L.push('| Thành viên | MSSV | Mảng | Vai trò Scrum | Số việc | Điểm | Đã xong | File Jira |');
L.push('| --- | --- | --- | --- | ---: | ---: | ---: | --- |');
for (const m of TEAM) {
  const list = cuaNguoi(m);
  const pct = Math.round((tong(xong(list)) / tong(list)) * 100);
  L.push(`| ${m.name} | ${m.mssv} | **${m.role}** | ${m.scrum} | ${list.length} | ${tong(list)} | ${pct}% | \`jira/${tenFile(m)}\` |`);
}
L.push('');
L.push('| Mảng | Nội dung |');
L.push('| --- | --- |');
for (const key of ['BE', 'DB', 'UI', 'FE', 'QA', 'PM']) L.push(`| **${JOBS[key].name}** | ${JOBS[key].mo} |`);
L.push('');

/* Tiến độ theo sprint */
L.push('## Tiến độ theo sprint');
L.push('');
L.push('| Sprint | Thời gian | Story | Việc | Xong | Đang làm | Chưa làm | Điểm xong / tổng |');
L.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const n of [1, 2, 3]) {
  const sp = SPRINTS[n];
  const list = TASKS.filter((t) => sprintNow(t) === n);
  const dem = (s) => list.filter((t) => t.status === s).length;
  const soStory = STORIES.filter((s) => s.sprint === n).length;
  L.push(`| Sprint ${n} | ${sp.from} – ${sp.to} | ${soStory} | ${list.length} | ${dem('Done')} | ${dem('In Progress')} | ${dem('To Do')} | ${tong(xong(list))} / ${tong(list)} |`);
}
L.push('');
L.push('Việc chưa xong ở Sprint 1 đã chuyển sang Sprint 2 nên được tính ở Sprint 2.');
L.push('');

/* Chi tiết từng người */
L.push('## Việc của từng người');
L.push('');
for (const m of TEAM) {
  const list = cuaNguoi(m);
  const files = [...new Set(list.flatMap((t) => t.files))].sort();
  L.push(`### ${m.no}. ${m.name} — ${m.role}`);
  L.push('');
  L.push(`${list.length} việc · ${tong(list)} điểm · nhập file \`jira/${tenFile(m)}\`${m === po ? ' (nhập **đầu tiên**)' : ''}`);
  L.push('');
  if (files.length) {
    L.push(`**File mã nguồn (${files.length}):** ${files.map((f) => `\`${f}\``).join(', ')}`);
    L.push('');
  }
  L.push('| Mã | Sprint | Story | Việc | Điểm | Trạng thái |');
  L.push('| --- | :---: | --- | --- | ---: | --- |');
  for (const t of [...list].sort((a, b) => sprintNow(a) - sprintNow(b))) {
    const sprint = t.carry ? `${t.sprint} → ${t.carry}` : String(t.sprint);
    L.push(`| ${t.code} | ${sprint} | ${t.story} | [${JOBS[t.job].label}] ${t.title} | ${t.points} | ${TRANG_THAI[t.status]} |`);
  }
  L.push('');
}

mkdirSync(outDir, { recursive: true });
const target = join(outDir, '00_PHAN-CONG-THEO-CONG-DOAN.md');
writeFileSync(target, `${L.join('\n')}\n`, 'utf8');

console.log(`Đã tạo ${target}`);
for (const m of TEAM) {
  const list = cuaNguoi(m);
  console.log(`  ${m.name.padEnd(18)} ${m.role.padEnd(18)} ${String(list.length).padStart(2)} việc  ${String(tong(list)).padStart(3)} điểm  xong ${tong(xong(list))}`);
}

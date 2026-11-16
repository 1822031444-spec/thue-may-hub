/**
 * Sinh 5 file CSV nhập Jira, mỗi thành viên một file chứa đúng việc của mình.
 *
 * Mỗi người tự nhập file của mình, nên trên Jira ai tạo việc nào (Reporter) cũng
 * khớp với người làm. File của Product Owner còn chứa epic và user story (Product
 * Backlog), nên phải được nhập TRƯỚC — lần nhập đó cũng tạo ra Sprint 1/2/3 để
 * bốn file sau xếp việc vào.
 *
 * Việc được nhập dưới dạng Task độc lập chứ không phải Sub-task: Jira chỉ nối cha
 * con được trong cùng một lần nhập, mà story nằm ở file khác. Thay vào đó mỗi
 * việc mang nhãn mã story (US.06…) và tên story ngay trong tiêu đề, còn mô tả
 * của story liệt kê lại các việc của nó.
 *
 * Mỗi việc ghi người làm, file mã nguồn và endpoint. Trước khi ghi file, script
 * đối chiếu tasks.mjs với thư mục mã nguồn thật và dừng lại nếu có file chưa
 * thuộc việc nào.
 *
 * Chạy: npm run sep:jira
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES } from './domain.mjs';
import { JOBS, member, PROJECT, TEAM } from './data.mjs';
import { checkStoryCodes, rollup, sourceFiles as listSourceFiles, sprintNow, STORIES } from './progress.mjs';
import { TASKS } from './tasks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..', '..');
const outDir = join(projectRoot, 'SEP_Nhom11_ThueMayHub', 'jira');

/** Người nhập đầu tiên: Product Owner, vì file của họ chứa Product Backlog. */
const FIRST = TEAM.find((m) => m.scrum === 'Product Owner');
const ORDER = [FIRST, ...TEAM.filter((m) => m !== FIRST)];

/* ---- Đối chiếu với mã nguồn thật ---- */

const sourceFiles = listSourceFiles(projectRoot);

const declared = TASKS.flatMap((t) => t.files.map((f) => ({ task: t.code, path: f })));
const covers = (path) => declared.some((d) => (d.path.endsWith('/') ? path.startsWith(d.path) : path === d.path));

const problems = [
  ...checkStoryCodes(),
  ...TASKS.filter((t) => !member(t.who)).map((t) => `${t.code} ghi người làm "${t.who}" nhưng TEAM không có alias này`),
  ...sourceFiles.filter((f) => !covers(f)).map((f) => `${f} chưa thuộc việc nào trong tasks.mjs`),
  ...declared.filter((d) => !existsSync(join(projectRoot, d.path))).map((d) => `${d.task} trỏ vào ${d.path} nhưng file không tồn tại`),
];

if (problems.length) {
  console.error('\nDữ liệu chưa khớp với mã nguồn — sửa scripts/sep/tasks.mjs rồi chạy lại:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

/* ---- Dựng dòng CSV ---- */

/** Bọc một ô CSV: ô nào cũng trong ngoặc kép, ngoặc kép bên trong nhân đôi. */
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Jira đọc mô tả theo cú pháp wiki: `{ip}`, `{code}` bị hiểu thành macro và làm
 * hỏng cả đoạn. Đổi thành ngoặc kép thường cho an toàn.
 */
const plain = (text) => String(text).replace(/\{(\w+)\}/g, '"$1"');
const bullets = (items) => items.map((x) => `* ${plain(x)}`).join('\n');

/**
 * Cột dành cho project **team-managed**: cha con nối bằng `Issue ID` / `Parent ID`
 * (không có `Epic Link`). Các cột `Labels` trùng tên là cách Jira nhận nhiều nhãn.
 */
const COLUMNS = [
  'Issue ID', 'Issue Type', 'Summary', 'Description', 'Priority',
  'Story Points', 'Sprint', 'Assignee', 'Status', 'Parent ID', 'Labels', 'Labels', 'Labels',
];
const toLine = (r) => [
  r.id, r.type, r.summary, r.description, r.priority, r.points, r.sprint,
  r.assignee, r.status, r.parent, r.labels?.[0], r.labels?.[1], statusLabel(r.status),
].map(cell).join(',');

/**
 * Đường nhập CSV dành cho thành viên thường (Import work items from CSV) không
 * cho ghép cột Status — mọi việc vào Jira đều thành To Do. Nhãn này giữ lại
 * trạng thái thật để sau khi nhập lọc `labels = TT-Done` rồi chuyển hàng loạt.
 * Cột Status vẫn giữ cho trường hợp admin nhập bằng External System Import.
 */
function statusLabel(status) {
  if (status === 'Done') return 'TT-Done';
  if (status === 'In Progress') return 'TT-InProgress';
  return '';
}

const sprintName = (n) => `Sprint ${n}`;
const storyByCode = new Map(STORIES.map((s) => [s.code, s]));

/** Chỉ gán người khi đã có email thật; để trống thì gán lại trên Jira theo nhãn. */
const assigneeOf = (m) => (m.email && !m.email.startsWith('[') ? m.email : '');

function taskRow(t, id) {
  const who = member(t.who);
  const story = storyByCode.get(t.story);
  const lines = [`Người thực hiện: ${who.name} (${JOBS[t.job].name}).`];
  if (story) lines.push(`User story ${story.code}: ${story.story} — nhóm chức năng ${story.module}.`);
  else lines.push(`Việc chung của Sprint ${t.sprint}.`);
  if (t.carry) lines.push(`Chưa xong trong Sprint ${t.sprint} nên chuyển sang Sprint ${t.carry}.`);
  if (t.files.length) lines.push('', 'File mã nguồn:', bullets(t.files));
  if (t.api?.length) lines.push('', 'Endpoint:', bullets(t.api));

  return {
    id,
    type: 'Task',
    summary: `${t.code} [${JOBS[t.job].label}] ${story ? `${story.code} · ` : ''}${t.title}`,
    description: lines.join('\n'),
    priority: story?.priority || 'Medium',
    points: t.points,
    sprint: sprintName(sprintNow(t)),
    assignee: assigneeOf(who),
    status: t.status,
    labels: [who.alias, story ? story.code : 'QuanLyDuAn'],
  };
}

/** Epic và story: Product Backlog, chỉ nằm trong file của người nhập đầu tiên. */
function backlogRows(nextId) {
  const rows = [];
  const epicId = new Map();
  for (const mod of MODULES) {
    const id = nextId();
    epicId.set(mod.name, id);
    rows.push({
      id,
      type: 'Epic',
      summary: mod.name,
      description: [
        `Nhóm chức năng ${mod.name} của hệ thống ${PROJECT.shortName}. Người dùng: ${mod.actor}.`,
        '',
        'Chức năng (theo Function List):',
        bullets(mod.functions.map(([fid, , feature, , desc]) => `${fid} ${feature} — ${desc}`)),
      ].join('\n'),
      priority: 'Medium',
      status: rollup(STORIES.filter((s) => s.module === mod.name).map((s) => s.status)),
      labels: ['ThueMayHub'],
    });
  }
  for (const s of STORIES) rows.push(storyRow(s, nextId(), epicId.get(s.module) ?? ''));
  return rows;
}

function storyRow(s, id, parent) {
  const lines = [
    `Mã trong Product Backlog: ${s.code} · ${s.points} story point · nhóm chức năng ${s.module}.`,
    `Kế hoạch: Sprint ${s.planned}.${s.sprint !== s.planned ? ` Chuyển sang Sprint ${s.sprint} vì còn việc dở.` : ''}`,
    '',
    'Việc thực hiện (mỗi thành viên nhập việc của mình, lọc theo nhãn này để xem đủ):',
    bullets(s.tasks.map((t) => `${t.code} [${JOBS[t.job].label}] ${member(t.who).name} — ${t.title}`)),
  ];
  return {
    id,
    type: 'Story',
    summary: `${s.code} — ${s.story}`,
    description: lines.join('\n'),
    priority: s.priority,
    // Không ghi Story Points ở story: điểm đã nằm ở các việc con, ghi cả hai thì
    // tổng điểm sprint trên Jira bị nhân đôi.
    sprint: sprintName(s.sprint),
    status: s.status,
    parent,
    labels: ['ThueMayHub', s.code],
  };
}

/* ---- Ghi 5 file ---- */

// Xoá bản cũ để không còn file của người đã đổi tên hay bản gộp trước đây.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const summary = [];
ORDER.forEach((m, i) => {
  let seq = 1;
  const nextId = () => seq++;
  const mine = TASKS.filter((t) => t.who === m.alias).sort((a, b) => sprintNow(a) - sprintNow(b));
  const rows = [
    ...(m === FIRST ? backlogRows(nextId) : []),
    ...mine.map((t) => taskRow(t, nextId())),
  ];
  const name = `${i + 1}-${m.alias}.csv`;
  // BOM để Excel mở ra không hỏng tiếng Việt, Jira vẫn đọc bình thường.
  const csv = `\uFEFF${[COLUMNS.map(cell).join(','), ...rows.map(toLine)].join('\r\n')}`;
  writeFileSync(join(outDir, name), csv, 'utf8');
  summary.push({ name, m, rows: rows.length, tasks: mine });
});

/*
 * File bổ sung cho nhóm đã nhập 5 file trước đó: chỉ gồm việc thêm vào backlog sau
 * lần nhập đầu (`extra: true` trong tasks.mjs) và story của chúng. Nhập file này thay
 * vì nhập lại cả 5 file, để Jira không sinh việc trùng.
 */
const extraTasks = TASKS.filter((t) => t.extra);
if (extraTasks.length) {
  let seq = 1;
  const extraStories = STORIES.filter((s) => s.tasks.length && s.tasks.every((t) => t.extra));
  const rows = [
    ...extraStories.map((s) => storyRow(s, seq++, '')),
    ...extraTasks.map((t) => taskRow(t, seq++)),
  ];
  const csv = `﻿${[COLUMNS.map(cell).join(','), ...rows.map(toLine)].join('\r\n')}`;
  writeFileSync(join(outDir, '6-bo-sung-giao-dien-moi.csv'), csv, 'utf8');
  console.log(`Đã tạo 6-bo-sung-giao-dien-moi.csv: ${extraStories.length} story, ${extraTasks.length} việc mới — dành cho nhóm đã nhập 5 file trước.`);
}

console.log(`Đã tạo ${summary.length} file trong ${outDir}`);
console.log(`  Mã nguồn: ${sourceFiles.length} file, tất cả đã thuộc ít nhất một việc\n`);
for (const { name, m, rows, tasks } of summary) {
  const pts = tasks.reduce((s, t) => s + t.points, 0);
  const done = tasks.filter((t) => t.status === 'Done').reduce((s, t) => s + t.points, 0);
  const extra = m === FIRST ? `  (+ ${MODULES.length} epic, ${STORIES.length} story — nhập trước)` : '';
  console.log(`  ${name.padEnd(14)} ${m.name.padEnd(18)} ${String(tasks.length).padStart(2)} việc  ${String(pts).padStart(3)} điểm  xong ${String(done).padStart(3)}  ${rows} dòng${extra}`);
}
if (!TEAM.some((m) => assigneeOf(m))) {
  console.log('\n  Chưa có email thật trong data.mjs nên cột Assignee để trống — gán lại theo nhãn tên trên Jira.');
}

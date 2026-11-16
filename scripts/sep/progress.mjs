/**
 * Gộp việc lên user story và epic: story đang ở sprint nào, trạng thái gì.
 *
 * Tách riêng vì cả file nhập Jira lẫn bảng phân công cùng cần, tính hai nơi thì
 * sớm muộn Jira báo một đằng bảng phân công báo một nẻo.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PRODUCT_BACKLOG } from './plan.mjs';
import { SOURCE_EXCLUDE, SOURCE_FILES_AT_ROOT, SOURCE_ROOTS, TASKS } from './tasks.mjs';

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/** Danh sách file mã nguồn thật (đường dẫn kiểu a/b/c), dùng để đối chiếu với các việc. */
export function sourceFiles(projectRoot) {
  return [
    ...SOURCE_ROOTS.flatMap((root) => listFiles(join(projectRoot, root))),
    ...SOURCE_FILES_AT_ROOT.map((f) => join(projectRoot, f)),
  ]
    .map((f) => relative(projectRoot, f).split(sep).join('/'))
    .filter((f) => !SOURCE_EXCLUDE.some((ex) => f.startsWith(ex)));
}

/** Sprint hiện tại của việc: việc bị chuyển sprint thì tính theo sprint mới. */
export const sprintNow = (t) => t.carry ?? t.sprint;

/** Tất cả xong thì Done, đã có việc bắt đầu thì In Progress, còn lại To Do. */
export function rollup(statuses) {
  if (statuses.length === 0) return 'To Do';
  if (statuses.every((s) => s === 'Done')) return 'Done';
  if (statuses.some((s) => s !== 'To Do')) return 'In Progress';
  return 'To Do';
}

/**
 * Story kèm việc con. `sprint` là sprint hiện tại: Jira bắt sub-task nằm cùng
 * sprint với story cha, nên story có việc bị chuyển sang Sprint 2 thì cả story
 * cũng sang Sprint 2 — đúng như cách Jira xử lý story chưa xong khi đóng sprint.
 */
export const STORIES = PRODUCT_BACKLOG.map(([code, story, module, points, priority, sprintName]) => {
  const tasks = TASKS.filter((t) => t.story === code);
  const planned = Number(sprintName.replace('Sprint ', ''));
  return {
    code, story, module, points, priority, tasks, planned,
    sprint: Math.max(planned, ...tasks.map(sprintNow)),
    status: rollup(tasks.map((t) => t.status)),
  };
});

/** Lỗi dữ liệu: việc trỏ vào story không có trong Product Backlog. */
export function checkStoryCodes() {
  const known = new Set(PRODUCT_BACKLOG.map((r) => r[0]));
  return TASKS.filter((t) => t.story !== '-' && !known.has(t.story))
    .map((t) => `${t.code} trỏ vào ${t.story} nhưng Product Backlog không có story này`);
}

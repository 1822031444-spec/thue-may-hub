/**
 * Diễn tập phục hồi từ bản sao lưu.
 *
 * Bản sao chưa từng thử phục hồi thì chưa gọi là có bản sao. Script này dựng một
 * thư mục dữ liệu riêng từ file sao lưu rồi đếm lại từng bảng, để so với nguồn.
 * Không đụng vào database đang dùng.
 *
 *   node scripts/dien-tap-phuc-hoi.mjs <duong-dan-database-nguon>
 *
 * Xong sẽ in ra đường dẫn thư mục đã dựng, để chạy thử app trên đó.
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const source = process.argv[2];
if (!source || !existsSync(source)) {
  console.error('Thieu duong dan database nguon.');
  process.exit(1);
}

const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Đếm số dòng từng bảng, dùng để so nguồn với bản phục hồi. */
function snapshot(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout = 5000;');
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all();
  const counts = {};
  for (const t of tables) counts[t.name] = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n;
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  const fk = db.prepare('PRAGMA foreign_key_check').all().length;
  db.close();
  return { counts, integrity, fk };
}

const drill = join(tmpdir(), `dien-tap-phuc-hoi-${Date.now()}`);
const dataDir = join(drill, 'thuemay-data');
mkdirSync(dataDir, { recursive: true });
const backup = join(drill, 'ban-sao-luu.db');

console.log('--- Buoc 1: tao ban sao luu tu nguon (VACUUM INTO, giong het app lam)');
const src = new DatabaseSync(source);
src.exec('PRAGMA busy_timeout = 5000;');
src.exec(`VACUUM INTO '${backup.replace(/\\/g, '/')}'`);
const before = snapshot(source);
src.close();
console.log(`    nguon  : ${size(statSync(source).size)}`);
console.log(`    ban sao: ${size(statSync(backup).size)}`);

console.log('\n--- Buoc 2: phuc hoi — chep ban sao thanh thue-may.db trong thu muc moi');
const restored = join(dataDir, 'thue-may.db');
// Đúng như hướng dẫn: chỉ chép một file, không kèm -wal/-shm nào.
const { copyFileSync } = await import('node:fs');
copyFileSync(backup, restored);
console.log(`    da dat tai: ${restored}`);

console.log('\n--- Buoc 3: mo ban phuc hoi va dem lai tung bang');
const after = snapshot(restored);

console.log(`    toan ven      : ${after.integrity}`);
console.log(`    ban ghi mo coi: ${after.fk === 0 ? 'khong co' : `${after.fk} !`}`);

const names = Object.keys(before.counts);
const lech = names.filter((n) => before.counts[n] !== after.counts[n]);
const tongTruoc = names.reduce((s, n) => s + before.counts[n], 0);
const tongSau = names.reduce((s, n) => s + (after.counts[n] ?? 0), 0);

console.log(`    so bang       : ${names.length} -> ${Object.keys(after.counts).length}`);
console.log(`    tong so dong  : ${tongTruoc} -> ${tongSau}`);

if (lech.length === 0) {
  console.log('\n    Moi bang deu khop so dong.');
} else {
  console.log(`\n    LECH o ${lech.length} bang:`);
  for (const n of lech) console.log(`      ${n}: nguon ${before.counts[n]} vs phuc hoi ${after.counts[n]}`);
}

const ok = after.integrity === 'ok' && after.fk === 0 && lech.length === 0 && tongSau === tongTruoc;
console.log(`\n${ok ? 'Result: PASS — ban sao phuc hoi duoc, du lieu con nguyen' : 'Result: FAIL'}`);

console.log(`\nThu muc dien tap: ${drill}`);
console.log('Chep file portable vao day roi chay de thu app tren du lieu phuc hoi.');
console.log(`Xoa khi xong: Remove-Item -LiteralPath "${drill}" -Recurse -Force`);

if (process.env.KEEP !== '1') {
  rmSync(drill, { recursive: true, force: true });
  console.log('(da tu xoa; dat KEEP=1 neu muon giu lai de chay app)');
}

process.exit(ok ? 0 : 1);

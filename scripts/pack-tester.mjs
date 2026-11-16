/**
 * Đóng gói bản demo cho tester: chạy bằng double-click, máy tester không cần cài
 * Node, npm hay database.
 *
 *   npm run hub:pack   →   release/tester/ThueMayHub-Demo-Tester.zip
 *
 * Gói gồm:
 *   app/node.exe     đúng bản Node đang dùng để phát triển (node:sqlite cần Node 22.13+)
 *   app/server.cjs   toàn bộ server/ gộp thành một file, không cần node_modules
 *   app/seed.mjs     script tạo dữ liệu mẫu (server/seed-hub.ts) đã gộp
 *   app/web/         giao diện ThueMayHub-FE vừa build
 *   CHAY-DEMO.bat, LAM-MOI-DU-LIEU.bat, HUONG-DAN-TESTER.txt   (từ scripts/tester-kit/)
 *
 * Không mang theo thư mục data/ của dự án (trong đó có bản sao dữ liệu thật):
 * database mẫu được tạo mới ở lần chạy đầu trên máy tester.
 */

import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kit = join(root, 'scripts', 'tester-kit');
const outRoot = join(root, 'release', 'tester');
const NAME = 'ThueMayHub-Demo-Tester';
const out = join(outRoot, NAME);
const app = join(out, 'app');
const zip = join(outRoot, `${NAME}.zip`);

function run(command, cwd) {
  const result = spawnSync(command, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`[pack] Lệnh thất bại: ${command}`);
    process.exit(result.status ?? 1);
  }
}

if (process.platform !== 'win32') {
  console.error('[pack] Gói tester dùng node.exe và file .bat nên phải đóng gói trên Windows.');
  process.exit(1);
}
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`[pack] Cần Node 22.13 trở lên (node:sqlite không cần cờ), đang dùng ${process.version}.`);
  process.exit(1);
}

console.log('[pack] Build giao diện ThueMayHub-FE…');
run('npm run build', join(root, 'ThueMayHub-FE'));
const web = join(root, 'ThueMayHub-FE', '.output', 'public');
if (!existsSync(join(web, 'index.html'))) {
  console.error(`[pack] Không thấy ${join(web, 'index.html')} sau khi build.`);
  process.exit(1);
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(app, { recursive: true });

console.log('[pack] Gộp server và script dữ liệu mẫu…');
const shared = { bundle: true, platform: 'node', target: 'node22', logLevel: 'warning', legalComments: 'none' };
await build({
  ...shared,
  entryPoints: [join(root, 'server', 'index.ts')],
  outfile: join(app, 'server.cjs'),
  format: 'cjs',
});
await build({
  ...shared,
  entryPoints: [join(root, 'server', 'seed-hub.ts')],
  outfile: join(app, 'seed.mjs'),
  // seed-hub.ts dùng await ở cấp cao nhất nên phải là ESM; thư viện CommonJS bên
  // trong gọi require() nên cấp sẵn một require cho file ESM.
  format: 'esm',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});

cpSync(web, join(app, 'web'), { recursive: true });
copyFileSync(process.execPath, join(app, 'node.exe'));
// cmd.exe đọc sai nhãn `goto` trong file .bat chỉ xuống dòng bằng LF, nên đổi sang CRLF.
// File .txt thêm BOM để Notepad bản cũ cũng hiện đúng tiếng Việt.
for (const file of readdirSync(kit)) {
  const text = readFileSync(join(kit, file), 'utf8').replace(/\r?\n/g, '\r\n');
  writeFileSync(join(out, file), file.endsWith('.txt') ? `﻿${text}` : text);
}

console.log('[pack] Nén thành zip…');
// tar.exe có sẵn từ Windows 10 1803, ghi zip chuẩn mà Explorer giải nén được.
run(`"%SystemRoot%\\System32\\tar.exe" -a -c -f "${zip}" -C "${outRoot}" "${NAME}"`, root);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
console.log(`\n[pack] Xong: ${zip} (${mb(statSync(zip).size)})`);
console.log(`[pack] Thư mục chưa nén để thử: ${out}`);

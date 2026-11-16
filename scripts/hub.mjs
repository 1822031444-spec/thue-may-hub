/**
 * Chạy bản Thuê Máy Hub hoàn chỉnh: backend `server/` + giao diện `ThueMayHub-FE/`.
 *
 *   npm run hub         phát triển — API ở cổng 8789, giao diện ở http://localhost:5274,
 *                       sửa code bên nào thì bên đó tự tải lại
 *   npm run hub:start   chạy thật — build giao diện (nếu chưa) rồi một cổng 8789 phục vụ
 *                       cả API lẫn giao diện: http://localhost:8789
 *
 * Dùng database riêng `data/hub-demo.db`, tự tạo dữ liệu mẫu ở lần chạy đầu. Cổng
 * 8789 và 5274 khác bản thử (8788/5273) và bản chính (8787/5173) để chạy song song được.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fe = join(root, 'ThueMayHub-FE');
const mode = process.argv[2] === 'start' ? 'start' : 'dev';

const API_PORT = process.env.HUB_PORT || '8789';
const DATABASE_PATH = process.env.DATABASE_PATH || join(root, 'data', 'hub-demo.db');
const env = { ...process.env, PORT: API_PORT, DATABASE_PATH };

function run(command, cwd, extraEnv = {}) {
  const result = spawnSync(command, { cwd, stdio: 'inherit', shell: true, env: { ...env, ...extraEnv } });
  if (result.status !== 0) {
    console.error(`\n[hub] Lệnh thất bại: ${command}`);
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(fe, 'node_modules'))) {
  console.log('[hub] Cài thư viện cho giao diện lần đầu…');
  run('npm install', fe);
}

// Lần đầu thì tạo dữ liệu mẫu; database đã có dữ liệu thì script tự bỏ qua.
run('npx tsx server/seed-hub.ts', root);

if (mode === 'start') {
  const staticDir = join(fe, '.output', 'public');
  if (!existsSync(join(staticDir, 'index.html'))) {
    console.log('[hub] Build giao diện…');
    run('npm run build', fe);
  }
  console.log(`[hub] Mở http://localhost:${API_PORT}`);
  const server = spawn('npx tsx server/index.ts', {
    cwd: root, stdio: 'inherit', shell: true, env: { ...env, STATIC_DIR: staticDir },
  });
  server.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.log('[hub] Mở http://localhost:5274 sau khi hai tiến trình đã sẵn sàng.');
  const { result } = concurrently([
    { command: 'npx tsx watch server/index.ts', name: 'API', prefixColor: 'cyan', cwd: root, env },
    { command: 'npm run dev', name: 'HUB', prefixColor: 'magenta', cwd: fe, env: { HUB_API: `http://127.0.0.1:${API_PORT}` } },
  ], { killOthersOn: ['failure', 'success'] });
  result.catch(() => process.exit(1));
}

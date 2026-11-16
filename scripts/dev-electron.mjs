/**
 * Mở cửa sổ Electron trỏ vào vite dev server.
 *
 * Ở chế độ này server API do `tsx watch` chạy riêng (cổng 8788) và vite proxy
 * `/api` sang đó, nên tiến trình chính không tự khởi động server nữa. Nhờ vậy
 * sửa code giao diện là thấy ngay trong cửa sổ app, không phải build lại.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5273';

async function waitFor(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Không kết nối được ${url} sau ${timeoutMs / 1000} giây.`);
}

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'warning',
};

await Promise.all([
  build({ ...shared, entryPoints: ['electron/main.ts'], outfile: 'build/electron/main.cjs' }),
  build({ ...shared, entryPoints: ['electron/preload.ts'], outfile: 'build/electron/preload.cjs' }),
]);

console.log('[desktop] chờ vite dev server…');
await waitFor(DEV_URL);
console.log('[desktop] mở cửa sổ Electron');

const child = spawn(require('electron'), ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: DEV_URL },
});

child.on('close', (code) => process.exit(code ?? 0));

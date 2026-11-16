/**
 * Gộp mã TypeScript của tầng desktop thành CommonJS cho Electron chạy.
 *
 * Ba đích riêng biệt:
 *   main.cjs     — tiến trình chính, `electron` là API sẵn có nên để external.
 *   preload.cjs  — cầu nối contextBridge, cũng cần `electron` external.
 *   server.cjs   — toàn bộ server Express + SQLite gói thành một file, để bản
 *                  đóng gói không phải mang theo node_modules.
 */
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

const OUT_DIR = 'build/electron';

rmSync(OUT_DIR, { recursive: true, force: true });

const shared = {
  bundle: true,
  platform: 'node',
  // Khớp với Node 22 mà Electron 37 mang theo.
  target: 'node22',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info',
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ['electron/main.ts'],
    outfile: `${OUT_DIR}/main.cjs`,
    external: ['electron'],
  }),
  build({
    ...shared,
    entryPoints: ['electron/preload.ts'],
    outfile: `${OUT_DIR}/preload.cjs`,
    external: ['electron'],
  }),
  build({
    ...shared,
    entryPoints: ['server/index.ts'],
    outfile: `${OUT_DIR}/server.cjs`,
    // node:sqlite và các module lõi khác tự động external với platform node.
    minify: true,
  }),
]);

console.log('[electron] đã build main.cjs, preload.cjs và server.cjs');

/** Tạo lại PNG 2x từ bảy SVG Class Diagram hiện tại. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '../../ThueMayHub-FE/node_modules/playwright/index.mjs';

const dir = join(process.cwd(), 'design', 'class-diagram');
const names = [
  '0-tong-quan',
  '1-tai-khoan-phan-quyen',
  '2-khach-hang',
  '3-thiet-bi-sua-chua',
  '4-don-thue-tai-chinh',
  '5-yeu-cau-ho-tro',
  '6-van-hanh-he-thong',
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const name of names) {
    const svg = readFileSync(join(dir, `${name}.svg`), 'utf8');
    const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    if (!match) throw new Error(`${name}.svg không có viewBox hợp lệ`);
    const [, width, height] = match.map(Number);
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2,
    });
    try {
      await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`);
      if (await page.locator('parsererror').count()) throw new Error(`${name}.svg bị lỗi XML khi trình duyệt đọc`);
      await page.screenshot({
        path: join(dir, 'png', `${name}.png`),
        clip: { x: 0, y: 0, width, height },
      });
      console.log(`${name}: ${width}×${height} CSS px, PNG 2x`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

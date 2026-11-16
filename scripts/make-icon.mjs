/**
 * Sinh build/icon.ico cho electron-builder.
 *
 * Windows cần .ico thật, không nhận SVG, và dự án không có sẵn thư viện xử lý
 * ảnh nào. Biểu tượng ở đây được vẽ thẳng ra pixel rồi đóng gói PNG vào vỏ ICO,
 * nên không phải thêm phụ thuộc chỉ để tạo một file.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SIZE = 256;

/* ---- Hình học ------------------------------------------------------------ */

/** Khoảng cách có dấu tới hình chữ nhật bo góc; âm là nằm trong hình. */
function roundedRectDistance(x, y, left, top, right, bottom, radius) {
  const halfWidth = (right - left) / 2;
  const halfHeight = (bottom - top) / 2;
  const dx = Math.abs(x - (left + halfWidth)) - (halfWidth - radius);
  const dy = Math.abs(y - (top + halfHeight)) - (halfHeight - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Lấy mẫu 3×3 trong mỗi pixel để cạnh bo không bị răng cưa. */
function coverage(px, py, shape) {
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const x = px + (sx + 0.5) / 3;
      const y = py + (sy + 0.5) / 3;
      if (shape(x, y) <= 0) hits++;
    }
  }
  return hits / 9;
}

function blend(target, offset, r, g, b, alpha) {
  if (alpha <= 0) return;
  const inverse = 1 - alpha;
  target[offset] = Math.round(target[offset] * inverse + r * alpha);
  target[offset + 1] = Math.round(target[offset + 1] * inverse + g * alpha);
  target[offset + 2] = Math.round(target[offset + 2] * inverse + b * alpha);
  target[offset + 3] = Math.round(target[offset + 3] * inverse + 255 * alpha);
}

/* ---- Vẽ ------------------------------------------------------------------ */

function drawIcon() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4, 0);

  const badge = (x, y) => roundedRectDistance(x, y, 8, 8, SIZE - 8, SIZE - 8, 54);
  const monitor = (x, y) => roundedRectDistance(x, y, 58, 68, SIZE - 58, 164, 14);
  const screen = (x, y) => roundedRectDistance(x, y, 74, 84, SIZE - 74, 148, 6);
  const stand = (x, y) => roundedRectDistance(x, y, 116, 164, 140, 186, 3);
  const base = (x, y) => roundedRectDistance(x, y, 88, 186, 168, 200, 7);

  for (let y = 0; y < SIZE; y++) {
    // Nền chuyển màu dọc, cùng cặp màu với brand-mark trong giao diện.
    const t = y / (SIZE - 1);
    const bgR = Math.round(79 + (39 - 79) * t);
    const bgG = Math.round(116 + (69 - 116) * t);
    const bgB = Math.round(255 + (207 - 255) * t);

    for (let x = 0; x < SIZE; x++) {
      const offset = (y * SIZE + x) * 4;

      blend(pixels, offset, bgR, bgG, bgB, coverage(x, y, badge));
      blend(pixels, offset, 255, 255, 255, coverage(x, y, monitor));
      // Lòng màn hình lấy lại màu nền để tạo viền trắng dày, đọc được ở cỡ 16px.
      blend(pixels, offset, bgR, bgG, bgB, coverage(x, y, screen));
      blend(pixels, offset, 255, 255, 255, coverage(x, y, stand));
      blend(pixels, offset, 255, 255, 255, coverage(x, y, base));
    }
  }

  return pixels;
}

/* ---- Đóng gói PNG -------------------------------------------------------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8;   // 8 bit mỗi kênh
  header[9] = 6;   // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // Mỗi dòng quét cần một byte filter đứng trước; dùng filter 0 (none).
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (SIZE * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIco(png) {
  const directory = Buffer.alloc(22);
  directory.writeUInt16LE(0, 0);      // reserved
  directory.writeUInt16LE(1, 2);      // 1 = icon
  directory.writeUInt16LE(1, 4);      // số ảnh
  directory[6] = 0;                   // 0 nghĩa là 256 px
  directory[7] = 0;
  directory[8] = 0;                   // bảng màu: không dùng
  directory[9] = 0;                   // reserved
  directory.writeUInt16LE(1, 10);     // planes
  directory.writeUInt16LE(32, 12);    // bit mỗi pixel
  directory.writeUInt32LE(png.length, 14);
  directory.writeUInt32LE(directory.length, 18);
  return Buffer.concat([directory, png]);
}

/* ---- Ghi file ------------------------------------------------------------ */

const png = encodePng(drawIcon());
const targets = [
  { path: resolve('build/icon.ico'), data: encodeIco(png) },
  { path: resolve('public/icon-256.png'), data: png },
];

for (const target of targets) {
  mkdirSync(dirname(target.path), { recursive: true });
  writeFileSync(target.path, target.data);
  console.log(`[icon] ${target.path} (${(target.data.length / 1024).toFixed(1)} KB)`);
}

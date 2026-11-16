/**
 * Bộ vẽ SVG cho các sơ đồ UML (use case, tuần tự, trạng thái, hoạt động, triển khai).
 *
 * Cùng màu, cùng font với 7 hình sơ đồ lớp trong design/class-diagram để cả bộ hình
 * nhìn như một. Chữ đè lên đường kẻ có viền trắng vẽ thành lớp riêng phía sau, vì
 * Word không hiểu thuộc tính paint-order.
 */

export const C = {
  ink: '#0f1726',
  line: '#3b4557',
  muted: '#4b5568',
  soft: '#8a93a6',
  tint: '#7350cf',
  panel: '#f7f9fc',
  note: '#fdf4e3',
  noteLine: '#d9b979',
  noteInk: '#3d3423',
  good: '#2e7d32',
  bad: '#b3261e',
};
export const SANS = "'Segoe UI', Arial, sans-serif";
export const MONO = "Consolas, 'Courier New', monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (v) => Math.round(v * 10) / 10;
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`;

/* ---- Chữ ------------------------------------------------------------------ */

/** Ước lượng bề rộng chữ (px); đủ để ngắt dòng, không cần đo thật. */
export function textWidth(str, size = 12, { mono = false, bold = false } = {}) {
  return String(str).length * size * (mono ? 0.55 : bold ? 0.58 : 0.54);
}

/** Ngắt dòng theo bề rộng; `\n` trong chuỗi là xuống dòng bắt buộc. */
export function wrap(str, maxWidth, size = 12, opts) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(next, size, opts) > maxWidth) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/**
 * Như wrap, nhưng nếu cần hai dòng thì chọn chỗ ngắt cho hai dòng dài gần bằng nhau,
 * ưu tiên ngắt sau dấu phẩy, hai chấm, chấm phẩy — tránh kiểu "…theo / kỳ".
 */
export function balanced(str, maxWidth, size = 12, opts) {
  const s = String(str);
  if (s.includes('\n')) return wrap(s, maxWidth, size, opts);
  if (textWidth(s, size, opts) <= maxWidth) return [s];
  const words = s.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const w = Math.max(textWidth(a, size, opts), textWidth(b, size, opts));
    const score = w - (/[,;:]$/.test(a) ? 14 : 0);
    if (w <= maxWidth && (!best || score < best.score)) best = { score, lines: [a, b] };
  }
  return best ? best.lines : wrap(s, maxWidth, size, opts);
}

export function text(x, y, str, { size = 12, anchor = 'start', fill = C.ink, font = SANS, weight, italic, halo = false } = {}) {
  const attrs = `x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-family="${font}" font-size="${size}"`
    + `${weight ? ` font-weight="${weight}"` : ''}${italic ? ' font-style="italic"' : ''}`;
  const body = esc(str);
  const under = halo ? `<text ${attrs} fill="#ffffff" stroke="#ffffff" stroke-width="4" stroke-linejoin="round">${body}</text>` : '';
  return `${under}<text ${attrs} fill="${fill}">${body}</text>`;
}

/** Nhiều dòng chữ, căn giữa theo chiều dọc quanh `cy`. */
export function textBlock(x, cy, lines, opts = {}) {
  const size = opts.size ?? 12;
  const lh = opts.lineHeight ?? size * 1.28;
  const top = cy - ((lines.length - 1) * lh) / 2 + size * 0.36;
  return lines.map((l, i) => text(x, top + i * lh, l, opts)).join('');
}

/* ---- Hình cơ bản ------------------------------------------------------------ */

export function rect(x, y, w, h, { rx = 3, fill = '#ffffff', opacity, stroke = C.line, sw = 1, dash } = {}) {
  return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx}" fill="${fill}"`
    + `${opacity != null ? ` fill-opacity="${opacity}"` : ''} stroke="${stroke}" stroke-width="${sw}"`
    + `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

export function path(points, { stroke = C.line, sw = 1.25, dash } = {}) {
  return `<path d="M${points.map(pt).join(' L')}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

export function circle(x, y, r, { fill = '#ffffff', stroke = C.line, sw = 1.25 } = {}) {
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

/** Đầu mũi tên tại `to`, hướng theo đoạn from→to. Trả về [svg, độ lùi của thân]. */
function arrowHead(kind, from, to, color) {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const at = (back, side) => [to[0] - back * Math.cos(a) + side * Math.sin(a), to[1] - back * Math.sin(a) - side * Math.cos(a)];
  if (kind === 'open') {
    return [`<path d="M${pt(at(11, 5.5))} L${pt(to)} L${pt(at(11, -5.5))}" fill="none" stroke="${color}" stroke-width="1.25"/>`, 0];
  }
  if (kind === 'filled') {
    return [`<polygon points="${pt(to)} ${pt(at(11, 5))} ${pt(at(11, -5))}" fill="${color}" stroke="${color}" stroke-width="1"/>`, 9];
  }
  if (kind === 'triangle') {
    return [`<polygon points="${pt(to)} ${pt(at(14, 8))} ${pt(at(14, -8))}" fill="#ffffff" stroke="${color}" stroke-width="1.25"/>`, 14];
  }
  return ['', 0];
}

/** Điểm nằm ở tỉ lệ `t` (0..1) theo chiều dài một đường gấp khúc. */
export function along(points, t) {
  const segs = points.slice(1).map((p, i) => [points[i], p, Math.hypot(p[0] - points[i][0], p[1] - points[i][1])]);
  let left = segs.reduce((s, x) => s + x[2], 0) * t;
  for (const [a, b, len] of segs) {
    if (left <= len) return [a[0] + ((b[0] - a[0]) * left) / len, a[1] + ((b[1] - a[1]) * left) / len];
    left -= len;
  }
  return points[points.length - 1];
}

/**
 * Đường nối có mũi tên ở cuối. `label` đặt tại tỉ lệ `at` của đường, lệch `dx/dy`;
 * nhãn có viền trắng nên đè lên đường kẻ vẫn đọc được.
 */
export function arrow(points, {
  head = 'open', dash, stroke = C.line, sw = 1.25,
  label, at = 0.5, dx = 0, dy = -6, anchor = 'middle', size = 11, fill = C.muted, font = SANS, italic,
} = {}) {
  const pts = points.map((p) => [...p]);
  const n = pts.length;
  const [headSvg, back] = arrowHead(head, pts[n - 2], pts[n - 1], stroke);
  if (back) {
    const [a, b] = [pts[n - 2], pts[n - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    pts[n - 1] = [b[0] - ((b[0] - a[0]) * back) / len, b[1] - ((b[1] - a[1]) * back) / len];
  }
  let out = path(pts, { stroke, sw, dash }) + headSvg;
  if (label) {
    const [lx, ly] = along(points, at);
    const lines = String(label).split('\n');
    out += lines.map((l, i) => text(lx + dx, ly + dy + (i - lines.length + 1) * (size + 3), l, { size, anchor, fill, font, italic, halo: true })).join('');
  }
  return out;
}

/** Giao điểm của tia từ tâm hình elip tới (tx, ty) với viền elip. */
export function onEllipse(e, tx, ty) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const t = 1 / Math.sqrt((dx / e.rx) ** 2 + (dy / e.ry) ** 2);
  return [e.x + dx * t, e.y + dy * t];
}

/** Giao điểm của tia từ tâm hình chữ nhật {x,y,w,h} tới (tx, ty) với viền. */
export function onRect(b, tx, ty) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const t = Math.min(Math.abs(b.w / 2 / (dx || 1e-9)), Math.abs(b.h / 2 / (dy || 1e-9)));
  return [cx + dx * t, cy + dy * t];
}

/* ---- Use case --------------------------------------------------------------- */

/** Use case: {x, y, rx, ry, label}. */
export function useCase(u) {
  const size = u.size ?? 12.5;
  const lines = balanced(u.label, u.rx * 1.7, size);
  return `<ellipse cx="${r1(u.x)}" cy="${r1(u.y)}" rx="${u.rx}" ry="${u.ry}" fill="${C.tint}" fill-opacity="0.09" stroke="${C.line}" stroke-width="1.1"/>`
    + textBlock(u.x, u.y, lines, { size, anchor: 'middle' });
}

/** Tác nhân hình người: {x, top, name}. Cao 68, tên in bên dưới. */
export function actor(a) {
  const { x, top } = a;
  const s = { stroke: C.line, sw: 1.5 };
  const lines = wrap(a.name, 120, 12.5, { bold: true });
  return circle(x, top + 10, 10, { sw: 1.5 })
    + path([[x, top + 20], [x, top + 46]], s)
    + path([[x - 18, top + 30], [x + 18, top + 30]], s)
    + path([[x - 14, top + 68], [x, top + 46], [x + 14, top + 68]], s)
    + lines.map((l, i) => text(x, top + 86 + i * 15, l, { size: 12.5, anchor: 'middle', weight: 600 })).join('');
}
/** Điểm nối đường kết hợp ở bên trái/phải thân tác nhân. */
export const actorSide = (a, side) => [a.x + (side === 'left' ? -22 : 22), a.top + 34];

/** Tác nhân không phải người (bộ hẹn giờ, dịch vụ ngoài): hộp ghi «actor». */
export function systemActor(b) {
  return rect(b.x, b.y, b.w, b.h, { fill: C.panel, rx: 4 })
    + text(b.x + b.w / 2, b.y + 17, '«actor»', { size: 10.5, anchor: 'middle', fill: C.muted, font: MONO })
    + text(b.x + b.w / 2, b.y + 34, b.name, { size: 12.5, anchor: 'middle', weight: 600 });
}

/** Khung hệ thống của sơ đồ use case. */
export function boundary(x, y, w, h, title) {
  return rect(x, y, w, h, { fill: '#fbfcfe', rx: 6, sw: 1.25 })
    + text(x + 14, y + 22, title, { size: 13.5, weight: 700 });
}

/** Ghi chú góc gấp, nền vàng như sơ đồ lớp. */
export function note(x, y, w, lines, { size = 11.5 } = {}) {
  const lh = size * 1.32;
  const h = lines.length * lh + 14;
  return `<path d="M${x} ${y} H${x + w - 10} L${x + w} ${y + 10} V${y + h} H${x} Z" fill="${C.note}" stroke="${C.noteLine}" stroke-width="1"/>`
    + `<path d="M${x + w - 10} ${y} V${y + 10} H${x + w}" fill="none" stroke="${C.noteLine}" stroke-width="1"/>`
    + lines.map((l, i) => text(x + 10, y + 7 + size + i * lh, l, { size, fill: C.noteInk })).join('');
}
export const noteHeight = (count, size = 11.5) => count * size * 1.32 + 14;

/* ---- Trạng thái và hoạt động ------------------------------------------------ */

/** Trạng thái hoặc hành động: hộp bo tròn, chữ căn giữa. */
export function roundBox(b, label, { size = 12.5, fill = '#ffffff', sub, rx = 12, bold = false } = {}) {
  const lines = balanced(label, b.w - 18, size, { bold });
  const subLines = sub ? wrap(sub, b.w - 16, 11) : [];
  const total = lines.length * size * 1.28 + (subLines.length ? subLines.length * 14 + 6 : 0);
  const top = b.y + (b.h - total) / 2;
  let out = rect(b.x, b.y, b.w, b.h, { rx, fill, sw: 1.2 });
  out += textBlock(b.x + b.w / 2, top + (lines.length * size * 1.28) / 2, lines, { size, anchor: 'middle', weight: bold ? 600 : undefined });
  if (subLines.length) {
    const sy = top + lines.length * size * 1.28 + 6;
    out += `<line x1="${b.x}" y1="${r1(sy - 3)}" x2="${b.x + b.w}" y2="${r1(sy - 3)}" stroke="${C.line}" stroke-width="0.8"/>`;
    out += subLines.map((l, i) => text(b.x + b.w / 2, sy + 11 + i * 14, l, { size: 11, anchor: 'middle', fill: C.muted, font: MONO })).join('');
  }
  return out;
}

export const initialNode = (x, y) => circle(x, y, 8, { fill: C.ink, stroke: C.ink });
export const finalNode = (x, y) => circle(x, y, 11, { fill: '#ffffff', stroke: C.ink, sw: 1.5 }) + circle(x, y, 6.5, { fill: C.ink, stroke: C.ink });

/** Nút rẽ nhánh hình thoi, tâm (x, y). */
export function diamond(x, y, r = 16) {
  return `<polygon points="${x} ${y - r} ${x + r} ${y} ${x} ${y + r} ${x - r} ${y}" fill="#ffffff" stroke="${C.line}" stroke-width="1.25"/>`;
}

/** Làn bơi dọc: các cột {x, w, title}. */
export function swimlanes(lanes, y, h) {
  return lanes.map((l, i) => rect(l.x, y, l.w, h, { rx: 0, fill: i % 2 ? '#ffffff' : C.panel, sw: 1 })
    + rect(l.x, y, l.w, 30, { rx: 0, fill: C.tint, opacity: 0.12, sw: 1 })
    + text(l.x + l.w / 2, y + 20, l.title, { size: 13, anchor: 'middle', weight: 700 })).join('');
}

/* ---- Triển khai --------------------------------------------------------------- */

/** Node triển khai: hộp 3D. */
export function nodeBox(b, title, { depth = 10 } = {}) {
  const { x, y, w, h } = b;
  return `<path d="M${x} ${y} L${x + depth} ${y - depth} H${x + w + depth} V${y + h - depth} L${x + w} ${y + h}" fill="#eef1f6" stroke="${C.line}" stroke-width="1"/>`
    + `<path d="M${x + w} ${y} L${x + w + depth} ${y - depth}" fill="none" stroke="${C.line}" stroke-width="1"/>`
    + rect(x, y, w, h, { rx: 0, fill: C.panel, sw: 1.2 })
    + text(x + 12, y + 20, title, { size: 13, weight: 700 });
}

/** Thành phần: hộp có biểu tượng component ở góc phải. */
export function component(b, title, lines = [], { fill = '#ffffff' } = {}) {
  const { x, y, w, h } = b;
  const ix = x + w - 22;
  const iy = y + 8;
  let out = rect(x, y, w, h, { fill, sw: 1.1 });
  out += rect(ix, iy, 14, 16, { rx: 1, sw: 0.9 }) + rect(ix - 4, iy + 3, 8, 3.5, { rx: 0, sw: 0.9 }) + rect(ix - 4, iy + 9.5, 8, 3.5, { rx: 0, sw: 0.9 });
  out += text(x + 10, y + 20, title, { size: 12.5, weight: 600 });
  out += lines.map((l, i) => text(x + 10, y + 38 + i * 15, l, { size: 11, fill: C.muted, font: l.startsWith('/') ? MONO : SANS })).join('');
  return out;
}

/** Cơ sở dữ liệu hình trụ. */
export function cylinder(x, y, w, h, title, sub) {
  const ry = 8;
  return `<path d="M${x} ${y + ry} V${y + h - ry} A${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} V${y + ry}" fill="#ffffff" stroke="${C.line}" stroke-width="1.2"/>`
    + `<ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="${C.tint}" fill-opacity="0.12" stroke="${C.line}" stroke-width="1.2"/>`
    + text(x + w / 2, y + h / 2 + 4, title, { size: 12.5, anchor: 'middle', weight: 600 })
    + (sub ? text(x + w / 2, y + h / 2 + 20, sub, { size: 10.5, anchor: 'middle', fill: C.muted, font: MONO }) : '');
}

/* ---- Sơ đồ tuần tự ------------------------------------------------------------ */

/**
 * Dựng sơ đồ tuần tự từ danh sách bước, tự tính toạ độ dọc.
 *
 * participants: [{ id, label, kind: 'actor' | 'box', x }]
 * steps:
 *   { msg: [from, to, text] }     gọi (nét liền, mũi tên đặc)
 *   { reply: [from, to, text] }   trả về (nét đứt, mũi tên rỗng)
 *   { self: [who, text] }         tự gọi
 *   { frame: 'alt' | 'opt' | 'loop', guard, span: [idA, idB] }  mở khung
 *   { else: guard }               nhánh khác trong khung alt
 *   { end: true }                 đóng khung
 *   { gap: px }                   chừa khoảng trống
 */
export function sequence({ width, participants, steps, top = 16 }) {
  const P = Object.fromEntries(participants.map((p) => [p.id, p]));
  const parts = [];
  const over = [];
  let y = top + 128;
  const frames = [];

  for (const s of steps) {
    if (s.msg || s.reply) {
      const [from, to, label] = s.msg ?? s.reply;
      const lines = String(label).split('\n');
      y += (lines.length - 1) * 14;
      over.push(arrow([[P[from].x, y], [P[to].x, y]], {
        head: s.msg ? 'filled' : 'open', dash: s.reply ? '5 4' : undefined,
        label, dy: -6, size: 11.5, fill: C.ink,
      }));
      y += 32;
    } else if (s.self) {
      const [who, label] = s.self;
      const x = P[who].x;
      over.push(arrow([[x, y - 6], [x + 34, y - 6], [x + 34, y + 12], [x, y + 12]], { head: 'filled' }));
      const lines = String(label).split('\n');
      over.push(lines.map((l, i) => text(x + 42, y + 2 + i * 14 - ((lines.length - 1) * 7), l, { size: 11.5, halo: true })).join(''));
      y += 34 + (lines.length - 1) * 10;
    } else if (s.frame) {
      const xs = s.span.map((id) => P[id].x);
      // Chừa chỗ cho nhãn khung và điều kiện, để nhãn của thông điệp đầu tiên không đè lên.
      frames.push({ kind: s.frame, guard: s.guard, x1: Math.min(...xs) - (s.padLeft ?? 80), x2: Math.max(...xs) + (s.padRight ?? 80), y1: y - 16, elses: [] });
      y += 30;
    } else if (s.else) {
      const f = frames[frames.length - 1];
      f.elses.push({ y: y - 14, guard: s.else });
      y += 30;
    } else if (s.end) {
      const f = frames.pop();
      const y2 = y - 12;
      let out = rect(f.x1, f.y1, f.x2 - f.x1, y2 - f.y1, { rx: 0, fill: 'none', sw: 1.1 });
      const tagW = textWidth(f.kind, 12, { bold: true }) + 22;
      out += `<path d="M${f.x1} ${f.y1} H${f.x1 + tagW} V${f.y1 + 12} L${f.x1 + tagW - 8} ${f.y1 + 20} H${f.x1} Z" fill="${C.panel}" stroke="${C.line}" stroke-width="1.1"/>`;
      out += text(f.x1 + 8, f.y1 + 15, f.kind, { size: 12, weight: 700 });
      out += text(f.x1 + tagW + 8, f.y1 + 15, `[${f.guard}]`, { size: 11.5, italic: true, fill: C.muted, halo: true });
      for (const e of f.elses) {
        out += path([[f.x1, e.y], [f.x2, e.y]], { dash: '6 4', sw: 1 });
        out += text(f.x1 + 8, e.y + 14, `[${e.guard}]`, { size: 11.5, italic: true, fill: C.muted, halo: true });
      }
      parts.push(out);
      y += 10;
    } else if (s.gap) {
      y += s.gap;
    }
  }

  const height = y + 10;
  const head = participants.map((p) => {
    let out = path([[p.x, top + 100], [p.x, height - 8]], { stroke: C.soft, sw: 1, dash: '5 4' });
    if (p.kind === 'actor') out += actor({ x: p.x, top: top + 2, name: p.label });
    else {
      const lines = wrap(p.label, (p.w ?? 150) - 16, 12.5, { bold: true });
      const w = p.w ?? 150;
      out += rect(p.x - w / 2, top + 40, w, 56, { fill: C.tint, opacity: 0.12, sw: 1.2 });
      out += rect(p.x - w / 2, top + 40, w, 56, { fill: 'none', sw: 1.2 });
      out += textBlock(p.x, top + 68, lines, { size: 12.5, anchor: 'middle', weight: 600 });
    }
    return out;
  });
  return { height, body: [...head, ...parts, ...over].join('') };
}

/* ---- Khung tài liệu SVG -------------------------------------------------------- */

export function svgDoc(w, h, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" width="${Math.round(w)}" height="${Math.round(h)}" role="img" aria-label="${esc(label)}">`
    + `<rect width="${Math.round(w)}" height="${Math.round(h)}" fill="#ffffff"/>${body}</svg>`;
}

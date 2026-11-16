/**
 * Vẽ các sơ đồ UML còn lại của Thuê Máy Hub: use case, tuần tự, trạng thái, hoạt
 * động và kiến trúc triển khai. Sơ đồ lớp đã có sẵn trong design/class-diagram.
 *
 * Chạy: npm run sep:uml
 *
 * Ghi design/uml/*.svg (vector, chèn Word/PowerPoint không vỡ nét) và
 * design/uml/png/*.png gấp đôi kích thước (ảnh dự phòng cho Word bản cũ). Ảnh PNG
 * chụp bằng Microsoft Edge chạy ngầm qua Playwright của ThueMayHub-FE. `npm run sep`
 * chỉ đọc hai thư mục này, nên chỉ cần chạy lại lệnh này khi sửa sơ đồ.
 *
 * Nội dung bám code: tên endpoint, trạng thái, quy tắc BR đều lấy từ server/.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  actor, actorSide, arrow, boundary, C, component, cylinder, diamond, finalNode, initialNode, MONO,
  nodeBox, note, onEllipse, path, rect, roundBox, sequence, svgDoc, swimlanes, systemActor, text, useCase,
} from './uml-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const OUT = join(ROOT, 'design', 'uml');

/* ---- Tiện ích cho use case -------------------------------------------------- */

const uc = (x, y, label, rx = 125, ry = 26) => ({ x, y, rx, ry, label });
const leftEdge = (u) => [u.x - u.rx, u.y];
const rightEdge = (u) => [u.x + u.rx, u.y];
const assoc = (a, b) => path([a, b], { sw: 1.1 });
const include = (from, to, at = 0.5) => arrow([from, to], { dash: '6 4', label: '«include»', at, size: 10.5, font: MONO });
const extend = (from, to, at = 0.5) => arrow([from, to], { dash: '6 4', label: '«extend»', at, size: 10.5, font: MONO });

/* ---- U0. Use case tổng quát --------------------------------------------------- */

function u0() {
  const W = 1060;
  const H = 675;
  const kh = { x: 92, top: 24, name: 'Khách hàng' };
  const nv = { x: 975, top: 24, name: 'Nhân viên' };
  const chu = { x: 975, top: 440, name: 'Chủ hệ thống' };
  const login = uc(525, 60, 'Đăng nhập / đăng xuất trên một màn hình chung', 120, 27);
  const cust = [
    uc(345, 150, 'Đăng ký tài khoản, hoàn thiện hồ sơ', 122),
    uc(345, 228, 'Xem máy trống, gửi yêu cầu thuê', 122),
    uc(345, 306, 'Trả đơn bằng ví, xin gia hạn', 122),
    uc(345, 384, 'Gửi ticket hỗ trợ, xem thông báo', 122),
  ];
  const sys = [uc(345, 522, 'Tự khoá / mở mạng máy quá hạn', 122), uc(345, 600, 'Gửi tóm tắt đơn sắp hết hạn', 122)];
  const staff = [
    uc(700, 135, 'Quản lý khách hàng', 128, 26),
    uc(700, 200, 'Quản lý thiết bị', 128, 26),
    uc(700, 265, 'Tạo đơn thuê, giao máy, thu tiền, gia hạn', 128, 26),
    uc(700, 330, 'Duyệt yêu cầu thuê, trả lời ticket', 128, 26),
    uc(700, 395, 'Lập và đóng phiếu sửa chữa', 128, 26),
  ];
  const owner = [
    uc(700, 470, 'Nạp ví, hoàn tiền, xem sổ tài chính', 128, 26),
    uc(700, 535, 'Quản lý nhân viên, linh kiện, báo cáo', 128, 26),
    uc(700, 600, 'Cấu hình khoá mạng, sao lưu, Telegram', 128, 26),
  ];
  const timer = { x: 22, y: 499, w: 128, h: 46, name: 'Bộ hẹn giờ' };
  const tele = { x: 22, y: 577, w: 128, h: 46, name: 'Telegram' };

  const khP = actorSide(kh, 'right');
  const nvP = actorSide(nv, 'left');
  const chuP = actorSide(chu, 'left');
  const body = [
    boundary(190, 10, 670, 652, 'Hệ thống Thuê Máy Hub'),
    assoc(khP, onEllipse(login, khP[0], khP[1])),
    assoc(nvP, onEllipse(login, nvP[0], nvP[1])),
    ...cust.map((u) => assoc(khP, leftEdge(u))),
    ...staff.map((u) => assoc(nvP, rightEdge(u))),
    ...owner.map((u) => assoc(chuP, rightEdge(u))),
    assoc([timer.x + timer.w, 522], leftEdge(sys[0])),
    assoc([timer.x + timer.w, 532], leftEdge(sys[1])),
    assoc([tele.x + tele.w, 600], leftEdge(sys[1])),
    arrow([[chu.x, chu.top - 4], [nv.x, nv.top + 96]], { head: 'triangle' }),
    ...[login, ...cust, ...sys, ...staff, ...owner].map(useCase),
    actor(kh), actor(nv), actor(chu), systemActor(timer), systemActor(tele),
  ];
  return [W, H, 'Use case tổng quát: ba tác nhân chính, hai tác nhân hệ thống và các nhóm chức năng', body.join('')];
}

/* ---- U1. Cổng khách hàng ---------------------------------------------------- */

function u1() {
  const W = 1060;
  const H = 650;
  const kh = { x: 95, top: 270, name: 'Khách hàng' };
  const a = [
    uc(420, 72, 'Đăng ký tài khoản', 130, 25),
    uc(420, 140, 'Đăng nhập bằng SĐT hoặc email', 130, 25),
    uc(420, 208, 'Xem máy đang trống', 130, 25),
    uc(420, 276, 'Theo dõi đơn thuê và yêu cầu', 130, 25),
    uc(420, 344, 'Xem số dư và lịch sử ví', 130, 25),
    uc(420, 412, 'Gửi ticket hỗ trợ', 130, 25),
    uc(420, 480, 'Xem thông báo', 130, 25),
    uc(420, 548, 'Đổi mật khẩu', 130, 25),
  ];
  const b1 = uc(815, 72, 'Hoàn thiện hồ sơ: họ tên, CCCD, địa chỉ', 140, 25);
  const b2 = uc(815, 196, 'Gửi yêu cầu thuê, xem giá tạm tính', 140, 25);
  const b3 = uc(815, 262, 'Trả đơn bằng ví', 140, 25);
  const b4 = uc(815, 328, 'Xin gia hạn', 140, 25);
  const b5 = uc(815, 394, 'Huỷ yêu cầu chưa duyệt', 140, 25);
  const p = actorSide(kh, 'right');
  const body = [
    boundary(200, 10, 840, 628, 'Cổng khách hàng'),
    ...a.map((u) => assoc(p, leftEdge(u))),
    include(rightEdge(a[0]), leftEdge(b1)),
    extend(leftEdge(b2), rightEdge(a[2])),
    extend(leftEdge(b3), [a[3].x + a[3].rx, a[3].y - 4], 0.42),
    extend(leftEdge(b4), [a[3].x + a[3].rx, a[3].y], 0.42),
    extend(leftEdge(b5), [a[3].x + a[3].rx, a[3].y + 4], 0.42),
    note(640, 470, 380, [
      'Mọi chức năng trừ Đăng ký đều cần đăng nhập. Khách',
      'bị khoá (BLOCKED) không đăng nhập được (BR.07).',
      'Yêu cầu thuê chỉ thành đơn khi nhân viên duyệt (Hình U2).',
      'Trả bằng ví bị chặn nếu ví không đủ: ví không âm (BR.06).',
    ]),
    ...[...a, b1, b2, b3, b4, b5].map(useCase),
    actor(kh),
  ];
  return [W, H, 'Use case chi tiết của khách hàng trên cổng khách hàng', body.join('')];
}

/* ---- U2. Nghiệp vụ tại quầy ---------------------------------------------------- */

function u2() {
  const W = 1060;
  const H = 660;
  const nv = { x: 90, top: 290, name: 'Nhân viên' };
  const a = [
    'Xem Dashboard trong ngày', 'Quản lý khách hàng', 'Quản lý thiết bị', 'Tạo đơn thuê tại quầy',
    'Giao máy, nhận lại máy, huỷ đơn', 'Thu tiền đơn thuê', 'Gia hạn đơn tại quầy',
    'Duyệt yêu cầu thuê, trả lời ticket', 'Lập và đóng phiếu sửa chữa',
  ].map((label, i) => uc(400, 78 + i * 66, label, 132, 24));
  const inc = [
    [3, 'Tự tính thành tiền theo giờ / tháng'],
    [4, 'Cập nhật trạng thái máy theo đơn'],
    [5, 'Kiểm tra số còn nợ và số dư ví'],
    [7, 'Sinh đơn giữ chỗ, máy chuyển Giữ chỗ'],
    [8, 'Máy chuyển Bảo trì; đóng phiếu ghi tiền công'],
  ].map(([i, label]) => [i, uc(800, a[i].y, label, 150, 24)]);
  const p = actorSide(nv, 'right');
  // «extend» Thu tiền → Gia hạn: đi ở phía phải cột để nhãn không đè lên đường nối tác nhân.
  const x = a[5].x + 100;
  const dy = 24 * Math.sqrt(1 - (100 / 132) ** 2);
  const body = [
    boundary(195, 10, 850, 640, 'Nghiệp vụ tại quầy'),
    ...a.map((u) => assoc(p, leftEdge(u))),
    ...inc.map(([i, u]) => include(rightEdge(a[i]), leftEdge(u))),
    arrow([[x, a[5].y + dy], [x, a[6].y - dy]], { dash: '6 4', label: '«extend»', dx: 8, dy: 4, anchor: 'start', size: 10.5, font: MONO }),
    note(640, 52, 380, [
      'Chủ hệ thống kế thừa Nhân viên nên làm được mọi',
      'việc trong hình này (Hình U0, mũi tên tam giác).',
      'Dashboard của nhân viên ẩn các số tiền (BR.14).',
      'Không thu vượt số còn nợ (BR.03); máy đang thuê',
      'không gán cho đơn thứ hai (BR.01).',
    ]),
    ...[...a, ...inc.map(([, u]) => u)].map(useCase),
    actor(nv),
  ];
  return [W, H, 'Use case chi tiết của nhân viên tại quầy', body.join('')];
}

/* ---- U3. Quản trị riêng của chủ ------------------------------------------------- */

function u3() {
  const W = 1060;
  const H = 660;
  const nv = { x: 90, top: 40, name: 'Nhân viên' };
  const chu = { x: 90, top: 330, name: 'Chủ hệ thống' };
  const a = [
    'Nạp tiền vào ví khách', 'Hoàn tiền đơn thuê', 'Xem sổ giao dịch và chi phí theo kỳ', 'Ghi nhận chi phí vận hành',
    'Nhập kho, quản lý linh kiện', 'Quản lý tài khoản nhân viên', 'Xem nhật ký thao tác, báo cáo',
    'Khoá / mở mạng một máy', 'Cấu hình khoá mạng, sao lưu, Telegram',
  ].map((label, i) => uc(390, 78 + i * 66, label, 135, 24));
  const csv = uc(742, a[2].y, 'Xuất sổ tiền ra CSV', 140, 24);
  const reset = uc(742, a[5].y, 'Đặt lại mật khẩu nhân viên', 140, 24);
  const auto = uc(742, 476, 'Tự khoá máy quá hạn', 140, 24);
  const check = uc(742, 566, 'Kiểm tra IP, mã máy đúng khuôn; ghi nhật ký lệnh', 140, 26);
  const timer = { x: 925, y: 453, w: 118, h: 46, name: 'Bộ hẹn giờ' };
  const p = actorSide(chu, 'right');
  const body = [
    boundary(195, 10, 700, 640, 'Quản trị — chỉ Chủ hệ thống'),
    ...a.map((u) => assoc(p, leftEdge(u))),
    extend(leftEdge(csv), rightEdge(a[2])),
    extend(leftEdge(reset), rightEdge(a[5])),
    include(rightEdge(a[7]), onEllipse(check, a[7].x + a[7].rx, a[7].y)),
    include([auto.x, auto.y + auto.ry], [check.x, check.y - check.ry]),
    assoc([timer.x, auto.y], rightEdge(auto)),
    arrow([[chu.x, chu.top - 4], [nv.x, nv.top + 96]], { head: 'triangle' }),
    note(600, 52, 280, [
      'Nhân viên gọi các API này bị',
      'chặn 403 (BR.14). Luôn còn ít',
      'nhất một Chủ hoạt động (BR.13).',
      'Lệnh khoá chỉ thay {ip}, {code};',
      'sai khuôn thì từ chối (BR.15).',
    ]),
    ...[...a, csv, reset, auto, check].map(useCase),
    actor(nv), actor(chu), systemActor(timer),
  ];
  return [W, H, 'Use case chi tiết của chủ hệ thống', body.join('')];
}

/* ---- S1–S3. Sơ đồ tuần tự ---------------------------------------------------- */

function s1() {
  const W = 980;
  const { height, body } = sequence({
    width: W,
    participants: [
      { id: 'user', label: 'Người dùng', kind: 'actor', x: 80 },
      { id: 'ui', label: 'Giao diện mới (tmh-store)', x: 300, w: 170 },
      { id: 'api', label: 'API /api/hub (server/hub.ts)', x: 560, w: 180 },
      { id: 'db', label: 'SQLite', x: 850, w: 130 },
    ],
    steps: [
      { msg: ['user', 'ui', 'Nhập username / email / SĐT\nvà mật khẩu'] },
      { msg: ['ui', 'api', 'POST /api/hub/login\n{ identity, password }'] },
      { msg: ['api', 'db', 'Tìm admins theo email hoặc username'] },
      { reply: ['db', 'api', 'tài khoản quản trị (nếu có)'] },
      { frame: 'alt', guard: 'là quản trị hoặc nhân viên, mật khẩu đúng (scrypt)', span: ['ui', 'db'], padLeft: 120, padRight: 90 },
      { self: ['api', 'Bỏ phiên cũ của cả hai vai'] },
      { msg: ['api', 'db', 'INSERT sessions (hạn 7 ngày)'] },
      { reply: ['api', 'ui', '200 { role: Admin | Staff }\n+ cookie session_id (HttpOnly)'] },
      { else: 'không phải quản trị' },
      { msg: ['api', 'db', 'Tìm customer_accounts theo email hoặc SĐT'] },
      { reply: ['db', 'api', 'tài khoản khách (nếu có)'] },
      { frame: 'alt', guard: 'mật khẩu đúng, khách không bị khoá', span: ['ui', 'db'], padLeft: 95, padRight: 65 },
      { reply: ['api', 'ui', '200 { role: Customer }\n+ cookie customer_session_id'] },
      { else: 'sai tài khoản hoặc mật khẩu' },
      { reply: ['api', 'ui', '401 "Sai tài khoản hoặc mật khẩu."'] },
      { end: true },
      { end: true },
      { reply: ['ui', 'user', 'Mở khu vực theo vai trò:\nquản trị, nhân viên hoặc cổng khách'] },
    ],
  });
  return [W, height, 'Sơ đồ tuần tự đăng nhập chung cho ba vai trò', body];
}

function s2() {
  const W = 1010;
  const { height, body } = sequence({
    width: W,
    participants: [
      { id: 'kh', label: 'Khách hàng', kind: 'actor', x: 70 },
      { id: 'nv', label: 'Nhân viên', kind: 'actor', x: 195 },
      { id: 'ui', label: 'Giao diện mới', x: 400, w: 150 },
      { id: 'api', label: 'API Express', x: 660, w: 150 },
      { id: 'db', label: 'SQLite', x: 905, w: 130 },
    ],
    steps: [
      { msg: ['kh', 'ui', 'Chọn máy, ngày thuê; "Gửi yêu cầu"'] },
      { msg: ['ui', 'api', 'POST /api/customer/bookings'] },
      { msg: ['api', 'db', 'Máy còn AVAILABLE? Lưu yêu cầu\nPENDING kèm giá tạm tính'] },
      { reply: ['api', 'ui', '201 mã yêu cầu'] },
      { reply: ['ui', 'kh', 'Yêu cầu đang chờ duyệt'] },
      { gap: 8 },
      { msg: ['nv', 'ui', 'Mở Đơn thuê, bấm "Duyệt", nhập giá'] },
      { msg: ['ui', 'api', 'POST /api/service-desk/\nbookings/:id/approve'] },
      { frame: 'alt', guard: 'yêu cầu còn PENDING và máy còn AVAILABLE', span: ['ui', 'db'], padLeft: 90, padRight: 80 },
      { msg: ['api', 'db', 'Một transaction: tạo đơn RESERVED,\nyêu cầu APPROVED, máy RESERVED'] },
      { self: ['api', 'Báo cho khách, ghi audit log'] },
      { reply: ['api', 'ui', '201 mã đơn thuê'] },
      { else: 'đã có người duyệt hoặc máy vừa bận' },
      { reply: ['api', 'ui', '409 "Thiết bị không còn sẵn sàng."'] },
      { end: true },
    ],
  });
  return [W, height, 'Sơ đồ tuần tự từ yêu cầu thuê của khách tới lúc nhân viên duyệt', body];
}

function s3() {
  const W = 980;
  const { height, body } = sequence({
    width: W,
    participants: [
      { id: 'nv', label: 'Nhân viên', kind: 'actor', x: 80 },
      { id: 'ui', label: 'Giao diện mới', x: 300, w: 150 },
      { id: 'api', label: 'API Express', x: 570, w: 150 },
      { id: 'db', label: 'SQLite', x: 850, w: 130 },
    ],
    steps: [
      { msg: ['nv', 'ui', 'Khách tới nhận máy: "Giao máy"'] },
      { msg: ['ui', 'api', 'PATCH /api/rentals/:id/status\n{ status: ACTIVE }'] },
      { msg: ['api', 'db', 'Đơn ACTIVE, máy RENTED (một transaction)'] },
      { reply: ['api', 'ui', '200'] },
      { gap: 6 },
      { msg: ['nv', 'ui', '"Thu tiền": số tiền, nguồn tiền'] },
      { msg: ['ui', 'api', 'POST /api/rentals/:id/payment\n{ amount, source }'] },
      { msg: ['api', 'db', 'Số đã thu = SUM(revenue_change)'] },
      { frame: 'alt', guard: 'số tiền vượt phần còn nợ (BR.03)', span: ['ui', 'db'], padLeft: 90, padRight: 80 },
      { reply: ['api', 'ui', '400 "Số tiền vượt quá phần còn phải thanh toán."'] },
      { else: 'trả bằng ví mà số dư ví không đủ (BR.06)' },
      { reply: ['api', 'ui', '400 "Số dư ví khách hàng không đủ."'] },
      { else: 'hợp lệ' },
      { msg: ['api', 'db', 'INSERT bút toán RENTAL_PAYMENT\ncash, wallet, revenue (BR.11)'] },
      { self: ['api', 'Ghi audit log'] },
      { reply: ['api', 'ui', '201 { code, paidAmount }'] },
      { end: true },
      { reply: ['ui', 'nv', 'Thanh tiến độ thanh toán cập nhật'] },
    ],
  });
  return [W, height, 'Sơ đồ tuần tự giao máy và thu tiền đơn thuê', body];
}

/* ---- ST1. Vòng đời đơn thuê ------------------------------------------------------ */

function st1() {
  const W = 1080;
  const H = 500;
  const res = { x: 170, y: 150, w: 200, h: 80 };
  const act = { x: 500, y: 150, w: 210, h: 80 };
  const com = { x: 850, y: 36, w: 200, h: 74 };
  const exp = { x: 850, y: 258, w: 200, h: 74 };
  const can = { x: 170, y: 358, w: 200, h: 74 };
  const body = [
    initialNode(60, 190),
    arrow([[68, 190], [res.x, 190]], { label: 'duyệt yêu cầu thuê', dy: -8 }),
    arrow([[60, 198], [60, 470], [605, 470], [605, act.y + act.h]], { label: 'tạo đơn tại quầy, giao máy ngay', at: 0.42, dy: -7 }),
    arrow([[res.x + res.w, 190], [act.x, 190]], { label: 'giao máy', dy: -8 }),
    arrow([[270, res.y + res.h], [270, can.y]], { label: 'huỷ [chưa thu đồng nào] (BR.05)', dx: 8, dy: 4, anchor: 'start' }),
    arrow([[570, act.y], [570, 104], [640, 104], [640, act.y]], { label: 'gia hạn / thêm một kỳ thuê', at: 0.5, dy: -8 }),
    arrow([[act.x + act.w, 172], [780, 172], [780, 73], [com.x, 73]], { label: 'nhận lại máy', at: 0.78, dy: -8 }),
    arrow([[act.x + act.w, 208], [780, 208], [780, 295], [exp.x, 295]], { label: 'đánh dấu hết hạn', at: 0.5, dx: 8, dy: 4, anchor: 'start' }),
    arrow([[com.x + com.w / 2, com.y + com.h], [com.x + com.w / 2, com.y + com.h + 30]]),
    finalNode(com.x + com.w / 2, com.y + com.h + 41),
    arrow([[exp.x + exp.w / 2, exp.y + exp.h], [exp.x + exp.w / 2, exp.y + exp.h + 30]]),
    finalNode(exp.x + exp.w / 2, exp.y + exp.h + 41),
    arrow([[can.x + can.w, 395], [can.x + can.w + 48, 395]]),
    finalNode(can.x + can.w + 59, 395),
    roundBox(res, 'Giữ chỗ · RESERVED', { sub: 'entry / máy → RESERVED', bold: true }),
    roundBox(act, 'Đang thuê · ACTIVE', { sub: 'entry / máy → RENTED', bold: true }),
    roundBox(com, 'Hoàn tất · COMPLETED', { sub: 'entry / máy → AVAILABLE', bold: true }),
    roundBox(exp, 'Hết hạn · EXPIRED', { sub: 'entry / máy → AVAILABLE', bold: true }),
    roundBox(can, 'Đã huỷ · CANCELLED', { sub: 'entry / máy → AVAILABLE', bold: true }),
    path([[790, 420], [690, act.y + act.h]], { stroke: C.noteLine, sw: 1, dash: '3 3' }),
    note(790, 386, 280, [
      'Trạng thái mạng của máy chạy song song:',
      'đơn ACTIVE quá hạn + thời gian ân hạn',
      '→ bộ quét khoá mạng (LOCKED);',
      'gia hạn xong → tự mở lại (OPEN).',
    ]),
  ];
  return [W, H, 'Sơ đồ trạng thái vòng đời đơn thuê và trạng thái máy đi kèm', body.join('')];
}

/* ---- A1. Quy trình thuê máy --------------------------------------------------- */

function a1() {
  const W = 1060;
  const H = 665;
  const lanes = [
    { x: 20, w: 300, title: 'Khách hàng' },
    { x: 320, w: 360, title: 'Nhân viên / Chủ' },
    { x: 680, w: 360, title: 'Hệ thống' },
  ];
  const box = (cx, cy, w, h) => ({ x: cx - w / 2, y: cy - h / 2, w, h });
  // Cột giữa lệch phải để nhánh "từ chối" có chỗ kết thúc riêng, không đè lên hộp Giao máy.
  const mid = 530;
  const n1 = box(170, 104, 220, 42);
  const n2 = box(860, 104, 240, 46);
  const n3 = box(mid, 170, 220, 40);
  const rej = box(384, 280, 118, 52);
  const n5 = box(860, 280, 240, 46);
  const n6 = box(mid, 350, 220, 40);
  const n7 = box(860, 350, 240, 40);
  const n8 = box(mid, 422, 220, 46);
  const n9 = box(860, 422, 240, 46);
  const ext = box(170, 506, 220, 46);
  const n10 = box(mid, 576, 220, 40);
  const n11 = box(860, 576, 240, 40);
  const body = [
    swimlanes(lanes, 10, 645),
    initialNode(170, 62),
    arrow([[170, 70], [170, n1.y]]),
    arrow([[n1.x + n1.w, 104], [n2.x, 104]]),
    arrow([[860, n2.y + n2.h], [860, 170], [n3.x + n3.w, 170]]),
    arrow([[mid, n3.y + n3.h], [mid, 214]]),
    diamond(mid, 230),
    text(mid + 20, 256, 'Duyệt?', { size: 12, fill: C.muted }),
    arrow([[mid - 16, 230], [rej.x + rej.w / 2, 230], [rej.x + rej.w / 2, rej.y]], { label: '[không]', at: 0.3, dy: -6 }),
    arrow([[rej.x + rej.w / 2, rej.y + rej.h], [rej.x + rej.w / 2, 319]]),
    finalNode(rej.x + rej.w / 2, 330),
    arrow([[mid + 16, 230], [860, 230], [860, n5.y]], { label: '[duyệt]', at: 0.12, dy: -6 }),
    arrow([[860, n5.y + n5.h], [860, 316], [mid, 316], [mid, n6.y]]),
    arrow([[n6.x + n6.w, 350], [n7.x, 350]]),
    arrow([[860, n7.y + n7.h], [860, 386], [mid, 386], [mid, n8.y]]),
    arrow([[n8.x + n8.w, 422], [n9.x, 422]]),
    arrow([[860, n9.y + n9.h], [860, 470], [mid, 470], [mid, 490]]),
    diamond(mid, 506),
    text(mid + 22, 500, 'Tới hạn: khách', { size: 12, fill: C.muted }),
    text(mid + 22, 515, 'gia hạn?', { size: 12, fill: C.muted }),
    arrow([[mid - 16, 506], [ext.x + ext.w, 506]], { label: '[gia hạn]', at: 0.5, dy: -6 }),
    arrow([[170, ext.y], [170, 422], [n8.x, 422]]),
    arrow([[mid, 522], [mid, n10.y]], { label: '[trả máy]', dx: 8, dy: 4, anchor: 'start' }),
    arrow([[n10.x + n10.w, 576], [n11.x, 576]]),
    arrow([[860, n11.y + n11.h], [860, 619]]),
    finalNode(860, 630),
    roundBox(n1, 'Xem máy trống, gửi yêu cầu thuê', { size: 12 }),
    roundBox(n2, 'Lưu yêu cầu PENDING, tăng số việc chờ trên menu', { size: 12 }),
    roundBox(n3, 'Xem yêu cầu, kiểm tra máy', { size: 12 }),
    roundBox(rej, 'Từ chối và báo lý do cho khách', { size: 12 }),
    roundBox(n5, 'Tạo đơn RESERVED, máy chuyển Giữ chỗ, báo cho khách', { size: 12 }),
    roundBox(n6, 'Giao máy cho khách', { size: 12 }),
    roundBox(n7, 'Đơn ACTIVE, máy Đang thuê', { size: 12 }),
    roundBox(n8, 'Thu tiền: tiền mặt, chuyển khoản hoặc trừ ví', { size: 12 }),
    roundBox(n9, 'Ghi bút toán ba giá trị: cash, wallet, revenue', { size: 12 }),
    roundBox(ext, 'Xin gia hạn trên cổng, hoặc gia hạn tại quầy', { size: 12 }),
    roundBox(n10, 'Nhận lại máy, hoàn tất đơn', { size: 12 }),
    roundBox(n11, 'Đơn COMPLETED, máy về Sẵn sàng', { size: 12 }),
    note(36, 196, 268, [
      'Đơn tạo ngay tại quầy bỏ qua các bước',
      'yêu cầu và duyệt, vào thẳng Giao máy.',
      '',
      'Quá hạn mà chưa gia hạn: bộ quét tự',
      'khoá mạng máy sau thời gian ân hạn',
      '(Hình A2), gia hạn xong tự mở lại.',
    ]),
  ];
  return [W, H, 'Sơ đồ hoạt động quy trình thuê máy, chia làn khách hàng, nhân viên và hệ thống', body.join('')];
}

/* ---- A2. Bộ quét khoá mạng --------------------------------------------------------- */

function a2() {
  const W = 1000;
  const H = 600;
  const a1b = { x: 40, y: 140, w: 220, h: 60 };
  const region = { x: 300, y: 126, w: 650, h: 356 };
  const b1 = { x: 330, y: 150, w: 220, h: 40 };
  const b2 = { x: 650, y: 220, w: 270, h: 40 };
  const b3 = { x: 330, y: 292, w: 220, h: 40 };
  const b4 = { x: 330, y: 422, w: 220, h: 40 };
  const b5 = { x: 650, y: 358, w: 270, h: 44 };
  const a2b = { x: 40, y: 506, w: 220, h: 50 };
  const a3b = { x: 330, y: 506, w: 300, h: 50 };
  const body = [
    initialNode(150, 34),
    text(168, 38, 'mỗi 60 giây (setInterval)', { size: 11.5, fill: C.muted, font: MONO }),
    arrow([[150, 42], [150, 80]]),
    diamond(150, 96),
    text(174, 92, 'Đã bật khoá mạng', { size: 12, fill: C.muted }),
    text(174, 107, 'và bật tự khoá?', { size: 12, fill: C.muted }),
    arrow([[134, 96], [72, 96]], { label: '[không]', dy: -6 }),
    finalNode(60, 96),
    arrow([[150, 112], [150, a1b.y]], { label: '[có]', dx: 6, dy: 4, anchor: 'start' }),
    rect(region.x, region.y, region.w, region.h, { rx: 14, fill: 'none', dash: '7 5', sw: 1.2 }),
    text(region.x + 14, region.y + 20, '«với mỗi máy»', { size: 11.5, font: MONO, fill: C.muted }),
    arrow([[a1b.x + a1b.w, 170], [b1.x, 170]]),
    arrow([[440, b1.y + b1.h], [440, 224]]),
    diamond(440, 240),
    text(418, 236, 'IP và mã máy', { size: 12, fill: C.muted, anchor: 'end' }),
    text(418, 251, 'đúng khuôn?', { size: 12, fill: C.muted, anchor: 'end' }),
    arrow([[456, 240], [b2.x, 240]], { label: '[sai khuôn]', at: 0.62, dy: -6 }),
    arrow([[440, 256], [440, b3.y]], { label: '[đúng]', dx: 6, dy: 4, anchor: 'start' }),
    arrow([[440, b3.y + b3.h], [440, 364]]),
    diamond(440, 380),
    text(418, 376, 'Lệnh chạy', { size: 12, fill: C.muted, anchor: 'end' }),
    text(418, 391, 'thành công?', { size: 12, fill: C.muted, anchor: 'end' }),
    arrow([[456, 380], [b5.x, 380]], { label: '[lỗi / quá giờ]', at: 0.62, dy: -6 }),
    arrow([[440, 396], [440, b4.y]], { label: '[thành công]', dx: 6, dy: 4, anchor: 'start' }),
    arrow([[region.x, 446], [150, 446], [150, a2b.y]]),
    arrow([[a2b.x + a2b.w, 531], [a3b.x, 531]]),
    arrow([[a3b.x + a3b.w, 531], [698, 531]]),
    finalNode(709, 531),
    roundBox(a1b, 'Lấy các máy đang mở mạng có đơn ACTIVE đã quá hạn quá thời gian ân hạn', { size: 12 }),
    roundBox(b1, 'Ghép lệnh: chỉ thay {ip} và {code}', { size: 12 }),
    roundBox(b2, 'Từ chối chạy, ghi sự kiện FAILED', { size: 12 }),
    roundBox(b3, 'Chạy lệnh, có giới hạn thời gian', { size: 12 }),
    roundBox(b4, 'Máy chuyển LOCKED, ghi SUCCESS', { size: 12 }),
    roundBox(b5, 'Ghi FAILED, máy vẫn OPEN — không báo khoá giả', { size: 12 }),
    roundBox(a2b, 'Lấy các máy đang khoá mà đơn đã được gia hạn', { size: 12 }),
    roundBox(a3b, 'Mở mạng lại từng máy (cùng các bước kiểm tra như trên)', { size: 12 }),
    note(740, 500, 240, [
      'Mọi lần chạy, kể cả thất bại,',
      'đều ghi vào network_lock_events',
      'với nguồn AUTO hoặc MANUAL.',
    ]),
  ];
  return [W, H, 'Sơ đồ hoạt động của bộ quét khoá mạng chạy mỗi phút', body.join('')];
}

/* ---- AR1. Kiến trúc triển khai ------------------------------------------------------ */

function ar1() {
  const W = 1080;
  const H = 540;
  const body = [
    nodeBox({ x: 20, y: 40, w: 290, h: 262 }, 'Trình duyệt (máy tính, điện thoại)'),
    component({ x: 36, y: 70, w: 258, h: 110 }, 'Giao diện mới — ThueMayHub-FE', [
      'TanStack Start, React 19, Tailwind', 'Một màn đăng nhập cho ba vai trò', 'Quản trị, nhân viên, cổng khách', 'Cổng 8789 (bản dựng) / 5274 (phát triển)',
    ]),
    component({ x: 36, y: 196, w: 258, h: 92 }, 'Giao diện thế hệ đầu — src/', [
      'React + Vite', 'Trang quản trị và cổng khách cũ', 'Cổng 8788 / 5273',
    ]),
    nodeBox({ x: 20, y: 342, w: 290, h: 118 }, 'Máy Windows của tiệm'),
    component({ x: 36, y: 372, w: 258, h: 74 }, 'Bản desktop Electron', ['Đóng gói giao diện thế hệ đầu', 'kèm server chạy nội bộ']),

    nodeBox({ x: 370, y: 40, w: 440, h: 420 }, 'Máy chủ của tiệm — Node.js 22'),
    component({ x: 386, y: 70, w: 214, h: 196 }, 'Express 5 API', [
      '/api/hub', 'đăng nhập chung, hồ sơ khách', '/api/auth, /api/admins', '/api/customers, /devices', '/api/rentals, /finance', '/api/repairs, /parts', '/api/customer (cổng khách)', '/api/service-desk (duyệt)',
    ]),
    component({ x: 386, y: 300, w: 214, h: 92 }, 'Kiểm soát truy cập', ['requireAuth, requireCustomer', 'requirePermission OWNER/STAFF', 'cookie HttpOnly, mật khẩu scrypt']),
    component({ x: 614, y: 70, w: 182, h: 92 }, 'Tác vụ chạy nền', ['Khoá mạng: mỗi 60 giây', 'Telegram: mỗi 15 phút', 'Sao lưu: theo lịch']),
    cylinder(622, 206, 166, 112, 'thue-may.db', 'node:sqlite · WAL'),
    rect(622, 360, 166, 40, { fill: '#ffffff' }),
    text(705, 385, 'data/backups/', { size: 11.5, anchor: 'middle', font: MONO }),

    component({ x: 860, y: 70, w: 200, h: 60 }, 'Telegram Bot API', ['tóm tắt đơn sắp hết hạn']),
    nodeBox({ x: 860, y: 208, w: 200, h: 110 }, 'Máy cho thuê'),
    text(872, 252, 'PC / Boxphone của tiệm', { size: 11.5, fill: C.muted }),
    text(872, 270, 'nhận lệnh khoá / mở mạng', { size: 11.5, fill: C.muted }),
    text(872, 288, 'do chủ tiệm cấu hình', { size: 11.5, fill: C.muted }),

    arrow([[294, 118], [386, 118]], { head: 'filled', label: 'HTTP + JSON', dy: -7 }),
    arrow([[294, 236], [386, 200]], { head: 'filled', label: 'HTTP + JSON', at: 0.45, dy: 14 }),
    arrow([[294, 409], [370, 409]], { dash: '5 4', label: 'cùng mã server', at: 0.5, dy: -7 }),
    arrow([[493, 266], [493, 300]], { dash: '5 4' }),
    arrow([[600, 180], [622, 230]], { head: 'filled' }),
    text(604, 214, 'SQL', { size: 11, anchor: 'end', fill: C.muted, halo: true }),
    arrow([[705, 162], [705, 206]], { head: 'filled' }),
    arrow([[705, 318], [705, 360]], { dash: '5 4', label: 'VACUUM INTO', dx: 8, dy: 4, anchor: 'start', size: 10.5, font: MONO }),
    arrow([[796, 100], [860, 100]], { head: 'filled', label: 'HTTPS', dy: -7 }),
    arrow([[796, 140], [830, 140], [830, 262], [860, 262]], { head: 'filled', label: 'lệnh shell', at: 0.5, dx: -6, dy: 4, anchor: 'end' }),

    note(20, 482, 1040, [
      'Một backend phục vụ cả ba giao diện; dữ liệu là một file SQLite trên máy của tiệm. Ba con số tiền và kho (số dư ví, số đã thu, tồn kho) không lưu thành cột mà tính lại từ sổ bút toán.',
    ]),
  ];
  return [W, H, 'Sơ đồ kiến trúc triển khai: ba giao diện, một server Express, một file SQLite và hai hệ thống bên ngoài', body.join('')];
}

/* ---- Xuất SVG và PNG ------------------------------------------------------------- */

export const DIAGRAMS = {
  'u0-tong-quat': u0,
  'u1-khach-hang': u1,
  'u2-nhan-vien': u2,
  'u3-chu-he-thong': u3,
  's1-dang-nhap': s1,
  's2-yeu-cau-thue': s2,
  's3-giao-may-thu-tien': s3,
  'st1-don-thue': st1,
  'a1-quy-trinh-thue': a1,
  'a2-khoa-mang': a2,
  'ar1-kien-truc': ar1,
};

async function main() {
  mkdirSync(join(OUT, 'png'), { recursive: true });
  const svgs = Object.entries(DIAGRAMS).map(([name, draw]) => {
    const [w, h, label, body] = draw();
    const svg = svgDoc(w, h, label, body);
    writeFileSync(join(OUT, `${name}.svg`), svg, 'utf8');
    return { name, w: Math.round(w), h: Math.round(h), svg };
  });

  const require = createRequire(join(ROOT, 'ThueMayHub-FE', 'package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const d of svgs) {
    const page = await browser.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2 });
    await page.setContent(`<!doctype html><html><body style="margin:0">${d.svg}</body></html>`);
    await page.screenshot({ path: join(OUT, 'png', `${d.name}.png`), clip: { x: 0, y: 0, width: d.w, height: d.h } });
    await page.close();
    console.log(`  ${d.name.padEnd(22)} ${d.w}×${d.h}`);
  }
  await browser.close();
  console.log(`Đã vẽ ${svgs.length} sơ đồ vào ${OUT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

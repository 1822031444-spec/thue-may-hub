/**
 * Dữ liệu mẫu cho bản Thuê Máy Hub hoàn chỉnh (giao diện ThueMayHub-FE).
 *
 * Bám đúng tài khoản và số liệu mà README của FE giới thiệu, để ai mở app lần đầu
 * cũng đăng nhập được ngay. Ghi vào database riêng `data/hub-demo.db` — không
 * đụng database của bản thử hay bản đang kinh doanh.
 *
 *   npm run hub:seed            (bỏ qua nếu database đã có dữ liệu)
 *   npm run hub:reset           (xoá database mẫu rồi tạo lại từ đầu)
 */

import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const DB_PATH = resolve(process.env.DATABASE_PATH || './data/hub-demo.db');
process.env.DATABASE_PATH = DB_PATH;

if (process.argv.includes('--reset')) {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${DB_PATH}${suffix}`, { force: true });
  console.log(`[seed] Đã xoá ${DB_PATH}`);
}
const fresh = !existsSync(DB_PATH);

const { db, hashPassword, makeCode, makeId, runTransaction, syncDeviceStatus, writeSettings } = await import('./database.ts');

const hasData = Number((db.prepare('SELECT COUNT(*) AS n FROM devices').get() as { n: number }).n) > 0
  || Number((db.prepare('SELECT COUNT(*) AS n FROM admins').get() as { n: number }).n) > 0;
if (!fresh && hasData) {
  console.log(`[seed] ${DB_PATH} đã có dữ liệu, bỏ qua. Chạy "npm run hub:reset" nếu muốn làm lại từ đầu.`);
  process.exit(0);
}

const PASSWORD = 'demo123';
const at = (days: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const now = new Date().toISOString();

const STAFF = [
  ['Phạm Văn Đức Phú', 'admin', 'OWNER'],
  ['Nguyễn Minh Phát', 'phat', 'STAFF'],
  ['Đỗ Tuấn Thành', 'thanh', 'STAFF'],
  ['Hồ Sỹ Vinh', 'vinh', 'STAFF'],
  ['Đào Việt Anh', 'anh', 'STAFF'],
] as const;

// [mã, tên, loại, phân nhóm, vị trí, giá tháng, giá giờ]
const DEVICES = [
  ['PC-001', 'PC Gaming RTX 4060', 'PC', 'Gaming', 'Tầng 1 · Khu A', 6_500_000, 45_000],
  ['PC-002', 'PC Office Dell 7080', 'PC', 'Văn phòng', 'Tầng 1 · Khu B', 4_200_000, 35_000],
  ['BP-008', 'Boxphone BP-08', 'BOXPHONE', '8 khe', 'Tầng 2 · Kệ 1', 5_200_000, 30_000],
  ['PC-003', 'Mac Mini M2', 'PC', 'Đồ hoạ', 'Tầng 1 · Khu C', 7_800_000, 55_000],
  ['BP-012', 'Boxphone BP-12', 'BOXPHONE', '12 khe', 'Tầng 2 · Kệ 2', 6_200_000, 40_000],
  ['PC-004', 'PC Gaming RTX 3060', 'PC', 'Gaming', 'Tầng 1 · Khu A', 5_900_000, 40_000],
  ['PC-005', 'PC Creator Studio', 'PC', 'Đồ hoạ', 'Kho kỹ thuật', 8_200_000, 60_000],
] as const;

// [mã, tên, SĐT, email, số dư ví cuối cùng, bị chặn]
const CUSTOMERS = [
  ['KH-001', 'Nguyễn Minh Anh', '0902345678', 'minhanh@email.com', 1_250_000, false],
  ['KH-002', 'Trần Quốc Bảo', '0913456789', 'quocbao@email.com', 580_000, false],
  ['KH-003', 'Lê Thảo Vy', '0934567890', 'thaovy@email.com', 320_000, false],
  ['KH-004', 'Phạm Gia Huy', '0987654321', 'giahuy@email.com', 2_100_000, false],
  ['KH-005', 'Đỗ Ngọc Linh', '0973456789', 'ngoclinh@email.com', 0, true],
] as const;

// [mã đơn, khách, máy, trạng thái, bắt đầu (ngày), kết thúc (ngày), tổng tiền, ghi chú]
const RENTALS = [
  ['TMH-1028', 'KH-001', 'PC-001', 'ACTIVE', -25, 2, 6_500_000, 'Thuê dài hạn'],
  ['TMH-1027', 'KH-002', 'BP-008', 'ACTIVE', -20, 5, 5_200_000, ''],
  ['TMH-1026', 'KH-003', 'PC-002', 'EXPIRED', -35, -2, 4_200_000, 'Cần liên hệ'],
  ['TMH-1025', 'KH-004', 'PC-003', 'RESERVED', 1, 4, 1_350_000, ''],
  ['TMH-1024', 'KH-005', 'BP-012', 'COMPLETED', -12, -8, 1_280_000, ''],
] as const;

// [mã phiếu, đơn, số tiền, phương thức, ngày]
const PAYMENTS = [
  ['TT-2038', 'TMH-1028', 4_500_000, 'BANK', -2],
  ['TT-2037', 'TMH-1027', 5_200_000, 'WALLET', -4],
  ['TT-2036', 'TMH-1026', 3_200_000, 'CASH', -8],
  ['TT-2035', 'TMH-1025', 500_000, 'CASH', -1],
  ['TT-2034', 'TMH-1024', 1_280_000, 'CASH', -9],
] as const;

// [mã, máy, sự cố, trạng thái, ưu tiên, kỹ thuật viên, chi phí, ghi chú]
const REPAIRS = [
  ['SC-0042', 'BP-012', 'Không nhận kết nối thiết bị', 'IN_PROGRESS', 'HIGH', 'Lê Minh Tuấn', 430_000, ''],
  ['SC-0041', 'PC-005', 'Máy không lên nguồn', 'IN_PROGRESS', 'HIGH', 'Lê Minh Tuấn', 1_050_000, 'Chờ linh kiện nguồn 650W'],
  ['SC-0040', 'PC-002', 'Thay bàn phím', 'DONE', 'LOW', 'Trần Thu Hà', 230_000, ''],
] as const;

// [mã, tên, nhóm, đơn vị, tồn tối thiểu, vị trí, số lượng nhập, giá nhập]
const PARTS = [
  ['LK-RAM8', 'RAM DDR4 8GB', 'RAM', 'thanh', 2, 'Tủ linh kiện A1', 4, 450_000],
  ['LK-SSD512', 'SSD NVMe 512GB', 'STORAGE', 'cái', 2, 'Tủ linh kiện A2', 3, 900_000],
  ['LK-PSU650', 'Nguồn 650W 80 Plus', 'PSU', 'cái', 1, 'Kho kỹ thuật', 1, 1_100_000],
  ['LK-USB', 'Cáp USB cho boxphone', 'CABLE', 'sợi', 10, 'Tầng 2 · Kệ phụ', 20, 25_000],
] as const;

const ids = new Map<string, string>();
const idOf = (code: string) => {
  const id = ids.get(code);
  if (!id) throw new Error(`Thiếu mã ${code}`);
  return id;
};

runTransaction(() => {
  let ownerId = '';
  for (const [name, username, role] of STAFF) {
    const id = makeId();
    if (role === 'OWNER') ownerId = id;
    db.prepare(`
      INSERT INTO admins (id, name, email, username, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(id, name, `${username}@thuemayhub.com`, username, hashPassword(PASSWORD), role, now);
  }

  for (const [code, name, type, category, location, monthly, hourly] of DEVICES) {
    const id = makeId();
    ids.set(code, id);
    db.prepare(`
      INSERT INTO devices (id, code, name, type, category, location, monthly_rate, hourly_rate, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)
    `).run(id, code, name, type, category, location, monthly, hourly, now, now);
  }

  // Số dư ví không lưu cột: nạp đủ để sau các lần trả bằng ví còn đúng số dư cuối.
  const walletSpent = new Map<string, number>();
  for (const [, rental, amount, method] of PAYMENTS) {
    if (method !== 'WALLET') continue;
    const customer = RENTALS.find((r) => r[0] === rental)![1];
    walletSpent.set(customer, (walletSpent.get(customer) ?? 0) + amount);
  }
  for (const [code, name, phone, email, wallet, blocked] of CUSTOMERS) {
    const id = makeId();
    ids.set(code, id);
    db.prepare(`
      INSERT INTO customers (id, code, name, phone, email, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, name, phone, email, blocked ? 'BLOCKED' : 'ACTIVE', at(-60), now);
    const deposit = wallet + (walletSpent.get(code) ?? 0);
    if (deposit > 0) {
      db.prepare(`
        INSERT INTO financial_transactions
          (id, code, customer_id, kind, payment_method, cash_change, wallet_change, revenue_change, notes, created_by, occurred_at, created_at)
        VALUES (?, ?, ?, 'DEPOSIT', 'BANK', ?, ?, 0, 'Nạp ví', ?, ?, ?)
      `).run(makeId(), makeCode('GD'), id, deposit, deposit, ownerId, at(-30), now);
    }
  }

  // Tài khoản cổng khách của KH-001 — đăng nhập bằng số điện thoại.
  db.prepare(`
    INSERT INTO customer_accounts (id, customer_id, email, password_hash, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(makeId(), idOf('KH-001'), 'minhanh@email.com', hashPassword(PASSWORD), now, now);

  for (const [code, customer, device, status, from, to, total, note] of RENTALS) {
    const id = makeId();
    ids.set(code, id);
    db.prepare(`
      INSERT INTO rentals (id, code, customer_id, device_id, start_at, end_at, base_amount, total_amount, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, idOf(customer), idOf(device), at(from), at(to), total, total, status, note, at(Math.min(from, 0) - 1), now);
    syncDeviceStatus(idOf(device), status);
  }

  for (const [code, rental, amount, method, day] of PAYMENTS) {
    const r = RENTALS.find((x) => x[0] === rental)!;
    const wallet = method === 'WALLET';
    db.prepare(`
      INSERT INTO financial_transactions
        (id, code, customer_id, rental_id, kind, payment_method, cash_change, wallet_change, revenue_change, created_by, occurred_at, created_at)
      VALUES (?, ?, ?, ?, 'RENTAL_PAYMENT', ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId(), code, idOf(r[1]), idOf(rental), method, wallet ? 0 : amount, wallet ? -amount : 0, amount, ownerId, at(day), now);
  }

  // Yêu cầu thuê khách gửi từ cổng, đang chờ duyệt.
  db.prepare(`
    INSERT INTO booking_requests
      (id, code, customer_id, device_id, billing_mode, requested_start_at, requested_end_at, estimated_amount, status, customer_note, created_at, updated_at)
    VALUES (?, 'TMH-1023', ?, ?, 'MONTHLY', ?, ?, 960000, 'PENDING', 'Cần máy chạy game 3 ngày', ?, ?)
  `).run(makeId(), idOf('KH-004'), idOf('PC-004'), at(0, 14), at(3, 14), now, now);

  for (const [code, device, title, status, priority, vendor, cost, notes] of REPAIRS) {
    const done = status === 'DONE';
    let expenseId: string | null = null;
    if (done) {
      expenseId = makeId();
      db.prepare(`
        INSERT INTO expenses (id, code, category, amount, payment_method, vendor, notes, occurred_at, created_by, created_at)
        VALUES (?, ?, 'MAINTENANCE', ?, 'CASH', ?, ?, ?, ?, ?)
      `).run(expenseId, makeCode('CP'), cost, vendor, `Tiền công phiếu ${code}`, at(-5), ownerId, now);
    }
    db.prepare(`
      INSERT INTO repairs
        (id, code, device_id, title, status, priority, vendor, service_cost, expense_id, device_status_before, notes,
         reported_at, started_at, closed_at, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId(), code, idOf(device), title, status, priority, vendor, cost, expenseId, notes,
      at(done ? -7 : -3), at(done ? -7 : -3), done ? at(-5) : null, ownerId, now, now);
  }
  db.prepare("UPDATE devices SET status = 'MAINTENANCE' WHERE id = ?").run(idOf('BP-012'));
  db.prepare("UPDATE devices SET status = 'OFFLINE' WHERE id = ?").run(idOf('PC-005'));

  for (const [code, name, category, unit, min, location, qty, cost] of PARTS) {
    const id = makeId();
    const expenseId = makeId();
    db.prepare(`
      INSERT INTO parts (id, code, name, category, unit, min_quantity, location, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, name, category, unit, min, location, now, now);
    db.prepare(`
      INSERT INTO expenses (id, code, category, amount, payment_method, vendor, notes, occurred_at, created_by, created_at)
      VALUES (?, ?, 'PARTS', ?, 'BANK', 'Nhà cung cấp linh kiện', ?, ?, ?, ?)
    `).run(expenseId, makeCode('CP'), qty * cost, `Nhập ${qty} ${unit} ${name}`, at(-20), ownerId, now);
    db.prepare(`
      INSERT INTO part_movements (id, part_id, kind, quantity, unit_cost, expense_id, notes, created_by, occurred_at, created_at)
      VALUES (?, ?, 'PURCHASE', ?, ?, ?, 'Nhập kho ban đầu', ?, ?, ?)
    `).run(makeId(), id, qty, cost, expenseId, ownerId, at(-20), now);
  }

  writeSettings({
    'shop.name': 'Thuê Máy Hub',
    'shop.address': 'Tầng 1 – 2, Toà nhà Công nghệ Hub, TP. Hồ Chí Minh',
    'shop.hotline': '0901 000 001',
    'shop.email': 'hotro@thuemayhub.com',
    'shop.hours': '08:00 – 22:00 các ngày trong tuần',
  });

  // Một yêu cầu gia hạn và một ticket hỗ trợ đang chờ, để màn quầy có việc để xử lý ngay.
  const rental = db.prepare("SELECT id, customer_id, end_at FROM rentals WHERE code = 'TMH-1027'").get() as
    { id: string; customer_id: string; end_at: string };
  db.prepare(`
    INSERT INTO extension_requests
      (id, code, customer_id, rental_id, current_end_at, requested_end_at, status, customer_note, created_at, updated_at)
    VALUES (?, 'GH-1001', ?, ?, ?, ?, 'PENDING', 'Em cần thêm 1 tuần để chạy xong dự án', ?, ?)
  `).run(makeId(), rental.customer_id, rental.id, rental.end_at,
    new Date(new Date(rental.end_at).getTime() + 7 * 86_400_000).toISOString(), now, now);

  const ticketId = makeId();
  db.prepare(`
    INSERT INTO support_tickets
      (id, code, customer_id, rental_id, subject, category, priority, status, last_message_at, created_at, updated_at)
    VALUES (?, 'HT-1001', ?, ?, 'Máy chạy chậm khi mở nhiều tab', 'TECHNICAL', 'NORMAL', 'OPEN', ?, ?, ?)
  `).run(ticketId, idOf('KH-001'), (db.prepare("SELECT id FROM rentals WHERE code = 'TMH-1028'").get() as { id: string }).id,
    at(-1), at(-1), at(-1));
  db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, author_type, author_id, body, created_at)
    VALUES (?, ?, 'CUSTOMER', ?, 'Máy PC-001 mở trình duyệt hơn 20 tab thì bị giật, nhờ cửa hàng kiểm tra giúp.', ?)
  `).run(makeId(), ticketId, idOf('KH-001'), at(-1));
});

console.log(`[seed] Đã tạo dữ liệu mẫu trong ${DB_PATH}`);
console.log('[seed] Đăng nhập: admin / phat / thanh / vinh / anh, hoặc khách 0902345678 — mật khẩu demo123');

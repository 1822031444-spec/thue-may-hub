import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const databasePath = resolve(process.env.DATABASE_PATH || './data/thue-may.db');
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
// busy_timeout: bộ quét khoá mạng ghi database mỗi phút, có lúc trùng đúng thao
// tác của người dùng. Không đặt thì bên đến sau báo lỗi ngay thay vì chờ; 5 giây
// là thừa sức cho mọi thao tác trong app này.
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    credit_limit INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('PC', 'BOXPHONE')),
    specs TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    access_note TEXT NOT NULL DEFAULT '',
    hourly_rate INTEGER NOT NULL DEFAULT 0,
    monthly_rate INTEGER NOT NULL DEFAULT 0,
    purchase_price INTEGER NOT NULL DEFAULT 0,
    purchased_at TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rentals (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    device_id TEXT NOT NULL REFERENCES devices(id),
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    base_amount INTEGER NOT NULL DEFAULT 0,
    surcharge INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'RESERVED',
    access_note TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  /*
   * Mỗi lần gia hạn một đơn thuê là một dòng ở đây.
   *
   * Không cộng thẳng vào cột total_amount của rentals rồi thôi: làm vậy thì sau
   * vài tháng không ai biết con số tổng đó từ đâu ra, gồm mấy lần gia hạn, mỗi
   * lần bao lâu và giá nào. Ghi thành bút toán giống cách kho linh kiện và sổ
   * tiền đang làm; total_amount chỉ là tổng cộng lại cho nhanh.
   */
  CREATE TABLE IF NOT EXISTS rental_periods (
    id TEXT PRIMARY KEY,
    rental_id TEXT NOT NULL REFERENCES rentals(id),
    unit TEXT NOT NULL CHECK(unit IN ('HOUR', 'DAY', 'WEEK', 'MONTH')),
    quantity INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT REFERENCES admins(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id),
    rental_id TEXT REFERENCES rentals(id),
    kind TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'OTHER',
    cash_change INTEGER NOT NULL DEFAULT 0,
    wallet_change INTEGER NOT NULL DEFAULT 0,
    revenue_change INTEGER NOT NULL DEFAULT 0,
    reference TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT REFERENCES admins(id),
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'BANK',
    vendor TEXT NOT NULL DEFAULT '',
    reference TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL,
    created_by TEXT REFERENCES admins(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT REFERENCES admins(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customer_accounts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    email_verified_at TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customer_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS booking_requests (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    device_id TEXT NOT NULL REFERENCES devices(id),
    billing_mode TEXT NOT NULL CHECK(billing_mode IN ('HOURLY', 'MONTHLY')),
    requested_start_at TEXT NOT NULL,
    requested_end_at TEXT NOT NULL,
    estimated_amount INTEGER NOT NULL DEFAULT 0,
    quoted_amount INTEGER,
    status TEXT NOT NULL DEFAULT 'PENDING',
    customer_note TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    rental_id TEXT REFERENCES rentals(id),
    reviewed_by TEXT REFERENCES admins(id),
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS extension_requests (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    rental_id TEXT NOT NULL REFERENCES rentals(id),
    current_end_at TEXT NOT NULL,
    requested_end_at TEXT NOT NULL,
    additional_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    customer_note TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    reviewed_by TEXT REFERENCES admins(id),
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    rental_id TEXT REFERENCES rentals(id),
    subject TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'OPEN',
    last_message_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK(author_type IN ('CUSTOMER', 'ADMIN')),
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customer_notifications (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    dedupe_key TEXT UNIQUE,
    read_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  /* Nhật ký mọi lần khoá/mở mạng, kể cả lần thất bại: khi khách kêu "máy em vẫn
     vào được" thì đây là chỗ duy nhất trả lời được lệnh đã chạy chưa và báo gì. */
  CREATE TABLE IF NOT EXISTS network_lock_events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    rental_id TEXT REFERENCES rentals(id),
    action TEXT NOT NULL CHECK(action IN ('LOCK', 'UNLOCK')),
    source TEXT NOT NULL CHECK(source IN ('AUTO', 'MANUAL')),
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED')),
    command TEXT NOT NULL DEFAULT '',
    output TEXT NOT NULL DEFAULT '',
    created_by TEXT REFERENCES admins(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repairs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    device_id TEXT NOT NULL REFERENCES devices(id),
    title TEXT NOT NULL,
    symptom TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'REPORTED',
    vendor TEXT NOT NULL DEFAULT '',
    service_cost INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    reference TEXT NOT NULL DEFAULT '',
    expense_id TEXT REFERENCES expenses(id),
    device_status_before TEXT NOT NULL DEFAULT '',
    resolution TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    reported_at TEXT NOT NULL,
    started_at TEXT,
    closed_at TEXT,
    created_by TEXT REFERENCES admins(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'OTHER',
    unit TEXT NOT NULL DEFAULT 'cái',
    min_quantity INTEGER NOT NULL DEFAULT 0,
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  /* Tồn kho và giá vốn không lưu thành cột riêng mà luôn tính lại từ bảng này,
     để số liệu không bao giờ lệch với lịch sử nhập xuất. */
  CREATE TABLE IF NOT EXISTS part_movements (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    repair_id TEXT REFERENCES repairs(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK(kind IN ('PURCHASE', 'CONSUME', 'RETURN', 'ADJUST')),
    quantity INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL DEFAULT 0,
    expense_id TEXT REFERENCES expenses(id),
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT REFERENCES admins(id),
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  /* Khách tự nạp ví bằng chuyển khoản (VietQR). Tiền chỉ vào ví khi chủ xác nhận
     đã thấy tiền về tài khoản; lúc đó mới sinh dòng DEPOSIT trong financial_transactions.
     Tài khoản nhận được chốt vào từng yêu cầu: đổi tài khoản sau đó thì mã QR của
     yêu cầu cũ vẫn chỉ đúng nơi khách đã chuyển. */
  CREATE TABLE IF NOT EXISTS wallet_topups (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    amount INTEGER NOT NULL,
    transfer_note TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    bank_bin TEXT NOT NULL,
    bank_account_no TEXT NOT NULL,
    bank_account_name TEXT NOT NULL DEFAULT '',
    customer_paid_at TEXT,
    received_amount INTEGER,
    transaction_id TEXT REFERENCES financial_transactions(id),
    admin_note TEXT NOT NULL DEFAULT '',
    reviewed_by TEXT REFERENCES admins(id),
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_topups_customer ON wallet_topups(customer_id, status);
  CREATE INDEX IF NOT EXISTS idx_topups_status ON wallet_topups(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_rentals_device ON rentals(device_id);
  CREATE INDEX IF NOT EXISTS idx_rentals_customer ON rentals(customer_id);
  CREATE INDEX IF NOT EXISTS idx_rental_periods_rental ON rental_periods(rental_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_customer ON financial_transactions(customer_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_rental ON financial_transactions(rental_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_time ON financial_transactions(occurred_at);
  CREATE INDEX IF NOT EXISTS idx_expenses_time ON expenses(occurred_at);
  CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_booking_customer ON booking_requests(customer_id);
  CREATE INDEX IF NOT EXISTS idx_booking_status ON booking_requests(status);
  CREATE INDEX IF NOT EXISTS idx_extension_status ON extension_requests(status);
  CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id);
  CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_customer ON customer_notifications(customer_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_repairs_device ON repairs(device_id);
  CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
  CREATE INDEX IF NOT EXISTS idx_part_movements_part ON part_movements(part_id);
  CREATE INDEX IF NOT EXISTS idx_part_movements_repair ON part_movements(repair_id);
  CREATE INDEX IF NOT EXISTS idx_lock_events_device ON network_lock_events(device_id, created_at);
`);

/**
 * Thêm cột vào bảng đã tồn tại trên máy đang chạy bản cũ.
 * `CREATE TABLE IF NOT EXISTS` không đụng tới bảng cũ, nên cột mới phải tự thêm,
 * nếu không người dùng nâng cấp app sẽ mất dữ liệu hoặc app không khởi động được.
 */
function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((item) => item.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('devices', 'network_status', "TEXT NOT NULL DEFAULT 'OPEN'");
ensureColumn('devices', 'network_locked_at', 'TEXT');
ensureColumn('admins', 'status', "TEXT NOT NULL DEFAULT 'ACTIVE'");
// Giá theo ngày và theo tuần: nhiều khách thuê ngắn hạn, không phải ai cũng theo tháng.
ensureColumn('devices', 'daily_rate', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('devices', 'weekly_rate', 'INTEGER NOT NULL DEFAULT 0');
// Các cột giao diện ThueMayHub-FE cần: đăng nhập bằng username, hồ sơ khách có
// địa chỉ và CCCD, máy có phân nhóm và vị trí đặt, phiếu sửa có mức ưu tiên.
ensureColumn('admins', 'username', "TEXT NOT NULL DEFAULT ''");
ensureColumn('customers', 'address', "TEXT NOT NULL DEFAULT ''");
ensureColumn('customers', 'identity_number', "TEXT NOT NULL DEFAULT ''");
ensureColumn('devices', 'category', "TEXT NOT NULL DEFAULT ''");
ensureColumn('devices', 'location', "TEXT NOT NULL DEFAULT ''");
ensureColumn('repairs', 'priority', "TEXT NOT NULL DEFAULT 'MEDIUM'");
// Khách gửi yêu cầu thuê kèm số Zalo/điện thoại và cách nhận máy (UltraViewer…), để
// quầy biết liên hệ ai, qua kênh nào để giao máy. Duyệt yêu cầu thì chép sang đơn thuê.
for (const table of ['booking_requests', 'rentals']) {
  ensureColumn(table, 'contact_phone', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(table, 'contact_channel', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(table, 'handover_method', "TEXT NOT NULL DEFAULT ''");
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeId() {
  return randomUUID();
}

export function makeCode(prefix: string) {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

export function runTransaction(action: () => void) {
  db.exec('BEGIN IMMEDIATE');
  try {
    action();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function seedInitialAdmin() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM admins').get() as { count: number };
  if (existing.count > 0) return;

  const email = (process.env.ADMIN_EMAIL || 'admin@thuemay.local').toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123';
  db.prepare(`
    INSERT INTO admins (id, name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'OWNER', ?)
  `).run(makeId(), 'Chủ hệ thống', email, hashPassword(password), nowIso());

  console.warn(`[setup] Đã tạo tài khoản quản trị: ${email}`);
  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.warn('[setup] Mật khẩu tạm: Admin@123 — hãy đổi qua biến môi trường trước khi triển khai thật.');
  }
}

export function audit(adminId: string, action: string, entityType: string, entityId: string, detail = '') {
  db.prepare(`
    INSERT INTO audit_logs (id, admin_id, action, entity_type, entity_id, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(makeId(), adminId, action, entityType, entityId, detail, nowIso());
}

export function getWalletBalance(customerId: string) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(wallet_change), 0) AS balance
    FROM financial_transactions WHERE customer_id = ?
  `).get(customerId) as { balance: number };
  return Number(row.balance);
}

export function getRentalPaid(rentalId: string) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(revenue_change), 0) AS paid
    FROM financial_transactions WHERE rental_id = ?
  `).get(rentalId) as { paid: number };
  return Number(row.paid);
}

export function syncDeviceStatus(deviceId: string, rentalStatus: string) {
  const deviceStatus = rentalStatus === 'ACTIVE'
    ? 'RENTED'
    : rentalStatus === 'RESERVED'
      ? 'RESERVED'
      : 'AVAILABLE';
  db.prepare('UPDATE devices SET status = ?, updated_at = ? WHERE id = ?')
    .run(deviceStatus, nowIso(), deviceId);
}

/**
 * Ghi một khoản chi vào sổ chi phí và trả lại id để bên gọi gắn tham chiếu.
 *
 * Tiền sửa chữa và tiền mua linh kiện đều đi qua đây nên chỉ có đúng một nơi
 * sinh ra chi phí; báo cáo lợi nhuận không phải cộng thêm nguồn nào khác.
 */
export function recordExpense(input: {
  adminId: string;
  category: string;
  amount: number;
  paymentMethod: string;
  vendor?: string;
  reference?: string;
  notes?: string;
  occurredAt?: string;
}) {
  const id = makeId();
  const code = makeCode('CP');
  db.prepare(`
    INSERT INTO expenses
      (id, code, category, amount, payment_method, vendor, reference, notes, occurred_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, input.category, input.amount, input.paymentMethod, input.vendor || '', input.reference || '',
    input.notes || '', input.occurredAt || nowIso(), input.adminId, nowIso());
  return { id, code };
}

/**
 * Tồn kho và giá vốn bình quân của một linh kiện, tính lại từ lịch sử nhập xuất.
 * Giá vốn chỉ lấy từ các lần nhập mua, vì đó là tiền thật đã bỏ ra.
 */
export function partStock(partId: string) {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(quantity), 0) AS quantity,
      COALESCE(SUM(CASE WHEN kind = 'PURCHASE' THEN quantity ELSE 0 END), 0) AS purchased_quantity,
      COALESCE(SUM(CASE WHEN kind = 'PURCHASE' THEN quantity * unit_cost ELSE 0 END), 0) AS purchased_value
    FROM part_movements WHERE part_id = ?
  `).get(partId) as { quantity: number; purchased_quantity: number; purchased_value: number };

  const quantity = Number(row.quantity);
  const purchasedQuantity = Number(row.purchased_quantity);
  const averageCost = purchasedQuantity > 0 ? Math.round(Number(row.purchased_value) / purchasedQuantity) : 0;
  return { quantity, averageCost };
}

/* ---- Cấu hình hệ thống --------------------------------------------------- */

export function readSettings() {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string>;
}

export function writeSettings(values: Record<string, string>) {
  const time = nowIso();
  const statement = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  for (const [key, value] of Object.entries(values)) statement.run(key, value, time);
}

export function notifyCustomer(customerId: string, kind: string, title: string, body: string, link = '', dedupeKey?: string) {
  db.prepare(`
    INSERT OR IGNORE INTO customer_notifications
      (id, customer_id, kind, title, body, link, dedupe_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(makeId(), customerId, kind, title, body, link, dedupeKey || null, nowIso());
}

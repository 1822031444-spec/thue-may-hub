import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z, ZodError } from 'zod';
import {
  audit,
  db,
  getRentalPaid,
  getWalletBalance,
  hashPassword,
  makeCode,
  makeId,
  nowIso,
  partStock,
  recordExpense,
  runTransaction,
  seedInitialAdmin,
  syncDeviceStatus,
  verifyPassword,
  writeSettings,
} from './database.ts';
import { backupStatus, runBackup, saveBackupSettings, startBackupScheduler } from './backup.ts';
import { createAdminServiceRouter, createCustomerRouter } from './customer.ts';
import { createHubRouter } from './hub.ts';
import { createAdminTopupRouter } from './topup.ts';
import {
  buildCommand,
  devicesDueForLock,
  networkLockSettings,
  runNetworkAction,
  startNetworkLockScheduler,
  sweepNetworkLocks,
} from './network-lock.ts';
import { can, isOwner, type Permission } from './permissions.ts';
import { addPeriod, PERIOD_UNITS, UNIT_LABELS } from './rental-period.ts';
import { sortByName } from './sort.ts';
import { expiringRentals } from './expiring.ts';
import {
  buildDigest, discoverChats, saveTelegramSettings, sendTelegram,
  startTelegramScheduler, telegramSettings, telegramStatus,
} from './telegram.ts';

type Admin = { id: string; name: string; email: string; role: string };
type AuthedRequest = Request & { admin?: Admin };

const app = express();
// Bản thử dùng cổng khác bản chính (8787) để hai bản chạy song song được.
const port = Number(process.env.PORT || 8788);

seedInitialAdmin();
db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
startNetworkLockScheduler();
startBackupScheduler();
startTelegramScheduler();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies.session_id as string | undefined;
  if (!sessionId) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });

  const admin = db.prepare(`
    SELECT a.id, a.name, a.email, a.role, a.status
    FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, nowIso()) as (Admin & { status: string }) | undefined;
  if (!admin) return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn.' });
  // Khoá một tài khoản phải có hiệu lực ngay, kể cả khi người đó đang mở sẵn app.
  if (admin.status !== 'ACTIVE') {
    return res.status(401).json({ message: 'Tài khoản đã bị khoá. Liên hệ chủ hệ thống.' });
  }
  req.admin = admin;
  next();
}

/** Chặn ngay tại tầng API, không dựa vào việc giao diện có ẩn nút hay không. */
function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!can(req.admin?.role, permission)) {
      return res.status(403).json({ message: 'Tài khoản của bạn không có quyền thực hiện việc này.' });
    }
    return next();
  };
}

function routeId(req: Request) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

function rows<T>(statement: string, ...params: Array<string | number | null>) {
  return db.prepare(statement).all(...params) as T[];
}

/* ---- Lọc theo kỳ và phân trang ------------------------------------------- */

/** Mốc trên khi người dùng không chọn: so chuỗi ISO nên phải lớn hơn mọi ngày thật. */
const FAR_FUTURE = '2999-12-31T23:59:59.999Z';

/** Khoảng thời gian lọc. Thiếu mốc nào thì bên đó không giới hạn. */
function readRange(query: Request['query']) {
  const parse = (value: unknown) => {
    if (typeof value !== 'string' || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };
  return { from: parse(query.from), to: parse(query.to) };
}

function monthStartIso() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

/**
 * Sổ tiền phình theo từng lần thu chi. Trước đây chặn cứng 300 dòng nên dữ liệu
 * cũ biến mất mà không báo gì — với số liệu tiền thì đó là kiểu hỏng tệ nhất.
 * Nay trả kèm tổng số dòng để giao diện nói thật đang xem bao nhiêu trên bao nhiêu.
 */
function readPaging(query: Request['query']) {
  const limit = Math.min(Math.max(Math.trunc(Number(query.limit)) || 100, 1), 500);
  const offset = Math.max(Math.trunc(Number(query.offset)) || 0, 0);
  return { limit, offset };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, time: nowIso() }));

app.post('/api/auth/login', (req, res) => {
  const input = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(200),
  }).parse(req.body);
  const record = db.prepare('SELECT * FROM admins WHERE email = ?')
    .get(input.email.toLowerCase()) as (Admin & { password_hash: string; status: string }) | undefined;
  if (!record || !verifyPassword(input.password, record.password_hash)) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
  }
  if (record.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Tài khoản đã bị khoá. Liên hệ chủ hệ thống.' });
  }

  const sessionId = randomBytes(32).toString('hex');
  const days = Math.max(1, Number(process.env.SESSION_DAYS || 7));
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  db.prepare('INSERT INTO sessions (id, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(sessionId, record.id, expiresAt, nowIso());
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: days * 86_400_000,
  });
  audit(record.id, 'LOGIN', 'SESSION', sessionId);
  return res.json({ id: record.id, name: record.name, email: record.email, role: record.role });
});

app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res) => {
  const sessionId = req.cookies.session_id as string;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  res.clearCookie('session_id');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => res.json(req.admin));

app.use('/api/customer', createCustomerRouter());
// Giao diện ThueMayHub-FE: đăng nhập chung ba vai trò, hồ sơ khách, danh sách phiếu thu.
app.use('/api/hub', createHubRouter());

app.use('/api', requireAuth);

app.post('/api/auth/change-password', (req: AuthedRequest, res) => {
  const input = z.object({
    currentPassword: z.string().min(6).max(200),
    newPassword: z.string().min(10).max(200),
  }).parse(req.body);
  const record = db.prepare('SELECT password_hash FROM admins WHERE id = ?').get(req.admin!.id) as { password_hash: string };
  if (!verifyPassword(input.currentPassword, record.password_hash)) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
  }
  if (!/[A-Z]/.test(input.newPassword) || !/[a-z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
    return res.status(400).json({ message: 'Mật khẩu mới cần có chữ hoa, chữ thường và chữ số.' });
  }
  const currentSession = req.cookies.session_id as string;
  runTransaction(() => {
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(input.newPassword), req.admin!.id);
    db.prepare('DELETE FROM sessions WHERE admin_id = ? AND id != ?').run(req.admin!.id, currentSession);
  });
  audit(req.admin!.id, 'CHANGE_PASSWORD', 'ADMIN', req.admin!.id);
  res.json({ ok: true });
});

app.use('/api/service-desk', createAdminServiceRouter());
// Nạp ví qua chuyển khoản VietQR: tài khoản nhận, duyệt yêu cầu nạp của khách.
app.use('/api/topups', createAdminTopupRouter());

app.get('/api/dashboard', (req: AuthedRequest, res) => {
  // Không chọn kỳ thì vẫn là tháng hiện tại như trước, nên mọi chỗ gọi cũ không đổi.
  const range = readRange(req.query);
  const start = range.from ?? monthStartIso();
  const end = range.to ?? FAR_FUTURE;

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN occurred_at BETWEEN ? AND ? THEN revenue_change ELSE 0 END), 0) AS month_revenue,
      COALESCE(SUM(CASE WHEN occurred_at BETWEEN ? AND ? THEN cash_change ELSE 0 END), 0) AS month_cash,
      -- Số dư ví là số dư đang nợ khách tại thời điểm này, không phải con số của
      -- một kỳ, nên cố tình không lọc theo khoảng thời gian.
      COALESCE(SUM(wallet_change), 0) AS wallet_liability
    FROM financial_transactions
  `).get(start, end, start, end) as { month_revenue: number; month_cash: number; wallet_liability: number };
  const expense = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE occurred_at BETWEEN ? AND ?')
    .get(start, end) as { total: number };
  const repairSpend = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
    WHERE occurred_at BETWEEN ? AND ? AND category IN ('MAINTENANCE', 'PARTS')
  `).get(start, end) as { total: number };
  const openRepairs = db.prepare(`
    SELECT COUNT(*) AS count FROM repairs WHERE status IN ('REPORTED', 'IN_PROGRESS')
  `).get() as { count: number };
  const lowStockParts = db.prepare(`
    SELECT COUNT(*) AS count FROM parts p
    WHERE p.min_quantity > 0
      AND COALESCE((SELECT SUM(quantity) FROM part_movements WHERE part_id = p.id), 0) < p.min_quantity
  `).get() as { count: number };
  const lockSettings = networkLockSettings();
  const devicesDue = lockSettings.enabled ? devicesDueForLock(lockSettings.graceMinutes).length : 0;
  const devicesLocked = db.prepare("SELECT COUNT(*) AS count FROM devices WHERE network_status = 'LOCKED'")
    .get() as { count: number };
  const devices = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'RENTED' THEN 1 ELSE 0 END) AS rented,
      SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance
    FROM devices WHERE status != 'RETIRED'
  `).get() as { total: number; rented: number; maintenance: number };
  const customerCount = db.prepare("SELECT COUNT(*) AS count FROM customers WHERE status = 'ACTIVE'").get() as { count: number };
  const receivable = db.prepare(`
    SELECT COALESCE(SUM(MAX(r.total_amount - COALESCE(p.paid, 0), 0)), 0) AS total
    FROM rentals r
    LEFT JOIN (
      SELECT rental_id, SUM(revenue_change) AS paid
      FROM financial_transactions GROUP BY rental_id
    ) p ON p.rental_id = r.id
    WHERE r.status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'EXPIRED')
  `).get() as { total: number };
  const upcoming = rows(`
    SELECT r.id, r.code, r.end_at, r.status, c.name AS customer_name, d.name AS device_name
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    JOIN devices d ON d.id = r.device_id
    WHERE r.status IN ('RESERVED', 'ACTIVE')
    ORDER BY r.end_at ASC LIMIT 6
  `);
  const revenueByDevice = rows(`
    SELECT d.id, d.code, d.name, d.type, COALESCE(SUM(t.revenue_change), 0) AS revenue
    FROM devices d
    LEFT JOIN rentals r ON r.device_id = d.id
    LEFT JOIN financial_transactions t ON t.rental_id = r.id AND t.occurred_at BETWEEN ? AND ?
    GROUP BY d.id ORDER BY revenue DESC LIMIT 6
  `, start, end);

  // Nhân viên thấy phần vận hành nhưng không thấy các con số tiền tổng của tiệm.
  // Lọc ngay tại server để dữ liệu không bao giờ rời máy chủ, thay vì chỉ ẩn ở giao diện.
  const money = can(req.admin?.role, 'finance.view');
  const moneyFields = money ? {
    monthRevenue: Number(totals.month_revenue),
    monthCash: Number(totals.month_cash),
    monthExpenses: Number(expense.total),
    monthProfit: Number(totals.month_revenue) - Number(expense.total),
    walletLiability: Number(totals.wallet_liability),
    receivable: Number(receivable.total),
    monthRepairSpend: Number(repairSpend.total),
    revenueByDevice,
  } : {};

  res.json({
    ...moneyFields,
    // Giao diện hiển thị lại đúng kỳ đang tính, để không ai nhìn nhầm số tháng
    // trước thành số tháng này.
    period: { from: start, to: end === FAR_FUTURE ? null : end },
    canSeeMoney: money,
    deviceTotal: Number(devices.total),
    deviceRented: Number(devices.rented || 0),
    deviceMaintenance: Number(devices.maintenance || 0),
    customerCount: Number(customerCount.count),
    openRepairs: Number(openRepairs.count),
    lowStockParts: Number(lowStockParts.count),
    devicesDueForLock: devicesDue,
    devicesLocked: Number(devicesLocked.count),
    upcoming,
  });
});

app.get('/api/customers', (_req, res) => {
  const data = rows(`
    SELECT c.*,
      COALESCE(t.wallet_balance, 0) AS wallet_balance,
      COALESCE(t.total_spent, 0) AS total_spent,
      COALESCE(r.rental_count, 0) AS rental_count
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, SUM(wallet_change) AS wallet_balance, SUM(revenue_change) AS total_spent
      FROM financial_transactions GROUP BY customer_id
    ) t ON t.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, COUNT(*) AS rental_count FROM rentals GROUP BY customer_id
    ) r ON r.customer_id = c.id
    ORDER BY c.created_at DESC
  `);
  res.json(data);
});

app.post('/api/customers', (req: AuthedRequest, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).default(''),
    email: z.string().trim().max(160).default(''),
    company: z.string().trim().max(160).default(''),
    creditLimit: z.coerce.number().int().nonnegative().default(0),
    notes: z.string().trim().max(1000).default(''),
    address: z.string().trim().max(300).default(''),
    identityNumber: z.string().trim().max(20).default(''),
  }).parse(req.body);
  if (input.email && !z.string().email().safeParse(input.email).success) {
    return res.status(400).json({ message: 'Email không hợp lệ.' });
  }
  const id = makeId();
  const time = nowIso();
  const code = makeCode('KH');
  db.prepare(`
    INSERT INTO customers (id, code, name, phone, email, company, credit_limit, notes, address, identity_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, input.name, input.phone, input.email, input.company, input.creditLimit, input.notes,
    input.address, input.identityNumber, time, time);
  audit(req.admin!.id, 'CREATE', 'CUSTOMER', id, code);
  res.status(201).json({ id, code });
});

/**
 * Sửa hồ sơ khách. Trường nào không gửi thì giữ nguyên: giao diện mới chỉ gửi phần
 * nó sửa (ví dụ chỉ khoá khách), không được vì thế mà xoá mất ghi chú hay hạn mức.
 */
app.patch('/api/customers/:id', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().max(160).optional(),
    company: z.string().trim().max(160).optional(),
    creditLimit: z.coerce.number().int().nonnegative().optional(),
    status: z.enum(['ACTIVE', 'LIMITED', 'BLOCKED']).optional(),
    notes: z.string().trim().max(1000).optional(),
    address: z.string().trim().max(300).optional(),
    identityNumber: z.string().trim().max(20).optional(),
  }).parse(req.body);
  const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Record<string, string | number> | undefined;
  if (!current) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
  if (input.email && !z.string().email().safeParse(input.email).success) {
    return res.status(400).json({ message: 'Email không hợp lệ.' });
  }
  if (input.identityNumber && !/^\d{9,12}$/.test(input.identityNumber)) {
    return res.status(400).json({ message: 'Số CCCD gồm 9 đến 12 chữ số.' });
  }
  const next = {
    name: input.name ?? current.name,
    phone: input.phone ?? current.phone,
    email: input.email ?? current.email,
    company: input.company ?? current.company,
    creditLimit: input.creditLimit ?? current.credit_limit,
    status: input.status ?? current.status,
    notes: input.notes ?? current.notes,
    address: input.address ?? current.address ?? '',
    identityNumber: input.identityNumber ?? current.identity_number ?? '',
  };
  db.prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, company = ?, credit_limit = ?, status = ?, notes = ?,
      address = ?, identity_number = ?, updated_at = ?
    WHERE id = ?
  `).run(next.name, next.phone, next.email, next.company, next.creditLimit, next.status, next.notes,
    next.address, next.identityNumber, nowIso(), id);
  audit(req.admin!.id, 'UPDATE', 'CUSTOMER', id, String(next.status));
  res.json({ ok: true });
});

app.post('/api/customers/:id/deposit', requirePermission('customer.deposit'), (req: AuthedRequest, res) => {
  const customerId = routeId(req);
  const input = z.object({
    amount: z.coerce.number().int().positive(),
    paymentMethod: z.enum(['BANK', 'CASH', 'OTHER']).default('BANK'),
    reference: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(500).default(''),
  }).parse(req.body);
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
  const id = makeId();
  const code = makeCode('GD');
  const time = nowIso();
  db.prepare(`
    INSERT INTO financial_transactions
      (id, code, customer_id, kind, payment_method, cash_change, wallet_change, revenue_change, reference, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, 'DEPOSIT', ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(id, code, customerId, input.paymentMethod, input.amount, input.amount, input.reference, input.notes, req.admin!.id, time, time);
  audit(req.admin!.id, 'DEPOSIT', 'CUSTOMER', customerId, `${code}: ${input.amount}`);
  res.status(201).json({ id, code, walletBalance: getWalletBalance(customerId) });
});

app.get('/api/devices', (_req, res) => {
  const data = rows(`
    SELECT d.*,
      COALESCE(fin.lifetime_revenue, 0) AS lifetime_revenue,
      COALESCE(rc.rental_count, 0) AS rental_count,
      ar.customer_name AS current_customer,
      ar.end_at AS current_end_at,
      COALESCE(rep.repair_cost, 0) + COALESCE(rep.parts_cost, 0) AS repair_cost,
      COALESCE(rep.repair_count, 0) AS repair_count,
      COALESCE(rep.open_repairs, 0) AS open_repairs
    FROM devices d
    LEFT JOIN (
      SELECT r.device_id, SUM(t.revenue_change) AS lifetime_revenue
      FROM rentals r LEFT JOIN financial_transactions t ON t.rental_id = r.id
      GROUP BY r.device_id
    ) fin ON fin.device_id = d.id
    LEFT JOIN (
      SELECT device_id, COUNT(*) AS rental_count FROM rentals GROUP BY device_id
    ) rc ON rc.device_id = d.id
    LEFT JOIN (
      SELECT r2.device_id, c.name AS customer_name, r2.end_at
      FROM rentals r2 JOIN customers c ON c.id = r2.customer_id
      WHERE r2.status IN ('ACTIVE', 'RESERVED')
    ) ar ON ar.device_id = d.id
    LEFT JOIN (
      SELECT rp.device_id,
        COUNT(*) AS repair_count,
        SUM(CASE WHEN rp.status IN ('REPORTED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS open_repairs,
        SUM(CASE WHEN rp.status IN ('DONE', 'UNREPAIRABLE') THEN rp.service_cost ELSE 0 END) AS repair_cost,
        COALESCE((
          SELECT SUM(-m.quantity * m.unit_cost) FROM part_movements m
          JOIN repairs r3 ON r3.id = m.repair_id
          WHERE r3.device_id = rp.device_id AND m.kind IN ('CONSUME', 'RETURN')
        ), 0) AS parts_cost
      FROM repairs rp GROUP BY rp.device_id
    ) rep ON rep.device_id = d.id
  `);
  // Không ORDER BY trong SQL: SQLite sắp chuỗi thuần nên "Máy 10" đứng trước
  // "Máy 2". Sắp lại theo thứ tự số ngay đây, và đây là nơi duy nhất quyết định
  // thứ tự thiết bị cho toàn bộ giao diện.
  res.json(sortByName(data as Array<{ name?: string }>));
});

app.post('/api/devices', (req: AuthedRequest, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    type: z.enum(['PC', 'BOXPHONE']),
    specs: z.string().trim().max(1000).default(''),
    ipAddress: z.string().trim().max(80).default(''),
    accessNote: z.string().trim().max(500).default(''),
    hourlyRate: z.coerce.number().int().nonnegative().default(0),
    dailyRate: z.coerce.number().int().nonnegative().default(0),
    weeklyRate: z.coerce.number().int().nonnegative().default(0),
    monthlyRate: z.coerce.number().int().nonnegative().default(0),
    purchasePrice: z.coerce.number().int().nonnegative().default(0),
    purchasedAt: z.string().nullable().optional(),
    notes: z.string().trim().max(1000).default(''),
    category: z.string().trim().max(80).default(''),
    location: z.string().trim().max(120).default(''),
  }).parse(req.body);
  const id = makeId();
  const code = makeCode(input.type === 'PC' ? 'PC' : 'BP');
  const time = nowIso();
  db.prepare(`
    INSERT INTO devices
      (id, code, name, type, specs, ip_address, access_note, hourly_rate, daily_rate, weekly_rate, monthly_rate, purchase_price, purchased_at, notes,
       category, location, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, input.name, input.type, input.specs, input.ipAddress, input.accessNote, input.hourlyRate,
    input.dailyRate, input.weeklyRate, input.monthlyRate, input.purchasePrice, input.purchasedAt || null, input.notes,
    input.category, input.location, time, time);
  audit(req.admin!.id, 'CREATE', 'DEVICE', id, code);
  res.status(201).json({ id, code });
});

/** Sửa thiết bị; như sửa khách, trường nào không gửi thì giữ nguyên. */
app.patch('/api/devices/:id', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    specs: z.string().trim().max(1000).optional(),
    ipAddress: z.string().trim().max(80).optional(),
    accessNote: z.string().trim().max(500).optional(),
    hourlyRate: z.coerce.number().int().nonnegative().optional(),
    dailyRate: z.coerce.number().int().nonnegative().optional(),
    weeklyRate: z.coerce.number().int().nonnegative().optional(),
    monthlyRate: z.coerce.number().int().nonnegative().optional(),
    purchasePrice: z.coerce.number().int().nonnegative().optional(),
    // Sửa được loại máy: chọn nhầm PC/Boxphone lúc tạo là chuyện thường, mà loại
    // chỉ ảnh hưởng cách hiển thị nên đổi lúc nào cũng an toàn.
    type: z.enum(['PC', 'BOXPHONE']).optional(),
    status: z.enum(['AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'OFFLINE', 'RETIRED']).optional(),
    notes: z.string().trim().max(1000).optional(),
    category: z.string().trim().max(80).optional(),
    location: z.string().trim().max(120).optional(),
  }).parse(req.body);
  const truoc = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as Record<string, string | number> | undefined;
  if (!truoc) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  const loai = input.type ?? truoc.type;
  const trangThai = input.status ?? truoc.status;

  db.prepare(`
    UPDATE devices SET name = ?, type = ?, specs = ?, ip_address = ?, access_note = ?, hourly_rate = ?,
      daily_rate = ?, weekly_rate = ?, monthly_rate = ?,
      purchase_price = ?, status = ?, notes = ?, category = ?, location = ?, updated_at = ? WHERE id = ?
  `).run(input.name ?? truoc.name, loai, input.specs ?? truoc.specs, input.ipAddress ?? truoc.ip_address,
    input.accessNote ?? truoc.access_note, input.hourlyRate ?? truoc.hourly_rate,
    input.dailyRate ?? truoc.daily_rate, input.weeklyRate ?? truoc.weekly_rate, input.monthlyRate ?? truoc.monthly_rate,
    input.purchasePrice ?? truoc.purchase_price, trangThai, input.notes ?? truoc.notes,
    input.category ?? truoc.category ?? '', input.location ?? truoc.location ?? '', nowIso(), id);
  const doiLoai = loai !== truoc.type ? `, loại ${truoc.type} -> ${loai}` : '';
  audit(req.admin!.id, 'UPDATE', 'DEVICE', id, `${trangThai}${doiLoai}`);
  res.json({ ok: true });
});

/**
 * Xoá hẳn một thiết bị khỏi kho.
 *
 * Chỉ xoá được máy chưa từng dùng vào việc gì. Máy đã có đơn thuê, yêu cầu đặt
 * hay phiếu sửa thì từ chối: xoá đi là mất luôn lịch sử tiền và lịch sử sửa gắn
 * với nó, mà những thứ đó là bằng chứng khi khách thắc mắc. Trường hợp đó dùng
 * trạng thái "Ngừng dùng" — máy biến khỏi danh sách cho thuê nhưng sổ sách còn.
 *
 * Nhật ký khoá mạng thì xoá kèm, vì đó chỉ là log câu lệnh, không có ý nghĩa gì
 * khi thiết bị không còn.
 */
app.delete('/api/devices/:id', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const device = db.prepare('SELECT id, code, name, status FROM devices WHERE id = ?').get(id) as
    { id: string; code: string; name: string; status: string } | undefined;
  if (!device) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });

  if (['RENTED', 'RESERVED'].includes(device.status)) {
    return res.status(409).json({
      message: `${device.name} đang có người thuê hoặc đang giữ chỗ. Kết thúc đơn thuê trước rồi mới xoá được.`,
    });
  }

  const dem = (sql: string) => Number((db.prepare(sql).get(id) as { n: number }).n);
  const soDon = dem('SELECT COUNT(*) AS n FROM rentals WHERE device_id = ?');
  const soYeuCau = dem('SELECT COUNT(*) AS n FROM booking_requests WHERE device_id = ?');
  const soPhieuSua = dem('SELECT COUNT(*) AS n FROM repairs WHERE device_id = ?');

  if (soDon || soYeuCau || soPhieuSua) {
    const chiTiet = [
      soDon ? `${soDon} đơn thuê` : '',
      soYeuCau ? `${soYeuCau} yêu cầu thuê` : '',
      soPhieuSua ? `${soPhieuSua} phiếu sửa` : '',
    ].filter(Boolean).join(', ');
    return res.status(409).json({
      message: `${device.name} đã có ${chiTiet} nên không xoá được — xoá đi là mất luôn lịch sử đó. `
        + 'Hãy đổi trạng thái sang "Ngừng dùng" để máy không còn xuất hiện khi tạo đơn.',
      canRetire: true,
    });
  }

  runTransaction(() => {
    db.prepare('DELETE FROM network_lock_events WHERE device_id = ?').run(id);
    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  });

  audit(req.admin!.id, 'DELETE', 'DEVICE', id, `${device.code} — ${device.name}`);
  return res.json({ ok: true });
});

app.get('/api/rentals', (_req, res) => {
  const data = rows(`
    SELECT r.*, c.name AS customer_name, c.code AS customer_code, c.phone AS customer_phone,
      d.name AS device_name, d.code AS device_code, d.type AS device_type,
      COALESCE(SUM(t.revenue_change), 0) AS paid_amount
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    JOIN devices d ON d.id = r.device_id
    LEFT JOIN financial_transactions t ON t.rental_id = r.id
    GROUP BY r.id ORDER BY r.created_at DESC
  `);
  res.json(data);
});

/**
 * Ai sắp hết hạn — câu hỏi đầu tiên mỗi sáng mở app.
 *
 * Trả kèm số điện thoại và số tiền còn nợ, vì biết "sắp hết hạn" thôi chưa đủ:
 * phải gọi cho ai, và nhắc họ trả bao nhiêu. Gồm cả đơn đã quá hạn, đó mới là
 * nhóm gấp nhất — máy vẫn đang chạy mà tiền chưa thu.
 */
app.get('/api/rentals/expiring', (req, res) => {
  const days = Math.min(Math.max(Math.trunc(Number(req.query.days)) || 7, 1), 90);
  res.json(expiringRentals(days));
});

app.post('/api/rentals', (req: AuthedRequest, res) => {
  const input = z.object({
    customerId: z.string().uuid(),
    deviceId: z.string().uuid(),
    startAt: z.string().min(10),
    endAt: z.string().min(10),
    baseAmount: z.coerce.number().int().nonnegative(),
    surcharge: z.coerce.number().int().nonnegative().default(0),
    discount: z.coerce.number().int().nonnegative().default(0),
    status: z.enum(['RESERVED', 'ACTIVE']).default('RESERVED'),
    accessNote: z.string().trim().max(500).default(''),
    notes: z.string().trim().max(1000).default(''),
  }).parse(req.body);
  if (new Date(input.endAt) <= new Date(input.startAt)) {
    return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
  }
  const total = input.baseAmount + input.surcharge - input.discount;
  if (total < 0) return res.status(400).json({ message: 'Tổng tiền đơn không thể âm.' });
  const customer = db.prepare("SELECT id FROM customers WHERE id = ? AND status != 'BLOCKED'").get(input.customerId);
  if (!customer) return res.status(400).json({ message: 'Khách hàng không tồn tại hoặc đã bị khóa.' });
  const device = db.prepare('SELECT id, status FROM devices WHERE id = ?').get(input.deviceId) as { id: string; status: string } | undefined;
  if (!device || device.status !== 'AVAILABLE') {
    return res.status(409).json({ message: 'Thiết bị không ở trạng thái sẵn sàng.' });
  }
  const id = makeId();
  const code = makeCode('HD');
  const time = nowIso();
  runTransaction(() => {
    db.prepare(`
      INSERT INTO rentals
        (id, code, customer_id, device_id, start_at, end_at, base_amount, surcharge, discount, total_amount, status, access_note, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, input.customerId, input.deviceId, new Date(input.startAt).toISOString(), new Date(input.endAt).toISOString(),
      input.baseAmount, input.surcharge, input.discount, total, input.status, input.accessNote, input.notes, time, time);
    syncDeviceStatus(input.deviceId, input.status);
  });
  audit(req.admin!.id, 'CREATE', 'RENTAL', id, code);
  res.status(201).json({ id, code, totalAmount: total });
});

app.patch('/api/rentals/:id/status', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    status: z.enum(['RESERVED', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED']),
  }).parse(req.body);
  const rental = db.prepare('SELECT id, device_id, status FROM rentals WHERE id = ?').get(id) as
    { id: string; device_id: string; status: string } | undefined;
  if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn thuê.' });
  runTransaction(() => {
    db.prepare('UPDATE rentals SET status = ?, updated_at = ? WHERE id = ?').run(input.status, nowIso(), rental.id);
    syncDeviceStatus(rental.device_id, input.status);
  });
  audit(req.admin!.id, 'STATUS', 'RENTAL', rental.id, `${rental.status} -> ${input.status}`);
  res.json({ ok: true });
});

app.post('/api/rentals/:id/payment', (req: AuthedRequest, res) => {
  const idParam = routeId(req);
  const input = z.object({
    amount: z.coerce.number().int().positive(),
    source: z.enum(['WALLET', 'BANK', 'CASH', 'OTHER']),
    reference: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(500).default(''),
  }).parse(req.body);
  const rental = db.prepare('SELECT id, customer_id, total_amount FROM rentals WHERE id = ?').get(idParam) as
    { id: string; customer_id: string; total_amount: number } | undefined;
  if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn thuê.' });
  const paid = getRentalPaid(rental.id);
  if (input.amount > rental.total_amount - paid) {
    return res.status(400).json({ message: 'Số tiền vượt quá phần còn phải thanh toán.' });
  }
  if (input.source === 'WALLET' && getWalletBalance(rental.customer_id) < input.amount) {
    return res.status(400).json({ message: 'Số dư ví khách hàng không đủ.' });
  }
  const id = makeId();
  const code = makeCode('GD');
  const time = nowIso();
  const cashChange = input.source === 'WALLET' ? 0 : input.amount;
  const walletChange = input.source === 'WALLET' ? -input.amount : 0;
  db.prepare(`
    INSERT INTO financial_transactions
      (id, code, customer_id, rental_id, kind, payment_method, cash_change, wallet_change, revenue_change,
       reference, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, ?, 'RENTAL_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, rental.customer_id, rental.id, input.source, cashChange, walletChange, input.amount,
    input.reference, input.notes, req.admin!.id, time, time);
  audit(req.admin!.id, 'PAYMENT', 'RENTAL', rental.id, `${code}: ${input.amount}`);
  res.status(201).json({ id, code, paidAmount: paid + input.amount });
});

/**
 * Gia hạn một đơn thuê.
 *
 * Đây là thao tác hằng ngày của tiệm: khách trả tiền kỳ tiếp theo thì đẩy hạn ra.
 * Gộp cả thu tiền vào cùng một lần gọi để không phải làm hai bước rồi quên mất
 * bước sau — và để cả hai cùng nằm trong một transaction, không có cảnh gia hạn
 * xong mà tiền chưa ghi.
 */
app.post('/api/rentals/:id/renew', (req: AuthedRequest, res) => {
  const idParam = routeId(req);
  const input = z.object({
    unit: z.enum(PERIOD_UNITS),
    quantity: z.coerce.number().int().positive().max(60),
    amount: z.coerce.number().int().nonnegative(),
    /** END: nối tiếp ngay sau hạn cũ. NOW: tính từ lúc gia hạn, dùng khi khách trả trễ. */
    from: z.enum(['END', 'NOW']).default('END'),
    notes: z.string().trim().max(500).default(''),
    /** Có thu tiền luôn trong lần này không; bỏ trống là ghi nợ. */
    collect: z.object({
      source: z.enum(['WALLET', 'BANK', 'CASH', 'OTHER']),
      reference: z.string().trim().max(160).default(''),
      notes: z.string().trim().max(500).default(''),
    }).nullish(),
  }).parse(req.body);

  const rental = db.prepare('SELECT id, code, customer_id, end_at, status, total_amount FROM rentals WHERE id = ?')
    .get(idParam) as
    { id: string; code: string; customer_id: string; end_at: string; status: string; total_amount: number } | undefined;
  if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn thuê.' });
  if (rental.status === 'CANCELLED') {
    return res.status(409).json({ message: 'Đơn đã huỷ thì không gia hạn được.' });
  }

  const now = new Date();
  const oldEnd = new Date(rental.end_at);
  // Trả trễ mà vẫn nối từ hạn cũ thì kỳ mới nằm một phần trong quá khứ — để người
  // dùng tự chọn thay vì đoán hộ, vì mỗi tiệm tính một kiểu.
  const start = input.from === 'NOW' && now > oldEnd ? now : oldEnd;
  const end = addPeriod(start, input.unit, input.quantity);

  if (input.collect?.source === 'WALLET' && getWalletBalance(rental.customer_id) < input.amount) {
    return res.status(400).json({ message: 'Số dư ví khách hàng không đủ.' });
  }

  const periodId = makeId();
  const time = nowIso();
  let paymentCode = '';

  runTransaction(() => {
    db.prepare(`
      INSERT INTO rental_periods (id, rental_id, unit, quantity, start_at, end_at, amount, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(periodId, rental.id, input.unit, input.quantity, start.toISOString(), end.toISOString(),
      input.amount, input.notes, req.admin!.id, time);

    db.prepare(`
      UPDATE rentals
      SET end_at = ?, base_amount = base_amount + ?, total_amount = total_amount + ?,
          status = CASE WHEN status = 'COMPLETED' THEN 'ACTIVE' ELSE status END,
          updated_at = ?
      WHERE id = ?
    `).run(end.toISOString(), input.amount, input.amount, time, rental.id);

    if (input.collect && input.amount > 0) {
      paymentCode = makeCode('GD');
      const cashChange = input.collect.source === 'WALLET' ? 0 : input.amount;
      const walletChange = input.collect.source === 'WALLET' ? -input.amount : 0;
      db.prepare(`
        INSERT INTO financial_transactions
          (id, code, customer_id, rental_id, kind, payment_method, cash_change, wallet_change, revenue_change,
           reference, notes, created_by, occurred_at, created_at)
        VALUES (?, ?, ?, ?, 'RENTAL_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(makeId(), paymentCode, rental.customer_id, rental.id, input.collect.source,
        cashChange, walletChange, input.amount, input.collect.reference, input.collect.notes,
        req.admin!.id, time, time);
    }

    // Gia hạn xong là máy có người thuê trở lại, kể cả khi trước đó đã trả máy.
    syncDeviceStatus(
      (db.prepare('SELECT device_id FROM rentals WHERE id = ?').get(rental.id) as { device_id: string }).device_id,
      'ACTIVE',
    );
  });

  audit(req.admin!.id, 'RENEW', 'RENTAL', rental.id,
    `${rental.code}: +${input.quantity} ${UNIT_LABELS[input.unit]} tới ${end.toISOString()}${paymentCode ? ` (thu ${input.amount})` : ' (ghi nợ)'}`);

  return res.status(201).json({
    id: periodId,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    amount: input.amount,
    collected: Boolean(paymentCode),
    paymentCode,
  });
});

/** Lịch sử các lần gia hạn của một đơn — để biết con số tổng từ đâu ra. */
app.get('/api/rentals/:id/periods', (req, res) => {
  res.json(rows(`
    SELECT p.*, a.name AS created_by_name
    FROM rental_periods p
    LEFT JOIN admins a ON a.id = p.created_by
    WHERE p.rental_id = ? ORDER BY p.start_at ASC
  `, routeId(req)));
});

app.post('/api/rentals/:id/refund', requirePermission('rental.refund'), (req: AuthedRequest, res) => {
  const idParam = routeId(req);
  const input = z.object({
    amount: z.coerce.number().int().positive(),
    destination: z.enum(['WALLET', 'BANK', 'CASH']),
    reference: z.string().trim().max(160).default(''),
    notes: z.string().trim().min(3).max(500),
  }).parse(req.body);
  const rental = db.prepare('SELECT id, customer_id FROM rentals WHERE id = ?').get(idParam) as
    { id: string; customer_id: string } | undefined;
  if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn thuê.' });
  const paid = getRentalPaid(rental.id);
  if (input.amount > paid) {
    return res.status(400).json({ message: 'Số tiền hoàn vượt quá số đã thanh toán ròng của đơn.' });
  }
  const id = makeId();
  const code = makeCode('HT');
  const time = nowIso();
  const cashChange = input.destination === 'WALLET' ? 0 : -input.amount;
  const walletChange = input.destination === 'WALLET' ? input.amount : 0;
  db.prepare(`
    INSERT INTO financial_transactions
      (id, code, customer_id, rental_id, kind, payment_method, cash_change, wallet_change, revenue_change,
       reference, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, ?, 'REFUND', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, rental.customer_id, rental.id, input.destination, cashChange, walletChange, -input.amount,
    input.reference, input.notes, req.admin!.id, time, time);
  audit(req.admin!.id, 'REFUND', 'RENTAL', rental.id, `${code}: ${input.amount} — ${input.notes}`);
  res.status(201).json({ id, code, paidAmount: paid - input.amount });
});

app.get('/api/finance/transactions', requirePermission('finance.view'), (req, res) => {
  const range = readRange(req.query);
  const from = range.from ?? '';
  const to = range.to ?? FAR_FUTURE;
  const { limit, offset } = readPaging(req.query);

  const total = db.prepare(
    'SELECT COUNT(*) AS count FROM financial_transactions WHERE occurred_at BETWEEN ? AND ?',
  ).get(from, to) as { count: number };

  const data = rows(`
    SELECT t.*, c.name AS customer_name, r.code AS rental_code
    FROM financial_transactions t
    LEFT JOIN customers c ON c.id = t.customer_id
    LEFT JOIN rentals r ON r.id = t.rental_id
    WHERE t.occurred_at BETWEEN ? AND ?
    ORDER BY t.occurred_at DESC LIMIT ? OFFSET ?
  `, from, to, limit, offset);

  res.json({ rows: data, total: Number(total.count) });
});

app.get('/api/finance/expenses', requirePermission('finance.view'), (req, res) => {
  const range = readRange(req.query);
  const from = range.from ?? '';
  const to = range.to ?? FAR_FUTURE;
  const { limit, offset } = readPaging(req.query);

  const total = db.prepare('SELECT COUNT(*) AS count FROM expenses WHERE occurred_at BETWEEN ? AND ?')
    .get(from, to) as { count: number };

  const data = rows(
    'SELECT * FROM expenses WHERE occurred_at BETWEEN ? AND ? ORDER BY occurred_at DESC LIMIT ? OFFSET ?',
    from, to, limit, offset,
  );

  res.json({ rows: data, total: Number(total.count) });
});

app.post('/api/finance/expenses', requirePermission('finance.expense'), (req: AuthedRequest, res) => {
  const input = z.object({
    category: z.enum(['ELECTRICITY', 'INTERNET', 'RENT', 'SALARY', 'MAINTENANCE', 'PARTS', 'MARKETING', 'SOFTWARE', 'TAX', 'OTHER']),
    amount: z.coerce.number().int().positive(),
    paymentMethod: z.enum(['BANK', 'CASH', 'OTHER']).default('BANK'),
    vendor: z.string().trim().max(160).default(''),
    reference: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(500).default(''),
    occurredAt: z.string().min(10),
  }).parse(req.body);
  const id = makeId();
  const code = makeCode('CP');
  const time = nowIso();
  db.prepare(`
    INSERT INTO expenses
      (id, code, category, amount, payment_method, vendor, reference, notes, occurred_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, input.category, input.amount, input.paymentMethod, input.vendor, input.reference, input.notes,
    new Date(input.occurredAt).toISOString(), req.admin!.id, time);
  audit(req.admin!.id, 'CREATE', 'EXPENSE', id, `${code}: ${input.amount}`);
  res.status(201).json({ id, code });
});

/* ========================================================================
   Sửa chữa thiết bị và kho linh kiện

   Nguyên tắc tiền: chi phí chỉ sinh ra ở đúng hai thời điểm — lúc mua linh kiện
   nhập kho, và lúc đóng phiếu sửa (tiền công thợ). Lắp linh kiện từ kho vào máy
   không tạo chi phí mới vì tiền đã chi khi mua; thao tác đó chỉ trừ tồn kho và
   quy trách nhiệm chi phí về đúng thiết bị để biết máy nào đang ngốn tiền.
   ======================================================================== */

const REPAIR_LIST_SQL = `
  SELECT r.*,
    d.code AS device_code, d.name AS device_name, d.type AS device_type, d.status AS device_status,
    COALESCE(pc.parts_cost, 0) AS parts_cost,
    COALESCE(pc.parts_count, 0) AS parts_count
  FROM repairs r
  JOIN devices d ON d.id = r.device_id
  LEFT JOIN (
    SELECT repair_id,
      SUM(-quantity * unit_cost) AS parts_cost,
      SUM(-quantity) AS parts_count
    FROM part_movements WHERE kind IN ('CONSUME', 'RETURN') GROUP BY repair_id
  ) pc ON pc.repair_id = r.id
`;

const OPEN_REPAIR_STATUSES = ['REPORTED', 'IN_PROGRESS'];

function findRepair(id: string) {
  return db.prepare(`${REPAIR_LIST_SQL} WHERE r.id = ?`).get(id) as
    (Record<string, unknown> & { id: string; code: string; status: string; device_id: string; service_cost: number }) | undefined;
}

app.get('/api/repairs', (req, res) => {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : null;
  const { limit, offset } = readPaging(req.query);
  const where = deviceId ? 'WHERE r.device_id = ?' : '';
  const filter = deviceId ? [deviceId] : [];

  const total = db.prepare(`SELECT COUNT(*) AS count FROM repairs r ${where}`)
    .get(...filter) as { count: number };
  const data = rows(
    `${REPAIR_LIST_SQL} ${where} ORDER BY r.reported_at DESC LIMIT ? OFFSET ?`,
    ...filter, limit, offset,
  );

  res.json({ rows: data, total: Number(total.count) });
});

app.get('/api/repairs/:id', (req, res) => {
  const repair = findRepair(routeId(req));
  if (!repair) return res.status(404).json({ message: 'Không tìm thấy phiếu sửa chữa.' });
  const parts = rows(`
    SELECT m.*, p.name AS part_name, p.code AS part_code, p.unit AS part_unit
    FROM part_movements m JOIN parts p ON p.id = m.part_id
    WHERE m.repair_id = ? AND m.kind IN ('CONSUME', 'RETURN')
    ORDER BY m.occurred_at ASC
  `, repair.id);
  return res.json({ ...repair, parts });
});

app.post('/api/repairs', (req: AuthedRequest, res) => {
  const input = z.object({
    deviceId: z.string().min(1),
    title: z.string().trim().min(3).max(160),
    symptom: z.string().trim().max(1000).default(''),
    vendor: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(1000).default(''),
    startNow: z.coerce.boolean().default(false),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    // Chi phí ước tính lúc mở phiếu; chỉ thành khoản chi thật khi đóng phiếu.
    serviceCost: z.coerce.number().int().nonnegative().default(0),
  }).parse(req.body);

  const device = db.prepare('SELECT id, status FROM devices WHERE id = ?').get(input.deviceId) as { id: string; status: string } | undefined;
  if (!device) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });

  const id = makeId();
  const code = makeCode('SC');
  const time = nowIso();

  runTransaction(() => {
    db.prepare(`
      INSERT INTO repairs
        (id, code, device_id, title, symptom, status, vendor, notes, device_status_before,
         reported_at, started_at, created_by, created_at, updated_at, priority, service_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, input.deviceId, input.title, input.symptom, input.startNow ? 'IN_PROGRESS' : 'REPORTED',
      input.vendor, input.notes, device.status, time, input.startNow ? time : null, req.admin!.id, time, time,
      input.priority, input.serviceCost);
    if (input.startNow) holdDeviceForRepair(device);
  });

  audit(req.admin!.id, 'CREATE', 'REPAIR', id, `${code}: ${input.title}`);
  return res.status(201).json({ id, code });
});

app.patch('/api/repairs/:id', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    title: z.string().trim().min(3).max(160),
    symptom: z.string().trim().max(1000).default(''),
    vendor: z.string().trim().max(160).default(''),
    serviceCost: z.coerce.number().int().nonnegative().default(0),
    notes: z.string().trim().max(1000).default(''),
  }).parse(req.body);

  const repair = findRepair(id);
  if (!repair) return res.status(404).json({ message: 'Không tìm thấy phiếu sửa chữa.' });
  if (!OPEN_REPAIR_STATUSES.includes(repair.status)) {
    return res.status(400).json({ message: 'Phiếu đã đóng nên không sửa được nội dung.' });
  }

  db.prepare(`
    UPDATE repairs SET title = ?, symptom = ?, vendor = ?, service_cost = ?, notes = ?, updated_at = ? WHERE id = ?
  `).run(input.title, input.symptom, input.vendor, input.serviceCost, input.notes, nowIso(), id);
  audit(req.admin!.id, 'UPDATE', 'REPAIR', id, repair.code);
  return res.json({ ok: true });
});

app.patch('/api/repairs/:id/status', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    status: z.enum(['IN_PROGRESS', 'DONE', 'UNREPAIRABLE', 'CANCELLED']),
    serviceCost: z.coerce.number().int().nonnegative().default(0),
    vendor: z.string().trim().max(160).default(''),
    paymentMethod: z.enum(['BANK', 'CASH', 'OTHER']).default('CASH'),
    reference: z.string().trim().max(160).default(''),
    resolution: z.string().trim().max(1000).default(''),
  }).parse(req.body);

  const repair = findRepair(id);
  if (!repair) return res.status(404).json({ message: 'Không tìm thấy phiếu sửa chữa.' });
  if (!OPEN_REPAIR_STATUSES.includes(repair.status)) {
    return res.status(400).json({ message: 'Phiếu này đã đóng. Hãy tạo phiếu mới nếu máy hỏng lại.' });
  }
  if (input.status === 'IN_PROGRESS' && repair.status === 'IN_PROGRESS') {
    return res.status(400).json({ message: 'Phiếu đang ở trạng thái đang sửa.' });
  }
  if (input.status === 'CANCELLED' && Number(repair.parts_count) > 0) {
    return res.status(400).json({ message: 'Phiếu đã lắp linh kiện nên không huỷ được. Hãy gỡ linh kiện về kho trước.' });
  }

  const device = db.prepare('SELECT id, status FROM devices WHERE id = ?').get(repair.device_id) as { id: string; status: string };
  const time = nowIso();

  runTransaction(() => {
    if (input.status === 'IN_PROGRESS') {
      db.prepare('UPDATE repairs SET status = ?, vendor = ?, started_at = ?, updated_at = ? WHERE id = ?')
        .run('IN_PROGRESS', input.vendor || String(repair.vendor || ''), time, time, id);
      holdDeviceForRepair(device);
      return;
    }

    if (input.status === 'CANCELLED') {
      db.prepare('UPDATE repairs SET status = ?, resolution = ?, closed_at = ?, updated_at = ? WHERE id = ?')
        .run('CANCELLED', input.resolution, time, time, id);
      releaseDeviceAfterRepair(device, String(repair.device_status_before || ''));
      return;
    }

    // Đóng phiếu: tiền công thợ mới được ghi vào sổ chi phí tại đây.
    let expenseId: string | null = null;
    if (input.serviceCost > 0) {
      const expense = recordExpense({
        adminId: req.admin!.id,
        category: 'MAINTENANCE',
        amount: input.serviceCost,
        paymentMethod: input.paymentMethod,
        vendor: input.vendor || String(repair.vendor || ''),
        reference: input.reference,
        notes: `${repair.code} · ${repair.device_name} · ${repair.title}`,
        occurredAt: time,
      });
      expenseId = expense.id;
    }

    db.prepare(`
      UPDATE repairs SET status = ?, service_cost = ?, vendor = ?, payment_method = ?, reference = ?,
        resolution = ?, expense_id = ?, closed_at = ?, updated_at = ? WHERE id = ?
    `).run(input.status, input.serviceCost, input.vendor || String(repair.vendor || ''), input.paymentMethod,
      input.reference, input.resolution, expenseId, time, time, id);

    if (input.status === 'UNREPAIRABLE') {
      db.prepare('UPDATE devices SET status = ?, updated_at = ? WHERE id = ?').run('RETIRED', time, device.id);
    } else {
      releaseDeviceAfterRepair(device, String(repair.device_status_before || ''));
    }
  });

  audit(req.admin!.id, 'STATUS', 'REPAIR', id, `${repair.code} → ${input.status}`);
  return res.json({ ok: true });
});

app.post('/api/repairs/:id/parts', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    partId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    notes: z.string().trim().max(300).default(''),
  }).parse(req.body);

  const repair = findRepair(id);
  if (!repair) return res.status(404).json({ message: 'Không tìm thấy phiếu sửa chữa.' });
  if (!OPEN_REPAIR_STATUSES.includes(repair.status)) {
    return res.status(400).json({ message: 'Phiếu đã đóng nên không lắp thêm linh kiện được.' });
  }

  const part = db.prepare('SELECT id, name, unit FROM parts WHERE id = ?').get(input.partId) as { id: string; name: string; unit: string } | undefined;
  if (!part) return res.status(404).json({ message: 'Không tìm thấy linh kiện.' });

  const stock = partStock(part.id);
  if (stock.quantity < input.quantity) {
    return res.status(400).json({ message: `Kho chỉ còn ${stock.quantity} ${part.unit} ${part.name}.` });
  }

  const time = nowIso();
  db.prepare(`
    INSERT INTO part_movements (id, part_id, repair_id, kind, quantity, unit_cost, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, 'CONSUME', ?, ?, ?, ?, ?, ?)
  `).run(makeId(), part.id, id, -input.quantity, stock.averageCost, input.notes, req.admin!.id, time, time);

  audit(req.admin!.id, 'UPDATE', 'REPAIR', id, `Lắp ${input.quantity} ${part.name}`);
  return res.status(201).json({ ok: true });
});

app.delete('/api/repairs/:id/parts/:movementId', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const movementId = Array.isArray(req.params.movementId) ? req.params.movementId[0] : req.params.movementId;

  const repair = findRepair(id);
  if (!repair) return res.status(404).json({ message: 'Không tìm thấy phiếu sửa chữa.' });
  if (!OPEN_REPAIR_STATUSES.includes(repair.status)) {
    return res.status(400).json({ message: 'Phiếu đã đóng nên không gỡ linh kiện được.' });
  }

  const movement = db.prepare("SELECT * FROM part_movements WHERE id = ? AND repair_id = ? AND kind = 'CONSUME'")
    .get(movementId, id) as { id: string; part_id: string; quantity: number; unit_cost: number } | undefined;
  if (!movement) return res.status(404).json({ message: 'Không tìm thấy dòng linh kiện này.' });

  // Trả về kho bằng một bút toán đối ứng thay vì xoá lịch sử, giống cách sổ tiền
  // xử lý hoàn tiền: luôn còn dấu vết ai đã lắp rồi lại gỡ.
  const time = nowIso();
  db.prepare(`
    INSERT INTO part_movements (id, part_id, repair_id, kind, quantity, unit_cost, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, 'RETURN', ?, ?, ?, ?, ?, ?)
  `).run(makeId(), movement.part_id, id, -movement.quantity, movement.unit_cost, 'Gỡ khỏi phiếu sửa', req.admin!.id, time, time);

  audit(req.admin!.id, 'UPDATE', 'REPAIR', id, 'Gỡ linh kiện về kho');
  return res.json({ ok: true });
});

/* ---- Kho linh kiện ------------------------------------------------------ */

app.get('/api/parts', (_req, res) => {
  res.json(rows(`
    SELECT p.*,
      COALESCE(m.quantity, 0) AS quantity,
      CASE WHEN COALESCE(m.purchased_quantity, 0) > 0
        THEN CAST(ROUND(COALESCE(m.purchased_value, 0) * 1.0 / m.purchased_quantity) AS INTEGER)
        ELSE 0 END AS average_cost,
      COALESCE(m.consumed, 0) AS consumed_quantity
    FROM parts p
    LEFT JOIN (
      SELECT part_id,
        SUM(quantity) AS quantity,
        SUM(CASE WHEN kind = 'PURCHASE' THEN quantity ELSE 0 END) AS purchased_quantity,
        SUM(CASE WHEN kind = 'PURCHASE' THEN quantity * unit_cost ELSE 0 END) AS purchased_value,
        SUM(CASE WHEN kind IN ('CONSUME', 'RETURN') THEN -quantity ELSE 0 END) AS consumed
      FROM part_movements GROUP BY part_id
    ) m ON m.part_id = p.id
    ORDER BY p.category, p.name
  `));
});

app.post('/api/parts', (req: AuthedRequest, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(160),
    category: z.enum(['RAM', 'STORAGE', 'GPU', 'CPU', 'MAINBOARD', 'PSU', 'COOLING', 'SCREEN', 'BATTERY', 'CABLE', 'OTHER']).default('OTHER'),
    unit: z.string().trim().min(1).max(20).default('cái'),
    minQuantity: z.coerce.number().int().nonnegative().default(0),
    location: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(500).default(''),
  }).parse(req.body);

  const id = makeId();
  const code = makeCode('LK');
  const time = nowIso();
  db.prepare(`
    INSERT INTO parts (id, code, name, category, unit, min_quantity, location, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, input.name, input.category, input.unit, input.minQuantity, input.location, input.notes, time, time);
  audit(req.admin!.id, 'CREATE', 'PART', id, `${code}: ${input.name}`);
  res.status(201).json({ id, code });
});

app.patch('/api/parts/:id', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    name: z.string().trim().min(2).max(160),
    category: z.enum(['RAM', 'STORAGE', 'GPU', 'CPU', 'MAINBOARD', 'PSU', 'COOLING', 'SCREEN', 'BATTERY', 'CABLE', 'OTHER']),
    unit: z.string().trim().min(1).max(20),
    minQuantity: z.coerce.number().int().nonnegative().default(0),
    location: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(500).default(''),
  }).parse(req.body);

  const result = db.prepare(`
    UPDATE parts SET name = ?, category = ?, unit = ?, min_quantity = ?, location = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(input.name, input.category, input.unit, input.minQuantity, input.location, input.notes, nowIso(), id);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy linh kiện.' });
  audit(req.admin!.id, 'UPDATE', 'PART', id, input.name);
  return res.json({ ok: true });
});

app.get('/api/parts/:id/movements', (req, res) => {
  const partId = routeId(req);
  const { limit, offset } = readPaging(req.query);

  // Lịch sử xuất nhập là căn cứ tính tồn kho và giá vốn, cắt mất dòng cũ là mất
  // luôn cách đối chiếu khi số tồn trông có vẻ sai.
  const total = db.prepare('SELECT COUNT(*) AS count FROM part_movements WHERE part_id = ?')
    .get(partId) as { count: number };
  const data = rows(`
    SELECT m.*, r.code AS repair_code, d.name AS device_name
    FROM part_movements m
    LEFT JOIN repairs r ON r.id = m.repair_id
    LEFT JOIN devices d ON d.id = r.device_id
    WHERE m.part_id = ? ORDER BY m.occurred_at DESC LIMIT ? OFFSET ?
  `, partId, limit, offset);

  res.json({ rows: data, total: Number(total.count) });
});

app.post('/api/parts/:id/movements', (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    kind: z.enum(['PURCHASE', 'ADJUST']),
    quantity: z.coerce.number().int(),
    unitCost: z.coerce.number().int().nonnegative().default(0),
    paymentMethod: z.enum(['BANK', 'CASH', 'OTHER']).default('CASH'),
    vendor: z.string().trim().max(160).default(''),
    reference: z.string().trim().max(160).default(''),
    notes: z.string().trim().max(300).default(''),
    occurredAt: z.string().min(10).optional(),
  }).parse(req.body);

  const part = db.prepare('SELECT id, name, unit FROM parts WHERE id = ?').get(id) as { id: string; name: string; unit: string } | undefined;
  if (!part) return res.status(404).json({ message: 'Không tìm thấy linh kiện.' });
  if (input.quantity === 0) return res.status(400).json({ message: 'Số lượng phải khác 0.' });
  if (input.kind === 'PURCHASE' && input.quantity < 0) {
    return res.status(400).json({ message: 'Nhập mua phải có số lượng dương.' });
  }

  const stock = partStock(id);
  if (stock.quantity + input.quantity < 0) {
    return res.status(400).json({ message: `Kho chỉ còn ${stock.quantity} ${part.unit}, không trừ được ${Math.abs(input.quantity)}.` });
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt).toISOString() : nowIso();
  let expenseId: string | null = null;

  runTransaction(() => {
    if (input.kind === 'PURCHASE' && input.unitCost > 0) {
      const expense = recordExpense({
        adminId: req.admin!.id,
        category: 'PARTS',
        amount: input.unitCost * input.quantity,
        paymentMethod: input.paymentMethod,
        vendor: input.vendor,
        reference: input.reference,
        notes: `Nhập ${input.quantity} ${part.unit} ${part.name}`,
        occurredAt,
      });
      expenseId = expense.id;
    }
    db.prepare(`
      INSERT INTO part_movements (id, part_id, kind, quantity, unit_cost, expense_id, notes, created_by, occurred_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId(), id, input.kind, input.quantity, input.unitCost, expenseId, input.notes, req.admin!.id, occurredAt, nowIso());
  });

  audit(req.admin!.id, input.kind === 'PURCHASE' ? 'CREATE' : 'UPDATE', 'PART', id,
    `${input.kind === 'PURCHASE' ? 'Nhập' : 'Điều chỉnh'} ${input.quantity} ${part.name}`);
  return res.status(201).json({ ok: true });
});

/** Giữ máy lại khi bắt đầu sửa, trừ khi khách đang cầm máy. */
function holdDeviceForRepair(device: { id: string; status: string }) {
  if (device.status === 'RENTED' || device.status === 'RESERVED') return;
  db.prepare('UPDATE devices SET status = ?, updated_at = ? WHERE id = ?').run('MAINTENANCE', nowIso(), device.id);
}

/** Chỉ trả máy về khai thác nếu chính phiếu sửa này đã giữ nó. */
function releaseDeviceAfterRepair(device: { id: string; status: string }, statusBefore: string) {
  if (device.status !== 'MAINTENANCE') return;
  const next = statusBefore === 'MAINTENANCE' || statusBefore === 'RETIRED' || !statusBefore ? 'AVAILABLE' : statusBefore;
  db.prepare('UPDATE devices SET status = ?, updated_at = ? WHERE id = ?').run(next, nowIso(), device.id);
}

/* ========================================================================
   Khoá mạng thiết bị khi hết hạn thuê
   ======================================================================== */

app.get('/api/network-lock', requirePermission('settings.networkLock'), (_req, res) => {
  const settings = networkLockSettings();
  const due = devicesDueForLock(settings.graceMinutes);
  const lockedCount = db.prepare("SELECT COUNT(*) AS count FROM devices WHERE network_status = 'LOCKED'")
    .get() as { count: number };
  res.json({
    settings,
    due,
    lockedCount: Number(lockedCount.count),
    events: rows(`
      SELECT e.*, d.code AS device_code, d.name AS device_name, a.name AS admin_name
      FROM network_lock_events e
      JOIN devices d ON d.id = e.device_id
      LEFT JOIN admins a ON a.id = e.created_by
      ORDER BY e.created_at DESC LIMIT 50
    `),
  });
});

app.put('/api/network-lock/settings', requirePermission('settings.networkLock'), (req: AuthedRequest, res) => {
  const input = z.object({
    enabled: z.coerce.boolean(),
    autoLock: z.coerce.boolean(),
    lockCommand: z.string().max(2000).default(''),
    unlockCommand: z.string().max(2000).default(''),
    graceMinutes: z.coerce.number().int().min(0).max(1440).default(15),
    timeoutSeconds: z.coerce.number().int().min(5).max(120).default(20),
  }).parse(req.body);

  if (input.enabled && !input.lockCommand.trim()) {
    return res.status(400).json({ message: 'Cần khai báo câu lệnh khoá trước khi bật cơ chế này.' });
  }

  writeSettings({
    'networkLock.enabled': input.enabled ? '1' : '0',
    'networkLock.autoLock': input.autoLock ? '1' : '0',
    'networkLock.lockCommand': input.lockCommand.trim(),
    'networkLock.unlockCommand': input.unlockCommand.trim(),
    'networkLock.graceMinutes': String(input.graceMinutes),
    'networkLock.timeoutSeconds': String(input.timeoutSeconds),
  });
  audit(req.admin!.id, 'UPDATE', 'SETTINGS', 'network-lock', input.enabled ? 'Bật khoá mạng' : 'Tắt khoá mạng');
  return res.json({ ok: true });
});

/** Dựng thử câu lệnh để người dùng nhìn thấy chính xác chuỗi sẽ chạy, không thực thi. */
app.post('/api/network-lock/preview', requirePermission('settings.networkLock'), (req, res) => {
  const input = z.object({ deviceId: z.string().min(1) }).parse(req.body);
  const device = db.prepare('SELECT code, ip_address FROM devices WHERE id = ?')
    .get(input.deviceId) as { code: string; ip_address: string } | undefined;
  if (!device) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });

  const settings = networkLockSettings();
  const build = (template: string) => {
    try {
      return { ok: true, command: buildCommand(template, device) };
    } catch (error) {
      return { ok: false, command: error instanceof Error ? error.message : String(error) };
    }
  };
  return res.json({ lock: build(settings.lockCommand), unlock: build(settings.unlockCommand) });
});

app.post('/api/network-lock/devices/:id/:action', requirePermission('settings.networkLock'), async (req: AuthedRequest, res) => {
  const rawAction = Array.isArray(req.params.action) ? req.params.action[0] : req.params.action;
  if (rawAction !== 'lock' && rawAction !== 'unlock') {
    return res.status(400).json({ message: 'Thao tác không hợp lệ.' });
  }
  try {
    const result = await runNetworkAction({
      deviceId: routeId(req),
      action: rawAction === 'lock' ? 'LOCK' : 'UNLOCK',
      source: 'MANUAL',
      adminId: req.admin!.id,
    });
    if (!result.ok) return res.status(422).json({ message: 'Lệnh chạy không thành công.', output: result.output });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Không chạy được lệnh.' });
  }
});

app.post('/api/network-lock/sweep', requirePermission('settings.networkLock'), async (_req, res) => {
  const result = await sweepNetworkLocks();
  res.json(result);
});

/* ========================================================================
   Tài khoản quản trị

   Chỉ chủ hệ thống đụng được khu vực này. Hai điều luôn phải đúng sau mọi thao
   tác: người đang thao tác không tự khoá được chính mình, và hệ thống không bao
   giờ còn lại 0 tài khoản chủ đang hoạt động.
   ======================================================================== */

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}$/;

function activeOwnerCount(excludeId?: string) {
  const row = excludeId
    ? db.prepare("SELECT COUNT(*) AS count FROM admins WHERE role = 'OWNER' AND status = 'ACTIVE' AND id != ?").get(excludeId)
    : db.prepare("SELECT COUNT(*) AS count FROM admins WHERE role = 'OWNER' AND status = 'ACTIVE'").get();
  return Number((row as { count: number }).count);
}

app.get('/api/admins', requirePermission('settings.accounts'), (_req, res) => {
  res.json(rows(`
    SELECT a.id, a.name, a.email, a.username, a.role, a.status, a.created_at,
      (SELECT MAX(created_at) FROM sessions WHERE admin_id = a.id) AS last_session_at
    FROM admins a
    ORDER BY CASE a.role WHEN 'OWNER' THEN 0 ELSE 1 END, a.created_at ASC
  `));
});

app.post('/api/admins', requirePermission('settings.accounts'), (req: AuthedRequest, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    password: z.string().max(200),
    role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
    // Tên đăng nhập ngắn cho màn đăng nhập chung của giao diện mới; để trống thì
    // nhân viên đăng nhập bằng email như cũ.
    username: z.string().trim().toLowerCase().max(40).default(''),
  }).parse(req.body);

  if (!PASSWORD_RULE.test(input.password)) {
    return res.status(400).json({ message: 'Mật khẩu cần ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.' });
  }
  if (input.username && !/^[a-z0-9._-]{3,40}$/.test(input.username)) {
    return res.status(400).json({ message: 'Tên đăng nhập gồm 3–40 ký tự: chữ thường không dấu, số, dấu chấm, gạch.' });
  }

  const email = input.email.toLowerCase();
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ message: 'Email này đã có tài khoản.' });
  if (input.username && db.prepare("SELECT id FROM admins WHERE username != '' AND lower(username) = ?").get(input.username)) {
    return res.status(400).json({ message: 'Tên đăng nhập này đã có người dùng.' });
  }

  const id = makeId();
  db.prepare(`
    INSERT INTO admins (id, name, email, username, password_hash, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).run(id, input.name, email, input.username, hashPassword(input.password), input.role, nowIso());
  audit(req.admin!.id, 'CREATE', 'ADMIN', id, `${input.name} · ${input.role}`);
  return res.status(201).json({ id });
});

app.patch('/api/admins/:id', requirePermission('settings.accounts'), (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    role: z.enum(['OWNER', 'STAFF']),
    status: z.enum(['ACTIVE', 'DISABLED']),
  }).parse(req.body);

  const target = db.prepare('SELECT id, name, role, status FROM admins WHERE id = ?')
    .get(id) as { id: string; name: string; role: string; status: string } | undefined;
  if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

  const changingSelf = target.id === req.admin!.id;
  if (changingSelf && (input.role !== target.role || input.status !== target.status)) {
    return res.status(400).json({ message: 'Không thể tự đổi vai trò hoặc tự khoá tài khoản của chính mình.' });
  }
  const losesOwner = target.role === 'OWNER' && target.status === 'ACTIVE'
    && (input.role !== 'OWNER' || input.status !== 'ACTIVE');
  if (losesOwner && activeOwnerCount(target.id) === 0) {
    return res.status(400).json({ message: 'Phải còn ít nhất một tài khoản chủ đang hoạt động.' });
  }

  runTransaction(() => {
    db.prepare('UPDATE admins SET name = ?, role = ?, status = ? WHERE id = ?')
      .run(input.name, input.role, input.status, id);
    // Khoá tài khoản thì cắt luôn mọi phiên đang mở của người đó.
    if (input.status === 'DISABLED') db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(id);
  });
  audit(req.admin!.id, 'UPDATE', 'ADMIN', id, `${input.name} · ${input.role} · ${input.status}`);
  return res.json({ ok: true });
});

app.post('/api/admins/:id/password', requirePermission('settings.accounts'), (req: AuthedRequest, res) => {
  const id = routeId(req);
  const input = z.object({ password: z.string().max(200) }).parse(req.body);
  if (!PASSWORD_RULE.test(input.password)) {
    return res.status(400).json({ message: 'Mật khẩu cần ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.' });
  }
  const target = db.prepare('SELECT id FROM admins WHERE id = ?').get(id) as { id: string } | undefined;
  if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

  const currentSession = req.cookies.session_id as string;
  runTransaction(() => {
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(input.password), id);
    db.prepare('DELETE FROM sessions WHERE admin_id = ? AND id != ?').run(id, currentSession);
  });
  audit(req.admin!.id, 'CHANGE_PASSWORD', 'ADMIN', id, 'Chủ hệ thống đặt lại mật khẩu');
  return res.json({ ok: true });
});

app.get('/api/audit-logs', requirePermission('settings.audit'), (req, res) => {
  const { limit, offset } = readPaging(req.query);
  // Nhật ký là bảng phình nhanh nhất: mỗi thao tác của mọi người đều thêm một dòng.
  const total = db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get() as { count: number };
  const data = rows(`
    SELECT l.*, a.name AS admin_name FROM audit_logs l
    LEFT JOIN admins a ON a.id = l.admin_id
    ORDER BY l.created_at DESC LIMIT ? OFFSET ?
  `, limit, offset);
  res.json({ rows: data, total: Number(total.count) });
});

/* ---- Sao lưu ------------------------------------------------------------- */

/* ---- Nhắc khách qua Telegram -------------------------------------------- */

app.get('/api/telegram', requirePermission('settings.notify'), (_req, res) => {
  res.json(telegramStatus());
});

app.put('/api/telegram/settings', requirePermission('settings.notify'), (req: AuthedRequest, res) => {
  const input = z.object({
    enabled: z.boolean(),
    // Để trống nghĩa là giữ token cũ — giao diện chỉ nhận về chuỗi đã che.
    token: z.string().trim().max(200).default(''),
    chatId: z.string().trim().max(60).default(''),
    hour: z.coerce.number().int().min(0).max(23),
    days: z.coerce.number().int().min(1).max(60),
  }).parse(req.body);

  const hienTai = telegramSettings();
  const token = input.token || hienTai.token;

  if (input.enabled && (!token || !input.chatId)) {
    return res.status(400).json({ message: 'Bật nhắc qua Telegram thì phải có cả token của bot và chat id nơi nhận.' });
  }

  saveTelegramSettings({ ...input, token });
  audit(req.admin!.id, 'UPDATE', 'SETTINGS', 'telegram',
    `Nhắc Telegram: ${input.enabled ? 'bật' : 'tắt'}, ${input.hour}h mỗi ngày, trước ${input.days} ngày`);
  return res.json(telegramStatus());
});

/** Gửi thử ngay, dùng đúng nội dung thật để người dùng thấy tin sẽ trông thế nào. */
app.post('/api/telegram/test', requirePermission('settings.notify'), async (req: AuthedRequest, res) => {
  const input = z.object({
    token: z.string().trim().max(200).default(''),
    chatId: z.string().trim().max(60).default(''),
  }).parse(req.body ?? {});

  const hienTai = telegramSettings();
  const token = input.token || hienTai.token;
  const chatId = input.chatId || hienTai.chatId;

  const noiDung = buildDigest(hienTai.days)
    || 'Thuê Máy Hub — đây là tin gửi thử. Hiện không có máy nào sắp hết hạn.';
  const result = await sendTelegram(noiDung, { token, chatId });
  if (!result.ok) return res.status(400).json({ message: result.message });
  audit(req.admin!.id, 'UPDATE', 'SETTINGS', 'telegram', 'Gửi thử tin nhắc Telegram');
  return res.json({ ok: true });
});

/** Đọc chat id từ những tin người dùng vừa nhắn cho bot. */
app.post('/api/telegram/discover', requirePermission('settings.notify'), async (req, res) => {
  const input = z.object({ token: z.string().trim().max(200).default('') }).parse(req.body ?? {});
  const token = input.token || telegramSettings().token;
  const result = await discoverChats(token);
  if (!result.ok) return res.status(400).json({ message: result.message });
  return res.json({ chats: result.chats });
});

app.get('/api/backups', requirePermission('settings.backup'), (_req, res) => {
  res.json(backupStatus());
});

app.post('/api/backups', requirePermission('settings.backup'), (req: AuthedRequest, res) => {
  const result = runBackup('MANUAL');
  if (!result.ok) return res.status(500).json({ message: `Không tạo được bản sao lưu: ${result.message}` });
  audit(req.admin!.id, 'BACKUP', 'DATABASE', result.name, `Sao lưu thủ công (${result.size} byte)`);
  return res.status(201).json(result);
});

app.put('/api/backups/settings', requirePermission('settings.backup'), (req: AuthedRequest, res) => {
  const input = z.object({
    enabled: z.boolean(),
    // Để trống nghĩa là dùng thư mục mặc định cạnh database.
    dir: z.string().trim().max(400).default(''),
    intervalHours: z.coerce.number().int().min(1).max(24 * 30),
    keep: z.coerce.number().int().min(1).max(200),
  }).parse(req.body);

  // Thư mục phải ghi được, nếu không thì mỗi lần sao lưu đều hỏng mà người dùng
  // chỉ biết khi mở trang này — kiểm tra ngay lúc lưu cấu hình cho chắc.
  if (input.dir) {
    try {
      mkdirSync(input.dir, { recursive: true });
      const probe = join(input.dir, '.thuemay-backup-test');
      writeFileSync(probe, '');
      unlinkSync(probe);
    } catch {
      return res.status(400).json({ message: 'Không ghi được vào thư mục này. Hãy chọn thư mục khác.' });
    }
  }

  saveBackupSettings(input);
  audit(req.admin!.id, 'UPDATE', 'SETTINGS', 'backup', `Cấu hình sao lưu: ${input.enabled ? 'bật' : 'tắt'}, mỗi ${input.intervalHours} giờ, giữ ${input.keep} bản`);
  return res.json(backupStatus());
});

// Bản web chạy từ thư mục dự án nên ./dist là đúng. Bản desktop đã đóng gói có
// cwd khác hẳn, nên tiến trình chính của Electron truyền đường dẫn qua STATIC_DIR.
const distPath = resolve(process.env.STATIC_DIR || './dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // Truyền thư mục qua `root`: sendFile từ chối mọi đường dẫn có thư mục bắt đầu bằng
  // dấu chấm, mà giao diện ThueMayHub-FE build ra `.output/public`.
  app.get('*splat', (_req, res) => res.sendFile('index.html', { root: distPath }));
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Dữ liệu chưa hợp lệ.', issues: error.flatten() });
  }
  console.error(error);
  const message = error instanceof Error ? error.message : 'Lỗi hệ thống.';
  return res.status(500).json({ message });
});

// Bản desktop truyền HOST=127.0.0.1 để server chỉ nghe trên loopback: Windows
// không hỏi quyền tường lửa và API không lộ ra mạng nội bộ. Bản web bỏ trống
// biến này để tiếp tục nghe trên mọi card mạng như trước.
const host = process.env.HOST;
const announce = () => console.log(`[api] Thuê Máy Hub đang chạy tại http://${host || 'localhost'}:${port}`);

if (host) app.listen(port, host, announce);
else app.listen(port, announce);

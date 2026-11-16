import { randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  audit, db, getWalletBalance, hashPassword, makeCode, makeId, notifyCustomer, nowIso, readSettings, runTransaction,
  verifyPassword, writeSettings,
} from './database.ts';
import { setCustomerSession } from './customer.ts';

/**
 * API cho giao diện ThueMayHub-FE.
 *
 * Giao diện này có một màn đăng nhập chung cho cả ba vai trò và tự nhận ra người
 * dùng là quản trị, nhân viên hay khách. Phía server vẫn giữ hai loại phiên tách
 * biệt như cũ (cookie `session_id` cho quản trị, `customer_session_id` cho khách);
 * router này chỉ thêm lớp "đoán vai trò" ở trước, không đổi quy tắc phân quyền nào.
 *
 * Mọi API nghiệp vụ khác (máy, khách, đơn, thu tiền, sửa chữa…) giao diện mới gọi
 * thẳng vào API sẵn có, nên quy tắc tiền và quyền chỉ nằm ở một nơi.
 */

type AdminRow = { id: string; name: string; email: string; username: string; role: string; status: string };

const roleOf = (role: string) => (role === 'OWNER' ? 'Admin' : 'Staff');
const adminUser = (a: AdminRow) => ({ id: a.id, name: a.name, email: a.email, username: a.username || a.email.split('@')[0], role: roleOf(a.role) });

function adminFromCookie(req: Request) {
  const sessionId = req.cookies.session_id as string | undefined;
  if (!sessionId) return null;
  const admin = db.prepare(`
    SELECT a.id, a.name, a.email, a.username, a.role, a.status
    FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, nowIso()) as AdminRow | undefined;
  return admin && admin.status === 'ACTIVE' ? admin : null;
}

function customerIdFromCookie(req: Request) {
  const sessionId = req.cookies.customer_session_id as string | undefined;
  if (!sessionId) return null;
  const row = db.prepare(`
    SELECT c.id FROM customer_sessions s
    JOIN customer_accounts a ON a.id = s.account_id
    JOIN customers c ON c.id = a.customer_id
    WHERE s.id = ? AND s.expires_at > ? AND a.status = 'ACTIVE' AND c.status != 'BLOCKED'
  `).get(sessionId, nowIso()) as { id: string } | undefined;
  return row?.id ?? null;
}

/** Hồ sơ khách theo đúng hình dạng giao diện dùng. */
function customerProfile(customerId: string) {
  const c = db.prepare(`
    SELECT c.id, c.code, c.name, c.phone, c.email, c.status, c.address, c.identity_number, a.email AS login_email
    FROM customers c LEFT JOIN customer_accounts a ON a.customer_id = c.id WHERE c.id = ?
  `).get(customerId) as {
    id: string; code: string; name: string; phone: string; email: string; status: string;
    address: string; identity_number: string; login_email: string | null;
  };
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    phone: c.phone,
    email: c.email || c.login_email || '',
    wallet: getWalletBalance(c.id),
    blacklist: c.status === 'BLOCKED',
    address: c.address,
    identityNumber: c.identity_number,
    // Chưa có họ tên hoặc số điện thoại thì chưa cho vào cổng thuê máy.
    profileComplete: Boolean(c.name.trim() && c.phone.trim()),
  };
}

function startAdminSession(res: Response, admin: AdminRow) {
  const sessionId = randomBytes(32).toString('hex');
  const days = Math.max(1, Number(process.env.SESSION_DAYS || 7));
  db.prepare('INSERT INTO sessions (id, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(sessionId, admin.id, new Date(Date.now() + days * 86_400_000).toISOString(), nowIso());
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: days * 86_400_000,
  });
  audit(admin.id, 'LOGIN', 'SESSION', sessionId);
}

/** Đăng nhập vai này thì bỏ phiên vai kia, để một trình duyệt không mang hai danh tính. */
function dropSessions(req: Request, res: Response, keep: 'admin' | 'customer' | null) {
  if (keep !== 'admin' && req.cookies.session_id) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.cookies.session_id as string);
    res.clearCookie('session_id');
  }
  if (keep !== 'customer' && req.cookies.customer_session_id) {
    db.prepare('DELETE FROM customer_sessions WHERE id = ?').run(req.cookies.customer_session_id as string);
    res.clearCookie('customer_session_id');
  }
}

const cleanPhone = (value: string) => value.replace(/[\s.-]/g, '');

const SHOP_DEFAULTS = {
  name: 'Thuê Máy Hub',
  address: '',
  hotline: '',
  email: '',
  hours: '08:00 – 22:00 các ngày trong tuần',
};

function shopInfo() {
  const saved = readSettings();
  return Object.fromEntries(Object.entries(SHOP_DEFAULTS).map(([k, v]) => [k, saved[`shop.${k}`] ?? v])) as typeof SHOP_DEFAULTS;
}

export function createHubRouter() {
  const router = Router();

  router.post('/login', (req, res) => {
    const input = z.object({
      identity: z.string().trim().min(1).max(160),
      password: z.string().min(1).max(200),
    }).parse(req.body);
    const key = input.identity.toLowerCase();

    // Quản trị và nhân viên: email hoặc username.
    const admin = db.prepare(`
      SELECT id, name, email, username, role, status, password_hash FROM admins
      WHERE email = ? OR (username != '' AND lower(username) = ?)
    `).get(key, key) as (AdminRow & { password_hash: string }) | undefined;
    if (admin && verifyPassword(input.password, admin.password_hash)) {
      if (admin.status !== 'ACTIVE') return res.status(403).json({ message: 'Tài khoản đã bị khoá. Liên hệ chủ hệ thống.' });
      dropSessions(req, res, null);
      startAdminSession(res, admin);
      return res.json({ role: roleOf(admin.role), user: adminUser(admin) });
    }

    // Khách hàng: email đăng nhập hoặc số điện thoại.
    const account = db.prepare(`
      SELECT a.id, a.password_hash, a.status, c.id AS customer_id, c.status AS customer_status
      FROM customer_accounts a JOIN customers c ON c.id = a.customer_id
      WHERE a.email = ? OR replace(replace(replace(c.phone, ' ', ''), '.', ''), '-', '') = ?
      ORDER BY CASE WHEN a.email = ? THEN 0 ELSE 1 END LIMIT 1
    `).get(key, cleanPhone(key), key) as
      { id: string; password_hash: string; status: string; customer_id: string; customer_status: string } | undefined;
    if (account && verifyPassword(input.password, account.password_hash)) {
      if (account.status !== 'ACTIVE' || account.customer_status === 'BLOCKED') {
        return res.status(403).json({ message: 'Tài khoản đang bị hạn chế. Hãy liên hệ cửa hàng.' });
      }
      dropSessions(req, res, null);
      setCustomerSession(res, account.id);
      db.prepare('UPDATE customer_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), account.id);
      return res.json({ role: 'Customer', user: customerProfile(account.customer_id) });
    }

    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  });

  router.get('/me', (req, res) => {
    const admin = adminFromCookie(req);
    if (admin) return res.json({ role: roleOf(admin.role), user: adminUser(admin) });
    const customerId = customerIdFromCookie(req);
    if (customerId) return res.json({ role: 'Customer', user: customerProfile(customerId) });
    // Chưa đăng nhập là trạng thái bình thường của trang đăng nhập, không phải lỗi.
    return res.json({ role: null, user: null });
  });

  router.post('/logout', (req, res) => {
    dropSessions(req, res, null);
    res.json({ ok: true });
  });

  /** Khách tự đăng ký; họ tên điền sau ở bước hoàn thiện hồ sơ. */
  router.post('/register', (req, res) => {
    const input = z.object({
      phone: z.string().trim().max(30),
      email: z.string().trim().max(160),
      password: z.string().max(200),
    }).parse(req.body);
    const phone = cleanPhone(input.phone);
    const email = input.email.toLowerCase();
    if (!/^\+?\d{9,15}$/.test(phone)) return res.status(400).json({ message: 'Số điện thoại chưa hợp lệ.' });
    if (!z.string().email().safeParse(email).success) return res.status(400).json({ message: 'Email chưa hợp lệ.' });
    if (input.password.length < 6) return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự.' });

    const taken = db.prepare(`
      SELECT 1 FROM customer_accounts a JOIN customers c ON c.id = a.customer_id
      WHERE a.email = ? OR replace(replace(replace(c.phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1
    `).get(email, phone);
    if (taken) return res.status(409).json({ message: 'Số điện thoại hoặc email đã có tài khoản. Hãy đăng nhập.' });

    const customerId = makeId();
    const accountId = makeId();
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`
        INSERT INTO customers (id, code, name, phone, email, status, notes, created_at, updated_at)
        VALUES (?, ?, '', ?, ?, 'ACTIVE', 'Khách tự đăng ký từ cổng Thuê Máy Hub', ?, ?)
      `).run(customerId, makeCode('KH'), phone, email, time, time);
      db.prepare(`
        INSERT INTO customer_accounts (id, customer_id, email, password_hash, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(accountId, customerId, email, hashPassword(input.password), time, time);
    });
    dropSessions(req, res, null);
    setCustomerSession(res, accountId);
    notifyCustomer(customerId, 'WELCOME', 'Chào mừng đến Thuê Máy Hub', 'Hãy hoàn thiện hồ sơ để bắt đầu thuê máy.');
    return res.status(201).json({ role: 'Customer', user: customerProfile(customerId) });
  });

  /** Khách hoàn thiện hoặc sửa hồ sơ của chính mình. */
  router.patch('/profile', (req, res) => {
    const customerId = customerIdFromCookie(req);
    if (!customerId) return res.status(401).json({ message: 'Bạn cần đăng nhập cổng khách hàng.' });
    const input = z.object({
      name: z.string().trim().max(120),
      phone: z.string().trim().max(30),
      email: z.string().trim().max(160).default(''),
      address: z.string().trim().max(300).default(''),
      identityNumber: z.string().trim().max(20).default(''),
    }).parse(req.body);
    if (input.name.length < 2) return res.status(400).json({ message: 'Hãy nhập họ tên đầy đủ.' });
    if (!/^\+?\d{9,15}$/.test(cleanPhone(input.phone))) return res.status(400).json({ message: 'Số điện thoại chưa hợp lệ.' });
    if (input.email && !z.string().email().safeParse(input.email).success) return res.status(400).json({ message: 'Email chưa hợp lệ.' });
    if (input.identityNumber && !/^\d{9,12}$/.test(input.identityNumber)) {
      return res.status(400).json({ message: 'Số CCCD gồm 9 đến 12 chữ số.' });
    }
    db.prepare(`
      UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, identity_number = ?, updated_at = ? WHERE id = ?
    `).run(input.name, cleanPhone(input.phone), input.email.toLowerCase(), input.address, input.identityNumber, nowIso(), customerId);
    return res.json(customerProfile(customerId));
  });

  /**
   * Các lần thu tiền đơn thuê, cho cả nhân viên xem.
   *
   * Sổ tiền đầy đủ (/api/finance/transactions) vẫn chỉ dành cho chủ. Ở đây chỉ có
   * phiếu thu của đơn thuê — chính những khoản nhân viên đã tự tay thu ở quầy.
   */
  router.get('/payments', (req, res) => {
    if (!adminFromCookie(req)) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
    // Kèm cả phiếu hoàn tiền (số âm) để cộng dồn ra đúng số thực thu sau hoàn.
    res.json(db.prepare(`
      SELECT t.id, t.code, t.kind, t.rental_id, r.code AS rental_code, t.customer_id, c.name AS customer_name,
        t.revenue_change AS amount, t.payment_method, t.occurred_at, t.notes
      FROM financial_transactions t
      LEFT JOIN rentals r ON r.id = t.rental_id
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE t.kind IN ('RENTAL_PAYMENT', 'REFUND')
      ORDER BY t.occurred_at DESC LIMIT 500
    `).all());
  });

  /**
   * Lịch sử ví: khách xem ví của chính mình; quầy xem ví của một khách qua `?customerId=`.
   * Chỉ những dòng làm ví thay đổi (nạp, trả đơn bằng ví, hoàn về ví).
   */
  router.get('/wallet', (req, res) => {
    const admin = adminFromCookie(req);
    const customerId = admin ? String(req.query.customerId ?? '') : customerIdFromCookie(req);
    if (!customerId) return res.status(admin ? 400 : 401).json({ message: admin ? 'Thiếu mã khách hàng.' : 'Bạn cần đăng nhập.' });
    const rows = db.prepare(`
      SELECT t.id, t.code, t.kind, t.payment_method, t.wallet_change, t.notes, t.occurred_at, r.code AS rental_code
      FROM financial_transactions t LEFT JOIN rentals r ON r.id = t.rental_id
      WHERE t.customer_id = ? AND t.wallet_change != 0
      ORDER BY t.occurred_at DESC LIMIT 200
    `).all(customerId);
    res.json({ balance: getWalletBalance(customerId), rows });
  });

  /**
   * Thông tin cửa hàng hiện ở cổng khách (trang Hỗ trợ) và trang Cài đặt. Ai cũng
   * đọc được vì khách cần biết số hotline; chỉ chủ hệ thống được sửa.
   */
  router.get('/shop', (_req, res) => res.json(shopInfo()));

  router.put('/shop', (req, res) => {
    const admin = adminFromCookie(req);
    if (!admin) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
    if (admin.role !== 'OWNER') return res.status(403).json({ message: 'Chỉ chủ hệ thống được sửa thông tin cửa hàng.' });
    const input = z.object({
      name: z.string().trim().min(2).max(120),
      address: z.string().trim().max(300).default(''),
      hotline: z.string().trim().max(40).default(''),
      email: z.string().trim().max(160).default(''),
      hours: z.string().trim().max(120).default(''),
    }).parse(req.body);
    if (input.email && !z.string().email().safeParse(input.email).success) return res.status(400).json({ message: 'Email chưa hợp lệ.' });
    writeSettings(Object.fromEntries(Object.entries(input).map(([k, v]) => [`shop.${k}`, v])));
    audit(admin.id, 'UPDATE', 'SETTINGS', 'shop', input.name);
    return res.json(shopInfo());
  });

  return router;
}

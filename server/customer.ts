import { randomBytes } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  audit, db, getRentalPaid, getWalletBalance, hashPassword, makeCode, makeId, notifyCustomer,
  nowIso, runTransaction, syncDeviceStatus, verifyPassword,
} from './database.ts';
import { sortByName } from './sort.ts';
import { createCustomerTopupRouter } from './topup.ts';

type CustomerIdentity = {
  accountId: string;
  customerId: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
};

type CustomerRequest = Request & { customer?: CustomerIdentity };
type AdminRequest = Request & { admin?: { id: string; name: string; email: string; role: string } };

/** Kênh khách muốn được liên hệ và cách nhận máy, khách chọn khi gửi yêu cầu thuê. */
const CONTACT_CHANNELS = ['ZALO', 'PHONE', 'TELEGRAM'] as const;
const HANDOVER_METHODS = ['ULTRAVIEWER', 'TEAMVIEWER', 'ANYDESK', 'IN_STORE', 'OTHER'] as const;

function routeId(req: Request) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Tin cuối của ticket và ai gửi tin đó (CUSTOMER / ADMIN). Giao diện so tin cuối giữa
 * hai lần tải để báo "có tin nhắn mới" cho bên còn lại.
 */
const LAST_MESSAGE_COLUMNS = `
  (SELECT body FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC, rowid DESC LIMIT 1) AS last_message,
  (SELECT author_type FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC, rowid DESC LIMIT 1) AS last_author`;

/** Ticket cho quầy: việc cần trả lời lên đầu, rồi theo tin mới nhất. */
function deskTickets(limit: number, offset: number) {
  return db.prepare(`
    SELECT t.*, c.name AS customer_name, r.code AS rental_code, ${LAST_MESSAGE_COLUMNS}
    FROM support_tickets t JOIN customers c ON c.id = t.customer_id LEFT JOIN rentals r ON r.id = t.rental_id
    ORDER BY CASE t.status WHEN 'OPEN' THEN 0 WHEN 'WAITING_CUSTOMER' THEN 1 ELSE 2 END, t.last_message_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
}

export function setCustomerSession(res: Response, accountId: string) {
  const id = randomBytes(32).toString('hex');
  const days = Math.max(1, Number(process.env.CUSTOMER_SESSION_DAYS || 14));
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  db.prepare('INSERT INTO customer_sessions (id, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(id, accountId, expiresAt, nowIso());
  res.cookie('customer_session_id', id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: days * 86_400_000,
  });
}

function requireCustomer(req: CustomerRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies.customer_session_id as string | undefined;
  if (!sessionId) return res.status(401).json({ message: 'Bạn cần đăng nhập cổng khách hàng.' });
  const identity = db.prepare(`
    SELECT a.id AS accountId, c.id AS customerId, c.code, c.name, a.email, c.phone, c.company, c.status
    FROM customer_sessions s
    JOIN customer_accounts a ON a.id = s.account_id
    JOIN customers c ON c.id = a.customer_id
    WHERE s.id = ? AND s.expires_at > ? AND a.status = 'ACTIVE' AND c.status != 'BLOCKED'
  `).get(sessionId, nowIso()) as CustomerIdentity | undefined;
  if (!identity) return res.status(401).json({ message: 'Phiên khách hàng đã hết hạn hoặc tài khoản bị khóa.' });
  req.customer = identity;
  next();
}

function customerPayload(identity: CustomerIdentity) {
  const unread = db.prepare('SELECT COUNT(*) AS count FROM customer_notifications WHERE customer_id = ? AND read_at IS NULL')
    .get(identity.customerId) as { count: number };
  return {
    ...identity,
    walletBalance: getWalletBalance(identity.customerId),
    unreadNotifications: Number(unread.count),
  };
}

export function createCustomerRouter() {
  const router = Router();
  db.prepare('DELETE FROM customer_sessions WHERE expires_at <= ?').run(nowIso());

  router.post('/auth/register', (req, res) => {
    const input = z.object({
      name: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(8).max(30),
      email: z.string().trim().email().max(160),
      password: z.string().min(10).max(200),
    }).parse(req.body);
    if (!/[A-Z]/.test(input.password) || !/[a-z]/.test(input.password) || !/[0-9]/.test(input.password)) {
      return res.status(400).json({ message: 'Mật khẩu cần có chữ hoa, chữ thường và chữ số.' });
    }
    const email = input.email.toLowerCase();
    if (db.prepare('SELECT id FROM customer_accounts WHERE email = ?').get(email)) {
      return res.status(409).json({ message: 'Email đã có tài khoản. Hãy đăng nhập.' });
    }
    const accountId = makeId();
    const customerId = makeId();
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`
        INSERT INTO customers (id, code, name, phone, email, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'Khách tự đăng ký từ cổng khách hàng', ?, ?)
      `).run(customerId, makeCode('KH'), input.name, input.phone, email, time, time);
      db.prepare(`
        INSERT INTO customer_accounts (id, customer_id, email, password_hash, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(accountId, customerId, email, hashPassword(input.password), time, time);
    });
    setCustomerSession(res, accountId);
    const identity = db.prepare(`
      SELECT a.id AS accountId, c.id AS customerId, c.code, c.name, a.email, c.phone, c.company, c.status
      FROM customer_accounts a JOIN customers c ON c.id = a.customer_id WHERE a.id = ?
    `).get(accountId) as CustomerIdentity;
    notifyCustomer(customerId, 'WELCOME', 'Chào mừng đến Thuê Máy Hub', 'Tài khoản đã sẵn sàng. Bạn có thể xem thiết bị và gửi yêu cầu thuê.', '/portal/catalog');
    return res.status(201).json(customerPayload(identity));
  });

  router.post('/auth/login', (req, res) => {
    const input = z.object({ email: z.string().email(), password: z.string().min(6).max(200) }).parse(req.body);
    const record = db.prepare(`
      SELECT a.id, a.password_hash, a.status, c.status AS customer_status
      FROM customer_accounts a JOIN customers c ON c.id = a.customer_id WHERE a.email = ?
    `).get(input.email.toLowerCase()) as { id: string; password_hash: string; status: string; customer_status: string } | undefined;
    if (!record || !verifyPassword(input.password, record.password_hash)) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    if (record.status !== 'ACTIVE' || record.customer_status === 'BLOCKED') {
      return res.status(403).json({ message: 'Tài khoản đang bị hạn chế. Hãy liên hệ hỗ trợ.' });
    }
    setCustomerSession(res, record.id);
    db.prepare('UPDATE customer_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), record.id);
    const identity = db.prepare(`
      SELECT a.id AS accountId, c.id AS customerId, c.code, c.name, a.email, c.phone, c.company, c.status
      FROM customer_accounts a JOIN customers c ON c.id = a.customer_id WHERE a.id = ?
    `).get(record.id) as CustomerIdentity;
    return res.json(customerPayload(identity));
  });

  router.post('/auth/change-password', requireCustomer, (req: CustomerRequest, res) => {
    const input = z.object({
      currentPassword: z.string().min(6).max(200),
      newPassword: z.string().min(10).max(200),
    }).parse(req.body);

    const record = db.prepare('SELECT password_hash FROM customer_accounts WHERE id = ?')
      .get(req.customer!.accountId) as { password_hash: string };
    if (!verifyPassword(input.currentPassword, record.password_hash)) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }
    if (!/[A-Z]/.test(input.newPassword) || !/[a-z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
      return res.status(400).json({ message: 'Mật khẩu mới cần có chữ hoa, chữ thường và chữ số.' });
    }

    const currentSession = req.cookies.customer_session_id as string;
    runTransaction(() => {
      db.prepare('UPDATE customer_accounts SET password_hash = ?, updated_at = ? WHERE id = ?')
        .run(hashPassword(input.newPassword), nowIso(), req.customer!.accountId);
      // Giữ lại đúng phiên đang thao tác, cắt mọi thiết bị khác.
      db.prepare('DELETE FROM customer_sessions WHERE account_id = ? AND id != ?')
        .run(req.customer!.accountId, currentSession);
    });

    notifyCustomer(
      req.customer!.customerId,
      'SECURITY',
      'Mật khẩu đã được đổi',
      'Nếu không phải bạn thực hiện, hãy liên hệ đội vận hành ngay.',
    );
    return res.json({ ok: true });
  });

  router.post('/auth/logout', requireCustomer, (req, res) => {
    db.prepare('DELETE FROM customer_sessions WHERE id = ?').run(req.cookies.customer_session_id as string);
    res.clearCookie('customer_session_id');
    res.json({ ok: true });
  });

  router.get('/auth/me', requireCustomer, (req: CustomerRequest, res) => res.json(customerPayload(req.customer!)));
  router.use(requireCustomer);
  router.use('/topups', createCustomerTopupRouter());

  router.get('/catalog', (_req, res) => {
    const devices = db.prepare(`
      SELECT id, code, name, type, specs, category, location, hourly_rate, monthly_rate, status
      FROM devices WHERE status = 'AVAILABLE'
    `).all();
    // Cùng thứ tự với trang quản trị: theo tên, số trong tên hiểu là số.
    res.json(sortByName(devices as Array<{ name?: string }>));
  });

  router.get('/bookings', (req: CustomerRequest, res) => {
    const data = db.prepare(`
      SELECT b.*, d.code AS device_code, d.name AS device_name, d.type AS device_type, d.monthly_rate AS device_monthly_rate
      FROM booking_requests b JOIN devices d ON d.id = b.device_id
      WHERE b.customer_id = ? ORDER BY b.created_at DESC
    `).all(req.customer!.customerId);
    res.json(data);
  });

  router.post('/bookings', (req: CustomerRequest, res) => {
    const input = z.object({
      deviceId: z.string().uuid(),
      billingMode: z.enum(['HOURLY', 'MONTHLY']),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      note: z.string().trim().max(1000).default(''),
      contactPhone: z.string().trim().max(30).default(''),
      contactChannel: z.enum(CONTACT_CHANNELS).default('ZALO'),
      handoverMethod: z.enum(HANDOVER_METHODS).default('ULTRAVIEWER'),
    }).parse(req.body);
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (end <= start || start.getTime() < Date.now() - 300_000) {
      return res.status(400).json({ message: 'Khoảng thời gian yêu cầu không hợp lệ.' });
    }
    // Không nhập thì lấy số trong hồ sơ; quầy luôn phải có một số để liên hệ giao máy.
    const contactPhone = (input.contactPhone || req.customer!.phone).replace(/[\s.-]/g, '');
    if (!/^\+?\d{9,15}$/.test(contactPhone)) {
      return res.status(400).json({ message: 'Hãy nhập số điện thoại hoặc Zalo hợp lệ để cửa hàng liên hệ giao máy.' });
    }
    const device = db.prepare(`
      SELECT id, hourly_rate, monthly_rate, status FROM devices WHERE id = ?
    `).get(input.deviceId) as { id: string; hourly_rate: number; monthly_rate: number; status: string } | undefined;
    if (!device || device.status !== 'AVAILABLE') {
      return res.status(409).json({ message: 'Thiết bị hiện không còn sẵn sàng.' });
    }
    const duplicate = db.prepare(`
      SELECT id FROM booking_requests WHERE customer_id = ? AND device_id = ? AND status = 'PENDING'
    `).get(req.customer!.customerId, device.id);
    if (duplicate) return res.status(409).json({ message: 'Bạn đã có yêu cầu chờ duyệt cho thiết bị này.' });

    const duration = end.getTime() - start.getTime();
    const quantity = input.billingMode === 'HOURLY'
      ? Math.max(1, Math.ceil(duration / 3_600_000))
      : Math.max(1, Math.ceil(duration / (30 * 86_400_000)));
    const estimated = quantity * (input.billingMode === 'HOURLY' ? device.hourly_rate : device.monthly_rate);
    if (estimated <= 0) return res.status(400).json({ message: 'Thiết bị chưa được cấu hình giá cho gói này.' });
    const id = makeId();
    const code = makeCode('YC');
    const time = nowIso();
    db.prepare(`
      INSERT INTO booking_requests
        (id, code, customer_id, device_id, billing_mode, requested_start_at, requested_end_at,
         estimated_amount, status, customer_note, contact_phone, contact_channel, handover_method, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)
    `).run(id, code, req.customer!.customerId, device.id, input.billingMode, start.toISOString(), end.toISOString(),
      estimated, input.note, contactPhone, input.contactChannel, input.handoverMethod, time, time);
    notifyCustomer(req.customer!.customerId, 'BOOKING', 'Đã nhận yêu cầu thuê máy', `${code} đang chờ đội vận hành xác nhận.`, '/portal/bookings');
    res.status(201).json({ id, code, estimatedAmount: estimated });
  });

  router.patch('/bookings/:id/cancel', (req: CustomerRequest, res) => {
    const id = routeId(req);
    const result = db.prepare(`
      UPDATE booking_requests SET status = 'CANCELLED', updated_at = ?
      WHERE id = ? AND customer_id = ? AND status = 'PENDING'
    `).run(nowIso(), id, req.customer!.customerId);
    if (!result.changes) return res.status(409).json({ message: 'Yêu cầu không còn có thể hủy.' });
    res.json({ ok: true });
  });

  router.get('/rentals', (req: CustomerRequest, res) => {
    const data = db.prepare(`
      SELECT r.*, d.name AS device_name, d.code AS device_code, d.type AS device_type, d.specs,
        COALESCE(SUM(t.revenue_change), 0) AS paid_amount
      FROM rentals r JOIN devices d ON d.id = r.device_id
      LEFT JOIN financial_transactions t ON t.rental_id = r.id
      WHERE r.customer_id = ? GROUP BY r.id ORDER BY r.created_at DESC
    `).all(req.customer!.customerId);
    res.json(data);
  });

  router.post('/rentals/:id/pay-with-wallet', (req: CustomerRequest, res) => {
    const id = routeId(req);
    const input = z.object({ amount: z.coerce.number().int().positive() }).parse(req.body);
    const rental = db.prepare(`
      SELECT id, total_amount FROM rentals WHERE id = ? AND customer_id = ? AND status != 'CANCELLED'
    `).get(id, req.customer!.customerId) as { id: string; total_amount: number } | undefined;
    if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn thuê.' });
    const paid = getRentalPaid(rental.id);
    const wallet = getWalletBalance(req.customer!.customerId);
    if (input.amount > rental.total_amount - paid) return res.status(400).json({ message: 'Số tiền vượt phần còn phải thanh toán.' });
    if (input.amount > wallet) return res.status(400).json({ message: 'Số dư ví không đủ.' });
    const time = nowIso();
    db.prepare(`
      INSERT INTO financial_transactions
        (id, code, customer_id, rental_id, kind, payment_method, cash_change, wallet_change, revenue_change,
         notes, occurred_at, created_at)
      VALUES (?, ?, ?, ?, 'RENTAL_PAYMENT', 'WALLET', 0, ?, ?, 'Khách tự thanh toán từ cổng', ?, ?)
    `).run(makeId(), makeCode('GD'), req.customer!.customerId, rental.id, -input.amount, input.amount, time, time);
    res.status(201).json({ paidAmount: paid + input.amount, walletBalance: wallet - input.amount });
  });

  router.post('/rentals/:id/extensions', (req: CustomerRequest, res) => {
    const rentalId = routeId(req);
    const input = z.object({ requestedEndAt: z.string().datetime(), note: z.string().trim().max(1000).default('') }).parse(req.body);
    const rental = db.prepare(`
      SELECT id, end_at, status FROM rentals WHERE id = ? AND customer_id = ?
    `).get(rentalId, req.customer!.customerId) as { id: string; end_at: string; status: string } | undefined;
    if (!rental || !['ACTIVE', 'RESERVED'].includes(rental.status)) return res.status(409).json({ message: 'Đơn này không thể gia hạn.' });
    if (new Date(input.requestedEndAt) <= new Date(rental.end_at)) return res.status(400).json({ message: 'Thời hạn mới phải sau thời hạn hiện tại.' });
    if (db.prepare("SELECT id FROM extension_requests WHERE rental_id = ? AND status = 'PENDING'").get(rental.id)) {
      return res.status(409).json({ message: 'Đơn đang có một yêu cầu gia hạn chờ xử lý.' });
    }
    const id = makeId();
    const code = makeCode('GH');
    const time = nowIso();
    db.prepare(`
      INSERT INTO extension_requests
        (id, code, customer_id, rental_id, current_end_at, requested_end_at, status, customer_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).run(id, code, req.customer!.customerId, rental.id, rental.end_at, new Date(input.requestedEndAt).toISOString(), input.note, time, time);
    notifyCustomer(req.customer!.customerId, 'EXTENSION', 'Đã nhận yêu cầu gia hạn', `${code} đang chờ báo giá và xác nhận.`, '/portal/rentals');
    res.status(201).json({ id, code });
  });

  router.get('/extensions', (req: CustomerRequest, res) => {
    res.json(db.prepare(`
      SELECT e.*, r.code AS rental_code, d.name AS device_name
      FROM extension_requests e JOIN rentals r ON r.id = e.rental_id JOIN devices d ON d.id = r.device_id
      WHERE e.customer_id = ? ORDER BY e.created_at DESC
    `).all(req.customer!.customerId));
  });

  router.get('/tickets', (req: CustomerRequest, res) => {
    res.json(db.prepare(`
      SELECT t.*, r.code AS rental_code, ${LAST_MESSAGE_COLUMNS}
      FROM support_tickets t LEFT JOIN rentals r ON r.id = t.rental_id
      WHERE t.customer_id = ? ORDER BY t.last_message_at DESC
    `).all(req.customer!.customerId));
  });

  router.post('/tickets', (req: CustomerRequest, res) => {
    const input = z.object({
      rentalId: z.string().uuid().nullable().optional(),
      subject: z.string().trim().min(4).max(160),
      category: z.enum(['TECHNICAL', 'PAYMENT', 'RENTAL', 'GENERAL']),
      priority: z.enum(['NORMAL', 'HIGH']).default('NORMAL'),
      message: z.string().trim().min(5).max(3000),
    }).parse(req.body);
    if (input.rentalId && !db.prepare('SELECT id FROM rentals WHERE id = ? AND customer_id = ?').get(input.rentalId, req.customer!.customerId)) {
      return res.status(400).json({ message: 'Đơn thuê đính kèm không hợp lệ.' });
    }
    const id = makeId();
    const code = makeCode('HT');
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`
        INSERT INTO support_tickets
          (id, code, customer_id, rental_id, subject, category, priority, status, last_message_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
      `).run(id, code, req.customer!.customerId, input.rentalId || null, input.subject, input.category, input.priority, time, time, time);
      db.prepare(`
        INSERT INTO ticket_messages (id, ticket_id, author_type, author_id, body, created_at)
        VALUES (?, ?, 'CUSTOMER', ?, ?, ?)
      `).run(makeId(), id, req.customer!.customerId, input.message, time);
    });
    res.status(201).json({ id, code });
  });

  router.get('/tickets/:id/messages', (req: CustomerRequest, res) => {
    const id = routeId(req);
    if (!db.prepare('SELECT id FROM support_tickets WHERE id = ? AND customer_id = ?').get(id, req.customer!.customerId)) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ.' });
    }
    res.json(db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at').all(id));
  });

  router.post('/tickets/:id/messages', (req: CustomerRequest, res) => {
    const id = routeId(req);
    const input = z.object({ body: z.string().trim().min(2).max(3000) }).parse(req.body);
    if (!db.prepare('SELECT id FROM support_tickets WHERE id = ? AND customer_id = ?').get(id, req.customer!.customerId)) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ.' });
    }
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`INSERT INTO ticket_messages (id, ticket_id, author_type, author_id, body, created_at) VALUES (?, ?, 'CUSTOMER', ?, ?, ?)`)
        .run(makeId(), id, req.customer!.customerId, input.body, time);
      db.prepare("UPDATE support_tickets SET status = 'OPEN', last_message_at = ?, updated_at = ? WHERE id = ?").run(time, time, id);
    });
    res.status(201).json({ ok: true });
  });

  router.get('/notifications', (req: CustomerRequest, res) => {
    const soon = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const rentals = db.prepare(`
      SELECT r.id, r.code, r.end_at, d.name AS device_name FROM rentals r JOIN devices d ON d.id = r.device_id
      WHERE r.customer_id = ? AND r.status IN ('ACTIVE', 'RESERVED') AND r.end_at <= ?
    `).all(req.customer!.customerId, soon) as Array<{ id: string; code: string; end_at: string; device_name: string }>;
    for (const rental of rentals) {
      notifyCustomer(req.customer!.customerId, 'EXPIRY', 'Đơn thuê sắp hết hạn', `${rental.device_name} (${rental.code}) sẽ hết hạn trong vòng 24 giờ.`, '/portal/rentals', `expiry-24h-${rental.id}`);
    }
    res.json(db.prepare('SELECT * FROM customer_notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100').all(req.customer!.customerId));
  });

  router.post('/notifications/read-all', (req: CustomerRequest, res) => {
    db.prepare('UPDATE customer_notifications SET read_at = ? WHERE customer_id = ? AND read_at IS NULL').run(nowIso(), req.customer!.customerId);
    res.json({ ok: true });
  });

  return router;
}

export function createAdminServiceRouter() {
  const router = Router();

  /**
   * Danh sách yêu cầu và ticket, trả theo trang.
   *
   * `pending` được đếm bằng câu lệnh riêng chứ không đếm từ mảng trả về: huy hiệu
   * việc chờ trên menu lấy con số này, mà đếm từ danh sách đã cắt thì quá ngưỡng
   * là báo thiếu việc — kiểu sai nguy hiểm vì người dùng tin vào con số đó.
   */
  router.get('/overview', (req, res) => {
    const limit = Math.min(Math.max(Math.trunc(Number(req.query.limit)) || 100, 1), 500);
    const offset = Math.max(Math.trunc(Number(req.query.offset)) || 0, 0);
    const count = (sql: string) => Number((db.prepare(sql).get() as { count: number }).count);

    const bookings = db.prepare(`
      SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, d.name AS device_name, d.code AS device_code, d.status AS device_status,
        d.monthly_rate AS device_monthly_rate
      FROM booking_requests b JOIN customers c ON c.id = b.customer_id JOIN devices d ON d.id = b.device_id
      ORDER BY CASE b.status WHEN 'PENDING' THEN 0 ELSE 1 END, b.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    const extensions = db.prepare(`
      SELECT e.*, c.name AS customer_name, r.code AS rental_code, d.name AS device_name
      FROM extension_requests e JOIN customers c ON c.id = e.customer_id
      JOIN rentals r ON r.id = e.rental_id JOIN devices d ON d.id = r.device_id
      ORDER BY CASE e.status WHEN 'PENDING' THEN 0 ELSE 1 END, e.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    const tickets = deskTickets(limit, offset);

    res.json({
      bookings: { rows: bookings, total: count('SELECT COUNT(*) AS count FROM booking_requests') },
      extensions: { rows: extensions, total: count('SELECT COUNT(*) AS count FROM extension_requests') },
      tickets: { rows: tickets, total: count('SELECT COUNT(*) AS count FROM support_tickets') },
      pending: {
        bookings: count("SELECT COUNT(*) AS count FROM booking_requests WHERE status = 'PENDING'"),
        extensions: count("SELECT COUNT(*) AS count FROM extension_requests WHERE status = 'PENDING'"),
        tickets: count("SELECT COUNT(*) AS count FROM support_tickets WHERE status NOT IN ('RESOLVED', 'CLOSED')"),
      },
    });
  });

  router.post('/bookings/:id/approve', (req: AdminRequest, res) => {
    const id = routeId(req);
    const input = z.object({
      quotedAmount: z.coerce.number().int().nonnegative(),
      adminNote: z.string().trim().max(1000).default(''),
      accessNote: z.string().trim().max(1000).default(''),
    }).parse(req.body);
    const booking = db.prepare(`
      SELECT * FROM booking_requests WHERE id = ? AND status = 'PENDING'
    `).get(id) as Record<string, string | number> | undefined;
    if (!booking) return res.status(409).json({ message: 'Yêu cầu không còn chờ duyệt.' });
    const device = db.prepare('SELECT status FROM devices WHERE id = ?').get(booking.device_id as string) as { status: string } | undefined;
    if (!device || device.status !== 'AVAILABLE') return res.status(409).json({ message: 'Thiết bị không còn sẵn sàng.' });
    const rentalId = makeId();
    const rentalCode = makeCode('HD');
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`
        INSERT INTO rentals
          (id, code, customer_id, device_id, start_at, end_at, base_amount, total_amount, status, access_note, notes,
           contact_phone, contact_channel, handover_method, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RESERVED', ?, ?, ?, ?, ?, ?, ?)
      `).run(rentalId, rentalCode, booking.customer_id, booking.device_id, booking.requested_start_at, booking.requested_end_at,
        input.quotedAmount, input.quotedAmount, input.accessNote, `Tạo từ yêu cầu ${booking.code}. ${input.adminNote}`,
        booking.contact_phone ?? '', booking.contact_channel ?? '', booking.handover_method ?? '', time, time);
      db.prepare(`
        UPDATE booking_requests SET status = 'APPROVED', quoted_amount = ?, admin_note = ?, rental_id = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(input.quotedAmount, input.adminNote, rentalId, req.admin!.id, time, time, id);
      syncDeviceStatus(booking.device_id as string, 'RESERVED');
    });
    notifyCustomer(booking.customer_id as string, 'BOOKING_APPROVED', 'Yêu cầu thuê đã được duyệt', `${booking.code} đã được duyệt với giá ${input.quotedAmount.toLocaleString('vi-VN')} đồng.`, '/portal/rentals');
    audit(req.admin!.id, 'APPROVE', 'BOOKING_REQUEST', id, `${booking.code} -> ${rentalCode}`);
    res.status(201).json({ rentalId, rentalCode });
  });

  router.post('/bookings/:id/reject', (req: AdminRequest, res) => {
    const id = routeId(req);
    const input = z.object({ adminNote: z.string().trim().min(3).max(1000) }).parse(req.body);
    const booking = db.prepare("SELECT customer_id, code FROM booking_requests WHERE id = ? AND status = 'PENDING'").get(id) as { customer_id: string; code: string } | undefined;
    if (!booking) return res.status(409).json({ message: 'Yêu cầu không còn chờ duyệt.' });
    const time = nowIso();
    db.prepare(`UPDATE booking_requests SET status = 'REJECTED', admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`)
      .run(input.adminNote, req.admin!.id, time, time, id);
    notifyCustomer(booking.customer_id, 'BOOKING_REJECTED', 'Yêu cầu thuê cần điều chỉnh', `${booking.code}: ${input.adminNote}`, '/portal/bookings');
    audit(req.admin!.id, 'REJECT', 'BOOKING_REQUEST', id, input.adminNote);
    res.json({ ok: true });
  });

  router.post('/extensions/:id/approve', (req: AdminRequest, res) => {
    const id = routeId(req);
    const input = z.object({ additionalAmount: z.coerce.number().int().nonnegative(), adminNote: z.string().trim().max(1000).default('') }).parse(req.body);
    const extension = db.prepare("SELECT * FROM extension_requests WHERE id = ? AND status = 'PENDING'").get(id) as Record<string, string | number> | undefined;
    if (!extension) return res.status(409).json({ message: 'Yêu cầu gia hạn không còn chờ duyệt.' });
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`UPDATE rentals SET end_at = ?, base_amount = base_amount + ?, total_amount = total_amount + ?, updated_at = ? WHERE id = ?`)
        .run(extension.requested_end_at, input.additionalAmount, input.additionalAmount, time, extension.rental_id);
      db.prepare(`UPDATE extension_requests SET status = 'APPROVED', additional_amount = ?, admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`)
        .run(input.additionalAmount, input.adminNote, req.admin!.id, time, time, id);
    });
    notifyCustomer(extension.customer_id as string, 'EXTENSION_APPROVED', 'Gia hạn đã được duyệt', `${extension.code} đã được duyệt. Phí bổ sung ${input.additionalAmount.toLocaleString('vi-VN')} đồng.`, '/portal/rentals');
    audit(req.admin!.id, 'APPROVE', 'EXTENSION_REQUEST', id, String(input.additionalAmount));
    res.json({ ok: true });
  });

  router.post('/extensions/:id/reject', (req: AdminRequest, res) => {
    const id = routeId(req);
    const input = z.object({ adminNote: z.string().trim().min(3).max(1000) }).parse(req.body);
    const extension = db.prepare("SELECT customer_id, code FROM extension_requests WHERE id = ? AND status = 'PENDING'").get(id) as { customer_id: string; code: string } | undefined;
    if (!extension) return res.status(409).json({ message: 'Yêu cầu gia hạn không còn chờ duyệt.' });
    const time = nowIso();
    db.prepare(`UPDATE extension_requests SET status = 'REJECTED', admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`)
      .run(input.adminNote, req.admin!.id, time, time, id);
    notifyCustomer(extension.customer_id, 'EXTENSION_REJECTED', 'Chưa thể gia hạn đơn', `${extension.code}: ${input.adminNote}`, '/portal/rentals');
    audit(req.admin!.id, 'REJECT', 'EXTENSION_REQUEST', id, input.adminNote);
    res.json({ ok: true });
  });

  /**
   * Chỉ danh sách ticket, nhẹ hơn /overview: giao diện quầy gọi vài giây một lần để
   * thấy ngay tin nhắn mới của khách và bật thông báo.
   */
  router.get('/tickets', (req, res) => {
    const limit = Math.min(Math.max(Math.trunc(Number(req.query.limit)) || 100, 1), 500);
    res.json(deskTickets(limit, 0));
  });

  router.get('/tickets/:id/messages', (req, res) => {
    const id = routeId(req);
    res.json(db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at').all(id));
  });

  router.post('/tickets/:id/messages', (req: AdminRequest, res) => {
    const id = routeId(req);
    const input = z.object({ body: z.string().trim().min(2).max(3000) }).parse(req.body);
    const ticket = db.prepare('SELECT customer_id, code FROM support_tickets WHERE id = ?').get(id) as { customer_id: string; code: string } | undefined;
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy ticket.' });
    const time = nowIso();
    runTransaction(() => {
      db.prepare(`INSERT INTO ticket_messages (id, ticket_id, author_type, author_id, body, created_at) VALUES (?, ?, 'ADMIN', ?, ?, ?)`)
        .run(makeId(), id, req.admin!.id, input.body, time);
      db.prepare("UPDATE support_tickets SET status = 'WAITING_CUSTOMER', last_message_at = ?, updated_at = ? WHERE id = ?").run(time, time, id);
    });
    notifyCustomer(ticket.customer_id, 'SUPPORT_REPLY', 'Hỗ trợ đã phản hồi', `${ticket.code}: ${input.body.slice(0, 120)}`, '/portal/support');
    audit(req.admin!.id, 'REPLY', 'SUPPORT_TICKET', id, ticket.code);
    res.status(201).json({ ok: true });
  });

  router.patch('/tickets/:id/status', (req: AdminRequest, res) => {
    const id = routeId(req);
    const input = z.object({ status: z.enum(['OPEN', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']) }).parse(req.body);
    const ticket = db.prepare('SELECT customer_id, code FROM support_tickets WHERE id = ?').get(id) as { customer_id: string; code: string } | undefined;
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy ticket.' });
    db.prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?').run(input.status, nowIso(), id);
    if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
      notifyCustomer(ticket.customer_id, 'SUPPORT_STATUS', 'Yêu cầu hỗ trợ đã được xử lý', `${ticket.code} đã chuyển sang trạng thái hoàn tất.`, '/portal/support');
    }
    audit(req.admin!.id, 'STATUS', 'SUPPORT_TICKET', id, input.status);
    res.json({ ok: true });
  });

  return router;
}

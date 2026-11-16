import { randomInt } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import {
  audit, db, getWalletBalance, makeId, notifyCustomer, nowIso, readSettings, runTransaction, writeSettings,
} from './database.ts';
import { can, type Permission } from './permissions.ts';

/**
 * Khách tự nạp ví bằng chuyển khoản ngân hàng qua mã VietQR.
 *
 * 1. Chủ cửa hàng khai báo tài khoản nhận tiền (Cài đặt → Nhận chuyển khoản).
 * 2. Khách chọn số tiền, hệ thống tạo một yêu cầu nạp có nội dung chuyển khoản riêng
 *    (ví dụ "NAP K7M2QX") và mã VietQR chứa sẵn ngân hàng, số tài khoản, số tiền, nội dung.
 *    App ngân hàng nào ở Việt Nam cũng quét được mã này.
 * 3. Khách chuyển xong bấm "Tôi đã chuyển khoản" để báo cửa hàng.
 * 4. Chủ đối chiếu sao kê theo nội dung chuyển khoản rồi xác nhận — lúc đó mới ghi
 *    giao dịch nạp ví. Tiền chỉ vào ví khi có người kiểm tra thật, không tin lời khách.
 *
 * Mã QR được tạo ngay trên máy chủ này, không gọi dịch vụ ngoài nào, nên số tài
 * khoản và thông tin khách không rời khỏi máy.
 */

/** Mã BIN theo danh sách NAPAS/VietQR (api.vietqr.io/v2/banks). */
export const BANKS: ReadonlyArray<{ bin: string; name: string }> = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970437', name: 'HDBank' },
  { bin: '970441', name: 'VIB' },
  { bin: '970443', name: 'SHB' },
  { bin: '970431', name: 'Eximbank' },
  { bin: '970426', name: 'MSB' },
  { bin: '970448', name: 'OCB' },
  { bin: '970440', name: 'SeABank' },
  { bin: '970449', name: 'LPBank' },
  { bin: '970454', name: 'BVBank (Bản Việt)' },
  { bin: '970428', name: 'Nam A Bank' },
  { bin: '970409', name: 'Bac A Bank' },
  { bin: '970412', name: 'PVcomBank' },
  { bin: '970425', name: 'ABBANK' },
  { bin: '970427', name: 'VietABank' },
  { bin: '970433', name: 'VietBank' },
  { bin: '970438', name: 'BaoViet Bank' },
  { bin: '970452', name: 'KienLongBank' },
  { bin: '970419', name: 'NCB' },
  { bin: '970430', name: 'PGBank' },
  { bin: '970400', name: 'Saigonbank' },
  { bin: '970429', name: 'SCB' },
  { bin: '970408', name: 'GPBank' },
  { bin: '970414', name: 'MBV' },
  { bin: '970406', name: 'Vikki' },
  { bin: '546034', name: 'CAKE by VPBank' },
  { bin: '546035', name: 'Ubank by VPBank' },
  { bin: '963388', name: 'Timo' },
  { bin: '970424', name: 'Shinhan Bank' },
  { bin: '970457', name: 'Woori Bank' },
  { bin: '970439', name: 'Public Bank' },
  { bin: '458761', name: 'HSBC' },
  { bin: '422589', name: 'CIMB' },
];

export const bankName = (bin: string) => BANKS.find((b) => b.bin === bin)?.name ?? bin;

/* ---- Chuỗi VietQR (chuẩn EMVCo của NAPAS) -------------------------------- */

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE: đa thức 0x1021, giá trị đầu 0xFFFF — chuẩn EMVCo quy định. */
export function crc16(text: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(text, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Chuỗi nằm trong mã QR. Có số tiền thì là mã "động" (12): app ngân hàng điền sẵn
 * số tiền và nội dung, khách chỉ việc xác nhận.
 */
export function vietQrPayload(input: { bin: string; accountNo: string; amount?: number; note?: string }) {
  const beneficiary = tlv('00', input.bin) + tlv('01', input.accountNo);
  const merchant = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');
  const body = tlv('00', '01')
    + tlv('01', input.amount ? '12' : '11')
    + tlv('38', merchant)
    + tlv('53', '704')
    + (input.amount ? tlv('54', String(input.amount)) : '')
    + tlv('58', 'VN')
    + (input.note ? tlv('62', tlv('08', input.note)) : '')
    + '6304';
  return body + crc16(body);
}

/** Tên chủ tài khoản kiểu ngân hàng in: chữ hoa, không dấu. */
export function plainName(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ---- Cấu hình tài khoản nhận ---------------------------------------------- */

export function bankSettings() {
  const s = readSettings();
  const bin = s['bank.bin'] ?? '';
  const accountNo = s['bank.accountNo'] ?? '';
  const accountName = s['bank.accountName'] ?? '';
  const enabled = s['bank.enabled'] === '1';
  return {
    enabled, bin, bankName: bin ? bankName(bin) : '', accountNo, accountName,
    ready: enabled && Boolean(bin && accountNo && accountName),
  };
}

export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 50_000_000;

/** Bỏ chữ dễ đọc nhầm (0/O, 1/I/L) vì khách có thể phải gõ tay nội dung chuyển khoản. */
const NOTE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newTransferNote() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += NOTE_ALPHABET[randomInt(NOTE_ALPHABET.length)];
    const note = `NAP ${suffix}`;
    if (!db.prepare('SELECT 1 FROM wallet_topups WHERE transfer_note = ?').get(note)) return note;
  }
  throw new Error('Không tạo được nội dung chuyển khoản riêng.');
}

type TopupRow = {
  id: string; code: string; customer_id: string; amount: number; transfer_note: string; status: string;
  bank_bin: string; bank_account_no: string; bank_account_name: string;
  customer_paid_at: string | null; received_amount: number | null; transaction_id: string | null;
  admin_note: string; reviewed_by: string | null; reviewed_at: string | null; created_at: string; updated_at: string;
};

const SELECT_TOPUPS = `
  SELECT t.*, c.code AS customer_code, c.name AS customer_name, c.phone AS customer_phone, a.name AS reviewer_name
  FROM wallet_topups t JOIN customers c ON c.id = t.customer_id LEFT JOIN admins a ON a.id = t.reviewed_by`;

/** Mã QR của một yêu cầu, vẽ theo tài khoản đã chốt lúc tạo yêu cầu. */
async function withQr(row: TopupRow) {
  const payload = vietQrPayload({ bin: row.bank_bin, accountNo: row.bank_account_no, amount: row.amount, note: row.transfer_note });
  const svg = await QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
  return { ...row, bank_name: bankName(row.bank_bin), qr_payload: payload, qr_svg: svg };
}

/* ---- API của khách: /api/customer/topups ---------------------------------- */

type CustomerReq = Request & { customer?: { customerId: string; code: string; name: string } };

function topupId(req: Request) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

/** Gắn sau requireCustomer nên `req.customer` luôn có. */
export function createCustomerTopupRouter() {
  const router = Router();

  router.get('/', async (req: CustomerReq, res) => {
    const bank = bankSettings();
    const rows = db.prepare(`${SELECT_TOPUPS} WHERE t.customer_id = ? ORDER BY t.created_at DESC LIMIT 10`)
      .all(req.customer!.customerId) as TopupRow[];
    res.json({
      bank: { ready: bank.ready, bankName: bank.bankName, accountNo: bank.accountNo, accountName: bank.accountName },
      min: TOPUP_MIN,
      max: TOPUP_MAX,
      rows: await Promise.all(rows.map((r) => (r.status === 'PENDING' ? withQr(r) : r))),
    });
  });

  router.post('/', async (req: CustomerReq, res) => {
    const input = z.object({ amount: z.coerce.number().int() }).parse(req.body);
    if (input.amount < TOPUP_MIN || input.amount > TOPUP_MAX) {
      return res.status(400).json({
        message: `Số tiền nạp từ ${TOPUP_MIN.toLocaleString('vi-VN')} đến ${TOPUP_MAX.toLocaleString('vi-VN')} đồng.`,
      });
    }
    const bank = bankSettings();
    if (!bank.ready) return res.status(409).json({ message: 'Cửa hàng chưa bật nạp ví bằng chuyển khoản. Hãy nạp tại quầy.' });
    const customerId = req.customer!.customerId;
    if (db.prepare("SELECT 1 FROM wallet_topups WHERE customer_id = ? AND status = 'PENDING'").get(customerId)) {
      return res.status(409).json({ message: 'Bạn đang có một yêu cầu nạp chưa được xác nhận. Huỷ yêu cầu đó trước khi tạo yêu cầu mới.' });
    }
    const id = makeId();
    const note = newTransferNote();
    const time = nowIso();
    db.prepare(`
      INSERT INTO wallet_topups
        (id, code, customer_id, amount, transfer_note, status, bank_bin, bank_account_no, bank_account_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
    `).run(id, note.replace(' ', '-'), customerId, input.amount, note, bank.bin, bank.accountNo, bank.accountName, time, time);
    const row = db.prepare(`${SELECT_TOPUPS} WHERE t.id = ?`).get(id) as TopupRow;
    res.status(201).json(await withQr(row));
  });

  router.post('/:id/paid', (req: CustomerReq, res) => {
    const result = db.prepare(`
      UPDATE wallet_topups SET customer_paid_at = COALESCE(customer_paid_at, ?), updated_at = ?
      WHERE id = ? AND customer_id = ? AND status = 'PENDING'
    `).run(nowIso(), nowIso(), topupId(req), req.customer!.customerId);
    if (!result.changes) return res.status(409).json({ message: 'Yêu cầu nạp này đã được xử lý hoặc đã huỷ.' });
    res.json({ ok: true });
  });

  router.post('/:id/cancel', (req: CustomerReq, res) => {
    const result = db.prepare(`
      UPDATE wallet_topups SET status = 'CANCELLED', updated_at = ?
      WHERE id = ? AND customer_id = ? AND status = 'PENDING'
    `).run(nowIso(), topupId(req), req.customer!.customerId);
    if (!result.changes) return res.status(409).json({ message: 'Yêu cầu nạp này đã được xử lý hoặc đã huỷ.' });
    res.json({ ok: true });
  });

  return router;
}

/* ---- API quản trị: /api/topups (gắn sau requireAuth) ---------------------- */

type AdminReq = Request & { admin?: { id: string; role: string } };

function allow(permission: Permission) {
  return (req: AdminReq, res: Response, next: NextFunction) => {
    if (!can(req.admin?.role, permission)) {
      return res.status(403).json({ message: 'Tài khoản của bạn không có quyền thực hiện việc này.' });
    }
    return next();
  };
}

export function createAdminTopupRouter() {
  const router = Router();

  router.get('/bank', allow('settings.payment'), (_req, res) => {
    res.json({ settings: bankSettings(), banks: BANKS });
  });

  router.put('/bank', allow('settings.payment'), (req: AdminReq, res) => {
    const input = z.object({
      enabled: z.boolean(),
      bin: z.string().trim(),
      accountNo: z.string().trim().max(40),
      accountName: z.string().trim().max(80),
    }).parse(req.body);
    const accountNo = input.accountNo.replace(/[\s.-]/g, '');
    const accountName = plainName(input.accountName);
    if (input.bin && !BANKS.some((b) => b.bin === input.bin)) return res.status(400).json({ message: 'Ngân hàng không có trong danh sách.' });
    if (accountNo && !/^[A-Za-z0-9]{4,19}$/.test(accountNo)) {
      return res.status(400).json({ message: 'Số tài khoản gồm 4 đến 19 chữ số hoặc chữ cái, không có ký tự đặc biệt.' });
    }
    if (input.enabled && (!input.bin || !accountNo || accountName.length < 2)) {
      return res.status(400).json({ message: 'Muốn bật nạp ví qua chuyển khoản thì cần chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản.' });
    }
    writeSettings({
      'bank.enabled': input.enabled ? '1' : '0',
      'bank.bin': input.bin,
      'bank.accountNo': accountNo,
      'bank.accountName': accountName,
    });
    audit(req.admin!.id, 'UPDATE', 'SETTINGS', 'bank', `${bankName(input.bin)} ${accountNo ? `••••${accountNo.slice(-4)}` : ''} ${input.enabled ? 'bật' : 'tắt'}`.trim());
    res.json({ settings: bankSettings(), banks: BANKS });
  });

  /** Mã QR mẫu không kèm số tiền, để chủ quét thử bằng app ngân hàng trước khi bật cho khách. */
  router.get('/bank/preview', allow('settings.payment'), async (_req, res) => {
    const bank = bankSettings();
    if (!bank.bin || !bank.accountNo) return res.status(409).json({ message: 'Chưa lưu ngân hàng và số tài khoản.' });
    const payload = vietQrPayload({ bin: bank.bin, accountNo: bank.accountNo });
    res.json({ qr_payload: payload, qr_svg: await QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 }) });
  });

  router.get('/', allow('customer.deposit'), (_req, res) => {
    // Việc cần làm lên đầu: khách đã báo chuyển trước, rồi tới yêu cầu đang chờ, rồi lịch sử.
    const rows = db.prepare(`${SELECT_TOPUPS}
      ORDER BY CASE WHEN t.status = 'PENDING' AND t.customer_paid_at IS NOT NULL THEN 0 WHEN t.status = 'PENDING' THEN 1 ELSE 2 END,
        COALESCE(t.customer_paid_at, t.created_at) DESC
      LIMIT 100`).all();
    const pending = db.prepare("SELECT COUNT(*) AS count FROM wallet_topups WHERE status = 'PENDING'").get() as { count: number };
    res.json({ rows, pending: Number(pending.count), bankReady: bankSettings().ready });
  });

  router.post('/:id/approve', allow('customer.deposit'), (req: AdminReq, res) => {
    const id = topupId(req);
    const input = z.object({
      amount: z.coerce.number().int().positive().max(TOPUP_MAX * 2).optional(),
      note: z.string().trim().max(500).default(''),
    }).parse(req.body);
    const topup = db.prepare("SELECT * FROM wallet_topups WHERE id = ? AND status = 'PENDING'").get(id) as TopupRow | undefined;
    if (!topup) return res.status(409).json({ message: 'Yêu cầu nạp không còn chờ xác nhận.' });
    const amount = input.amount ?? topup.amount;
    const transactionId = makeId();
    const code = `GD-${topup.code}`;
    const time = nowIso();
    let changed = 0;
    runTransaction(() => {
      // Điều kiện status = 'PENDING' ngay trong câu UPDATE: hai người bấm xác nhận cùng
      // lúc thì chỉ một lần ghi tiền.
      changed = Number(db.prepare(`
        UPDATE wallet_topups SET status = 'APPROVED', received_amount = ?, admin_note = ?,
          reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ? AND status = 'PENDING'
      `).run(amount, input.note, req.admin!.id, time, time, id).changes);
      if (!changed) return;
      db.prepare(`
        INSERT INTO financial_transactions
          (id, code, customer_id, kind, payment_method, cash_change, wallet_change, revenue_change, reference, notes, created_by, occurred_at, created_at)
        VALUES (?, ?, ?, 'DEPOSIT', 'BANK', ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(transactionId, code, topup.customer_id, amount, amount, topup.transfer_note,
        `Nạp ví qua chuyển khoản (${topup.transfer_note})${input.note ? `. ${input.note}` : ''}`, req.admin!.id, time, time);
      // Gắn sau khi dòng giao dịch đã có, vì transaction_id là khoá ngoại.
      db.prepare('UPDATE wallet_topups SET transaction_id = ? WHERE id = ?').run(transactionId, id);
    });
    if (!changed) return res.status(409).json({ message: 'Yêu cầu nạp không còn chờ xác nhận.' });
    notifyCustomer(topup.customer_id, 'WALLET_TOPUP', 'Đã nạp tiền vào ví',
      `${amount.toLocaleString('vi-VN')} đ đã vào ví (${topup.transfer_note}).`, '/portal/wallet');
    audit(req.admin!.id, 'DEPOSIT', 'WALLET_TOPUP', id, `${topup.transfer_note}: ${amount}`);
    res.json({ ok: true, walletBalance: getWalletBalance(topup.customer_id) });
  });

  router.post('/:id/reject', allow('customer.deposit'), (req: AdminReq, res) => {
    const id = topupId(req);
    const input = z.object({ adminNote: z.string().trim().min(3).max(500) }).parse(req.body);
    const topup = db.prepare("SELECT customer_id, transfer_note FROM wallet_topups WHERE id = ? AND status = 'PENDING'").get(id) as
      { customer_id: string; transfer_note: string } | undefined;
    if (!topup) return res.status(409).json({ message: 'Yêu cầu nạp không còn chờ xác nhận.' });
    const time = nowIso();
    db.prepare(`
      UPDATE wallet_topups SET status = 'REJECTED', admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ? AND status = 'PENDING'
    `).run(input.adminNote, req.admin!.id, time, time, id);
    notifyCustomer(topup.customer_id, 'WALLET_TOPUP_REJECTED', 'Chưa xác nhận được khoản nạp',
      `${topup.transfer_note}: ${input.adminNote}`, '/portal/wallet');
    audit(req.admin!.id, 'REJECT', 'WALLET_TOPUP', id, `${topup.transfer_note}: ${input.adminNote}`);
    res.json({ ok: true });
  });

  return router;
}

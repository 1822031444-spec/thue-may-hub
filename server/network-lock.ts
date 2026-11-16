import { exec } from 'node:child_process';
import { audit, db, makeId, nowIso, readSettings } from './database.ts';

/**
 * Khoá và mở mạng cho thiết bị khi đơn thuê hết hạn.
 *
 * App không tự biết cách chặn một IP — mỗi nhà dùng một router khác nhau. Thay
 * vào đó chủ hệ thống khai báo sẵn hai câu lệnh trong Cài đặt, app chỉ thay chỗ
 * trống rồi chạy và ghi lại kết quả.
 */

export type LockAction = 'LOCK' | 'UNLOCK';

export type NetworkLockSettings = {
  enabled: boolean;
  autoLock: boolean;
  lockCommand: string;
  unlockCommand: string;
  graceMinutes: number;
  timeoutSeconds: number;
};

const DEFAULTS: NetworkLockSettings = {
  enabled: false,
  autoLock: true,
  lockCommand: '',
  unlockCommand: '',
  graceMinutes: 15,
  timeoutSeconds: 20,
};

export function networkLockSettings(): NetworkLockSettings {
  const raw = readSettings();
  return {
    enabled: raw['networkLock.enabled'] === '1',
    autoLock: raw['networkLock.autoLock'] !== '0',
    lockCommand: raw['networkLock.lockCommand'] || '',
    unlockCommand: raw['networkLock.unlockCommand'] || '',
    graceMinutes: clampNumber(raw['networkLock.graceMinutes'], DEFAULTS.graceMinutes, 0, 1440),
    timeoutSeconds: clampNumber(raw['networkLock.timeoutSeconds'], DEFAULTS.timeoutSeconds, 5, 120),
  };
}

function clampNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

/* ---- Dựng câu lệnh ------------------------------------------------------- */

/**
 * Chỉ hai chỗ trống được thay, và cả hai đều phải qua kiểm tra định dạng.
 *
 * Câu lệnh chạy thẳng bằng shell nên bất kỳ giá trị nào lọt vào đó cũng có thể
 * trở thành lệnh mới. Tên thiết bị là chữ tự do nên không bao giờ được thay vào;
 * IP và mã máy thì phải khớp đúng khuôn, sai khuôn là từ chối chạy chứ không
 * cắt gọt cho vừa.
 */
const IP_OR_HOST = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,62}[A-Za-z0-9])?$/;
const DEVICE_CODE = /^[A-Za-z0-9-]{1,40}$/;

export function buildCommand(template: string, device: { code: string; ip_address: string }) {
  if (!template.trim()) throw new Error('Chưa khai báo câu lệnh trong Cài đặt.');

  if (template.includes('{ip}')) {
    const ip = (device.ip_address || '').trim();
    if (!ip) throw new Error(`Thiết bị ${device.code} chưa gán IP nên không chạy được lệnh.`);
    if (!IP_OR_HOST.test(ip)) throw new Error(`IP "${ip}" chứa ký tự không hợp lệ nên bị từ chối vì lý do an toàn.`);
    template = template.replaceAll('{ip}', ip);
  }

  if (template.includes('{code}')) {
    if (!DEVICE_CODE.test(device.code)) throw new Error(`Mã thiết bị "${device.code}" không hợp lệ.`);
    template = template.replaceAll('{code}', device.code);
  }

  return template;
}

function runShell(command: string, timeoutSeconds: number) {
  return new Promise<{ ok: boolean; output: string }>((resolve) => {
    exec(command, { timeout: timeoutSeconds * 1000, maxBuffer: 256 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      const output = [stdout, stderr].map((part) => part?.toString().trim()).filter(Boolean).join('\n');
      if (error) {
        const reason = error.killed ? `Lệnh chạy quá ${timeoutSeconds} giây và đã bị dừng.` : error.message;
        resolve({ ok: false, output: [reason, output].filter(Boolean).join('\n').slice(0, 4000) });
        return;
      }
      resolve({ ok: true, output: output.slice(0, 4000) || 'Lệnh chạy xong, không có kết quả trả về.' });
    });
  });
}

/* ---- Thực thi ------------------------------------------------------------ */

type DeviceRow = { id: string; code: string; name: string; ip_address: string; network_status: string };

function recordEvent(input: {
  deviceId: string;
  rentalId: string | null;
  action: LockAction;
  source: 'AUTO' | 'MANUAL';
  status: 'SUCCESS' | 'FAILED';
  command: string;
  output: string;
  adminId: string | null;
}) {
  db.prepare(`
    INSERT INTO network_lock_events
      (id, device_id, rental_id, action, source, status, command, output, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(makeId(), input.deviceId, input.rentalId, input.action, input.source, input.status,
    input.command, input.output, input.adminId, nowIso());
}

/**
 * Chạy lệnh khoá hoặc mở cho một thiết bị. Trạng thái mạng chỉ đổi khi lệnh chạy
 * thành công, để màn hình không bao giờ báo "đã khoá" trong khi thực tế chưa khoá.
 */
export async function runNetworkAction(input: {
  deviceId: string;
  action: LockAction;
  source: 'AUTO' | 'MANUAL';
  adminId: string | null;
  rentalId?: string | null;
}) {
  const settings = networkLockSettings();
  const device = db.prepare('SELECT id, code, name, ip_address, network_status FROM devices WHERE id = ?')
    .get(input.deviceId) as DeviceRow | undefined;
  if (!device) throw new Error('Không tìm thấy thiết bị.');
  if (!settings.enabled) throw new Error('Cơ chế khoá mạng đang tắt. Bật trong Cài đặt trước khi dùng.');

  const template = input.action === 'LOCK' ? settings.lockCommand : settings.unlockCommand;

  let command: string;
  try {
    command = buildCommand(template, device);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordEvent({
      deviceId: device.id,
      rentalId: input.rentalId ?? null,
      action: input.action,
      source: input.source,
      status: 'FAILED',
      command: template,
      output: message,
      adminId: input.adminId,
    });
    throw error;
  }

  const result = await runShell(command, settings.timeoutSeconds);

  recordEvent({
    deviceId: device.id,
    rentalId: input.rentalId ?? null,
    action: input.action,
    source: input.source,
    status: result.ok ? 'SUCCESS' : 'FAILED',
    command,
    output: result.output,
    adminId: input.adminId,
  });

  if (result.ok) {
    const next = input.action === 'LOCK' ? 'LOCKED' : 'OPEN';
    db.prepare('UPDATE devices SET network_status = ?, network_locked_at = ?, updated_at = ? WHERE id = ?')
      .run(next, input.action === 'LOCK' ? nowIso() : null, nowIso(), device.id);
    if (input.adminId) {
      audit(input.adminId, 'STATUS', 'DEVICE', device.id, `${input.action === 'LOCK' ? 'Khoá' : 'Mở'} mạng ${device.code}`);
    }
  }

  return { ok: result.ok, output: result.output, command };
}

/* ---- Quét tự động -------------------------------------------------------- */

/** Máy đang mở mạng nhưng đơn thuê đã quá hạn quá thời gian ân hạn. */
export function devicesDueForLock(graceMinutes: number) {
  const cutoff = new Date(Date.now() - graceMinutes * 60_000).toISOString();
  return db.prepare(`
    SELECT d.id AS device_id, d.code, d.name, d.ip_address, r.id AS rental_id, r.code AS rental_code, r.end_at
    FROM devices d
    JOIN rentals r ON r.device_id = d.id AND r.status = 'ACTIVE'
    WHERE d.network_status = 'OPEN' AND r.end_at <= ?
    ORDER BY r.end_at ASC
  `).all(cutoff) as Array<{
    device_id: string; code: string; name: string; ip_address: string;
    rental_id: string; rental_code: string; end_at: string;
  }>;
}

/** Máy đang bị khoá nhưng đã có đơn thuê còn hạn — gia hạn xong thì mở lại. */
export function devicesDueForUnlock() {
  return db.prepare(`
    SELECT d.id AS device_id, d.code, r.id AS rental_id
    FROM devices d
    JOIN rentals r ON r.device_id = d.id AND r.status = 'ACTIVE'
    WHERE d.network_status = 'LOCKED' AND r.end_at > ?
  `).all(nowIso()) as Array<{ device_id: string; code: string; rental_id: string }>;
}

/**
 * Một vòng quét. Tách riêng khỏi bộ hẹn giờ để API "quét ngay" và bài kiểm thử
 * gọi lại được mà không phải chờ tới chu kỳ tiếp theo.
 *
 * Mọi thao tác ở đây ghi nguồn AUTO kể cả khi do người bấm nút, vì nhật ký cần
 * phân biệt "luật hết hạn tự chạy" với "người tự tay khoá một máy cụ thể".
 */
export async function sweepNetworkLocks() {
  const source = 'AUTO' as const;
  const settings = networkLockSettings();
  if (!settings.enabled || !settings.autoLock) return { locked: 0, unlocked: 0, failed: 0, skipped: true };

  let locked = 0;
  let unlocked = 0;
  let failed = 0;

  for (const row of devicesDueForLock(settings.graceMinutes)) {
    try {
      const result = await runNetworkAction({
        deviceId: row.device_id,
        action: 'LOCK',
        source,
        adminId: null,
        rentalId: row.rental_id,
      });
      if (result.ok) locked++;
      else failed++;
    } catch {
      failed++;
    }
  }

  for (const row of devicesDueForUnlock()) {
    try {
      const result = await runNetworkAction({
        deviceId: row.device_id,
        action: 'UNLOCK',
        source,
        adminId: null,
        rentalId: row.rental_id,
      });
      if (result.ok) unlocked++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { locked, unlocked, failed, skipped: false };
}

let timer: NodeJS.Timeout | null = null;

export function startNetworkLockScheduler(intervalMs = 60_000) {
  if (timer) return;
  timer = setInterval(() => {
    void sweepNetworkLocks().catch(() => undefined);
  }, intervalMs);
  // Bộ hẹn giờ không được giữ tiến trình sống khi app đã muốn thoát.
  timer.unref?.();
}

/**
 * Sao lưu tự động cơ sở dữ liệu.
 *
 * Cách sao lưu: câu lệnh `VACUUM INTO` của SQLite. Đây là cách duy nhất chép
 * được một database đang mở mà chắc chắn ra bản nhất quán — nó chụp đúng một
 * thời điểm, không bị các thao tác ghi xảy ra ngay sau đó làm lệch, và kết quả
 * là một file duy nhất không kèm `-wal`/`-shm`. Chép tay ba file lúc app đang
 * chạy thì dễ ra bản sao dở dang mà không hề báo lỗi.
 *
 * Giới hạn cần nói thẳng: mặc định bản sao nằm ngay cạnh database gốc. Như vậy
 * chống được hỏng file, xoá nhầm và lỗi nâng cấp, nhưng KHÔNG chống được hỏng ổ
 * cứng. Muốn an toàn thật thì phải trỏ sang ổ khác hoặc USB.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { db, nowIso, readSettings, writeSettings } from './database.ts';

const PREFIX = 'thue-may-';
const SUFFIX = '.db';

export type BackupSettings = {
  enabled: boolean;
  dir: string;
  intervalHours: number;
  keep: number;
};

export type BackupFile = {
  name: string;
  size: number;
  createdAt: string;
};

export const BACKUP_DEFAULTS: BackupSettings = {
  enabled: true,
  dir: '',
  intervalHours: 24,
  keep: 14,
};

function databasePath() {
  return resolve(process.env.DATABASE_PATH || './data/thue-may.db');
}

/** Thư mục mặc định nằm cạnh database; người dùng đổi được sang ổ khác. */
export function defaultBackupDir() {
  return join(dirname(databasePath()), 'backups');
}

export function backupSettings(): BackupSettings {
  const saved = readSettings();
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(saved[key]);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.trunc(value), min), max);
  };
  return {
    enabled: saved['backup.enabled'] !== 'false',
    dir: saved['backup.dir'] || '',
    intervalHours: number('backup.intervalHours', BACKUP_DEFAULTS.intervalHours, 1, 24 * 30),
    keep: number('backup.keep', BACKUP_DEFAULTS.keep, 1, 200),
  };
}

export function saveBackupSettings(input: BackupSettings) {
  writeSettings({
    'backup.enabled': input.enabled ? 'true' : 'false',
    'backup.dir': input.dir,
    'backup.intervalHours': String(input.intervalHours),
    'backup.keep': String(input.keep),
  });
}

export function backupDir() {
  return backupSettings().dir || defaultBackupDir();
}

/** Tên file theo thời gian địa phương để người dùng đọc là hiểu ngay. */
function backupName(at: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${PREFIX}${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`
    + `-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}${SUFFIX}`;
}

export function listBackups(): BackupFile[] {
  const dir = backupDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
    .map((name) => {
      const info = statSync(join(dir, name));
      return { name, size: info.size, createdAt: info.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Xoá những bản cũ nhất vượt quá số bản cần giữ. */
function rotate(keep: number) {
  const dir = backupDir();
  const extra = listBackups().slice(keep);
  for (const file of extra) {
    try {
      rmSync(join(dir, file.name), { force: true });
    } catch {
      /* Xoá không được thì bỏ qua, lần sau dọn tiếp — không để hỏng cả lần sao lưu. */
    }
  }
  return extra.length;
}

export function runBackup(source: 'AUTO' | 'MANUAL') {
  const settings = backupSettings();
  const dir = backupDir();
  const at = new Date();
  const name = backupName(at);
  const target = join(dir, name);

  try {
    mkdirSync(dir, { recursive: true });

    // VACUUM INTO từ chối ghi đè file đã có; trùng tên chỉ xảy ra khi bấm hai lần
    // trong cùng một giây, lúc đó bản vừa tạo đã là bản mới nhất rồi.
    if (existsSync(target)) {
      return { ok: true as const, name, size: statSync(target).size, at: at.toISOString(), removed: 0 };
    }

    // Nháy đơn trong đường dẫn sẽ làm hỏng câu lệnh SQL, nhân đôi theo đúng
    // cách SQLite quy định. Dấu \ của Windows cũng đổi thành / cho an toàn.
    const quoted = target.replace(/\\/g, '/').replace(/'/g, "''");
    db.exec(`VACUUM INTO '${quoted}'`);

    const removed = rotate(settings.keep);
    writeSettings({
      'backup.lastAt': at.toISOString(),
      'backup.lastFile': name,
      'backup.lastSource': source,
      'backup.lastError': '',
    });
    return { ok: true as const, name, size: statSync(target).size, at: at.toISOString(), removed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Ghi lại lỗi để giao diện báo thẳng cho người dùng. Sao lưu hỏng mà im lặng
    // là tệ nhất: tưởng có bản sao, tới lúc cần mới biết là không có.
    writeSettings({ 'backup.lastError': message, 'backup.lastErrorAt': at.toISOString() });
    return { ok: false as const, message };
  }
}

export function backupStatus() {
  const saved = readSettings();
  return {
    settings: backupSettings(),
    defaultDir: defaultBackupDir(),
    activeDir: backupDir(),
    lastAt: saved['backup.lastAt'] || '',
    lastFile: saved['backup.lastFile'] || '',
    lastSource: saved['backup.lastSource'] || '',
    lastError: saved['backup.lastError'] || '',
    files: listBackups(),
  };
}

/** Đã tới hạn sao lưu chưa; chưa từng sao lưu thì tính là tới hạn. */
function isDue(settings: BackupSettings) {
  const last = readSettings()['backup.lastAt'];
  if (!last) return true;
  const elapsed = Date.now() - new Date(last).getTime();
  if (!Number.isFinite(elapsed)) return true;
  return elapsed >= settings.intervalHours * 3600_000;
}

export function sweepBackup() {
  const settings = backupSettings();
  if (!settings.enabled) return null;
  if (!isDue(settings)) return null;
  return runBackup('AUTO');
}

/**
 * Kiểm mỗi 15 phút thay vì hẹn đúng mốc: app desktop bị tắt mở liên tục, hẹn giờ
 * dài sẽ không bao giờ tới lượt. Cách này chỉ cần app mở đủ lâu một lần trong
 * ngày là có bản sao.
 */
export function startBackupScheduler(intervalMs = 15 * 60_000) {
  const tick = () => {
    const result = sweepBackup();
    if (result && !result.ok) console.error(`[backup] Sao lưu tự động thất bại: ${result.message}`);
    else if (result) console.log(`[backup] Đã tạo bản sao lưu ${result.name}`);
  };
  // Chờ một chút cho server khởi động xong rồi mới chạy lần đầu.
  setTimeout(tick, 20_000).unref?.();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return timer;
}

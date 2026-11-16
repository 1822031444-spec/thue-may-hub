/**
 * Bot Telegram nhắc chủ tiệm mỗi ngày.
 *
 * Vì sao Telegram mà không phải Zalo: Zalo không mở API cho tài khoản cá nhân,
 * muốn gửi tự động phải có Official Account đã xác thực kèm giấy phép kinh doanh
 * và trả phí từng tin. Telegram Bot API thì miễn phí, chính thức, tạo bot xong
 * là dùng được ngay.
 *
 * Bot này chỉ nhắc **chủ tiệm**, không nhắc khách: muốn nhận tin từ bot thì người
 * nhận phải tự cài Telegram và bấm /start, mà khách của tiệm thì dùng Zalo. Việc
 * nhắn cho khách để giao diện soạn sẵn tin rồi người dùng tự dán sang Zalo.
 */

import { readSettings, writeSettings } from './database.ts';
import { daysLeft, expiringRentals, money, ngayGio } from './expiring.ts';

export type TelegramSettings = {
  enabled: boolean;
  token: string;
  chatId: string;
  /** Giờ trong ngày (0-23) muốn nhận tin nhắc. */
  hour: number;
  /** Nhắc trước bao nhiêu ngày. */
  days: number;
};

export const TELEGRAM_DEFAULTS: TelegramSettings = {
  enabled: false,
  token: '',
  chatId: '',
  hour: 8,
  days: 7,
};

export function telegramSettings(): TelegramSettings {
  const saved = readSettings();
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(saved[key]);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.trunc(value), min), max);
  };
  return {
    enabled: saved['telegram.enabled'] === 'true',
    token: saved['telegram.token'] || '',
    chatId: saved['telegram.chatId'] || '',
    hour: number('telegram.hour', TELEGRAM_DEFAULTS.hour, 0, 23),
    days: number('telegram.days', TELEGRAM_DEFAULTS.days, 1, 60),
  };
}

export function saveTelegramSettings(input: TelegramSettings) {
  writeSettings({
    'telegram.enabled': input.enabled ? 'true' : 'false',
    'telegram.token': input.token,
    'telegram.chatId': input.chatId,
    'telegram.hour': String(input.hour),
    'telegram.days': String(input.days),
  });
}

/** Che bớt token khi trả về giao diện — không để lộ nguyên chuỗi ra màn hình. */
export function maskToken(token: string) {
  if (!token) return '';
  if (token.length <= 12) return '•'.repeat(token.length);
  return `${token.slice(0, 6)}${'•'.repeat(10)}${token.slice(-4)}`;
}

type TelegramResult = { ok: true; description?: string } | { ok: false; message: string };

async function callTelegram(token: string, method: string, body: Record<string, unknown>): Promise<TelegramResult> {
  if (!token) return { ok: false, message: 'Chưa khai báo token của bot.' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Máy tiệm có lúc mất mạng; đợi mãi sẽ treo luôn vòng quét.
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json() as { ok: boolean; description?: string; result?: unknown };
    if (!data.ok) return { ok: false, message: data.description || `Telegram trả về lỗi (HTTP ${res.status}).` };
    return { ok: true, description: data.description };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Không gọi được Telegram: ${message}` };
  }
}

export async function sendTelegram(text: string, override?: { token?: string; chatId?: string }) {
  const settings = telegramSettings();
  const token = override?.token || settings.token;
  const chatId = override?.chatId || settings.chatId;
  if (!chatId) return { ok: false as const, message: 'Chưa khai báo chat id nơi nhận.' };
  return callTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

/**
 * Tìm chat id giúp người dùng.
 *
 * Telegram không cho bot tự biết id của ai; người dùng phải nhắn cho bot trước,
 * rồi bot mới đọc được qua getUpdates. Không có bước này thì họ phải đi tìm một
 * bot thứ ba chỉ để lấy con số.
 */
export async function discoverChats(token: string) {
  if (!token) return { ok: false as const, message: 'Chưa khai báo token của bot.' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json() as {
      ok: boolean;
      description?: string;
      result?: Array<{ message?: { chat?: { id: number; type: string; title?: string; first_name?: string; username?: string } } }>;
    };
    if (!data.ok) return { ok: false as const, message: data.description || 'Telegram từ chối yêu cầu.' };

    const seen = new Map<string, { id: string; ten: string; loai: string }>();
    for (const update of data.result ?? []) {
      const chat = update.message?.chat;
      if (!chat) continue;
      seen.set(String(chat.id), {
        id: String(chat.id),
        ten: chat.title || chat.first_name || chat.username || 'Không rõ tên',
        loai: chat.type,
      });
    }
    return { ok: true as const, chats: [...seen.values()] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false as const, message: `Không gọi được Telegram: ${message}` };
  }
}

/** Nội dung tin nhắc hằng ngày. Trả về chuỗi rỗng nghĩa là không có gì để nhắc. */
export function buildDigest(days: number) {
  const data = expiringRentals(days);
  if (!data.rows.length) return '';

  const dong: string[] = [];
  dong.push(`<b>Thuê Máy Hub — cần nhắc khách hôm nay</b>`);
  dong.push('');

  const quaHan = data.rows.filter((r) => daysLeft(r.end_at) <= 0);
  const sapHet = data.rows.filter((r) => daysLeft(r.end_at) > 0);

  const viet = (r: typeof data.rows[number]) => {
    const con = daysLeft(r.end_at);
    const han = con <= 0 ? `quá hạn ${Math.abs(con)} ngày` : `còn ${con} ngày`;
    const no = Math.max(r.total_amount - r.paid_amount, 0);
    const phone = r.customer_phone ? ` · ${r.customer_phone}` : '';
    const tienNo = no > 0 ? ` · nợ ${money(no)}` : '';
    return `• <b>${r.customer_name}</b> — ${r.device_name}\n  ${ngayGio(r.end_at)} (${han})${phone}${tienNo}`;
  };

  if (quaHan.length) {
    dong.push(`<b>ĐÃ QUÁ HẠN (${quaHan.length})</b> — máy vẫn đang chạy`);
    dong.push(...quaHan.map(viet));
    dong.push('');
  }
  if (sapHet.length) {
    dong.push(`<b>Sắp hết hạn trong ${days} ngày (${sapHet.length})</b>`);
    dong.push(...sapHet.map(viet));
    dong.push('');
  }
  if (data.unpaidTotal > 0) {
    dong.push(`Tổng chưa thu của nhóm này: <b>${money(data.unpaidTotal)}</b>`);
  }

  return dong.join('\n');
}

/** Hôm nay đã gửi chưa; so theo ngày địa phương để không lệch múi giờ. */
function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export async function sweepTelegram() {
  const settings = telegramSettings();
  if (!settings.enabled || !settings.token || !settings.chatId) return null;

  const saved = readSettings();
  if (saved['telegram.lastSentDay'] === todayKey()) return null;
  if (new Date().getHours() < settings.hour) return null;

  const text = buildDigest(settings.days);
  if (!text) {
    // Không có ai sắp hết hạn thì không nhắn, nhưng vẫn đánh dấu đã xử lý hôm nay
    // để khỏi kiểm lại mỗi 15 phút suốt ngày.
    writeSettings({ 'telegram.lastSentDay': todayKey(), 'telegram.lastError': '' });
    return { ok: true as const, skipped: true };
  }

  const result = await sendTelegram(text);
  if (result.ok) {
    writeSettings({
      'telegram.lastSentDay': todayKey(),
      'telegram.lastSentAt': new Date().toISOString(),
      'telegram.lastError': '',
    });
    return { ok: true as const, skipped: false };
  }

  // Gửi hỏng thì KHÔNG đánh dấu đã gửi, để vòng sau thử lại — mất mạng lúc 8h
  // sáng không nên thành mất luôn tin nhắc của cả ngày.
  writeSettings({ 'telegram.lastError': result.message, 'telegram.lastErrorAt': new Date().toISOString() });
  return result;
}

export function telegramStatus() {
  const saved = readSettings();
  const settings = telegramSettings();
  return {
    settings: { ...settings, token: maskToken(settings.token) },
    hasToken: Boolean(settings.token),
    lastSentAt: saved['telegram.lastSentAt'] || '',
    lastError: saved['telegram.lastError'] || '',
  };
}

/**
 * Kiểm mỗi 15 phút. App desktop bị tắt mở liên tục nên hẹn đúng một mốc trong
 * ngày sẽ có hôm không bao giờ tới lượt; cách này chỉ cần app mở một lần sau giờ
 * đã hẹn là tin được gửi.
 */
export function startTelegramScheduler(intervalMs = 15 * 60_000) {
  const tick = async () => {
    const result = await sweepTelegram();
    if (result && !result.ok) console.error(`[telegram] Không gửi được tin nhắc: ${result.message}`);
    else if (result && !result.skipped) console.log('[telegram] Đã gửi tin nhắc hằng ngày.');
  };
  setTimeout(() => void tick(), 30_000).unref?.();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  return timer;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.message || 'Không thể xử lý yêu cầu.', response.status);
  }
  return body as T;
}

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function shortMoney(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}tr`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return `${amount}`;
}

export function dateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function dateOnly(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(value));
}

/**
 * Khoảng cách tới một mốc thời gian, viết theo cách người vận hành nói.
 * Dùng cho hạn trả máy nên chỉ cần độ chính xác tới giờ.
 */
export function timeUntil(value?: string | null) {
  if (!value) return { text: '—', tone: 'normal' as const };
  const diff = new Date(value).getTime() - Date.now();
  const hours = Math.round(Math.abs(diff) / 3_600_000);
  const days = Math.round(hours / 24);
  const amount = hours < 48 ? `${hours} giờ` : `${days} ngày`;
  if (diff < 0) return { text: `Quá hạn ${amount}`, tone: 'late' as const };
  if (hours <= 72) return { text: `Còn ${amount}`, tone: 'due' as const };
  return { text: `Còn ${amount}`, tone: 'normal' as const };
}

export function initials(name?: string | null) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

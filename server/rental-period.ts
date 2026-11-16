/**
 * Cộng kỳ hạn thuê.
 *
 * Tách riêng vì phép cộng tháng là chỗ dễ sai âm thầm: `setMonth` của JavaScript
 * tự tràn sang tháng sau khi ngày gốc không tồn tại ở tháng đích — 31/01 cộng 1
 * tháng ra 03/03 chứ không phải 28/02. Với đơn thuê thì đó là cho không khách
 * mấy ngày, hoặc tính thiếu tiền, mà không ai nhận ra.
 */

export const PERIOD_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH'] as const;
export type PeriodUnit = typeof PERIOD_UNITS[number];

export const UNIT_LABELS: Record<PeriodUnit, string> = {
  HOUR: 'giờ',
  DAY: 'ngày',
  WEEK: 'tuần',
  MONTH: 'tháng',
};

/**
 * Cộng `quantity` đơn vị vào `from`.
 *
 * Cộng tháng thì giữ nguyên ngày trong tháng, và kẹp lại nếu tháng đích ngắn hơn:
 * 31/01 + 1 tháng = 28/02 (hoặc 29/02 năm nhuận). Đây là cách người Việt vẫn tính
 * hạn thuê bao, và cũng là cách duy nhất không bao giờ nhảy qua tháng khác.
 */
export function addPeriod(from: Date, unit: PeriodUnit, quantity: number) {
  const next = new Date(from.getTime());

  if (unit === 'HOUR') {
    next.setHours(next.getHours() + quantity);
    return next;
  }
  if (unit === 'DAY') {
    next.setDate(next.getDate() + quantity);
    return next;
  }
  if (unit === 'WEEK') {
    next.setDate(next.getDate() + quantity * 7);
    return next;
  }

  const day = next.getDate();
  // Về ngày 1 trước khi đổi tháng, để `setMonth` không có cơ hội tràn.
  next.setDate(1);
  next.setMonth(next.getMonth() + quantity);
  const lastDayOfTarget = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDayOfTarget));
  return next;
}

/** Giá gợi ý của một thiết bị theo đơn vị thuê; 0 nghĩa là chưa khai báo giá đó. */
export function suggestedRate(
  device: { hourly_rate?: number; daily_rate?: number; weekly_rate?: number; monthly_rate?: number },
  unit: PeriodUnit,
) {
  if (unit === 'HOUR') return Number(device.hourly_rate || 0);
  if (unit === 'DAY') return Number(device.daily_rate || 0);
  if (unit === 'WEEK') return Number(device.weekly_rate || 0);
  return Number(device.monthly_rate || 0);
}

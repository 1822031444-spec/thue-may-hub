/**
 * Bản sao của `server/rental-period.ts`, dùng để hiện trước hạn mới ngay khi người
 * dùng gõ, không phải chờ server trả lời.
 *
 * Giống cách `src/lib/permissions.ts` nhân bản bảng quyền: đây chỉ là lớp giao
 * diện, server vẫn tự tính lại hạn thật khi ghi. Sai lệch ở đây cùng lắm là hiện
 * sai dòng xem trước, không làm sai dữ liệu.
 *
 * Sửa một bên thì phải sửa bên kia.
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
 * Cộng tháng thì giữ nguyên ngày trong tháng và kẹp lại nếu tháng đích ngắn hơn:
 * 31/01 + 1 tháng = 28/02, không phải 03/03 như `setMonth` mặc định.
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
  next.setDate(1);
  next.setMonth(next.getMonth() + quantity);
  const lastDayOfTarget = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDayOfTarget));
  return next;
}

/** Giá gợi ý của thiết bị theo đơn vị thuê; 0 nghĩa là chưa khai báo giá đó. */
export function suggestedRate(
  device: { hourly_rate?: number; daily_rate?: number; weekly_rate?: number; monthly_rate?: number },
  unit: PeriodUnit,
) {
  if (unit === 'HOUR') return Number(device.hourly_rate || 0);
  if (unit === 'DAY') return Number(device.daily_rate || 0);
  if (unit === 'WEEK') return Number(device.weekly_rate || 0);
  return Number(device.monthly_rate || 0);
}

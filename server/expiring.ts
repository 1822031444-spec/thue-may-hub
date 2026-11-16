/**
 * Danh sách đơn sắp hết hạn.
 *
 * Tách riêng vì hai nơi cùng cần: API cho trang Tổng quan, và bot Telegram nhắc
 * mỗi ngày. Viết hai câu lệnh riêng thì sớm muộn cũng lệch nhau, lúc đó màn hình
 * báo một đằng bot báo một nẻo.
 */

import { db } from './database.ts';

export type ExpiringRental = {
  id: string;
  code: string;
  end_at: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  device_name: string;
  device_code: string;
  device_monthly_rate: number;
};

export type ExpiringSummary = {
  rows: ExpiringRental[];
  counts: { overdue: number; today: number; within3: number; later: number };
  days: number;
  unpaidTotal: number;
};

export function expiringRentals(days: number): ExpiringSummary {
  const now = new Date();
  const limit = new Date(now.getTime() + days * 86_400_000).toISOString();

  const rows = db.prepare(`
    SELECT r.id, r.code, r.end_at, r.status, r.total_amount,
      c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
      d.name AS device_name, d.code AS device_code, d.monthly_rate AS device_monthly_rate,
      COALESCE(SUM(t.revenue_change), 0) AS paid_amount
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    JOIN devices d ON d.id = r.device_id
    LEFT JOIN financial_transactions t ON t.rental_id = r.id
    WHERE r.status IN ('RESERVED', 'ACTIVE') AND r.end_at <= ?
    GROUP BY r.id ORDER BY r.end_at ASC
  `).all(limit) as ExpiringRental[];

  // Phân nhóm theo mức gấp để nơi hiển thị khỏi phải tự tính lại.
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(24, 0, 0, 0);
  const in3Days = new Date(now.getTime() + 3 * 86_400_000).toISOString();
  const nowIso = now.toISOString();

  const counts = { overdue: 0, today: 0, within3: 0, later: 0 };
  for (const row of rows) {
    if (row.end_at <= nowIso) counts.overdue += 1;
    else if (row.end_at < startOfTomorrow.toISOString()) counts.today += 1;
    else if (row.end_at <= in3Days) counts.within3 += 1;
    else counts.later += 1;
  }

  return {
    rows,
    counts,
    days,
    unpaidTotal: rows.reduce((sum, row) => sum + Math.max(row.total_amount - row.paid_amount, 0), 0),
  };
}

/** Số ngày còn lại tới hạn; số âm nghĩa là đã quá hạn bấy nhiêu ngày. */
export function daysLeft(endAt: string) {
  return Math.ceil((new Date(endAt).getTime() - Date.now()) / 86_400_000);
}

export const money = (n: number) => `${Number(n).toLocaleString('vi-VN')}đ`;

export function ngayGio(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

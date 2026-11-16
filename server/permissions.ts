/**
 * Phân quyền theo vai trò.
 *
 * Hệ thống có đúng hai vai trò. Chủ làm được mọi thứ; nhân viên làm việc hằng
 * ngày nhưng không nhìn thấy bức tranh tiền của cả tiệm và không tự tay đưa
 * tiền ra khỏi tiệm được.
 *
 * Danh sách dưới đây liệt kê quyền của nhân viên chứ không liệt kê quyền của
 * chủ: thêm một quyền mới mà quên khai báo thì mặc định nhân viên không có,
 * tức là hướng an toàn.
 */

export type Role = 'OWNER' | 'STAFF';

export type Permission =
  /** Xem sổ giao dịch, sổ chi phí và các con số tiền tổng trên trang Tổng quan. */
  | 'finance.view'
  /** Ghi một khoản chi mới. */
  | 'finance.expense'
  /** Ghi nhận khách nạp tiền vào ví. */
  | 'customer.deposit'
  /** Hoàn tiền một đơn thuê — đường tiền ra khỏi tiệm. */
  | 'rental.refund'
  /** Xem và sửa cấu hình khoá mạng, khoá/mở tay từng máy. */
  | 'settings.networkLock'
  /** Tạo, sửa, khoá tài khoản quản trị. */
  | 'settings.accounts'
  /** Xem nhật ký thao tác của mọi người. */
  | 'settings.audit'
  /** Xem, cấu hình và tạo bản sao lưu — bản sao chứa toàn bộ dữ liệu tiền của tiệm. */
  | 'settings.backup'
  /** Cấu hình nhắc khách qua Telegram — tin nhắc có kèm công nợ của khách. */
  | 'settings.notify'
  /** Khai báo tài khoản ngân hàng nhận tiền nạp ví — quyết định tiền khách chuyển vào đâu. */
  | 'settings.payment';

/** Quyền mà nhân viên được cấp. Mọi quyền không có ở đây đều dành riêng cho chủ. */
const STAFF_PERMISSIONS: readonly Permission[] = [];

export function can(role: string | undefined, permission: Permission) {
  if (role === 'OWNER') return true;
  if (role === 'STAFF') return STAFF_PERMISSIONS.includes(permission);
  return false;
}

export function isOwner(role: string | undefined) {
  return role === 'OWNER';
}

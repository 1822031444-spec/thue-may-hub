import type { Role } from '../types';

/**
 * Bản sao của bảng quyền phía server, dùng để ẩn những nút mà tài khoản hiện tại
 * không bấm được. Đây chỉ là lớp giao diện cho đỡ rối mắt — server vẫn kiểm tra
 * lại mọi yêu cầu, nên sửa chỗ này không mở thêm được quyền nào.
 *
 * Khi thêm quyền mới, phải khai báo ở cả `server/permissions.ts` lẫn file này.
 */
export type Permission =
  | 'finance.view'
  | 'finance.expense'
  | 'customer.deposit'
  | 'rental.refund'
  | 'settings.networkLock'
  | 'settings.accounts'
  | 'settings.audit'
  | 'settings.backup'
  | 'settings.notify';

const STAFF_PERMISSIONS: readonly Permission[] = [];

export function can(role: Role | undefined, permission: Permission) {
  if (role === 'OWNER') return true;
  if (role === 'STAFF') return STAFF_PERMISSIONS.includes(permission);
  return false;
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Chủ hệ thống',
  STAFF: 'Nhân viên',
};

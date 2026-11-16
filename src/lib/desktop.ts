/**
 * Cầu nối tới tiến trình chính của Electron.
 *
 * Cùng một bundle này chạy ở hai nơi: trong cửa sổ desktop và trên trình duyệt.
 * Khi chạy trên web, `window.thueMay` không tồn tại và mọi hàm ở đây trở thành
 * no-op, nên giao diện không cần rẽ nhánh ở từng chỗ gọi.
 */

export type DesktopBridge = {
  isDesktop: true;
  platform: NodeJS.Platform;
  appVersion: string;
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (handler: (maximized: boolean) => void) => () => void;
  /** Thư mục chứa database SQLite — dùng để sao lưu thủ công. */
  dataDir: () => Promise<{ dir: string; portable: boolean; custom: boolean }>;
  openDataDir: () => Promise<string>;
  /** Đổi thư mục dữ liệu. App tự khởi động lại nếu đổi thành công. */
  chooseDataDir: () => Promise<{ ok: boolean; moved?: boolean; message?: string }>;
  resetDataDir: () => Promise<{ ok: boolean }>;
  /** Mở hộp thoại chọn thư mục, trả về đường dẫn ('' nếu người dùng huỷ). */
  chooseFolder: (title?: string) => Promise<string>;
};

declare global {
  interface Window {
    thueMay?: DesktopBridge;
  }
}

export const desktop = typeof window !== 'undefined' ? window.thueMay : undefined;
export const isDesktop = Boolean(desktop);

export function minimizeWindow() {
  desktop?.minimize();
}

export function toggleMaximizeWindow() {
  desktop?.toggleMaximize();
}

export function closeWindow() {
  desktop?.close();
}

/** Trả về hàm huỷ đăng ký; trên web là hàm rỗng. */
export function onMaximizeChange(handler: (maximized: boolean) => void) {
  return desktop?.onMaximizeChange(handler) ?? (() => undefined);
}

export async function readMaximized() {
  return (await desktop?.isMaximized()) ?? false;
}

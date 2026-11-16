/**
 * Command palette được render ở gốc app, còn nút mở nó nằm rải rác trong thanh
 * tiêu đề và topbar. Một bus nhỏ ở tầng module tránh phải luồn prop hay dựng
 * thêm context chỉ cho một sự kiện.
 */
const listeners = new Set<() => void>();

export function openCommandPalette() {
  listeners.forEach((listener) => listener());
}

export function onOpenCommandPalette(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

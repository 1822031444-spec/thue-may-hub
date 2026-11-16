/**
 * Sắp xếp theo tên đúng kiểu người đọc mong đợi.
 *
 * Sắp theo chuỗi thuần sẽ ra "Máy 1, Máy 10, Máy 11, Máy 2" vì so từng ký tự:
 * chữ '1' đứng trước chữ '2'. Với tiệm có 38 máy thì danh sách đó gần như không
 * tra được. `Intl.Collator` với `numeric` đọc cụm chữ số thành số nên ra đúng
 * "Máy 1, Máy 2, ... Máy 10", và vẫn xử lý được dấu tiếng Việt.
 *
 * Làm ở tầng server để mọi nơi hiển thị thiết bị — trang kho, ô chọn máy khi tạo
 * đơn, khi tạo phiếu sửa, khi xem trước lệnh khoá mạng — đều cùng một thứ tự.
 */

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

/** So sánh hai tên theo thứ tự tự nhiên; dùng trực tiếp trong Array.sort. */
export function compareNames(a: string, b: string) {
  return collator.compare(a || '', b || '');
}

/** Sắp xếp tại chỗ một danh sách bản ghi theo tên. */
export function sortByName<T extends { name?: string }>(items: T[]) {
  return items.sort((a, b) => compareNames(a.name ?? '', b.name ?? ''));
}

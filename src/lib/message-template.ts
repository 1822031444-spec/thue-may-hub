/**
 * Mẫu tin nhắn nhắc khách gia hạn.
 *
 * Lưu ở máy (localStorage) chứ không lưu vào database: đây là cách xưng hô của
 * riêng người đang dùng máy này, không phải dữ liệu kinh doanh cần sao lưu hay
 * chia sẻ giữa các máy.
 */

const KEY = 'thuemay.zalo.template';

export const DEFAULT_ZALO_TEMPLATE = `Chào {ten}, máy {may} sẽ hết hạn vào {ngay} (còn {conLai} ngày).
Phí gia hạn 1 tháng: {gia}.
Anh/chị chuyển khoản giúp em để em gia hạn tiếp nhé. Em cảm ơn!`;

export function loadZaloTemplate() {
  try {
    return localStorage.getItem(KEY) || DEFAULT_ZALO_TEMPLATE;
  } catch {
    // Trình duyệt chặn localStorage thì vẫn phải có mẫu để dùng.
    return DEFAULT_ZALO_TEMPLATE;
  }
}

export function saveZaloTemplate(template: string) {
  try {
    localStorage.setItem(KEY, template);
  } catch {
    /* Không lưu được thì thôi, lần sau dùng mẫu mặc định. */
  }
}

const tien = (n: number) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

/** Thay các chỗ trống trong mẫu bằng dữ liệu thật của một đơn thuê. */
export function fillTemplate(template: string, data: {
  ten: string;
  may: string;
  endAt: string;
  giaThang: number;
  con: number;
}) {
  const conLai = Math.ceil((new Date(data.endAt).getTime() - Date.now()) / 86_400_000);
  const ngay = new Date(data.endAt).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return template
    .replaceAll('{ten}', data.ten)
    .replaceAll('{may}', data.may)
    .replaceAll('{ngay}', ngay)
    // Quá hạn thì nói thẳng là quá hạn, đừng ghi "còn -3 ngày".
    .replaceAll('{conLai}', conLai > 0 ? String(conLai) : `0 (đã quá hạn ${Math.abs(conLai)} ngày)`)
    .replaceAll('{gia}', tien(data.giaThang))
    .replaceAll('{no}', tien(data.con));
}

/**
 * Chép vào clipboard. Trả về true nếu chép được.
 *
 * `navigator.clipboard` cần ngữ cảnh bảo mật; app desktop chạy qua http://127.0.0.1
 * nên vẫn được coi là an toàn, nhưng bản web chạy http thường thì không — do đó
 * vẫn giữ đường lui bằng textarea ẩn.
 */
export async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Rơi xuống cách dự phòng bên dưới. */
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

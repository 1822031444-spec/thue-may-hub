import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Command palette điều hướng sang một trang rồi yêu cầu trang đó mở sẵn một hộp
 * thoại — ví dụ "Tạo đơn thuê" nhảy vào /admin/rentals và bật form tạo đơn.
 * Yêu cầu được gửi qua location state và xoá ngay sau khi chạy, để người dùng
 * bấm Back hay F5 không bị mở lại hộp thoại lần nữa.
 */
export function usePendingAction<T = unknown>(action: string, run: (payload?: T) => void) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { action?: string; payload?: T } | null;
    if (state?.action !== action) return;
    // Đọc payload trước khi xoá state, nếu không thì run() nhận về undefined.
    const payload = state.payload;
    navigate(location.pathname, { replace: true, state: null });
    run(payload);
    // Chỉ chạy lại khi thực sự có lượt điều hướng mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}

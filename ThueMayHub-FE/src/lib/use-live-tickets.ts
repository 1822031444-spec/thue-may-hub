import { useEffect } from "react";
import { useHub } from "@/lib/tmh-store";

/**
 * Hỏi server danh sách ticket vài giây một lần khi tab đang mở, để tin nhắn hỗ trợ
 * mới của bên kia hiện thông báo ngay thay vì chờ lần tải lại toàn bộ (20–30 giây).
 * Quay lại tab thì hỏi ngay một lần.
 */
export function useLiveTickets(intervalMs = 5000) {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") useHub.getState().pollTickets().catch(() => undefined);
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
}

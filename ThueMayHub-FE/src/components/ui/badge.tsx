import { statusLabel } from "@/lib/tmh-store";

export function tone(status: string) {
  if (["AVAILABLE", "COMPLETED", "Hoàn thành", "Hoạt động", "APPROVED", "RESOLVED"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["RENTED", "ACTIVE", "CONFIRMED", "RESERVED", "WAITING_CUSTOMER"].includes(status)) return "bg-indigo-50 text-indigo-700";
  if (["PENDING", "MAINTENANCE", "OPEN", "Đang xử lý", "Mới báo", "Trung bình"].includes(status)) return "bg-amber-50 text-amber-700";
  if (["EXPIRED", "BROKEN", "REJECTED", "Cao", "Chờ linh kiện", "Không sửa được", "Blacklist"].includes(status)) return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${tone(value)}`}>
      {statusLabel[value] || value}
    </span>
  );
}


import { useState, type ReactNode } from "react";
import { useHub, type Page } from "@/lib/tmh-store";

/**
 * Chuông trên thanh trên của khu quản trị: gom các việc đang chờ (yêu cầu thuê,
 * gia hạn, hỗ trợ, đơn quá hạn, linh kiện sắp hết) và dẫn thẳng tới trang xử lý.
 */
export function NoticeMenu({ go, icon }: { go: (page: Page) => void; icon: ReactNode }) {
  const store = useHub();
  const [open, setOpen] = useState(false);
  const admin = store.account?.role === "Admin";
  const now = Date.now();

  const items: [string, number, Page][] = (
    [
      ["Yêu cầu thuê chờ duyệt", store.orders.filter((o) => o.status === "PENDING").length, "orders"],
      ["Yêu cầu gia hạn chờ duyệt", store.extensions.filter((e) => e.status === "PENDING").length, "orders"],
      ["Yêu cầu hỗ trợ cần trả lời", store.tickets.filter((t) => t.status === "OPEN").length, "support"],
      ["Đơn đã quá hạn trả máy", store.orders.filter((o) => (o.status === "ACTIVE" || o.status === "EXPIRED") && new Date(o.end).getTime() < now).length, "orders"],
      ["Đơn hết hạn trong 3 ngày", store.orders.filter((o) => o.status === "ACTIVE" && new Date(o.end).getTime() >= now && new Date(o.end).getTime() - now < 3 * 86_400_000).length, "overview"],
      ...(admin
        ? ([
            ["Khách báo đã chuyển khoản nạp ví", store.topups.filter((t) => t.status === "PENDING" && t.paidAt).length, "wallets"],
            ["Linh kiện dưới mức tối thiểu", store.parts.filter((p) => p.minQuantity > 0 && p.quantity < p.minQuantity).length, "parts"],
          ] as [string, number, Page][])
        : []),
    ] as [string, number, Page][]
  ).filter(([, count]) => count > 0);

  const total = items.reduce((n, [, count]) => n + count, 0);

  return (
    <div className="relative">
      <button
        className="relative grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-50 hover:text-fg"
        aria-label={`Thông báo (${total})`}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-lg" onMouseLeave={() => setOpen(false)}>
          <p className="px-3 py-2 text-xs font-extrabold tracking-widest text-muted uppercase">Việc cần làm</p>
          {items.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted">Không có việc nào đang chờ.</p>
          ) : (
            items.map(([label, count, page]) => (
              <button
                key={label}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  go(page);
                }}
              >
                <span>{label}</span>
                <span className="rounded-md bg-amber-100 px-2 text-xs font-bold text-amber-800">{count}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

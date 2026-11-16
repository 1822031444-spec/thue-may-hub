import { useState } from "react";
import { Bell } from "lucide-react";
import { dateTimeLabel, useHub } from "@/lib/tmh-store";

/** Thông báo của khách: yêu cầu được duyệt, cửa hàng trả lời, đơn sắp hết hạn… */
export function NoticeBell() {
  const store = useHub();
  const [open, setOpen] = useState(false);
  const unread = store.notices.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        className="relative grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-50 hover:text-fg"
        aria-label={`Thông báo (${unread} chưa đọc)`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unread) void store.readNotices();
        }}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg" onMouseLeave={() => setOpen(false)}>
          <p className="px-3 py-2 text-xs font-extrabold tracking-widest text-muted uppercase">Thông báo</p>
          {store.notices.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted">Chưa có thông báo nào.</p>
          ) : (
            store.notices.slice(0, 20).map((n) => (
              <div key={n.id} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                <p className="font-bold">{n.title}</p>
                <p className="text-xs text-muted">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted">{dateTimeLabel(n.at)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

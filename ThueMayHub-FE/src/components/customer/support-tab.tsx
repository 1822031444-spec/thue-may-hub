import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { dateTimeLabel, TICKET_CATEGORY, useHub, type Ticket } from "@/lib/tmh-store";
import { TicketThread } from "@/components/support/ticket-thread";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";

/** Liên hệ cửa hàng, gửi yêu cầu hỗ trợ và theo dõi các yêu cầu đã gửi. */
export function SupportTab({ customerId }: { customerId: string }) {
  const store = useHub();
  const myOrders = store.orders.filter((o) => o.customerId === customerId && o.kind === "rental");
  const [open, setOpen] = useState<Ticket | null>(null);
  const [form, setForm] = useState({ subject: "", category: "TECHNICAL", orderId: "", message: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const shop = store.shop;

  const contact: [typeof Phone, string, string][] = [
    [Phone, "Hotline", shop.hotline],
    [Mail, "Email", shop.email],
    [MapPin, "Địa chỉ", shop.address],
    [Clock, "Giờ làm việc", shop.hours],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-6">
        <article className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-base font-extrabold">Liên hệ {shop.name}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {contact.filter(([, , value]) => value).map(([Icon, label, value]) => (
              <li key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 text-primary" />
                <span><span className="text-muted">{label}: </span><strong>{value}</strong></span>
              </li>
            ))}
          </ul>
        </article>

        <form
          className="rounded-xl border border-line bg-surface p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const error = await store.createTicket(form);
            setBusy(false);
            if (error) setErr(error);
            else {
              setErr("");
              setForm({ subject: "", category: "TECHNICAL", orderId: "", message: "" });
            }
          }}
        >
          <h2 className="text-base font-extrabold">Gửi yêu cầu hỗ trợ</h2>
          {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{err}</p>}
          <label className="mt-4 block text-sm font-bold">
            Tiêu đề
            <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" required minLength={4} value={form.subject}
              placeholder="Máy không vào mạng, cần đổi cấu hình..." onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">
              Nhóm
              <select className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(TICKET_CATEGORY).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">
              Đơn liên quan
              <select className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3" value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
                <option value="">Không gắn đơn</option>
                {myOrders.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.deviceName}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-sm font-bold">
            Nội dung
            <textarea className="mt-2 min-h-24 w-full rounded-lg border border-line px-3 py-2.5" required minLength={5} value={form.message}
              placeholder="Mô tả vấn đề bạn gặp..." onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <button className="mt-4 h-11 w-full rounded-lg bg-primary text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60" disabled={busy}>
            {busy ? "Đang gửi…" : "Gửi yêu cầu"}
          </button>
        </form>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-extrabold">Yêu cầu đã gửi ({store.tickets.length})</h2>
          <p className="text-xs text-muted">Bấm vào một yêu cầu để xem trao đổi với cửa hàng</p>
        </div>
        {store.tickets.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">Bạn chưa gửi yêu cầu hỗ trợ nào.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {store.tickets.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <strong>{t.subject}</strong>
                  <span className="block text-xs text-muted">
                    {t.code} · {TICKET_CATEGORY[t.category] ?? t.category} · {dateTimeLabel(t.lastAt)}
                  </span>
                  <span className="mt-1 line-clamp-1 block text-xs text-muted">{t.lastMessage}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge value={t.status} />
                  <button className={rowBtn.ghost} onClick={() => setOpen(t)}>Xem</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {open && <TicketThread ticket={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

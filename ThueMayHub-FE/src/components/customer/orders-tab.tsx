import { useState } from "react";
import { dateLabel, money, report, useHub, type Order } from "@/lib/tmh-store";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { Table } from "@/components/ui/table";

type Action = { kind: "pay" | "extend"; order: Order };

/** Đơn và yêu cầu thuê của khách: trả bằng ví, xin gia hạn, huỷ yêu cầu chưa duyệt. */
export function OrdersTab({ customerId }: { customerId: string }) {
  const store = useHub();
  const me = store.customers.find((c) => c.id === customerId)!;
  const mine = store.orders.filter((o) => o.customerId === customerId);
  const [action, setAction] = useState<Action | null>(null);

  const extensionOf = (o: Order) => store.extensions.find((e) => e.orderId === o.id && e.status === "PENDING");
  const lastExtension = (o: Order) => store.extensions.find((e) => e.orderId === o.id);

  const cancel = async (o: Order) => {
    if (!window.confirm(`Huỷ yêu cầu ${o.code}?`)) return;
    report(await store.cancelBooking(o.id));
  };

  const actions = (o: Order) => {
    if (o.kind === "booking") {
      return o.status === "PENDING"
        ? <button className={rowBtn.danger} onClick={() => cancel(o)}>Huỷ yêu cầu</button>
        : <span className="text-xs text-muted">{o.note || "—"}</span>;
    }
    const debt = o.total - o.paid;
    const pending = extensionOf(o);
    return (
      <div className="flex flex-wrap gap-1.5">
        {debt > 0 && o.status !== "CANCELLED" && (
          <button className={rowBtn.primary} onClick={() => setAction({ kind: "pay", order: o })}>Trả bằng ví</button>
        )}
        {(o.status === "ACTIVE" || o.status === "CONFIRMED") &&
          (pending ? (
            <span className="text-xs font-bold text-amber-700">Đang chờ duyệt gia hạn</span>
          ) : (
            <button className={rowBtn.ghost} onClick={() => setAction({ kind: "extend", order: o })}>Xin gia hạn</button>
          ))}
        {debt <= 0 && o.status !== "ACTIVE" && o.status !== "CONFIRMED" && <span className="text-xs text-muted">—</span>}
      </div>
    );
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-extrabold">Đơn thuê của bạn</h2>
          <p className="text-xs text-muted">Yêu cầu đang chờ duyệt và các đơn máy bạn đã, đang thuê. Số dư ví: {money(me.wallet)}</p>
        </div>
        <Table
          heads={["Mã", "Thiết bị", "Bắt đầu", "Hết hạn", "Tổng phí", "Đã thanh toán", "Trạng thái", "Thao tác"]}
          rows={mine.map((o) => {
            const ext = lastExtension(o);
            return [
              <span key={o.id} className="font-bold text-primary">{o.code}</span>,
              o.deviceName || store.devices.find((d) => d.id === o.deviceId)?.name || "—",
              dateLabel(o.start),
              <span key={o.id + "e"}>
                {dateLabel(o.end)}
                {ext && ext.status !== "PENDING" && (
                  <span className={`block text-[11px] ${ext.status === "APPROVED" ? "text-emerald-700" : "text-rose-700"}`}>
                    Gia hạn {ext.status === "APPROVED" ? "đã duyệt" : `bị từ chối${ext.adminNote ? `: ${ext.adminNote}` : ""}`}
                  </span>
                )}
              </span>,
              o.kind === "booking" ? <span key={o.id + "t"} className="text-muted">~{money(o.total)}</span> : money(o.total),
              money(o.paid),
              <Badge key={o.id + "b"} value={o.status} />,
              <span key={o.id + "a"}>{actions(o)}</span>,
            ];
          })}
        />
      </section>

      {action?.kind === "pay" && <PayDialog order={action.order} wallet={me.wallet} onClose={() => setAction(null)} />}
      {action?.kind === "extend" && <ExtendDialog order={action.order} onClose={() => setAction(null)} />}
    </>
  );
}

function PayDialog({ order, wallet, onClose }: { order: Order; wallet: number; onClose: () => void }) {
  const store = useHub();
  const debt = order.total - order.paid;
  const [amount, setAmount] = useState(Math.min(debt, wallet));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog title={`Trả đơn ${order.code} bằng ví`} subtitle={`${order.deviceName} · còn nợ ${money(debt)}`} onClose={onClose}>
      <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
        Số dư ví hiện có: <strong className="text-fg">{money(wallet)}</strong>.
        {wallet <= 0 && " Ví đang trống — hãy nạp tiền tại quầy trước."}
      </p>
      {err && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{err}</p>}
      <label className="block text-sm font-bold">
        Số tiền trả (đ)
        <input
          type="number" min={1000} max={Math.min(debt, wallet)}
          className="mt-2 h-11 w-full rounded-lg border border-line px-3"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </label>
      <div className="mt-6 flex justify-end gap-2">
        <button className="h-11 px-4 text-sm font-bold text-muted hover:text-fg" onClick={onClose}>Hủy</button>
        <button
          className="h-11 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60"
          disabled={busy || amount <= 0 || wallet <= 0}
          onClick={async () => {
            setBusy(true);
            const error = await store.payWithWallet({ orderId: order.id, amount });
            setBusy(false);
            if (error) setErr(error);
            else onClose();
          }}
        >
          {busy ? "Đang trả…" : "Xác nhận trả"}
        </button>
      </div>
    </Dialog>
  );
}

function ExtendDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const store = useHub();
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const until = new Date(new Date(order.end).getTime() + Math.max(1, days) * 86_400_000).toISOString();

  return (
    <Dialog title={`Xin gia hạn đơn ${order.code}`} subtitle={`${order.deviceName} · hạn hiện tại ${dateLabel(order.end)}`} onClose={onClose}>
      {err && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{err}</p>}
      <label className="block text-sm font-bold">
        Gia hạn thêm (ngày)
        <input type="number" min={1} className="mt-2 h-11 w-full rounded-lg border border-line px-3" value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </label>
      <label className="mt-3 block text-sm font-bold">
        Ghi chú cho cửa hàng
        <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" value={note} placeholder="Lý do, thời gian mong muốn..." onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-muted">
        Hạn mới dự kiến: <strong className="text-fg">{dateLabel(until)}</strong>. Cửa hàng sẽ báo phí gia hạn khi duyệt.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="h-11 px-4 text-sm font-bold text-muted hover:text-fg" onClick={onClose}>Hủy</button>
        <button
          className="h-11 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const error = await store.requestExtension({ orderId: order.id, days, note });
            setBusy(false);
            if (error) setErr(error);
            else onClose();
          }}
        >
          {busy ? "Đang gửi…" : "Gửi yêu cầu gia hạn"}
        </button>
      </div>
    </Dialog>
  );
}

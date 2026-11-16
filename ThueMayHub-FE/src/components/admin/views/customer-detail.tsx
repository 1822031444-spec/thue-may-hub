import { useEffect, useState } from "react";
import { api, dateLabel, dateTimeLabel, errorText, money, toWalletRow, useHub, type Row, type WalletRow } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";

const KIND: Record<string, string> = { DEPOSIT: "Nạp ví", RENTAL_PAYMENT: "Trả đơn", REFUND: "Hoàn tiền", ADJUSTMENT: "Điều chỉnh" };

/** Hồ sơ một khách: thông tin liên hệ, các đơn thuê và lịch sử ví. */
export function CustomerDetail({
  customerId,
  onClose,
  onAction,
}: {
  customerId: string;
  onClose: () => void;
  onAction: (type: ModalType, context?: string) => void;
}) {
  const store = useHub();
  const c = store.customers.find((x) => x.id === customerId);
  const orders = store.orders.filter((o) => o.customerId === customerId);
  const [wallet, setWallet] = useState<WalletRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ rows: Row[] }>(`/hub/wallet?customerId=${customerId}`)
      .then((r) => setWallet(r.rows.map(toWalletRow)))
      .catch((e) => setError(errorText(e)));
  }, [customerId, c?.wallet]);

  if (!c) return null;
  const debt = orders.filter((o) => o.kind === "rental" && o.status !== "CANCELLED").reduce((n, o) => n + Math.max(0, o.total - o.paid), 0);

  return (
    <Dialog title={c.name || c.code} subtitle={`${c.code} · ${c.phone}${c.email ? ` · ${c.email}` : ""}`} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Số dư ví", money(c.wallet), "text-emerald-700"],
          ["Còn nợ các đơn", money(debt), debt ? "text-amber-600" : "text-fg"],
          ["Tổng đã chi", money(c.totalSpent ?? 0), "text-primary"],
        ].map(([label, value, color]) => (
          <article key={label} className="rounded-xl border border-line p-4">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className={`mt-1 text-xl font-extrabold ${color}`}>{value}</p>
          </article>
        ))}
      </div>

      <dl className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted">Địa chỉ</dt><dd className="font-semibold">{c.address || "Chưa cập nhật"}</dd></div>
        <div><dt className="text-xs text-muted">CCCD</dt><dd className="font-semibold">{c.identityNumber || "Chưa cập nhật"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-muted">Ghi chú</dt><dd>{c.notes || "—"}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className={rowBtn.ghost} onClick={() => onAction("customerEdit", c.id)}>Sửa hồ sơ</button>
        {store.account?.role === "Admin" && (
          <button className={rowBtn.primary} onClick={() => onAction("deposit", c.id)}>Nạp ví</button>
        )}
      </div>

      <h3 className="mt-6 mb-2 text-sm font-extrabold">Đơn thuê ({orders.length})</h3>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">Khách chưa có đơn nào.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span>
                <strong className="text-primary">{o.code}</strong> · {o.deviceName}
                <span className="block text-xs text-muted">{dateLabel(o.start)} → {dateLabel(o.end)}</span>
              </span>
              <span className="text-right text-xs">
                <span className="block font-bold">{money(o.paid)} / {money(o.total)}</span>
                <Badge value={o.status} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 mb-2 text-sm font-extrabold">Lịch sử ví</h3>
      {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
      {!wallet && !error && <p className="text-sm text-muted">Đang tải…</p>}
      {wallet && wallet.length === 0 && <p className="text-sm text-muted">Ví chưa có giao dịch nào.</p>}
      {wallet && wallet.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {wallet.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <span>
                <strong>{KIND[w.kind] ?? w.kind}</strong>
                {w.orderCode && <span className="text-muted"> · {w.orderCode}</span>}
                <span className="block text-xs text-muted">{dateTimeLabel(w.at)} · {w.code}</span>
              </span>
              <span className={`font-extrabold ${w.change > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {w.change > 0 ? "+" : "−"}{money(Math.abs(w.change))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

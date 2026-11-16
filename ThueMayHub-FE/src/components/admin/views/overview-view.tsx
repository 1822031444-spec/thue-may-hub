import { ChevronRight } from "lucide-react";
import { dateLabel, money, useHub, type Page } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { Table } from "@/components/ui/table";

const DAY = 86_400_000;

export function OverviewView({
  nameOf,
  deviceOf,
  onAction,
  go,
}: {
  nameOf: (id: string) => string;
  deviceOf: (id: string) => string;
  onAction: (type: ModalType, context?: string) => void;
  go: (page: Page) => void;
}) {
  const store = useHub();
  const admin = store.account?.role === "Admin";
  const now = Date.now();
  const available = store.devices.filter((d) => d.status === "AVAILABLE").length;
  const renting = store.orders.filter((o) => o.status === "ACTIVE").length;
  const collected = store.payments.reduce((n, p) => n + p.amount, 0);
  const pendingBookings = store.orders.filter((o) => o.status === "PENDING").length;
  const pendingExtensions = store.extensions.filter((e) => e.status === "PENDING").length;
  const openTickets = store.tickets.filter((t) => t.status === "OPEN").length;
  const openRepairs = store.repairs.filter((r) => r.open).length;
  const todo = pendingBookings + pendingExtensions + openTickets;

  // Đơn đang chạy hết hạn trong 3 ngày tới hoặc đã quá hạn — nhóm cần gọi khách sớm nhất.
  const expiring = store.orders
    .filter((o) => (o.status === "ACTIVE" || o.status === "EXPIRED") && new Date(o.end).getTime() - now < 3 * DAY)
    .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());

  const cards: [string, string, string, string][] = [
    ["Máy còn trống", String(available).padStart(2, "0"), `Trên tổng ${store.devices.filter((d) => d.status !== "RETIRED").length} máy đang dùng`, "text-emerald-600"],
    ["Đang cho thuê", String(renting).padStart(2, "0"), `${expiring.length} đơn sắp hết hạn hoặc quá hạn`, "text-amber-600"],
    ["Việc cần xử lý", String(todo).padStart(2, "0"), "Yêu cầu thuê, gia hạn và hỗ trợ đang chờ", todo ? "text-rose-600" : "text-fg"],
    admin
      ? ["Đã thu thực tế", money(collected), "Tổng thu sau khi trừ hoàn tiền", "text-primary"]
      : ["Phiếu sửa đang mở", String(openRepairs).padStart(2, "0"), "Máy đang bảo trì hoặc chờ sửa", "text-primary"],
  ];

  const tasks: [string, number, Page][] = [
    ["Yêu cầu thuê chờ duyệt", pendingBookings, "orders"],
    ["Yêu cầu gia hạn chờ duyệt", pendingExtensions, "orders"],
    ["Yêu cầu hỗ trợ cần trả lời", openTickets, "support"],
    ["Phiếu sửa đang mở", openRepairs, "repairs"],
  ];

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, hint, colorClass]) => (
          <article key={label} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className={`mt-3 text-3xl font-extrabold tracking-tight ${colorClass}`}>{value}</p>
            <p className="mt-2 text-xs text-muted">{hint}</p>
          </article>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-extrabold">Việc cần xử lý</h2>
          <ul className="mt-3 space-y-2">
            {tasks.map(([label, count, page]) => (
              <li key={label}>
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50"
                  onClick={() => go(page)}
                >
                  <span>{label}</span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${count ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-muted"}`}>{count}</span>
                    <ChevronRight className="size-4 text-muted" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-extrabold">Sắp hết hạn & quá hạn</h2>
            <p className="text-xs text-muted">Đơn đang thuê hết hạn trong 3 ngày tới — gọi khách để gia hạn hoặc nhận lại máy</p>
          </div>
          {expiring.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Không có đơn nào sắp hết hạn.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {expiring.slice(0, 6).map((o) => {
                const late = new Date(o.end).getTime() < now;
                const phone = store.customers.find((c) => c.id === o.customerId)?.phone;
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span>
                      <strong className="text-primary">{o.code}</strong> · {o.customerName || nameOf(o.customerId)}
                      {phone && <span className="text-muted"> · {phone}</span>}
                      <span className="block text-xs text-muted">
                        {o.deviceName || deviceOf(o.deviceId)} ·{" "}
                        <span className={late ? "font-bold text-rose-700" : "font-semibold text-amber-700"}>
                          {late ? "đã quá hạn" : "hết hạn"} {dateLabel(o.end)}
                        </span>
                        {o.total > o.paid && <> · còn nợ {money(o.total - o.paid)}</>}
                      </span>
                    </span>
                    <span className="flex gap-1.5">
                      <button className={rowBtn.ghost} onClick={() => onAction("renew", o.id)}>Gia hạn</button>
                      {o.total > o.paid && <button className={rowBtn.primary} onClick={() => onAction("payment", o.id)}>Thu tiền</button>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-extrabold">Đơn thuê mới nhất</h2>
            <p className="text-xs text-muted">5 hợp đồng thuê được lập gần đây</p>
          </div>
          <button className={rowBtn.ghost} onClick={() => go("orders")}>Xem tất cả</button>
        </div>
        <Table
          heads={["Mã đơn", "Khách hàng", "Thiết bị", "Hết hạn", "Tổng phí", "Trạng thái"]}
          rows={store.orders.filter((o) => o.kind === "rental").slice(0, 5).map((o) => [
            o.code,
            o.customerName || nameOf(o.customerId),
            o.deviceName || deviceOf(o.deviceId),
            dateLabel(o.end),
            money(o.total),
            <Badge key={o.id} value={o.status} />,
          ])}
        />
      </section>
    </>
  );
}

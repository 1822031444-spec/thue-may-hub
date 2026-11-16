import { useState } from "react";
import { CONTACT_CHANNEL, HANDOVER_METHOD, dateLabel, money, report, useHub, type Order } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

const FILTERS: [string, string, (o: Order) => boolean][] = [
  ["all", "Tất cả", () => true],
  ["pending", "Chờ duyệt", (o) => o.status === "PENDING"],
  ["reserved", "Đã xác nhận", (o) => o.status === "CONFIRMED"],
  ["active", "Đang thuê", (o) => o.status === "ACTIVE"],
  ["late", "Quá hạn", (o) => o.status === "EXPIRED" || (o.status === "ACTIVE" && new Date(o.end).getTime() < Date.now())],
  ["debt", "Còn nợ", (o) => o.kind === "rental" && o.status !== "CANCELLED" && o.total > o.paid],
  ["done", "Đã kết thúc", (o) => o.status === "COMPLETED" || o.status === "CANCELLED" || o.status === "REJECTED"],
];

/** Tên khách kèm số để liên hệ giao máy: quầy gọi/nhắn số này để gửi thông tin truy cập máy. */
export function CustomerContact({ order }: { order: Order }) {
  return (
    <span>
      {order.customerName}
      {order.contactPhone && (
        <span className="block text-xs text-muted">
          {CONTACT_CHANNEL[order.contactChannel] ?? "SĐT"} <strong className="text-fg">{order.contactPhone}</strong>
          {order.handover && <> · {HANDOVER_METHOD[order.handover] ?? order.handover}</>}
        </span>
      )}
    </span>
  );
}

export function OrdersView({
  query,
  setQuery,
  onAction,
}: {
  query: string;
  setQuery: (v: string) => void;
  onAction: (type: ModalType, context?: string) => void;
}) {
  const store = useHub();
  const admin = store.account?.role === "Admin";
  const [filter, setFilter] = useState("all");
  const q = query.trim().toLowerCase();
  const match = FILTERS.find(([key]) => key === filter)![2];
  const waiting = store.extensions.filter((e) => e.status === "PENDING");

  const filtered = store.orders.filter(
    (o) =>
      match(o) &&
      (o.code.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.deviceName.toLowerCase().includes(q))
  );

  // Đổi trạng thái đơn đi thẳng qua API; kết quả báo bằng toast chung của khu quản trị.
  const change = async (o: Order, status: "ACTIVE" | "COMPLETED" | "CANCELLED") => {
    if (status === "CANCELLED" && !window.confirm(`Huỷ đơn ${o.code}? Máy sẽ trở về trạng thái còn trống.`)) return;
    report(await store.setOrderStatus(o.id, status));
  };

  const actions = (o: Order) => {
    if (o.status === "PENDING") {
      return (
        <div className="flex gap-1.5">
          <button className={rowBtn.primary} onClick={() => onAction("approve", o.id)}>Duyệt</button>
          <button className={rowBtn.danger} onClick={() => onAction("reject", o.id)}>Từ chối</button>
        </div>
      );
    }
    if (o.kind === "booking") return <span className="text-xs text-muted">—</span>;
    const debt = o.total - o.paid;
    return (
      <div className="flex flex-wrap gap-1.5">
        {o.status === "CONFIRMED" && <button className={rowBtn.primary} onClick={() => change(o, "ACTIVE")}>Giao máy</button>}
        {debt > 0 && o.status !== "CANCELLED" && <button className={rowBtn.ghost} onClick={() => onAction("payment", o.id)}>Thu tiền</button>}
        {(o.status === "ACTIVE" || o.status === "EXPIRED" || o.status === "CONFIRMED") && (
          <button className={rowBtn.ghost} onClick={() => onAction("renew", o.id)}>Gia hạn</button>
        )}
        {(o.status === "ACTIVE" || o.status === "EXPIRED") && (
          <button className={rowBtn.ghost} onClick={() => change(o, "COMPLETED")}>Nhận lại máy</button>
        )}
        {o.status === "CONFIRMED" && o.paid === 0 && <button className={rowBtn.muted} onClick={() => change(o, "CANCELLED")}>Huỷ</button>}
        {admin && o.paid > 0 && <button className={rowBtn.danger} onClick={() => onAction("refund", o.id)}>Hoàn tiền</button>}
      </div>
    );
  };

  return (
    <>
      {waiting.length > 0 && (
        <section className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
          <div className="px-5 pt-4">
            <h2 className="text-base font-extrabold text-amber-900">Yêu cầu gia hạn chờ duyệt ({waiting.length})</h2>
            <p className="text-xs text-amber-800">Khách gửi từ cổng khách hàng. Duyệt thì hạn đơn và tổng tiền được cập nhật ngay.</p>
          </div>
          <Table
            heads={["Mã", "Khách hàng", "Đơn thuê", "Hạn hiện tại", "Xin gia hạn tới", "Ghi chú", "Thao tác"]}
            rows={waiting.map((e) => [
              <span key={e.id} className="font-bold">{e.code}</span>,
              e.customerName,
              `${e.orderCode} · ${e.deviceName}`,
              dateLabel(e.currentEnd),
              <strong key={e.id + "r"}>{dateLabel(e.requestedEnd)}</strong>,
              e.note || "—",
              <div key={e.id + "a"} className="flex gap-1.5">
                <button className={rowBtn.primary} onClick={() => onAction("extApprove", e.id)}>Duyệt</button>
                <button className={rowBtn.danger} onClick={() => onAction("extReject", e.id)}>Từ chối</button>
              </div>,
            ])}
          />
        </section>
      )}

      <ListCard
        title="Tất cả đơn thuê"
        count={`${filtered.length}/${store.orders.length} hợp đồng`}
        query={query}
        setQuery={setQuery}
        placeholder="Tìm theo mã đơn, tên khách hoặc tên máy..."
      >
        <FilterTabs value={filter} onChange={setFilter} tabs={FILTERS.map(([key, label, fn]) => [key, label, store.orders.filter(fn).length])} />
        <Table
          heads={["Mã đơn", "Khách hàng", "Thiết bị", "Ngày bắt đầu", "Hạn trả", "Tổng phí", "Đã thu", "Trạng thái", "Thao tác"]}
          rows={filtered.map((o) => [
            <span key={o.id} className="font-bold text-primary">{o.code}</span>,
            <CustomerContact key={o.id + "c"} order={o} />,
            o.deviceName,
            dateLabel(o.start),
            <span key={o.id + "e"} className={o.status === "ACTIVE" && new Date(o.end).getTime() < Date.now() ? "font-bold text-rose-700" : ""}>
              {dateLabel(o.end)}
            </span>,
            o.kind === "booking" ? <span key={o.id + "t"} className="text-muted">~{money(o.total)}</span> : money(o.total),
            <span key={o.id + "p"} className={`font-semibold ${o.paid >= o.total ? "text-emerald-700" : "text-amber-700"}`}>{money(o.paid)}</span>,
            <Badge key={o.id} value={o.status} />,
            <span key={o.id + "a"}>{actions(o)}</span>,
          ])}
        />
      </ListCard>
    </>
  );
}

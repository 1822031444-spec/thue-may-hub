import { useState } from "react";
import { money, report, useHub, type Device } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

const FILTERS: [string, string, (d: Device) => boolean][] = [
  ["all", "Tất cả", () => true],
  ["free", "Còn trống", (d) => d.status === "AVAILABLE"],
  ["busy", "Đang thuê / giữ chỗ", (d) => d.status === "RENTED" || d.status === "RESERVED"],
  ["fix", "Bảo trì / hỏng", (d) => d.status === "MAINTENANCE" || d.status === "BROKEN"],
  ["retired", "Ngừng dùng", (d) => d.status === "RETIRED"],
];

export function DevicesView({
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

  const filtered = store.devices.filter(
    (d) =>
      match(d) &&
      (d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q))
  );

  const remove = async (d: Device) => {
    if (!window.confirm(`Xoá hẳn ${d.code} · ${d.name}? Máy đã có đơn hoặc phiếu sửa thì không xoá được — dùng "Ngừng dùng".`)) return;
    report(await store.deleteDevice(d.id));
  };

  const actions = (d: Device) => (
    <div className="flex flex-wrap gap-1.5">
      <button className={rowBtn.ghost} onClick={() => onAction("deviceEdit", d.id)}>Sửa</button>
      {d.status === "AVAILABLE" && (
        <button className={rowBtn.muted} onClick={async () => report(await store.setDeviceStatus(d.id, "MAINTENANCE"))}>Bảo trì</button>
      )}
      {(d.status === "MAINTENANCE" || d.status === "BROKEN" || d.status === "RETIRED") && (
        <button className={rowBtn.primary} onClick={async () => report(await store.setDeviceStatus(d.id, "AVAILABLE"))}>Sẵn sàng</button>
      )}
      {d.status !== "RENTED" && d.status !== "RESERVED" && d.status !== "RETIRED" && (
        <button className={rowBtn.muted} onClick={() => onAction("repair", d.id)}>Báo hỏng</button>
      )}
      {admin && d.status !== "RENTED" && d.status !== "RESERVED" && d.status !== "RETIRED" && (
        <button className={rowBtn.muted} onClick={async () => report(await store.setDeviceStatus(d.id, "RETIRED"))}>Ngừng dùng</button>
      )}
      {admin && d.status !== "RENTED" && d.status !== "RESERVED" && (
        <button className={rowBtn.danger} onClick={() => remove(d)}>Xoá</button>
      )}
    </div>
  );

  return (
    <ListCard
      title="Danh sách thiết bị"
      count={`${filtered.length}/${store.devices.length} máy`}
      query={query}
      setQuery={setQuery}
      placeholder="Tìm theo mã máy, tên máy, cấu hình hoặc vị trí..."
    >
      <FilterTabs
        value={filter}
        onChange={setFilter}
        tabs={FILTERS.map(([key, label, fn]) => [key, label, store.devices.filter(fn).length])}
      />
      <Table
        heads={["Mã máy", "Tên thiết bị", "Phân loại", "Trạng thái", "Vị trí", "Giá giờ", "Giá tháng", "Doanh thu / tiền sửa", "Thao tác"]}
        rows={filtered.map((d) => [
          <span key={d.id} className="font-bold text-primary">{d.code}</span>,
          <span key={d.id + "n"}>
            <span className="block font-semibold">{d.name}</span>
            {d.currentCustomer && <span className="text-xs text-muted">Đang thuê: {d.currentCustomer}</span>}
            {d.networkLocked && <span className="block text-xs font-bold text-rose-700">Đã khoá mạng</span>}
          </span>,
          d.category ? `${d.type} · ${d.category}` : d.type,
          <Badge key={d.id} value={d.status} />,
          d.location || "—",
          money(d.hourly),
          <span key={d.id + "m"} className="font-semibold">{money(d.monthly)}</span>,
          <span key={d.id + "r"} className="text-xs">
            <span className="block font-bold text-emerald-700">{money(d.revenue)}</span>
            <span className="text-rose-700">−{money(d.repairCost)}</span>
          </span>,
          <span key={d.id + "a"}>{actions(d)}</span>,
        ])}
      />
    </ListCard>
  );
}

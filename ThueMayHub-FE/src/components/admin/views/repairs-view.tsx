import { useState } from "react";
import { money, useHub, type Repair } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

const FILTERS: [string, string, (r: Repair) => boolean][] = [
  ["open", "Đang mở", (r) => r.open],
  ["closed", "Đã đóng", (r) => !r.open],
  ["all", "Tất cả", () => true],
];

export function RepairsView({
  query,
  setQuery,
  onAction,
}: {
  query: string;
  setQuery: (v: string) => void;
  onAction: (type: ModalType, context?: string) => void;
}) {
  const store = useHub();
  const [filter, setFilter] = useState("open");
  const q = query.trim().toLowerCase();
  const match = FILTERS.find(([key]) => key === filter)![2];

  const filtered = store.repairs.filter(
    (r) =>
      match(r) &&
      (r.code.toLowerCase().includes(q) ||
        r.issue.toLowerCase().includes(q) ||
        r.technician.toLowerCase().includes(q) ||
        r.deviceName.toLowerCase().includes(q))
  );

  return (
    <ListCard
      title="Phiếu bảo trì & sửa chữa"
      count={`${filtered.length}/${store.repairs.length} phiếu`}
      query={query}
      setQuery={setQuery}
      placeholder="Tìm theo mã phiếu, mô tả lỗi, kỹ thuật viên hoặc thiết bị..."
    >
      <FilterTabs value={filter} onChange={setFilter} tabs={FILTERS.map(([key, label, fn]) => [key, label, store.repairs.filter(fn).length])} />
      <Table
        heads={["Mã phiếu", "Thiết bị", "Mô tả sự cố", "Mức ưu tiên", "Kỹ thuật viên", "Chi phí", "Trạng thái", "Thao tác"]}
        rows={filtered.map((r) => [
          <span key={r.id} className="font-bold text-primary">{r.code}</span>,
          r.deviceName,
          r.issue,
          <Badge key={r.id + "p"} value={r.priority} />,
          r.technician,
          <span key={r.id + "c"} className="text-xs">
            <span className="block font-bold">{money(r.cost)}</span>
            {r.partsCost > 0 && <span className="text-muted">gồm linh kiện {money(r.partsCost)}</span>}
          </span>,
          <Badge key={r.id + "s"} value={r.status} />,
          r.open ? (
            <div key={r.id + "a"} className="flex flex-wrap gap-1.5">
              <button className={rowBtn.ghost} onClick={() => onAction("repairPart", r.id)}>Lắp linh kiện</button>
              <button className={rowBtn.primary} onClick={() => onAction("finish", r.id)}>Đóng phiếu</button>
              <button className={rowBtn.danger} onClick={() => onAction("unrepairable", r.id)}>Không sửa được</button>
            </div>
          ) : (
            <span key={r.id + "a"} className="text-xs text-muted">—</span>
          ),
        ])}
      />
    </ListCard>
  );
}

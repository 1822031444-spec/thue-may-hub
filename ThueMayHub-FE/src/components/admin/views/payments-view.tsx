import { useState } from "react";
import { dateLabel, money, useHub, type Payment } from "@/lib/tmh-store";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

const FILTERS: [string, string, (p: Payment) => boolean][] = [
  ["all", "Tất cả", () => true],
  ["in", "Thu tiền", (p) => p.kind === "PAYMENT"],
  ["out", "Hoàn tiền", (p) => p.kind === "REFUND"],
];

export function PaymentsView({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (v: string) => void;
}) {
  const store = useHub();
  const [filter, setFilter] = useState("all");
  const q = query.trim().toLowerCase();
  const match = FILTERS.find(([key]) => key === filter)![2];

  const filtered = store.payments.filter(
    (p) =>
      match(p) &&
      (p.code.toLowerCase().includes(q) ||
        p.orderCode.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q))
  );
  const net = filtered.reduce((n, p) => n + p.amount, 0);

  return (
    <>
      <p className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
        Ghi nhận các khoản thu và hoàn tiền của đơn thuê. Mọi giao dịch được lưu vĩnh viễn, không sửa không xoá, phục vụ đối soát tài chính.
      </p>
      <ListCard
        title="Lịch sử giao dịch thu tiền"
        count={`${filtered.length} giao dịch · thực thu ròng ${money(net)}`}
        query={query}
        setQuery={setQuery}
        placeholder="Tìm theo mã phiếu, mã đơn thuê, khách hàng hoặc hình thức..."
      >
        <FilterTabs value={filter} onChange={setFilter} tabs={FILTERS.map(([key, label, fn]) => [key, label, store.payments.filter(fn).length])} />
        <Table
          heads={["Mã phiếu", "Loại", "Đơn thuê", "Khách hàng", "Ngày", "Phương thức", "Số tiền"]}
          rows={filtered.map((p) => [
            <span key={p.id} className="font-bold text-primary">{p.code}</span>,
            <span key={p.id + "k"} className={`text-xs font-bold ${p.kind === "REFUND" ? "text-rose-700" : "text-emerald-700"}`}>
              {p.kind === "REFUND" ? "Hoàn tiền" : "Thu tiền"}
            </span>,
            p.orderCode,
            p.customerName || "—",
            dateLabel(p.date),
            <span key={p.id + "m"} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{p.method}</span>,
            <span key={p.id + "a"} className={`font-bold ${p.amount < 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {p.amount < 0 ? "−" : ""}{money(Math.abs(p.amount))}
            </span>,
          ])}
        />
      </ListCard>
    </>
  );
}

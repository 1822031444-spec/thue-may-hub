import { useState } from "react";
import { money, report, useHub, type Customer } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { CustomerDetail } from "@/components/admin/views/customer-detail";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

export function CustomersView({
  query,
  setQuery,
  onAction,
}: {
  query: string;
  setQuery: (v: string) => void;
  onAction: (type: ModalType, context?: string) => void;
}) {
  const store = useHub();
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const groups: [string, string, (c: Customer) => boolean][] = [
    ["all", "Tất cả", () => true],
    ["renting", "Đang thuê", (c) => store.orders.some((o) => o.customerId === c.id && (o.status === "ACTIVE" || o.status === "EXPIRED"))],
    ["debt", "Còn nợ", (c) => store.orders.some((o) => o.customerId === c.id && o.kind === "rental" && o.status !== "CANCELLED" && o.total > o.paid)],
    ["blocked", "Đã khoá", (c) => c.blacklist],
  ];
  const match = groups.find(([key]) => key === filter)![2];

  const filtered = store.customers.filter(
    (c) =>
      match(c) &&
      (c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q))
  );

  const toggleBlock = async (c: Customer) => {
    if (!c.blacklist && !window.confirm(`Khoá ${c.name}? Khách sẽ không đăng nhập cổng khách và không thuê thêm được.`)) return;
    report(await store.setCustomerBlocked(c.id, !c.blacklist));
  };

  return (
    <>
      <ListCard
        title="Danh sách khách hàng"
        count={`${filtered.length}/${store.customers.length} khách`}
        query={query}
        setQuery={setQuery}
        placeholder="Tìm theo tên khách, số điện thoại hoặc email..."
      >
        <FilterTabs value={filter} onChange={setFilter} tabs={groups.map(([key, label, fn]) => [key, label, store.customers.filter(fn).length])} />
        <Table
          heads={["Mã khách", "Họ và tên", "Số điện thoại", "Email", "Số dư ví", "Đơn / đã chi", "Trạng thái", "Thao tác"]}
          rows={filtered.map((c) => [
            <span key={c.id} className="font-bold text-primary">{c.code}</span>,
            c.name || "Chưa cập nhật tên",
            c.phone,
            c.email || "—",
            <span key={c.id + "w"} className="font-semibold text-emerald-700">{money(c.wallet)}</span>,
            <span key={c.id + "s"} className="text-xs">
              <span className="block font-bold">{c.rentalCount ?? 0} đơn</span>
              <span className="text-muted">{money(c.totalSpent ?? 0)}</span>
            </span>,
            <Badge key={c.id} value={c.blacklist ? "Blacklist" : "Hoạt động"} />,
            <div key={c.id + "a"} className="flex flex-wrap gap-1.5">
              <button className={rowBtn.ghost} onClick={() => setDetail(c.id)}>Chi tiết</button>
              <button className={rowBtn.ghost} onClick={() => onAction("customerEdit", c.id)}>Sửa</button>
              <button className={c.blacklist ? rowBtn.primary : rowBtn.danger} onClick={() => toggleBlock(c)}>
                {c.blacklist ? "Mở khoá" : "Khoá"}
              </button>
            </div>,
          ])}
        />
      </ListCard>
      {detail && <CustomerDetail customerId={detail} onClose={() => setDetail(null)} onAction={onAction} />}
    </>
  );
}

import { useState } from "react";
import { dateTimeLabel, TICKET_CATEGORY, useHub, type Ticket } from "@/lib/tmh-store";
import { TicketThread } from "@/components/support/ticket-thread";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

const FILTERS: [string, string, (t: Ticket) => boolean][] = [
  ["open", "Cần trả lời", (t) => t.status === "OPEN"],
  ["waiting", "Chờ khách", (t) => t.status === "WAITING_CUSTOMER"],
  ["done", "Đã xử lý / đóng", (t) => t.status === "RESOLVED" || t.status === "CLOSED"],
  ["all", "Tất cả", () => true],
];

/** Yêu cầu hỗ trợ khách gửi từ cổng khách; nhân viên và chủ đều trả lời được. */
export function SupportView({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  const store = useHub();
  const [filter, setFilter] = useState("open");
  const [open, setOpen] = useState<Ticket | null>(null);
  const q = query.trim().toLowerCase();
  const match = FILTERS.find(([key]) => key === filter)![2];

  const filtered = store.tickets.filter(
    (t) =>
      match(t) &&
      (t.code.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q))
  );

  return (
    <>
      <ListCard
        title="Yêu cầu hỗ trợ của khách"
        count={`${filtered.length}/${store.tickets.length} yêu cầu`}
        query={query}
        setQuery={setQuery}
        placeholder="Tìm theo mã, tiêu đề hoặc tên khách..."
      >
        <FilterTabs value={filter} onChange={setFilter} tabs={FILTERS.map(([key, label, fn]) => [key, label, store.tickets.filter(fn).length])} />
        <Table
          heads={["Mã", "Khách hàng", "Tiêu đề", "Nhóm", "Tin gần nhất", "Cập nhật", "Trạng thái", ""]}
          rows={filtered.map((t) => [
            <span key={t.id} className="font-bold text-primary">{t.code}</span>,
            t.customerName,
            <span key={t.id + "s"} className="font-semibold">
              {t.subject}
              {t.priority === "HIGH" && <span className="ml-2 rounded bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700">Gấp</span>}
            </span>,
            TICKET_CATEGORY[t.category] ?? t.category,
            <span key={t.id + "m"} className="line-clamp-2 max-w-64 text-xs text-muted">{t.lastMessage}</span>,
            dateTimeLabel(t.lastAt),
            <Badge key={t.id + "b"} value={t.status} />,
            <button key={t.id + "a"} className={rowBtn.primary} onClick={() => setOpen(t)}>Mở</button>,
          ])}
        />
      </ListCard>
      {open && <TicketThread ticket={open} onClose={() => setOpen(null)} />}
    </>
  );
}

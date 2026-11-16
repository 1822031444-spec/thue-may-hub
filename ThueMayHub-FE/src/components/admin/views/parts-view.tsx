import { useEffect, useState } from "react";
import { api, dateTimeLabel, errorText, money, useHub, type Part, type Row } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { rowBtn } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { Table } from "@/components/ui/table";

const CATEGORY: Record<string, string> = {
  RAM: "RAM", STORAGE: "Ổ cứng", GPU: "Card đồ hoạ", CPU: "CPU", MAINBOARD: "Bo mạch",
  PSU: "Nguồn", COOLING: "Tản nhiệt", SCREEN: "Màn hình", BATTERY: "Pin", CABLE: "Cáp", OTHER: "Khác",
};
const MOVE: Record<string, string> = { PURCHASE: "Nhập mua", CONSUME: "Lắp vào máy", RETURN: "Trả về kho", ADJUST: "Điều chỉnh" };

export function PartsView({ onAction }: { onAction: (type: ModalType, context?: string) => void }) {
  const store = useHub();
  const [history, setHistory] = useState<Part | null>(null);
  const low = store.parts.filter((p) => p.minQuantity > 0 && p.quantity < p.minQuantity).length;
  const value = store.parts.reduce((sum, p) => sum + p.quantity * p.averageCost, 0);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">Giá trị tồn kho</p>
          <p className="mt-3 text-3xl font-extrabold text-primary">{money(value)}</p>
          <p className="mt-2 text-xs text-muted">Tính theo giá vốn bình quân của các lần nhập</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">Linh kiện dưới mức tối thiểu</p>
          <p className={`mt-3 text-3xl font-extrabold ${low ? "text-rose-600" : "text-emerald-600"}`}>{low}</p>
          <p className="mt-2 text-xs text-muted">Cần nhập thêm trước khi hết hàng</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="px-5 py-4">
          <h2 className="text-base font-extrabold">Kho linh kiện dự phòng</h2>
          <span className="text-xs text-muted">
            {store.parts.length} mã linh kiện · tồn kho tính lại từ lịch sử nhập xuất, không sửa tay được
          </span>
        </div>
        <Table
          heads={["Mã", "Tên linh kiện", "Nhóm", "Tồn kho", "Tối thiểu", "Giá vốn bình quân", "Vị trí", "Thao tác"]}
          rows={store.parts.map((p) => [
            <span key={p.id} className="font-bold text-primary">{p.code}</span>,
            p.name,
            CATEGORY[p.category] ?? p.category,
            <span
              key={p.id + "q"}
              className={`font-bold ${p.minQuantity > 0 && p.quantity < p.minQuantity ? "text-rose-700" : "text-fg"}`}
            >
              {p.quantity} {p.unit}
            </span>,
            `${p.minQuantity} ${p.unit}`,
            money(p.averageCost),
            p.location || "—",
            <div key={p.id + "a"} className="flex gap-1.5">
              <button className={rowBtn.primary} onClick={() => onAction("purchase", p.id)}>Nhập kho</button>
              <button className={rowBtn.ghost} onClick={() => setHistory(p)}>Lịch sử</button>
            </div>,
          ])}
        />
      </section>
      {history && <PartHistory part={history} onClose={() => setHistory(null)} />}
    </>
  );
}

function PartHistory({ part, onClose }: { part: Part; onClose: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Row[] | { rows: Row[] }>(`/parts/${part.id}/movements`)
      .then((r) => setRows(Array.isArray(r) ? r : r.rows))
      .catch((e) => setError(errorText(e)));
  }, [part.id]);

  return (
    <Dialog title={`Lịch sử kho · ${part.name}`} subtitle={`${part.code} · tồn hiện tại ${part.quantity} ${part.unit}`} onClose={onClose} wide>
      {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
      {!rows && !error && <p className="text-sm text-muted">Đang tải…</p>}
      {rows && rows.length === 0 && <p className="text-sm text-muted">Chưa có lần nhập xuất nào.</p>}
      {rows && rows.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {rows.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span>
                <strong>{MOVE[m.kind] ?? m.kind}</strong>
                {m.repair_code && <span className="text-muted"> · {m.repair_code}</span>}
                <span className="block text-xs text-muted">{dateTimeLabel(m.occurred_at)}{m.notes ? ` · ${m.notes}` : ""}</span>
              </span>
              <span className="text-right">
                <span className={`block font-extrabold ${Number(m.quantity) > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {Number(m.quantity) > 0 ? "+" : ""}{m.quantity} {part.unit}
                </span>
                {Number(m.unit_cost) > 0 && <span className="text-xs text-muted">{money(Number(m.unit_cost))}/{part.unit}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

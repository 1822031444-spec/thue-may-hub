import { useState } from "react";
import { dateTimeLabel, money, useHub } from "@/lib/tmh-store";
import { CustomerDetail } from "@/components/admin/views/customer-detail";
import { rowBtn } from "@/components/ui/buttons";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { Badge } from "@/components/ui/badge";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

export function WalletsView({
  query,
  setQuery,
  onAction,
}: {
  query: string;
  setQuery: (v: string) => void;
  onAction: (type: ModalType, context?: string) => void;
}) {
  const store = useHub();
  const [detail, setDetail] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const filtered = store.customers.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
  );

  const totalWalletBalance = store.customers.reduce((sum, c) => sum + c.wallet, 0);
  const waiting = store.topups.filter((t) => t.status === "PENDING");
  const done = store.topups.filter((t) => t.status === "APPROVED" || t.status === "REJECTED").slice(0, 8);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">Tổng số dư ví hệ thống</p>
          <p className="mt-3 text-3xl font-extrabold text-primary">{money(totalWalletBalance)}</p>
          <p className="mt-2 text-xs text-muted">Số tiền khách đã nạp và lưu giữ trong tài khoản</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">Khách hàng có số dư</p>
          <p className="mt-3 text-3xl font-extrabold text-emerald-600">
            {store.customers.filter((c) => c.wallet > 0).length} / {store.customers.length}
          </p>
          <p className="mt-2 text-xs text-muted">Khách hàng có ví đang hoạt động</p>
        </article>
      </div>

      <section className="mb-6 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-extrabold">Yêu cầu nạp qua chuyển khoản ({waiting.length})</h2>
          <p className="text-xs text-muted">
            Khách tạo mã VietQR ở cổng khách. Mở app ngân hàng, tìm khoản tiền có đúng <strong>nội dung</strong> bên dưới rồi mới xác nhận —
            tiền chỉ vào ví khách khi bạn xác nhận.
          </p>
        </div>
        {waiting.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Không có yêu cầu nạp nào đang chờ.</p>
        ) : (
          <Table
            heads={["Nội dung CK", "Khách hàng", "Số tiền", "Tạo lúc", "Tình trạng", "Thao tác"]}
            rows={waiting.map((t) => [
              <span key={t.id} className="font-mono font-extrabold text-primary">{t.note}</span>,
              <span key={t.id + "c"}>{t.customerName || t.customerCode}<span className="block text-xs text-muted">{t.customerCode} · {t.customerPhone}</span></span>,
              <strong key={t.id + "m"}>{money(t.amount)}</strong>,
              dateTimeLabel(t.createdAt),
              t.paidAt ? (
                <span key={t.id + "s"} className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800" title={dateTimeLabel(t.paidAt)}>Khách báo đã chuyển</span>
              ) : (
                <span key={t.id + "s"} className="text-xs text-muted">Chưa báo chuyển</span>
              ),
              <div key={t.id + "a"} className="flex gap-1.5">
                <button className={rowBtn.primary} onClick={() => onAction("topupApprove", t.id)}>Đã nhận tiền</button>
                <button className={rowBtn.danger} onClick={() => onAction("topupReject", t.id)}>Không thấy tiền</button>
              </div>,
            ])}
          />
        )}
        {done.length > 0 && (
          <details className="border-t border-line px-5 py-3 text-sm">
            <summary className="cursor-pointer text-xs font-bold text-muted">Đã xử lý gần đây ({done.length})</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {done.map((t) => (
                <li key={t.id}>
                  {dateTimeLabel(t.reviewedAt)} · <span className="font-mono">{t.note}</span> · {t.customerName} ·{" "}
                  {t.status === "APPROVED"
                    ? <span className="font-bold text-emerald-700">đã cộng {money(t.received)}</span>
                    : <span className="font-bold text-rose-700">từ chối: {t.adminNote}</span>}
                  {t.reviewer && <> · {t.reviewer}</>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <ListCard
        title="Quản lý số dư ví khách"
        count={`${filtered.length} tài khoản ví`}
        query={query}
        setQuery={setQuery}
        placeholder="Tìm theo mã khách, họ tên hoặc số điện thoại..."
      >
        <Table
          heads={["Mã khách", "Khách hàng", "Số điện thoại", "Số dư ví hiện tại", "Trạng thái tài khoản", "Thao tác"]}
          rows={filtered.map((c) => [
            <span key={c.id} className="font-bold text-primary">{c.code}</span>,
            c.name || "Chưa có tên",
            c.phone,
            <span key={c.id + "w"} className="font-bold text-emerald-700">{money(c.wallet)}</span>,
            <Badge key={c.id} value={c.blacklist ? "Blacklist" : "Hoạt động"} />,
            <div key={c.id + "a"} className="flex gap-1.5">
              <button className={rowBtn.primary} onClick={() => onAction("deposit", c.id)}>Nạp ví</button>
              <button className={rowBtn.ghost} onClick={() => setDetail(c.id)}>Lịch sử</button>
            </div>,
          ])}
        />
      </ListCard>
      {detail && <CustomerDetail customerId={detail} onClose={() => setDetail(null)} onAction={onAction} />}
    </>
  );
}

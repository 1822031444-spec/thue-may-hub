import { money, useHub } from "@/lib/tmh-store";

export function ReportsView() {
  const store = useHub();
  // Chỉ tính đơn thuê thật; yêu cầu chờ duyệt chưa phải hợp đồng, đơn huỷ không còn giá trị.
  const contracts = store.orders.filter((o) => o.kind === "rental" && o.status !== "CANCELLED");
  const totalValue = contracts.reduce((n, o) => n + o.total, 0);
  const collected = store.payments.reduce((n, p) => n + p.amount, 0);
  const receivables = contracts.reduce((n, o) => n + Math.max(0, o.total - o.paid), 0);
  const repairCosts = store.repairs.reduce((n, r) => n + (r.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <article className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Tổng doanh thu hợp đồng</p>
          <p className="mt-3 text-2xl font-extrabold text-primary">{money(totalValue)}</p>
          <p className="mt-2 text-xs text-muted">Giá trị tất cả đơn thuê đã lập</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Thực thu qua các phiếu</p>
          <p className="mt-3 text-2xl font-extrabold text-emerald-600">{money(collected)}</p>
          <p className="mt-2 text-xs text-muted">Tiền mặt, CK và ví đã nhận</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Công nợ còn phải thu</p>
          <p className="mt-3 text-2xl font-extrabold text-amber-600">{money(receivables)}</p>
          <p className="mt-2 text-xs text-muted">Các đơn còn thiếu tiền</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Chi phí sửa chữa & bảo trì</p>
          <p className="mt-3 text-2xl font-extrabold text-rose-600">{money(repairCosts)}</p>
          <p className="mt-2 text-xs text-muted">Tổng chi từ các phiếu sửa máy</p>
        </article>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <h3 className="text-base font-extrabold">Thống kê theo phương thức thanh toán</h3>
          <div className="mt-4 space-y-3">
            {["Tiền mặt", "Chuyển khoản", "Ví khách hàng"].map((method) => {
              const amount = store.payments
                .filter((p) => p.method === method)
                .reduce((s, p) => s + p.amount, 0);
              const pct = collected > 0 ? Math.round((amount / collected) * 100) : 0;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-fg">{method}</span>
                    <span className="font-bold">{money(amount)} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <h3 className="text-base font-extrabold">Trạng thái hợp đồng thuê máy</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-2">
              <span className="text-muted">Đang hoạt động (ACTIVE):</span>
              <span className="font-bold text-indigo-700">
                {store.orders.filter((o) => o.status === "ACTIVE").length} đơn
              </span>
            </div>
            <div className="flex justify-between border-b border-line pb-2">
              <span className="text-muted">Chờ xác nhận (PENDING):</span>
              <span className="font-bold text-amber-600">
                {store.orders.filter((o) => o.status === "PENDING").length} đơn
              </span>
            </div>
            <div className="flex justify-between border-b border-line pb-2">
              <span className="text-muted">Quá hạn (EXPIRED):</span>
              <span className="font-bold text-rose-600">
                {store.orders.filter((o) => o.status === "EXPIRED").length} đơn
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted">Hoàn thành (COMPLETED):</span>
              <span className="font-bold text-emerald-600">
                {store.orders.filter((o) => o.status === "COMPLETED").length} đơn
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


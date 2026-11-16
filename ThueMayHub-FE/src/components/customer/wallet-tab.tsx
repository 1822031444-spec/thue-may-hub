import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, QrCode } from "lucide-react";
import { api, dateTimeLabel, errorText, money, toWalletRow, useHub, type Row, type WalletRow } from "@/lib/tmh-store";

const KIND: Record<string, string> = { DEPOSIT: "Nạp tiền vào ví", RENTAL_PAYMENT: "Thanh toán đơn thuê", REFUND: "Cửa hàng hoàn tiền", ADJUSTMENT: "Điều chỉnh" };
const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

type TopupInfo = {
  bank: { ready: boolean; bankName: string; accountNo: string; accountName: string };
  min: number;
  max: number;
  rows: Row[];
};

/** Số dư, nạp ví bằng chuyển khoản VietQR và lịch sử biến động ví của khách. */
export function WalletTab({ customerId }: { customerId: string }) {
  const store = useHub();
  const me = store.customers.find((c) => c.id === customerId)!;
  const [rows, setRows] = useState<WalletRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ rows: Row[] }>("/hub/wallet")
      .then((r) => setRows(r.rows.map(toWalletRow)))
      .catch((e) => setError(errorText(e)));
  }, [me.wallet]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl bg-primary p-6 text-primary-ink shadow-sm">
          <p className="text-xs font-bold tracking-widest text-indigo-100 uppercase">Số dư ví khả dụng</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">{money(me.wallet)}</p>
          <p className="mt-4 text-xs text-indigo-100">
            Ví dùng để thanh toán tiền thuê máy trực tiếp trong hệ thống mà không cần chuyển khoản từng đơn.
          </p>
        </article>
        <TopupCard customerCode={me.code} phone={me.phone} />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-extrabold">Lịch sử ví</h2>
          <p className="text-xs text-muted">Các lần nạp, trả đơn bằng ví và hoàn tiền về ví</p>
        </div>
        {error && <p className="px-5 py-4 text-sm font-bold text-rose-700">{error}</p>}
        {!rows && !error && <p className="px-5 py-4 text-sm text-muted">Đang tải…</p>}
        {rows && rows.length === 0 && <p className="px-5 py-6 text-sm text-muted">Ví chưa có giao dịch nào.</p>}
        {rows && rows.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {rows.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span>
                  <strong>{KIND[w.kind] ?? w.kind}</strong>
                  {w.orderCode && <span className="text-muted"> · đơn {w.orderCode}</span>}
                  <span className="block text-xs text-muted">{dateTimeLabel(w.at)} · {w.code}</span>
                </span>
                <span className={`font-extrabold ${w.change > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {w.change > 0 ? "+" : "−"}{money(Math.abs(w.change))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Nạp ví qua chuyển khoản: khách chọn số tiền → mã VietQR (app ngân hàng nào cũng quét
 * được, điền sẵn số tiền và nội dung) → chuyển xong bấm "Tôi đã chuyển khoản" → cửa hàng
 * đối chiếu sao kê rồi xác nhận, tiền mới vào ví. Trong lúc chờ, cứ 5 giây hỏi lại một lần
 * để số dư cập nhật ngay khi cửa hàng xác nhận.
 */
function TopupCard({ customerCode, phone }: { customerCode: string; phone: string }) {
  const [info, setInfo] = useState<TopupInfo | null>(null);
  const [amount, setAmount] = useState(100_000);
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);
  const watching = useRef<string | null>(null);
  const hotline = useHub((s) => s.shop.hotline);

  const pending = info?.rows.find((r) => r.status === "PENDING") ?? null;
  const recent = (info?.rows ?? []).filter((r) => r.status !== "PENDING").slice(0, 3);

  const load = useCallback(async () => {
    const next = await api<TopupInfo>("/customer/topups");
    // Yêu cầu đang theo dõi vừa được cửa hàng xử lý: báo khách và tải lại số dư.
    const id = watching.current;
    const done = id ? next.rows.find((r) => r.id === id && r.status !== "PENDING") : null;
    if (done?.status === "APPROVED") {
      useHub.setState({ toast: `Cửa hàng đã xác nhận: +${money(Number(done.received_amount) || Number(done.amount))} vào ví.` });
      await useHub.getState().refresh().catch(() => undefined);
    } else if (done?.status === "REJECTED") {
      useHub.setState({ toast: `Cửa hàng chưa xác nhận khoản nạp ${done.transfer_note}: ${done.admin_note}` });
    }
    watching.current = next.rows.find((r) => r.status === "PENDING")?.id ?? null;
    setInfo(next);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg([false, errorText(e)]));
  }, [load]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pending?.id, load]);

  const run = async (work: () => Promise<unknown>, ok = "") => {
    setBusy(true);
    try {
      await work();
      await load();
      setMsg([true, ok]);
    } catch (e) {
      setMsg([false, errorText(e)]);
    } finally {
      setBusy(false);
    }
  };

  if (!info) {
    return (
      <article className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-base font-extrabold">Nạp tiền vào ví</h3>
        <p className={`mt-2 text-sm ${msg[0] ? "text-muted" : "font-bold text-rose-700"}`}>{msg[1] || "Đang tải…"}</p>
      </article>
    );
  }

  if (!info.bank.ready && !pending) {
    return (
      <article className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-base font-extrabold">Nạp tiền vào ví</h3>
        <p className="mt-2 text-sm text-muted">
          Liên hệ quầy thu ngân{hotline ? ` hoặc hotline ${hotline}` : ""} để nạp tiền; nhân viên
          ghi nhận xong là số dư cập nhật ngay tại đây.
        </p>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-muted">
          Mã khách hàng: <strong className="text-fg">{customerCode}</strong> · Số điện thoại: <strong className="text-fg">{phone}</strong>
        </div>
      </article>
    );
  }

  if (pending) {
    const svg = String(pending.qr_svg || "");
    return (
      <article className="rounded-2xl border border-primary/30 bg-surface p-6 md:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">Quét mã để chuyển khoản</h3>
            <p className="mt-1 text-xs text-muted">Mở app ngân hàng → Quét QR. Số tiền và nội dung đã điền sẵn.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${pending.customer_paid_at ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
            {pending.customer_paid_at ? "Chờ cửa hàng xác nhận" : "Chờ bạn chuyển khoản"}
          </span>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-[13rem_1fr]">
          {svg && (
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
              alt={`Mã VietQR chuyển ${money(Number(pending.amount))}, nội dung ${pending.transfer_note}`}
              className="mx-auto size-52 rounded-xl border border-line bg-white p-1"
            />
          )}
          <dl className="grid content-start gap-2 text-sm">
            <Detail label="Ngân hàng" value={String(pending.bank_name)} />
            <Detail label="Số tài khoản" value={String(pending.bank_account_no)} copy />
            <Detail label="Chủ tài khoản" value={String(pending.bank_account_name)} />
            <Detail label="Số tiền" value={money(Number(pending.amount))} copy={String(pending.amount)} />
            <Detail label="Nội dung" value={String(pending.transfer_note)} copy strong />
            <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              Giữ đúng nội dung <strong>{pending.transfer_note}</strong> để cửa hàng nhận ra khoản của bạn. Tiền vào ví sau khi cửa hàng
              kiểm tra tài khoản và xác nhận.
            </p>
          </dl>
        </div>
        {msg[1] && <Note ok={msg[0]} text={msg[1]} />}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <button
            className="h-11 rounded-lg border border-line px-4 text-sm font-bold text-muted hover:text-fg disabled:opacity-60"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Huỷ yêu cầu nạp ${pending.transfer_note}? Nếu bạn đã chuyển tiền, đừng huỷ — hãy bấm "Tôi đã chuyển khoản".`)) return;
              void run(() => api(`/customer/topups/${pending.id}/cancel`, { method: "POST" }), "Đã huỷ yêu cầu nạp.");
            }}
          >
            Huỷ yêu cầu
          </button>
          {!pending.customer_paid_at ? (
            <button
              className="h-11 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60"
              disabled={busy}
              onClick={() => run(() => api(`/customer/topups/${pending.id}/paid`, { method: "POST" }), "Đã báo cửa hàng. Số dư sẽ cập nhật khi cửa hàng xác nhận.")}
            >
              Tôi đã chuyển khoản
            </button>
          ) : (
            <p className="self-center text-xs text-muted">Đã báo cửa hàng lúc {dateTimeLabel(String(pending.customer_paid_at))}.</p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-base font-extrabold">Nạp tiền vào ví</h3>
      <p className="mt-1 text-sm text-muted">Chuyển khoản qua mã QR tới {info.bank.bankName} của cửa hàng.</p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => api("/customer/topups", { method: "POST", body: { amount } }));
        }}
      >
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              className={`h-9 rounded-lg border px-3 text-xs font-bold transition ${amount === v ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:text-fg"}`}
              onClick={() => setAmount(v)}
            >
              {money(v)}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-sm font-bold">
          Số tiền nạp (đ)
          <input
            type="number"
            required
            min={info.min}
            max={info.max}
            step={1000}
            className="mt-2 h-11 w-full rounded-lg border border-line px-3"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <button
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60"
          disabled={busy}
        >
          <QrCode className="size-4" /> {busy ? "Đang tạo mã…" : "Tạo mã QR chuyển khoản"}
        </button>
      </form>
      {msg[1] && <Note ok={msg[0]} text={msg[1]} />}
      {recent.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
          {recent.map((r) => (
            <li key={String(r.id)}>
              {dateTimeLabel(String(r.created_at))} · {r.transfer_note} · {money(Number(r.amount))} ·{" "}
              {r.status === "APPROVED" ? (
                <span className="font-bold text-emerald-700">đã cộng {money(Number(r.received_amount) || Number(r.amount))}</span>
              ) : r.status === "REJECTED" ? (
                <span className="font-bold text-rose-700">không xác nhận: {r.admin_note}</span>
              ) : (
                <span>đã huỷ</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Detail({ label, value, copy, strong }: { label: string; value: string; copy?: boolean | string; strong?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`flex items-center gap-2 text-right ${strong ? "font-mono text-base font-extrabold text-primary" : "font-bold"}`}>
        {value}
        {copy && (
          <button
            type="button"
            className="text-muted hover:text-fg"
            aria-label={`Sao chép ${label.toLowerCase()}`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(typeof copy === "string" ? copy : value);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              } catch {
                /* Trình duyệt chặn sao chép thì khách tự gõ, không cần báo lỗi. */
              }
            }}
          >
            {copied ? <span className="text-[10px] font-bold text-emerald-700">Đã chép</span> : <Copy className="size-3.5" />}
          </button>
        )}
      </dd>
    </div>
  );
}

function Note({ ok, text }: { ok: boolean; text: string }) {
  return <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{text}</p>;
}

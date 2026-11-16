import { useState } from "react";
import { CONTACT_CHANNEL, HANDOVER_METHOD, dayPrice, money, useHub } from "@/lib/tmh-store";
import { FilterTabs } from "@/components/ui/filter-tabs";

/** Danh mục máy đang trống và hộp thoại gửi yêu cầu thuê. */
export function HomeTab({ onSent }: { onSent: () => void }) {
  const store = useHub();
  const [type, setType] = useState("all");
  const [pick, setPick] = useState<string | null>(null);
  const [days, setDays] = useState(3);
  const [note, setNote] = useState("");
  // Cửa hàng cần một số để liên hệ giao máy (gửi ID/mật khẩu UltraViewer qua Zalo…).
  // Điền sẵn số trong hồ sơ, khách sửa được nếu dùng số Zalo khác.
  const me = store.customers.find((c) => c.id === store.account?.customerId);
  const [contactPhone, setContactPhone] = useState(me?.phone ?? "");
  const [contactChannel, setContactChannel] = useState("ZALO");
  const [handoverMethod, setHandoverMethod] = useState("ULTRAVIEWER");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const all = store.devices.filter((d) => d.status === "AVAILABLE");
  const free = all.filter((d) => type === "all" || d.type === type);
  const picked = store.devices.find((d) => d.id === pick);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Thiết bị sẵn sàng ({free.length})</h2>
        <div className="-mb-4">
          <FilterTabs
            value={type}
            onChange={setType}
            tabs={[
              ["all", "Tất cả", all.length],
              ["PC", "PC", all.filter((d) => d.type === "PC").length],
              ["Boxphone", "Boxphone", all.filter((d) => d.type === "Boxphone").length],
            ]}
          />
        </div>
      </div>
      {free.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-muted">
          Hiện tại chưa có máy trống phù hợp. Vui lòng quay lại sau!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {free.map((d) => (
            <article key={d.id} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">{d.category}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{d.type}</span>
                </div>
                <h3 className="mt-2 text-base font-extrabold">{d.name}</h3>
                {d.specs && <p className="mt-1 text-xs text-muted">{d.specs}</p>}
                <p className="mt-1 text-xs text-muted">{d.location}</p>
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-lg font-extrabold text-primary">{money(d.monthly)}</p>
                  <span className="text-xs text-muted">/tháng</span>
                </div>
                <p className="mt-1 text-xs text-muted">Theo giờ: {money(d.hourly)}/h</p>
                <button
                  className="mt-4 h-10 w-full rounded-lg bg-primary px-3 text-sm font-bold text-primary-ink transition hover:opacity-95"
                  onClick={() => setPick(d.id)}
                >
                  Gửi yêu cầu thuê
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pick && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <form
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const error = await store.requestRental({ deviceId: pick, days, note, contactPhone, contactChannel, handoverMethod });
              setBusy(false);
              if (error) setErr(error);
              else {
                setErr("");
                setNote("");
                setPick(null);
                onSent();
              }
            }}
          >
            <h2 className="text-xl font-extrabold">Gửi yêu cầu thuê máy</h2>
            <p className="mt-1 text-xs text-muted">Máy: {picked?.name}</p>
            {err && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm font-bold text-rose-700">{err}</p>}
            <label className="mt-4 block text-sm font-bold">
              Số ngày thuê
              <input
                type="number"
                min={1}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
            <div className="mt-3 grid grid-cols-[1fr_9rem] gap-3">
              <label className="block text-sm font-bold">
                Số điện thoại / Zalo liên hệ
                <input
                  type="tel"
                  required
                  minLength={9}
                  maxLength={20}
                  className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                  value={contactPhone}
                  placeholder="0901234567"
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </label>
              <label className="block text-sm font-bold">
                Liên hệ qua
                <select
                  className="mt-2 block h-11 w-full rounded-lg border border-line bg-surface px-3"
                  value={contactChannel}
                  onChange={(e) => setContactChannel(e.target.value)}
                >
                  {Object.entries(CONTACT_CHANNEL).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm font-bold">
              Cách nhận máy
              <select
                className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3"
                value={handoverMethod}
                onChange={(e) => setHandoverMethod(e.target.value)}
              >
                {Object.entries(HANDOVER_METHOD).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code === "IN_STORE" || code === "OTHER" ? label : `Điều khiển từ xa qua ${label}`}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-muted">
                Cửa hàng gửi ID và mật khẩu truy cập máy qua số liên hệ ở trên khi giao máy.
              </span>
            </label>
            <label className="mt-3 block text-sm font-bold">
              Ghi chú thêm
              <input
                className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                value={note}
                placeholder="Yêu cầu cấu hình, thời gian nhận máy..."
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {picked && (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-muted">
                Tạm tính: <strong className="text-fg">{money(dayPrice(picked.monthly, days))}</strong> cho {Math.max(1, days)} ngày. Cửa hàng
                sẽ xác nhận giá chính thức khi duyệt yêu cầu.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 px-4 text-sm font-bold text-muted hover:text-fg"
                onClick={() => {
                  setPick(null);
                  setErr("");
                }}
              >
                Hủy
              </button>
              <button
                className="h-11 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

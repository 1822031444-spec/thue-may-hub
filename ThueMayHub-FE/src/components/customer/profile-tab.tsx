import { useState } from "react";
import { useHub } from "@/lib/tmh-store";

const box = "mt-2 h-11 w-full rounded-lg border border-line px-3 text-sm font-medium";

/** Sửa hồ sơ và đổi mật khẩu của khách. */
export function ProfileTab({ customerId }: { customerId: string }) {
  const store = useHub();
  const me = store.customers.find((c) => c.id === customerId)!;
  const [form, setForm] = useState({
    name: me.name, phone: me.phone, email: me.email, address: me.address ?? "", identityNumber: me.identityNumber ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [pwMsg, setPwMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);

  const labels: [keyof typeof form, string][] = [
    ["name", "Họ tên"], ["phone", "Số điện thoại"], ["email", "Email"], ["address", "Địa chỉ"], ["identityNumber", "CCCD"],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="rounded-xl border border-line bg-surface p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await store.completeProfile(form);
          setBusy(false);
          setMsg(err ? [false, err] : [true, "Đã lưu hồ sơ."]);
        }}
      >
        <h2 className="text-base font-extrabold">Thông tin cá nhân</h2>
        <p className="mt-1 text-xs text-muted">Mã khách hàng: {me.code}</p>
        {labels.map(([key, label]) => (
          <label key={key} className="mt-3 block text-sm font-bold">
            {label}
            <input
              className={box}
              required={key === "name" || key === "phone"}
              type={key === "email" ? "email" : "text"}
              pattern={key === "identityNumber" ? "\\d{9,12}" : undefined}
              title={key === "identityNumber" ? "9 đến 12 chữ số" : undefined}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        {msg[1] && <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${msg[0] ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg[1]}</p>}
        <button className="mt-4 h-11 w-full rounded-lg bg-primary text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60" disabled={busy}>
          Lưu hồ sơ
        </button>
      </form>

      <form
        className="h-fit rounded-xl border border-line bg-surface p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.next !== pw.confirm) {
            setPwMsg([false, "Mật khẩu nhập lại không khớp."]);
            return;
          }
          setBusy(true);
          const err = await store.changePassword(pw.current, pw.next);
          setBusy(false);
          setPwMsg(err ? [false, err] : [true, "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất."]);
          if (!err) setPw({ current: "", next: "", confirm: "" });
        }}
      >
        <h2 className="text-base font-extrabold">Đổi mật khẩu</h2>
        <p className="mt-1 text-xs text-muted">Mật khẩu mới ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.</p>
        {(["current", "next", "confirm"] as const).map((key) => (
          <label key={key} className="mt-3 block text-sm font-bold">
            {{ current: "Mật khẩu hiện tại", next: "Mật khẩu mới", confirm: "Nhập lại mật khẩu mới" }[key]}
            <input className={box} type="password" required minLength={key === "current" ? 1 : 10} value={pw[key]}
              onChange={(e) => setPw({ ...pw, [key]: e.target.value })} />
          </label>
        ))}
        {pwMsg[1] && <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${pwMsg[0] ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{pwMsg[1]}</p>}
        <button className="mt-4 h-11 w-full rounded-lg border border-line text-sm font-extrabold hover:bg-slate-50 disabled:opacity-60" disabled={busy}>
          Đổi mật khẩu
        </button>
      </form>
    </div>
  );
}

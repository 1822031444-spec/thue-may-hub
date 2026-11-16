import { useState } from "react";

export function ProfileGate({
  name,
  phone,
  email,
  onSave,
  onLogout,
}: {
  name: string;
  phone: string;
  email: string;
  onSave: (fields: { name: string; phone: string; email: string; address: string; identityNumber: string }) => Promise<string | null>;
  onLogout: () => void;
}) {
  const [form, setForm] = useState({ name, phone, email, address: "", identityNumber: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <form
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await onSave(form);
          setError(err || "");
          setBusy(false);
        }}
      >
        <p className="text-xs font-extrabold tracking-widest text-primary">HỒ SƠ KHÁCH</p>
        <h1 className="mt-2 text-2xl font-extrabold">Hoàn thiện thông tin</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          Bạn chưa vào được cổng thuê máy cho đến khi có họ tên và số điện thoại.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700">{error}</p>
        )}

        {(["name", "phone", "email", "address", "identityNumber"] as const).map((key) => {
          const labels = {
            name: "Họ tên",
            phone: "Số điện thoại",
            email: "Email",
            address: "Địa chỉ",
            identityNumber: "CCCD",
          };
          return (
            <label key={key} className="mb-3 block text-sm font-bold">
              {labels[key]}
              <input
                required={key === "name" || key === "phone"}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 text-sm font-medium"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          );
        })}

        <button
          className="mt-2 h-11 w-full rounded-lg bg-primary text-sm font-extrabold text-primary-ink hover:opacity-95 transition disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Đang lưu..." : "Lưu và vào cổng khách"}
        </button>
        <button
          type="button"
          className="mt-3 h-11 w-full text-sm font-bold text-muted hover:text-fg transition"
          onClick={onLogout}
        >
          Đăng xuất
        </button>
      </form>
    </main>
  );
}

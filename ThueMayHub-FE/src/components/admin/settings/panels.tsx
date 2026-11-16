import { useEffect, useState, type ReactNode } from "react";
import { api, dateTimeLabel, errorText, useHub, type Row } from "@/lib/tmh-store";
import { ghostBtn, mainBtn } from "@/components/ui/buttons";

/*
 * Các khối trong trang Cài đặt. Mỗi khối tự tải cấu hình của mình khi mở và lưu
 * thẳng qua API; quyền do server kiểm (chỉ chủ hệ thống mới gọi được các API này).
 */

const input = "mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-medium";
const labelCls = "block text-xs font-bold tracking-wide text-muted uppercase";

export function Panel({ title, hint, children, actions }: { title: string; hint?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-extrabold">{title}</h3>
          {hint && <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Note({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null;
  return <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{text}</p>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
      <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Gọi một API lưu/chạy, trả về câu báo kết quả để hiện ngay dưới khối. */
async function attempt(work: () => Promise<string>): Promise<[boolean, string]> {
  try {
    return [true, await work()];
  } catch (e) {
    return [false, errorText(e)];
  }
}

/* ---- Thông tin cửa hàng ---------------------------------------------------- */

export function ShopPanel() {
  const store = useHub();
  const [form, setForm] = useState(store.shop);
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm(store.shop);
  }, [store.shop]);

  const fields: [keyof typeof form, string, string][] = [
    ["name", "Tên cửa hàng", "Thuê Máy Hub"],
    ["address", "Địa chỉ", "Số nhà, đường, quận, thành phố"],
    ["hotline", "Hotline", "0901 000 001"],
    ["email", "Email hỗ trợ", "hotro@thuemayhub.com"],
    ["hours", "Giờ làm việc", "08:00 – 22:00 các ngày trong tuần"],
  ];

  return (
    <Panel title="Thông tin cửa hàng" hint="Hiện ở trang Hỗ trợ của cổng khách để khách biết cách liên hệ.">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await store.saveShop(form);
          setBusy(false);
          setMsg(err ? [false, err] : [true, "Đã lưu thông tin cửa hàng."]);
        }}
      >
        {fields.map(([key, label, placeholder]) => (
          <label key={key} className={key === "address" ? "sm:col-span-2" : ""}>
            <span className={labelCls}>{label}</span>
            <input className={input} value={form[key]} placeholder={placeholder} required={key === "name"}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button className={mainBtn} disabled={busy}>{busy ? "Đang lưu…" : "Lưu thông tin"}</button>
          <Note ok={msg[0]} text={msg[1]} />
        </div>
      </form>
    </Panel>
  );
}

/* ---- Nhận chuyển khoản (VietQR) -------------------------------------------- */

type BankSettings = { enabled: boolean; bin: string; bankName: string; accountNo: string; accountName: string; ready: boolean };

/** Tài khoản ngân hàng nhận tiền khách nạp ví. Mã QR của khách tạo theo đúng tài khoản này. */
export function BankPanel() {
  const [banks, setBanks] = useState<{ bin: string; name: string }[]>([]);
  const [form, setForm] = useState<BankSettings | null>(null);
  const [preview, setPreview] = useState("");
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);

  const apply = (d: { settings: BankSettings; banks: { bin: string; name: string }[] }) => {
    setBanks(d.banks);
    setForm(d.settings);
  };
  useEffect(() => {
    api<{ settings: BankSettings; banks: { bin: string; name: string }[] }>("/topups/bank").then(apply).catch((e) => setMsg([false, errorText(e)]));
  }, []);

  if (!form) return <Panel title="Nhận chuyển khoản"><p className="text-sm text-muted">{msg[1] || "Đang tải…"}</p></Panel>;

  return (
    <Panel
      title="Nhận chuyển khoản (VietQR)"
      hint="Khách nạp ví bằng cách quét mã QR tạo từ tài khoản này; app ngân hàng nào cũng quét được. Tiền chỉ vào ví khách khi bạn xác nhận ở trang Ví khách."
      actions={
        <button
          className={ghostBtn}
          disabled={busy || !form.bin || !form.accountNo}
          onClick={async () => {
            setBusy(true);
            setMsg(await attempt(async () => {
              const r = await api<{ qr_svg: string }>("/topups/bank/preview");
              setPreview(r.qr_svg);
              return "Quét thử mã bên dưới bằng app ngân hàng: phải hiện đúng ngân hàng, số tài khoản và tên chủ tài khoản.";
            }));
            setBusy(false);
          }}
        >
          Xem mã QR mẫu
        </button>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(await attempt(async () => {
            apply(await api("/topups/bank", { method: "PUT", body: { enabled: form.enabled, bin: form.bin, accountNo: form.accountNo, accountName: form.accountName } }));
            setPreview("");
            return form.enabled ? "Đã lưu. Khách đã thấy nút nạp ví bằng mã QR." : "Đã lưu. Nạp ví bằng mã QR đang tắt.";
          }));
          setBusy(false);
        }}
      >
        <div className="sm:col-span-2">
          <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Cho khách nạp ví bằng chuyển khoản qua mã QR" />
        </div>
        <label>
          <span className={labelCls}>Ngân hàng</span>
          <select className={input} value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })}>
            <option value="">— Chọn ngân hàng —</option>
            {banks.map((b) => (
              <option key={b.bin} value={b.bin}>{b.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Số tài khoản</span>
          <input className={input} value={form.accountNo} inputMode="numeric" placeholder="0123456789"
            onChange={(e) => setForm({ ...form, accountNo: e.target.value })} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelCls}>Tên chủ tài khoản</span>
          <input className={`${input} uppercase`} value={form.accountName} placeholder="NGUYEN VAN A"
            onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
          <span className="mt-1 block text-xs text-muted">Ghi đúng như trên thẻ/app ngân hàng; có dấu cũng được, hệ thống tự bỏ dấu.</span>
        </label>
        <div className="sm:col-span-2">
          <button className={mainBtn} disabled={busy}>{busy ? "Đang lưu…" : "Lưu tài khoản nhận"}</button>
          <Note ok={msg[0]} text={msg[1]} />
        </div>
      </form>
      {preview && (
        <img
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview)}`}
          alt="Mã QR mẫu của tài khoản nhận"
          className="mt-4 size-48 rounded-xl border border-line bg-white p-1"
        />
      )}
    </Panel>
  );
}

/* ---- Khoá mạng khi hết hạn --------------------------------------------------- */

type LockSettings = { enabled: boolean; autoLock: boolean; lockCommand: string; unlockCommand: string; graceMinutes: number; timeoutSeconds: number };

export function NetworkLockPanel() {
  const [data, setData] = useState<{ settings: LockSettings; due: Row[]; lockedCount: number; events: Row[] } | null>(null);
  const [form, setForm] = useState<LockSettings | null>(null);
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<{ settings: LockSettings; due: Row[]; lockedCount: number; events: Row[] }>("/network-lock")
      .then((d) => {
        setData(d);
        setForm(d.settings);
      })
      .catch((e) => setMsg([false, errorText(e)]));
  useEffect(() => {
    void load();
  }, []);

  if (!form || !data) return <Panel title="Khoá mạng khi hết hạn"><p className="text-sm text-muted">{msg[1] || "Đang tải…"}</p></Panel>;

  return (
    <Panel
      title="Khoá mạng khi hết hạn"
      hint="Mỗi phút hệ thống tìm máy có đơn đang thuê đã quá hạn quá thời gian ân hạn và chạy lệnh khoá. Lệnh chỉ được thay {ip} và {code}; giá trị sai khuôn thì từ chối chạy."
      actions={
        <button
          className={ghostBtn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(await attempt(async () => {
              const r = await api<{ locked: number; unlocked: number; failed: number; skipped: boolean }>("/network-lock/sweep", { method: "POST" });
              await load();
              return r.skipped ? "Cơ chế đang tắt nên không quét." : `Đã quét: khoá ${r.locked}, mở ${r.unlocked}, lỗi ${r.failed}.`;
            }));
            setBusy(false);
          }}
        >
          Quét ngay
        </button>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <p className="rounded-lg bg-slate-50 p-3 text-sm">Đang khoá: <strong>{data.lockedCount}</strong> máy</p>
        <p className="rounded-lg bg-slate-50 p-3 text-sm">Đến hạn khoá: <strong>{data.due.length}</strong> máy</p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(await attempt(async () => {
            await api("/network-lock/settings", { method: "PUT", body: form });
            await load();
            return "Đã lưu cấu hình khoá mạng.";
          }));
          setBusy(false);
        }}
      >
        <div className="flex flex-wrap gap-6">
          <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Bật cơ chế khoá mạng" />
          <Toggle checked={form.autoLock} onChange={(v) => setForm({ ...form, autoLock: v })} label="Tự khoá khi quá hạn" />
        </div>
        <label>
          <span className={labelCls}>Lệnh khoá</span>
          <input className={`${input} font-mono`} value={form.lockCommand} placeholder="netsh advfirewall firewall add rule name=lock-{code} dir=out action=block remoteip={ip}"
            onChange={(e) => setForm({ ...form, lockCommand: e.target.value })} />
        </label>
        <label>
          <span className={labelCls}>Lệnh mở</span>
          <input className={`${input} font-mono`} value={form.unlockCommand} placeholder="netsh advfirewall firewall delete rule name=lock-{code}"
            onChange={(e) => setForm({ ...form, unlockCommand: e.target.value })} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelCls}>Thời gian ân hạn (phút)</span>
            <input type="number" min={0} max={1440} className={input} value={form.graceMinutes}
              onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })} />
          </label>
          <label>
            <span className={labelCls}>Giới hạn chạy lệnh (giây)</span>
            <input type="number" min={5} max={120} className={input} value={form.timeoutSeconds}
              onChange={(e) => setForm({ ...form, timeoutSeconds: Number(e.target.value) })} />
          </label>
        </div>
        <div>
          <button className={mainBtn} disabled={busy}>{busy ? "Đang lưu…" : "Lưu cấu hình"}</button>
          <Note ok={msg[0]} text={msg[1]} />
        </div>
      </form>

      <h4 className="mt-6 mb-2 text-sm font-extrabold">Lệnh đã chạy gần đây</h4>
      {data.events.length === 0 ? (
        <p className="text-sm text-muted">Chưa chạy lệnh nào.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {data.events.slice(0, 10).map((ev) => (
            <li key={ev.id} className="px-4 py-2.5">
              <span className={`font-bold ${ev.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>
                {ev.action === "LOCK" ? "Khoá" : "Mở"} {ev.device_code}
              </span>
              <span className="text-xs text-muted"> · {ev.source === "AUTO" ? "tự động" : ev.admin_name || "thủ công"} · {dateTimeLabel(ev.created_at)}</span>
              <code className="mt-1 block truncate text-xs text-muted">{ev.command}</code>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---- Sao lưu ------------------------------------------------------------- */

type BackupStatus = {
  settings: { enabled: boolean; dir: string; intervalHours: number; keep: number };
  defaultDir: string; activeDir: string; lastAt: string; lastError: string;
  files: { name: string; size: number; createdAt: string }[];
};

export function BackupPanel() {
  const [data, setData] = useState<BackupStatus | null>(null);
  const [form, setForm] = useState<BackupStatus["settings"] | null>(null);
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);

  const apply = (d: BackupStatus) => {
    setData(d);
    setForm(d.settings);
  };
  useEffect(() => {
    api<BackupStatus>("/backups").then(apply).catch((e) => setMsg([false, errorText(e)]));
  }, []);

  if (!data || !form) return <Panel title="Sao lưu dữ liệu"><p className="text-sm text-muted">{msg[1] || "Đang tải…"}</p></Panel>;

  return (
    <Panel
      title="Sao lưu dữ liệu"
      hint={`Bản sao nhất quán của database, lưu tại ${data.activeDir}. Lần gần nhất: ${data.lastAt ? dateTimeLabel(data.lastAt) : "chưa có"}.`}
      actions={
        <button
          className={mainBtn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(await attempt(async () => {
              const r = await api<{ name: string }>("/backups", { method: "POST" });
              apply(await api<BackupStatus>("/backups"));
              return `Đã sao lưu: ${r.name}`;
            }));
            setBusy(false);
          }}
        >
          Sao lưu ngay
        </button>
      }
    >
      {data.lastError && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Lỗi lần trước: {data.lastError}</p>}
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(await attempt(async () => {
            apply(await api<BackupStatus>("/backups/settings", { method: "PUT", body: form }));
            return "Đã lưu lịch sao lưu.";
          }));
          setBusy(false);
        }}
      >
        <div className="sm:col-span-2">
          <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Tự động sao lưu theo lịch" />
        </div>
        <label>
          <span className={labelCls}>Mỗi bao nhiêu giờ</span>
          <input type="number" min={1} max={720} className={input} value={form.intervalHours}
            onChange={(e) => setForm({ ...form, intervalHours: Number(e.target.value) })} />
        </label>
        <label>
          <span className={labelCls}>Giữ lại số bản gần nhất</span>
          <input type="number" min={1} max={200} className={input} value={form.keep}
            onChange={(e) => setForm({ ...form, keep: Number(e.target.value) })} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelCls}>Thư mục lưu (để trống = mặc định)</span>
          <input className={input} value={form.dir} placeholder={data.defaultDir} onChange={(e) => setForm({ ...form, dir: e.target.value })} />
        </label>
        <div className="sm:col-span-2">
          <button className={mainBtn} disabled={busy}>{busy ? "Đang lưu…" : "Lưu lịch sao lưu"}</button>
          <Note ok={msg[0]} text={msg[1]} />
        </div>
      </form>

      <h4 className="mt-6 mb-2 text-sm font-extrabold">Các bản sao lưu ({data.files.length})</h4>
      {data.files.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản sao lưu nào.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {data.files.slice(0, 8).map((f) => (
            <li key={f.name} className="flex justify-between gap-3 px-4 py-2.5">
              <code className="truncate text-xs">{f.name}</code>
              <span className="whitespace-nowrap text-xs text-muted">{(f.size / 1024).toFixed(0)} KB · {dateTimeLabel(f.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---- Telegram ------------------------------------------------------------ */

type TelegramStatus = {
  settings: { enabled: boolean; token: string; chatId: string; hour: number; days: number };
  hasToken: boolean; lastSentAt: string; lastError: string;
};

export function TelegramPanel() {
  const [data, setData] = useState<TelegramStatus | null>(null);
  const [form, setForm] = useState({ enabled: false, token: "", chatId: "", hour: 8, days: 3 });
  const [msg, setMsg] = useState<[boolean, string]>([true, ""]);
  const [busy, setBusy] = useState(false);

  const apply = (d: TelegramStatus) => {
    setData(d);
    setForm({ ...d.settings, token: "" });
  };
  useEffect(() => {
    api<TelegramStatus>("/telegram").then(apply).catch((e) => setMsg([false, errorText(e)]));
  }, []);

  if (!data) return <Panel title="Nhắc hạn qua Telegram"><p className="text-sm text-muted">{msg[1] || "Đang tải…"}</p></Panel>;

  return (
    <Panel
      title="Nhắc hạn qua Telegram"
      hint={`Mỗi ngày gửi cho chủ tiệm danh sách đơn sắp hết hạn. Lần gửi gần nhất: ${data.lastSentAt ? dateTimeLabel(data.lastSentAt) : "chưa có"}.`}
      actions={
        <button
          className={ghostBtn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(await attempt(async () => {
              await api("/telegram/test", { method: "POST", body: { token: form.token, chatId: form.chatId } });
              return "Đã gửi tin thử. Kiểm tra Telegram của bạn.";
            }));
            setBusy(false);
          }}
        >
          Gửi thử
        </button>
      }
    >
      {data.lastError && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Lỗi lần trước: {data.lastError}</p>}
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(await attempt(async () => {
            apply(await api<TelegramStatus>("/telegram/settings", { method: "PUT", body: form }));
            return "Đã lưu cấu hình Telegram.";
          }));
          setBusy(false);
        }}
      >
        <div className="sm:col-span-2">
          <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Bật nhắc hằng ngày" />
        </div>
        <label>
          <span className={labelCls}>Token của bot</span>
          <input className={input} value={form.token} placeholder={data.hasToken ? `Đã lưu (${data.settings.token}) — để trống để giữ` : "123456:ABC..."}
            onChange={(e) => setForm({ ...form, token: e.target.value })} />
        </label>
        <label>
          <span className={labelCls}>Chat id nơi nhận</span>
          <input className={input} value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })} />
        </label>
        <label>
          <span className={labelCls}>Gửi lúc (giờ trong ngày)</span>
          <input type="number" min={0} max={23} className={input} value={form.hour} onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })} />
        </label>
        <label>
          <span className={labelCls}>Nhắc trước bao nhiêu ngày</span>
          <input type="number" min={1} max={60} className={input} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} />
        </label>
        <div className="sm:col-span-2">
          <button className={mainBtn} disabled={busy}>{busy ? "Đang lưu…" : "Lưu cấu hình"}</button>
          <Note ok={msg[0]} text={msg[1]} />
        </div>
      </form>
    </Panel>
  );
}

/* ---- Nhật ký thao tác ---------------------------------------------------- */

const ACTION: Record<string, string> = {
  CREATE: "Tạo", UPDATE: "Sửa", DELETE: "Xoá", STATUS: "Đổi trạng thái", PAYMENT: "Thu tiền", REFUND: "Hoàn tiền",
  DEPOSIT: "Nạp ví", RENEW: "Gia hạn", APPROVE: "Duyệt", REJECT: "Từ chối", REPLY: "Trả lời", LOGIN: "Đăng nhập",
  CHANGE_PASSWORD: "Đổi mật khẩu", BACKUP: "Sao lưu", RESET_PASSWORD: "Đặt lại mật khẩu",
};

export function AuditPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ rows: Row[]; total: number }>("/audit-logs?limit=50")
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e) => setError(errorText(e)));
  }, []);

  return (
    <Panel title="Nhật ký thao tác" hint={`Ai đã làm gì, lúc nào. Hiện 50 dòng mới nhất trên tổng ${total}.`}>
      {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
      {!rows && !error && <p className="text-sm text-muted">Đang tải…</p>}
      {rows && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
              <span>
                <strong>{r.admin_name || "Hệ thống"}</strong> · {ACTION[r.action] ?? r.action} {String(r.entity_type).toLowerCase()}
                {r.detail && <span className="block text-xs text-muted">{r.detail}</span>}
              </span>
              <span className="text-xs whitespace-nowrap text-muted">{dateTimeLabel(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

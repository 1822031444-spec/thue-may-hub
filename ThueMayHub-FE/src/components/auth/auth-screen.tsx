import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, Shield, User } from "lucide-react";
import { useHub } from "@/lib/tmh-store";

export function AuthScreen() {
  const store = useHub();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = mode === "login";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      const err = mode === "login"
        ? await store.login(identity, password)
        : await store.register(identity, email, password);
      if (err) setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-ink lg:flex">
        <div className="flex items-center gap-3 text-lg font-extrabold">
          <span className="grid size-9 place-items-center rounded-lg bg-white/20">H</span>
          <span>Thuê Máy Hub</span>
        </div>
        <div>
          <p className="text-xs font-extrabold tracking-[0.2em] text-indigo-100">NỀN TẢNG QUẢN LÝ & THUÊ MÁY</p>
          <h1 className="mt-4 max-w-md text-5xl font-extrabold leading-tight tracking-tight">
            Một tài khoản. Đúng không gian.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-indigo-100">
            Thuê máy tính và Boxphone, theo dõi đơn thuê, thanh toán và hỗ trợ ở cùng một nơi.
          </p>
          <ul className="mt-8 space-y-3 text-sm font-semibold text-indigo-50">
            <li className="flex items-center gap-2">
              <Shield className="size-4" /> Dữ liệu tách biệt theo tài khoản
            </li>
            <li className="flex items-center gap-2">
              <Shield className="size-4" /> Trạng thái cập nhật trong cùng hệ thống
            </li>
          </ul>
        </div>
        <p className="text-xs text-indigo-100">© 2026 Thuê Máy Hub</p>
      </section>

      <section className="flex items-center justify-center px-5 py-16">
        <form className="w-full max-w-md" onSubmit={handleSubmit}>
          <div className="mb-5 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
            <Lock className="size-5" />
          </div>
          <p className="text-xs font-extrabold tracking-widest text-primary">THUÊ MÁY HUB</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
            {login ? "Đăng nhập tài khoản" : "Đăng ký khách hàng"}
          </h2>
          <p className="mt-2 mb-6 text-sm leading-6 text-muted">
            {login ? "Đăng nhập để tiếp tục." : "Tạo tài khoản để thuê máy và theo dõi đơn."}
          </p>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`h-11 rounded-lg text-sm font-extrabold transition ${
                login ? "bg-surface text-primary shadow-sm" : "text-muted"
              }`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`h-11 rounded-lg text-sm font-extrabold transition ${
                !login ? "bg-surface text-primary shadow-sm" : "text-muted"
              }`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Đăng ký
            </button>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700">{error}</p>
          )}

          <label className="mb-4 block text-sm font-bold">
            {login ? "Tài khoản" : "Số điện thoại"}
            <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-primary">
              {login ? <User className="size-4 text-muted" /> : <Phone className="size-4 text-muted" />}
              <input
                className="w-full border-0 bg-transparent text-sm outline-none"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                required
                autoComplete={login ? "username" : "tel"}
                placeholder={login ? "Nhập tài khoản" : "0901234567"}
              />
            </span>
          </label>

          {!login && (
            <label className="mb-4 block text-sm font-bold">
              Email
              <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-primary">
                <Mail className="size-4 text-muted" />
                <input
                  type="email"
                  className="w-full border-0 bg-transparent text-sm outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                />
              </span>
            </label>
          )}

          <label className="mb-4 block text-sm font-bold">
            Mật khẩu
            <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-primary">
              <Lock className="size-4 text-muted" />
              <input
                type={show ? "text" : "password"}
                className="w-full border-0 bg-transparent text-sm outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label="Hiện mật khẩu"
                className="text-muted hover:text-fg"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          {!login && (
            <label className="mb-4 block text-sm font-bold">
              Xác nhận mật khẩu
              <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-primary">
                <Lock className="size-4 text-muted" />
                <input
                  type="password"
                  className="w-full border-0 bg-transparent text-sm outline-none"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu"
                />
              </span>
            </label>
          )}

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-extrabold text-primary-ink hover:opacity-95 transition"
            disabled={busy}
          >
            {busy ? "Đang xử lý..." : login ? "Đăng nhập" : "Tạo tài khoản khách"}
          </button>
        </form>
      </section>
    </div>
  );
}


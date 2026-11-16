/** Nút nhỏ trong cột "Thao tác" của các bảng, dùng chung để các màn nhìn giống nhau. */
const base = "h-8 rounded-md px-2.5 text-xs font-bold whitespace-nowrap transition disabled:opacity-50";

export const rowBtn = {
  primary: `${base} bg-primary text-primary-ink hover:opacity-95`,
  ghost: `${base} border border-line text-fg hover:bg-slate-50`,
  muted: `${base} border border-line text-muted hover:text-fg`,
  danger: `${base} border border-rose-200 text-rose-700 hover:bg-rose-50`,
};

/** Nút lớn trên đầu mục (thêm mới, lưu cấu hình…). */
export const mainBtn =
  "inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-extrabold text-primary-ink transition hover:opacity-95 disabled:opacity-60";
export const ghostBtn =
  "inline-flex h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-bold text-fg transition hover:bg-slate-50 disabled:opacity-60";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Hộp thoại xem chi tiết (không phải form): chi tiết khách, hội thoại hỗ trợ, lịch sử kho… */
export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-label={title}
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-surface shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-muted hover:text-fg">
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </section>
    </div>
  );
}

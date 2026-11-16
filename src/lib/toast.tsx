import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastValue = {
  /** Thông báo kết quả một thao tác. Lỗi ở lại lâu hơn vì thường cần đọc kỹ. */
  push: (kind: ToastKind, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  /** Rút gọn cho khối catch: lấy message của Error, nếu không có thì dùng câu dự phòng. */
  fromError: (error: unknown, fallback: string) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = nextId.current++;
    setToasts((items) => [...items.slice(-3), { id, kind, title, description }]);
    window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
  }, [dismiss]);

  const value = useMemo<ToastValue>(() => ({
    push,
    success: (title, description) => push('success', title, description),
    error: (title, description) => push('error', title, description),
    fromError: (error, fallback) => push('error', error instanceof Error ? error.message : fallback),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            // Báo lỗi phải cắt ngang lời trình đọc màn hình đang đọc dở, còn báo
            // thành công thì chờ tới lượt là được.
            <div
              className={`toast ${toast.kind}`}
              key={toast.id}
              role={toast.kind === 'error' ? 'alert' : undefined}
            >
              <Icon />
              <div>
                <strong>{toast.title}</strong>
                {toast.description && <p>{toast.description}</p>}
              </div>
              <button onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('ToastProvider is missing');
  return value;
}

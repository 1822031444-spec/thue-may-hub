import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Info, LoaderCircle, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, type ComponentType, type ReactNode } from 'react';

/* ---- Tải & trạng thái rỗng ---------------------------------------------- */

export function LoadingScreen({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="brand-mark">TM</div>
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: rows }, (_, index) => <i className="skeleton" key={index} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: ComponentType<{ size?: number }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

/**
 * Tải hỏng khác hẳn chưa có dữ liệu. Báo "Chưa có khách hàng" khi thật ra là mất
 * kết nối sẽ làm người dùng tưởng mất sạch dữ liệu, nên mọi trang dùng chung
 * trạng thái này và luôn kèm nút thử lại.
 */
export function ErrorState({ onRetry, description = 'Có thể do mất kết nối tới server. Dữ liệu của bạn vẫn còn nguyên.' }: {
  onRetry: () => void;
  description?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Không tải được dữ liệu"
      description={description}
      action={
        <button className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={14} /> Thử lại
        </button>
      }
    />
  );
}

/* ---- Bố cục trang -------------------------------------------------------- */

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  );
}

export function Panel({ eyebrow, title, icon: Icon, action, children, className = '' }: {
  eyebrow?: string;
  title?: string;
  icon?: ComponentType<{ size?: number }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <div>
            {eyebrow && <span>{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          {action}
          {Icon && !action && <Icon size={18} />}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---- Điều khiển ---------------------------------------------------------- */

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count != null && <b>{option.count}</b>}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm…' }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Xoá tìm kiếm">
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function Field({ label, hint, required, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}{required && <i className="field-req">*</i>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/* ---- Thông báo trong trang ----------------------------------------------- */

export function Notice({ type = 'success', children }: { type?: 'success' | 'error' | 'info'; children: ReactNode }) {
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;
  return (
    <div className={`notice ${type}`}>
      <Icon />
      <span>{children}</span>
    </div>
  );
}

export function Callout({ icon: Icon = Info, children }: { icon?: ComponentType<{ size?: number }>; children: ReactNode }) {
  return (
    <div className="callout">
      <Icon />
      <span>{children}</span>
    </div>
  );
}

/* ---- Modal ---------------------------------------------------------------- */

/** Những thứ nhận được focus bằng phím Tab, dùng để giữ tiêu điểm trong hộp thoại. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type=hidden])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Modal({ open, title, description, children, onClose, wide, busy }: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  /** Đang gửi dữ liệu: khoá mọi đường đóng để không ai bỏ dở giữa chừng rồi
   *  không biết yêu cầu đã chạy hay chưa. */
  busy?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const descId = useId();

  // Nhiều nơi truyền `onClose` dạng arrow inline, mỗi lần cha vẽ lại là một hàm
  // mới. Giữ qua ref để effect dưới chỉ phụ thuộc `open`, không thì con trỏ bị
  // nhảy về trường đầu mỗi lần gõ phím.
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useEffect(() => {
    if (!open) return undefined;

    const requestClose = () => {
      if (!latest.current.busy) latest.current.onClose();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      // Bẫy tiêu điểm: Tab tới cuối thì vòng về đầu, đừng để lọt ra nền sau lưng.
      const list = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((node) => node.offsetParent !== null);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? panel.current.contains(active) : false;

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Nhớ nơi đang đứng để lúc đóng trả con trỏ về đúng nút đã mở hộp thoại.
    opener.current = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKey);
    // Nền trang không được cuộn phía sau modal, nếu không sẽ mất vị trí đang xem.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Đưa con trỏ vào trường đầu tiên để điền liền bằng bàn phím.
    const focusTarget = panel.current?.querySelector<HTMLElement>(
      'input:not([type=hidden]), select, textarea, button.btn-primary',
    );
    focusTarget?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const requestClose = () => { if (!busy) onClose(); };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      // Chỉ đóng khi cả lúc nhấn lẫn lúc nhả đều ở nền: kéo bôi đen chữ trong
      // form rồi nhả chuột ra ngoài không được làm mất nội dung đang nhập.
      // (Trình duyệt phát `click` ở nút cha chung, nên chỉ kiểm tra target là chưa đủ.)
      onMouseDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedBackdrop.current) requestClose();
        pressedBackdrop.current = false;
      }}
    >
      <section
        ref={panel}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descId}>{description}</p>}
          </div>
          <button className="icon-btn" onClick={requestClose} disabled={busy} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ConfirmModal({ open, title, description, confirmLabel = 'Xác nhận', danger, busy, onConfirm, onClose }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} busy={busy}>
      <div className="modal-body">
        <div className="callout">
          <AlertTriangle />
          <span>{description}</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Huỷ</button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---- Badge trạng thái ------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  RESERVED: 'Đã giữ chỗ',
  RENTED: 'Đang thuê',
  MAINTENANCE: 'Bảo trì',
  OFFLINE: 'Mất kết nối',
  RETIRED: 'Ngừng dùng',
  ACTIVE: 'Hoạt động',
  LIMITED: 'Hạn chế',
  BLOCKED: 'Đã khoá',
  COMPLETED: 'Hoàn tất',
  EXPIRED: 'Quá hạn',
  CANCELLED: 'Đã huỷ',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  OPEN: 'Đang mở',
  WAITING_CUSTOMER: 'Chờ khách',
  RESOLVED: 'Đã xử lý',
  CLOSED: 'Đã đóng',
  REPORTED: 'Báo hỏng',
  IN_PROGRESS: 'Đang sửa',
  DONE: 'Đã sửa xong',
  UNREPAIRABLE: 'Không sửa được',
};

const STATUS_TONES: Record<string, string> = {
  AVAILABLE: 'ok',
  RESERVED: 'info',
  RENTED: 'accent',
  MAINTENANCE: 'warn',
  OFFLINE: 'danger',
  RETIRED: 'neutral',
  ACTIVE: 'accent',
  LIMITED: 'warn',
  BLOCKED: 'danger',
  COMPLETED: 'ok',
  EXPIRED: 'danger',
  CANCELLED: 'neutral',
  PENDING: 'warn',
  APPROVED: 'ok',
  REJECTED: 'danger',
  OPEN: 'accent',
  WAITING_CUSTOMER: 'warn',
  RESOLVED: 'ok',
  CLOSED: 'neutral',
  REPORTED: 'warn',
  IN_PROGRESS: 'violet',
  DONE: 'ok',
  UNREPAIRABLE: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge tone-${STATUS_TONES[status] || 'neutral'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

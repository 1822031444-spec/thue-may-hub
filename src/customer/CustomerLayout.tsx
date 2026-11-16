import {
  Bell, ChevronRight, ClipboardList, Headphones, KeyRound, LayoutDashboard, LogOut, MonitorSmartphone,
  Moon, PackageCheck, Sun, WalletCards,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api, dateTime, initials, money } from '../api';
import { Field, Modal } from '../components/UI';
import { useTheme } from '../lib/theme';
import { useToast } from '../lib/toast';
import type { CustomerNotification } from '../types';
import { useCustomerAuth } from './CustomerAuth';

const NAV = [
  { to: '/portal', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/portal/catalog', label: 'Thuê thiết bị', icon: MonitorSmartphone },
  { to: '/portal/bookings', label: 'Yêu cầu', icon: ClipboardList },
  { to: '/portal/rentals', label: 'Đơn thuê', icon: PackageCheck },
  { to: '/portal/support', label: 'Hỗ trợ', icon: Headphones },
];

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { customer, refresh, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div className="portal">
      <aside className="portal-side">
        <Link className="portal-side-brand" to="/">
          <span className="brand-mark">TM</span>
          <div>
            <strong>Thuê Máy Hub</strong>
            <small>Cổng khách hàng</small>
          </div>
        </Link>

        <div className="wallet-card">
          <div><WalletCards /><span>Số dư khả dụng</span></div>
          <strong>{money(customer?.walletBalance || 0)}</strong>
          <small>{customer?.code}</small>
        </div>

        <nav>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="portal-side-foot">
          <div className="avatar">{initials(customer?.name)}</div>
          <div>
            <strong>{customer?.name}</strong>
            <span>{customer?.email}</span>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất"><LogOut /></button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-top">
          <div className="portal-top-greeting">
            <span>Xin chào,</span>
            <strong>{customer?.name}</strong>
          </div>
          <div className="portal-top-tools">
            <button
              className="icon-btn"
              onClick={toggle}
              title={resolved === 'dark' ? 'Nền sáng' : 'Nền tối'}
              aria-label={resolved === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
            >
              {resolved === 'dark' ? <Sun /> : <Moon />}
            </button>
            <NotificationBell unread={customer?.unreadNotifications || 0} onChanged={refresh} />
            <AccountMenu
              name={customer?.name || ''}
              email={customer?.email || ''}
              onChangePassword={() => setPasswordOpen(true)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        <main className="portal-content">{children}</main>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

/**
 * Menu tài khoản nằm trên thanh trên cùng chứ không phải chân sidebar, vì chân
 * sidebar bị ẩn trên màn hình điện thoại — để ở đó thì khách dùng điện thoại
 * không có chỗ đăng xuất.
 */
function AccountMenu({ name, email, onChangePassword, onLogout }: {
  name: string;
  email: string;
  onChangePassword: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} style={{ position: 'relative' }}>
      <button
        className="portal-avatar-button"
        onClick={() => setOpen(!open)}
        aria-label="Tài khoản của bạn"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials(name)}
      </button>

      {open && (
        <div className="menu-pop" style={{ right: 0, top: 'calc(100% + 8px)' }}>
          <div className="menu-head">
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
          <button onClick={() => { setOpen(false); onChangePassword(); }}>
            <KeyRound /> Đổi mật khẩu
          </button>
          <hr />
          <button className="danger" onClick={onLogout}><LogOut /> Đăng xuất</button>
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('newPassword') !== data.get('confirmPassword')) {
      toast.error('Xác nhận mật khẩu mới chưa khớp.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/customer/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: data.get('currentPassword'),
          newPassword: data.get('newPassword'),
        }),
      });
      form.reset();
      toast.success('Đã đổi mật khẩu.', 'Các thiết bị khác đã bị đăng xuất.');
      onClose();
    } catch (err) {
      toast.fromError(err, 'Không đổi được mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Đổi mật khẩu" description="Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại.">
      <form className="modal-form" onSubmit={submit}>
        <Field label="Mật khẩu hiện tại" required>
          <input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="Mật khẩu mới" required hint="Ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.">
          <input name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
        </Field>
        <Field label="Nhập lại mật khẩu mới" required>
          <input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NotificationBell({ unread, onChanged }: { unread: number; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [marking, setMarking] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setNotifications(await api<CustomerNotification[]>('/customer/notifications'));
    } catch {
      /* Thông báo lỗi thì phần còn lại của cổng vẫn dùng được bình thường. */
    }
  };
  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const readAll = async () => {
    if (marking) return;
    setMarking(true);
    try {
      await api('/customer/notifications/read-all', { method: 'POST' });
      setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      await onChanged();
    } catch (err) {
      toast.fromError(err, 'Không đánh dấu được thông báo đã đọc.');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div ref={wrapper} style={{ position: 'relative' }}>
      <button
        className="icon-btn bell"
        onClick={() => setOpen(!open)}
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell />
        {unread > 0 && <b>{unread}</b>}
      </button>

      {open && (
        <div className="notif-pop">
          <header>
            <div>
              <strong>Thông báo</strong>
              <span>{unread} chưa đọc</span>
            </div>
            {unread > 0 && (
              <button onClick={readAll} disabled={marking}>
                {marking ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
              </button>
            )}
          </header>
          <div className="notif-list">
            {notifications.length ? notifications.map((item) => (
              <Link
                to={item.link || '/portal'}
                key={item.id}
                className={item.read_at ? '' : 'unread'}
                onClick={() => setOpen(false)}
              >
                <i />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <span>{dateTime(item.created_at)}</span>
                </div>
              </Link>
            )) : <p className="notif-empty">Chưa có thông báo nào.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

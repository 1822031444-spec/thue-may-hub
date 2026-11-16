import {
  Banknote, Boxes, ChevronsLeft, ChevronsRight, Gauge, Globe, Headphones, LogOut, Menu,
  MonitorSmartphone, Moon, PanelsTopLeft, ReceiptText, Search, Settings, Sun, Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api, initials } from '../api';
import { useAuth } from '../App';
import { openCommandPalette } from '../lib/commandBus';
import { isDesktop } from '../lib/desktop';
import { ROLE_LABELS, type Permission } from '../lib/permissions';
import { useTheme } from '../lib/theme';
import type { DashboardData, ServiceDeskOverview } from '../types';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
  /** Huy hiệu đỏ: việc khách đang chờ mình xử lý. */
  badge?: boolean;
  /** Huy hiệu vàng: máy đang nằm xưởng. */
  repairBadge?: boolean;
  /** Chỉ hiện với tài khoản có quyền này. */
  permission?: Permission;
};

const NAV: NavItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: Gauge, end: true },
  { to: '/admin/customers', label: 'Khách hàng', icon: Boxes },
  { to: '/admin/devices', label: 'Kho thiết bị', icon: MonitorSmartphone },
  { to: '/admin/rentals', label: 'Đơn thuê', icon: ReceiptText },
  { to: '/admin/repairs', label: 'Sửa chữa', icon: Wrench, repairBadge: true },
  { to: '/admin/finance', label: 'Tài chính', icon: Banknote, permission: 'finance.view' },
  { to: '/admin/service-desk', label: 'Yêu cầu & hỗ trợ', icon: Headphones, badge: true },
  { to: '/admin/settings', label: 'Cài đặt & nhật ký', icon: Settings },
];

const TITLES: Record<string, { kicker: string; title: string }> = {
  '/admin': { kicker: 'Trung tâm điều hành', title: 'Tổng quan vận hành' },
  '/admin/customers': { kicker: 'CRM nội bộ', title: 'Khách hàng' },
  '/admin/devices': { kicker: 'Tài sản vận hành', title: 'Kho thiết bị' },
  '/admin/rentals': { kicker: 'Vòng đời dịch vụ', title: 'Đơn thuê' },
  '/admin/repairs': { kicker: 'Bảo trì tài sản', title: 'Sửa chữa & linh kiện' },
  '/admin/finance': { kicker: 'Sổ tiền quản trị', title: 'Tài chính' },
  '/admin/service-desk': { kicker: 'Customer service desk', title: 'Yêu cầu & hỗ trợ' },
  '/admin/settings': { kicker: 'Bảo mật & kiểm soát', title: 'Cài đặt hệ thống' },
};

const MINI_KEY = 'thuemay.sidebar.mini';

export function AppLayout({ children }: { children: ReactNode }) {
  const { admin, can, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mini, setMini] = useState(() => localStorage.getItem(MINI_KEY) === '1');
  const [pending, setPending] = useState(0);
  const [openRepairs, setOpenRepairs] = useState(0);

  // Số việc đang chờ xử lý hiển thị ngay trên menu để không phải mở trang mới biết.
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const [desk, dashboard] = await Promise.all([
          // Chỉ cần con số đếm, không cần dòng nào — xin đúng 1 dòng cho nhẹ.
          api<ServiceDeskOverview>('/service-desk/overview?limit=1'),
          api<DashboardData>('/dashboard'),
        ]);
        if (cancelled) return;
        // Dùng số server đếm. Đếm từ mảng trả về thì quá ngưỡng phân trang là
        // huy hiệu báo thiếu việc, mà người dùng lại tin vào nó.
        setPending(desk.pending.bookings + desk.pending.extensions + desk.pending.tickets);
        setOpenRepairs(dashboard.openRepairs);
      } catch {
        /* Không lấy được thì giữ nguyên số cũ, menu vẫn dùng được. */
      }
    };
    void read();
    const timer = window.setInterval(read, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [location.pathname]);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const toggleMini = () => {
    setMini((value) => {
      localStorage.setItem(MINI_KEY, value ? '0' : '1');
      return !value;
    });
  };

  const heading = TITLES[location.pathname] || { kicker: 'Thuê Máy', title: 'Bảng điều khiển' };

  return (
    <div className={`shell ${mini ? 'mini' : ''}`}>
      {drawerOpen && <button className="scrim" onClick={() => setDrawerOpen(false)} aria-label="Đóng menu" />}

      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">TM</div>
          <div>
            <strong>Thuê Máy</strong>
            <span>Operations Hub</span>
          </div>
        </div>

        <div className="nav-label">Vận hành</div>
        <nav>
          {NAV.filter((item) => !item.permission || can(item.permission)).map(({ to, label, icon: Icon, end, badge, repairBadge }) => {
            const count = badge ? pending : repairBadge ? openRepairs : 0;
            return (
              <NavLink key={to} to={to} end={end} title={mini ? label : undefined}>
                <Icon size={17} />
                <span>{label}</span>
                {count > 0 && <b className={`nav-count ${repairBadge ? 'warn' : ''}`}>{count}</b>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-note"><i /> Hệ thống đang hoạt động</div>
          <UserMenu
            name={admin?.name || ''}
            email={admin?.email || ''}
            role={admin ? ROLE_LABELS[admin.role] : ''}
            onLogout={async () => { await logout(); navigate('/login'); }}
          />
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Mở menu"><Menu /></button>

          <button
            className="icon-btn"
            onClick={toggleMini}
            title={mini ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-label={mini ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {mini ? <ChevronsRight /> : <ChevronsLeft />}
          </button>

          <div className="topbar-title">
            <span>{heading.kicker}</span>
            <strong>{heading.title}</strong>
          </div>

          <div className="topbar-actions">
            {!isDesktop && (
              <>
                <button className="icon-btn" onClick={openCommandPalette} title="Bảng lệnh (Ctrl K)" aria-label="Mở bảng lệnh">
                  <Search />
                </button>
                <button
                  className="icon-btn"
                  onClick={toggle}
                  title={resolved === 'dark' ? 'Nền sáng' : 'Nền tối'}
                  aria-label={resolved === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
                >
                  {resolved === 'dark' ? <Sun /> : <Moon />}
                </button>
              </>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({ name, email, role, onLogout }: { name: string; email: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const { preference, setPreference } = useTheme();
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
        className="user-card"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="avatar">{initials(name)}</div>
        <div>
          <strong>{name}</strong>
          <span className="truncate">{email}</span>
        </div>
        <PanelsTopLeft />
      </button>

      {open && (
        <div className="menu-pop" style={{ bottom: 'calc(100% + 6px)', left: 0, right: 0 }}>
          <div className="menu-head">
            <strong>{name}</strong>
            <span>{email}</span>
            {role && <span className="chip" style={{ marginTop: 5 }}>{role}</span>}
          </div>
          <div className="menu-theme">
            {(['light', 'dark', 'system'] as const).map((value) => (
              <button key={value} onClick={() => setPreference(value)}>
                {value === 'light' ? <Sun /> : value === 'dark' ? <Moon /> : <Globe />}
                {value === 'light' ? 'Nền sáng' : value === 'dark' ? 'Nền tối' : 'Theo hệ thống'}
                {preference === value && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>•</span>}
              </button>
            ))}
          </div>
          <hr />
          <button className="danger" onClick={onLogout}><LogOut /> Đăng xuất</button>
        </div>
      )}
    </div>
  );
}

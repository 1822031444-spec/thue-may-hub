import {
  Banknote, Boxes, CornerDownLeft, Gauge, Headphones, LogOut, Maximize2, Minimize2, Minus,
  MonitorSmartphone, Moon, Plus, ReceiptText, Search, Settings, Sun, Wrench, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { onOpenCommandPalette, openCommandPalette } from '../lib/commandBus';
import type { Permission } from '../lib/permissions';
import { closeWindow, isDesktop, minimizeWindow, onMaximizeChange, readMaximized, toggleMaximizeWindow } from '../lib/desktop';
import { useTheme } from '../lib/theme';

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ size?: number }>;
  run: () => void;
  /** Lệnh chỉ hiện với tài khoản có quyền tương ứng. */
  permission?: Permission;
};

/**
 * Khung bao quanh toàn bộ app: thanh tiêu đề cửa sổ (chỉ bản desktop) và
 * command palette. Cả hai nằm ngoài router nên có mặt ở mọi trang.
 */
export function AppChrome() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { admin } = useAuth();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => onOpenCommandPalette(() => setPaletteOpen(true)), []);

  // Đăng xuất xong thì palette không còn lệnh nào hợp lệ.
  useEffect(() => {
    if (!admin) setPaletteOpen(false);
  }, [admin]);

  return (
    <>
      {isDesktop && <TitleBar canSearch={Boolean(admin)} />}
      {paletteOpen && admin && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

/* ---- Thanh tiêu đề cửa sổ ------------------------------------------------ */

function TitleBar({ canSearch }: { canSearch: boolean }) {
  const { resolved, toggle } = useTheme();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void readMaximized().then(setMaximized);
    return onMaximizeChange(setMaximized);
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <div className="brand-mark sm">TM</div>
        Thuê Máy <em>Operations</em>
      </div>
      {canSearch && (
        <>
          <div className="titlebar-sep" />
          <button className="titlebar-search" onClick={openCommandPalette}>
            <Search />
            Tìm trang hoặc thao tác
            <kbd>Ctrl K</kbd>
          </button>
        </>
      )}
      <div className="titlebar-tools">
        <button className="icon-btn" onClick={toggle} title={resolved === 'dark' ? 'Chuyển nền sáng' : 'Chuyển nền tối'}>
          {resolved === 'dark' ? <Sun /> : <Moon />}
        </button>
      </div>
      <div className="window-controls">
        <button onClick={minimizeWindow} aria-label="Thu nhỏ"><Minus /></button>
        <button onClick={toggleMaximizeWindow} aria-label={maximized ? 'Khôi phục' : 'Phóng to'}>
          {maximized ? <Minimize2 /> : <Maximize2 />}
        </button>
        <button className="close" onClick={closeWindow} aria-label="Đóng"><X /></button>
      </div>
    </div>
  );
}

/* ---- Command palette ------------------------------------------------------ */

function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { can, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string, action?: string) => () => navigate(path, action ? { state: { action } } : undefined);
    return [
      { id: 'dashboard', group: 'Điều hướng', label: 'Tổng quan', icon: Gauge, run: go('/admin') },
      { id: 'customers', group: 'Điều hướng', label: 'Khách hàng', icon: Boxes, run: go('/admin/customers') },
      { id: 'devices', group: 'Điều hướng', label: 'Kho thiết bị', icon: MonitorSmartphone, run: go('/admin/devices') },
      { id: 'rentals', group: 'Điều hướng', label: 'Đơn thuê', icon: ReceiptText, run: go('/admin/rentals') },
      { id: 'repairs', group: 'Điều hướng', label: 'Sửa chữa & linh kiện', icon: Wrench, run: go('/admin/repairs') },
      { id: 'finance', group: 'Điều hướng', label: 'Tài chính', icon: Banknote, run: go('/admin/finance'), permission: 'finance.view' },
      { id: 'desk', group: 'Điều hướng', label: 'Yêu cầu & hỗ trợ', icon: Headphones, run: go('/admin/service-desk') },
      { id: 'settings', group: 'Điều hướng', label: 'Cài đặt & nhật ký', icon: Settings, run: go('/admin/settings') },

      { id: 'new-customer', group: 'Thao tác nhanh', label: 'Thêm khách hàng', hint: 'Mở form hồ sơ mới', icon: Plus, run: go('/admin/customers', 'create') },
      { id: 'new-device', group: 'Thao tác nhanh', label: 'Thêm thiết bị', hint: 'Nhập PC hoặc boxphone mới', icon: Plus, run: go('/admin/devices', 'create') },
      { id: 'new-rental', group: 'Thao tác nhanh', label: 'Tạo đơn thuê', hint: 'Chọn khách và thiết bị', icon: Plus, run: go('/admin/rentals', 'create') },
      { id: 'new-repair', group: 'Thao tác nhanh', label: 'Tạo phiếu sửa chữa', hint: 'Ghi máy hỏng cần sửa', icon: Plus, run: go('/admin/repairs', 'create') },
      { id: 'new-expense', group: 'Thao tác nhanh', label: 'Ghi chi phí', hint: 'Điện, mặt bằng, thuê nhà…', icon: Plus, run: go('/admin/finance', 'create'), permission: 'finance.expense' },

      {
        id: 'theme',
        group: 'Hệ thống',
        label: resolved === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối',
        icon: resolved === 'dark' ? Sun : Moon,
        run: toggle,
      },
      {
        id: 'logout',
        group: 'Hệ thống',
        label: 'Đăng xuất',
        icon: LogOut,
        run: () => { void logout().then(() => navigate('/login')); },
      },
    ];
  }, [navigate, logout, resolved, toggle]);

  const results = useMemo(() => {
    const allowed = commands.filter((command) => !command.permission || can(command.permission));
    const key = query.trim().toLowerCase();
    if (!key) return allowed;
    return allowed.filter((command) => `${command.label} ${command.group} ${command.hint || ''}`.toLowerCase().includes(key));
  }, [commands, query, can]);

  // Con trỏ có thể trỏ ra ngoài danh sách sau khi lọc.
  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // Esc gắn ở ô nhập là không đủ: bấm chuột vào danh sách là tiêu điểm rời ô,
  // lúc đó Esc không còn đóng được bảng lệnh nữa.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const runAt = (index: number) => {
    const command = results[index];
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') return onClose();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      return setCursor((value) => (Math.min(value, results.length - 1) + 1) % Math.max(results.length, 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      return setCursor((value) => (Math.min(value, results.length - 1) - 1 + results.length) % Math.max(results.length, 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      return runAt(active);
    }
    return undefined;
  };

  let lastGroup = '';

  return (
    <div className="palette-backdrop" onMouseDown={onClose} role="presentation">
      <div className="palette" role="dialog" aria-modal="true" aria-label="Bảng lệnh" onMouseDown={(event) => event.stopPropagation()}>
        <div className="palette-input">
          <Search />
          <input
            autoFocus
            value={query}
            placeholder="Nhập tên trang hoặc thao tác…"
            onChange={(event) => { setQuery(event.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {results.length ? results.map((command, index) => {
            const showGroup = command.group !== lastGroup;
            lastGroup = command.group;
            const Icon = command.icon;
            return (
              <div key={command.id}>
                {showGroup && <div className="palette-group">{command.group}</div>}
                <button
                  className={`palette-item ${index === active ? 'active' : ''}`}
                  onMouseMove={() => setCursor(index)}
                  onClick={() => runAt(index)}
                >
                  <Icon />
                  <strong>{command.label}</strong>
                  {command.hint && <small>{command.hint}</small>}
                </button>
              </div>
            );
          }) : <div className="palette-empty">Không có lệnh nào khớp “{query}”.</div>}
        </div>
        <div className="palette-foot">
          <span><b>↑</b><b>↓</b> di chuyển</span>
          <span><b><CornerDownLeft size={9} /></b> chọn</span>
          <span><b>Esc</b> đóng</span>
        </div>
      </div>
    </div>
  );
}

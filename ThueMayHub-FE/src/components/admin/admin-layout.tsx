import { useEffect, useState } from "react";
import {
  Bell,
  Box,
  Calendar,
  ChevronDown,
  KeyRound,
  LifeBuoy,
  CreditCard,
  LayoutGrid,
  LogOut,
  Monitor,
  Plus,
  Settings,
  Shield,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  currentAccount,
  useHub,
  type Account,
  type Page,
  type Role,
} from "@/lib/tmh-store";
import { useLiveTickets } from "@/lib/use-live-tickets";
import { Toast } from "@/components/ui/toast";
import { ActionModal, type ModalType } from "@/components/admin/modals/action-modal";
import { OverviewView } from "@/components/admin/views/overview-view";
import { DevicesView } from "@/components/admin/views/devices-view";
import { CustomersView } from "@/components/admin/views/customers-view";
import { OrdersView } from "@/components/admin/views/orders-view";
import { PaymentsView } from "@/components/admin/views/payments-view";
import { RepairsView } from "@/components/admin/views/repairs-view";
import { WalletsView } from "@/components/admin/views/wallets-view";
import { StaffView } from "@/components/admin/views/staff-view";
import { ReportsView } from "@/components/admin/views/reports-view";
import { PartsView } from "@/components/admin/views/parts-view";
import { SettingsView } from "@/components/admin/views/settings-view";
import { SupportView } from "@/components/admin/views/support-view";
import { NoticeMenu } from "@/components/admin/notice-menu";

const staffPages: Page[] = ["overview", "devices", "customers", "orders", "payments", "repairs", "support"];

const nav: { key: Page; label: string; group: string; adminOnly?: boolean }[] = [
  { key: "overview", label: "Dashboard", group: "Không gian làm việc" },
  { key: "devices", label: "Máy", group: "Không gian làm việc" },
  { key: "customers", label: "Khách hàng", group: "Không gian làm việc" },
  { key: "orders", label: "Đơn thuê", group: "Không gian làm việc" },
  { key: "payments", label: "Thanh toán", group: "Vận hành" },
  { key: "repairs", label: "Sửa chữa", group: "Vận hành" },
  { key: "support", label: "Hỗ trợ khách", group: "Vận hành" },
  { key: "wallets", label: "Ví khách", group: "Tài chính", adminOnly: true },
  { key: "parts", label: "Linh kiện", group: "Tài chính", adminOnly: true },
  { key: "staff", label: "Nhân viên", group: "Hệ thống", adminOnly: true },
  { key: "reports", label: "Báo cáo", group: "Hệ thống", adminOnly: true },
  { key: "settings", label: "Cài đặt", group: "Hệ thống", adminOnly: true },
];

function IconFor({ page, className = "size-5" }: { page: Page; className?: string }) {
  const map = {
    overview: LayoutGrid,
    devices: Monitor,
    customers: Users,
    orders: Box,
    payments: CreditCard,
    repairs: Wrench,
    support: LifeBuoy,
    wallets: Wallet,
    parts: Box,
    staff: Shield,
    reports: Calendar,
    settings: Settings,
  };
  const Cmp = map[page];
  return <Cmp className={className} />;
}

export function AdminLayout({ account }: { account: Account }) {
  const store = useHub();
  const [page, setPage] = useState<Page>("overview");
  const [query, setQuery] = useState("");
  // Tab mở sẵn khi chuyển sang trang Cài đặt (ví dụ bấm "Khai báo tài khoản nhận" ở trang Ví khách).
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<null | { type: ModalType; context?: string }>(null);
  const openModal = (type: ModalType, context?: string) => setModal({ type, context });

  // Khách gửi yêu cầu từ cổng khách thì quầy thấy trong vòng 20 giây, không cần tải lại trang.
  useEffect(() => {
    const timer = window.setInterval(() => {
      useHub.getState().refresh().catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, []);
  // Tin nhắn hỗ trợ của khách thì hỏi riêng mỗi 5 giây để báo ngay.
  useLiveTickets();
  const [menu, setMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const go = (next: Page) => {
    if (next !== "settings") setSettingsTab(undefined);
    setPage(next);
    setQuery("");
    setMenu(false);
  };

  const role = account.role as Role;
  const allowed = nav.filter((item) => role === "Admin" || (!item.adminOnly && staffPages.includes(item.key)));
  const visiblePage = allowed.some((item) => item.key === page) ? page : "overview";

  const titles: Record<Page, [string, string]> = {
    overview: ["Tổng quan vận hành", "Nắm bắt mọi hoạt động của cửa hàng trong một nơi."],
    devices: ["Quản lý máy", "Theo dõi tình trạng và giá thuê thiết bị."],
    customers: ["Khách hàng", "Thông tin khách hàng, ví và lịch sử thuê máy."],
    orders: ["Đơn thuê", "Theo dõi và xử lý các đơn thuê của cửa hàng."],
    payments: ["Thanh toán", "Ghi nhận các khoản thu theo đơn thuê."],
    repairs: ["Sửa chữa", "Quản lý phiếu bảo trì và sửa chữa thiết bị."],
    support: ["Hỗ trợ khách hàng", "Trả lời các yêu cầu hỗ trợ khách gửi từ cổng khách."],
    wallets: ["Ví khách hàng", "Số dư ví, xác nhận khách nạp qua chuyển khoản. Nạp và hoàn tiền chỉ dành cho quản trị."],
    parts: ["Linh kiện", "Tồn kho phục vụ sửa chữa."],
    staff: ["Nhân viên", "Tài khoản nội bộ được cấp, không đăng ký công khai."],
    reports: ["Báo cáo", "Doanh thu và thực thu. Chỉ quản trị viên."],
    settings: ["Cài đặt", "Cửa hàng, nhận chuyển khoản, khoá mạng, sao lưu, Telegram và nhật ký thao tác."],
  };

  const action =
    visiblePage === "devices"
      ? (["Thêm máy", "device"] as const)
      : visiblePage === "customers"
      ? (["Thêm khách hàng", "customer"] as const)
      : visiblePage === "orders" || visiblePage === "overview"
      ? (["Tạo đơn thuê", "order"] as const)
      : visiblePage === "payments"
      ? (["Thu tiền", "payment"] as const)
      : visiblePage === "repairs"
      ? (["Tạo phiếu sửa", "repair"] as const)
      : visiblePage === "parts"
      ? (["Thêm linh kiện", "part"] as const)
      : visiblePage === "staff"
      ? (["Thêm nhân viên", "staff"] as const)
      : null;

  const nameOf = (id: string) => store.customers.find((c) => c.id === id)?.name || id;
  const deviceOf = (id: string) => store.devices.find((d) => d.id === id)?.name || id;

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Sidebar */}
      <aside
        className={`${
          menu ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition md:static md:translate-x-0`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-line px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-ink">
            H
          </span>
          <span>
            <strong className="block text-sm">Thuê Máy Hub</strong>
            <small className="text-[11px] tracking-widest text-muted uppercase">Quản lý cửa hàng</small>
          </span>
        </div>

        <nav className="flex-1 overflow-auto px-3 py-4">
          {["Không gian làm việc", "Vận hành", "Tài chính", "Hệ thống"].map((group) => {
            const items = allowed.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mb-5">
                <div className="px-3 pb-2 text-[10px] font-extrabold tracking-widest text-muted uppercase">
                  {group}
                </div>
                {items.map((item) => (
                  <button
                    key={item.key}
                    className={`mb-1 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${
                      visiblePage === item.key
                        ? "bg-primary-soft text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => go(item.key)}
                  >
                    <IconFor page={item.key} />
                    <span className="flex-1">{item.label}</span>
                    {item.key === "orders" && store.orders.some((o) => o.status === "PENDING") && (
                      <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800" title="Yêu cầu thuê chờ duyệt">
                        {store.orders.filter((o) => o.status === "PENDING").length}
                      </span>
                    )}
                    {item.key === "wallets" && store.topups.some((t) => t.status === "PENDING") && (
                      <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800" title="Yêu cầu nạp ví chờ xác nhận">
                        {store.topups.filter((t) => t.status === "PENDING").length}
                      </span>
                    )}
                    {item.key === "repairs" && (
                      <span className="rounded bg-slate-100 px-1.5 text-[10px] font-bold">
                        {store.repairs.filter((r) => r.open).length}
                      </span>
                    )}
                    {item.key === "support" && store.tickets.some((t) => t.status === "OPEN") && (
                      <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800" title="Yêu cầu hỗ trợ cần trả lời">
                        {store.tickets.filter((t) => t.status === "OPEN").length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <button
            className="mb-3 flex h-11 w-full items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
            onClick={store.logout}
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-ink">
              {account.name.split(" ").slice(-1)[0]?.[0]}
            </span>
            <span>
              <strong className="block text-xs">{account.name}</strong>
              <small className="text-muted">{role === "Admin" ? "Quản trị viên" : "Nhân viên"}</small>
            </span>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {menu && (
        <button
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          aria-label="Đóng menu"
          onClick={() => setMenu(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4 md:px-8">
          <div className="flex items-center gap-3 text-sm text-muted">
            <button
              className="grid size-10 place-items-center rounded-lg md:hidden"
              onClick={() => setMenu(true)}
              aria-label="Mở menu"
            >
              <LayoutGrid className="size-5" />
            </button>
            <span>{role === "Admin" ? "Khu vực quản trị" : "Khu vực nhân viên"}</span>
            <span>/</span>
            <strong className="text-fg">{nav.find((n) => n.key === visiblePage)?.label}</strong>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <NoticeMenu go={go} icon={<Bell className="size-5" />} />
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50"
                onClick={() => setProfileMenu((v) => !v)}
                aria-label="Tài khoản"
              >
                <span className="grid size-8 place-items-center rounded-full bg-primary text-xs text-primary-ink">
                  {account.name
                    .split(" ")
                    .slice(-2)
                    .map((w) => w[0])
                    .join("")}
                </span>
                <span className="hidden sm:inline">{account.name}</span>
                <ChevronDown className="size-4 text-muted" />
              </button>
              {profileMenu && (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg" onMouseLeave={() => setProfileMenu(false)}>
                  <p className="px-3 py-2 text-xs text-muted">
                    {account.username} · {role === "Admin" ? "Quản trị viên" : "Nhân viên"}
                  </p>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setProfileMenu(false);
                      openModal("password");
                    }}
                  >
                    <KeyRound className="size-4" /> Đổi mật khẩu
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                    onClick={store.logout}
                  >
                    <LogOut className="size-4" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-widest text-primary uppercase">Bảng điều khiển</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{titles[visiblePage][0]}</h1>
              <p className="mt-1 text-sm text-muted">{titles[visiblePage][1]}</p>
            </div>
            {action && (
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-extrabold text-primary-ink hover:opacity-95 transition"
                onClick={() => openModal(action[1])}
              >
                <Plus className="size-4" />
                {action[0]}
              </button>
            )}
          </div>

          {/* Render Views */}
          {visiblePage === "overview" && <OverviewView nameOf={nameOf} deviceOf={deviceOf} onAction={openModal} go={go} />}
          {visiblePage === "devices" && <DevicesView query={query} setQuery={setQuery} onAction={openModal} />}
          {visiblePage === "customers" && <CustomersView query={query} setQuery={setQuery} onAction={openModal} />}
          {visiblePage === "orders" && <OrdersView query={query} setQuery={setQuery} onAction={openModal} />}
          {visiblePage === "payments" && <PaymentsView query={query} setQuery={setQuery} />}
          {visiblePage === "repairs" && <RepairsView query={query} setQuery={setQuery} onAction={openModal} />}
          {visiblePage === "support" && <SupportView query={query} setQuery={setQuery} />}
          {visiblePage === "wallets" && role === "Admin" && (
            <WalletsView
              query={query}
              setQuery={setQuery}
              onAction={openModal}
              onOpenBankSettings={() => {
                setSettingsTab("bank");
                go("settings");
              }}
            />
          )}
          {visiblePage === "staff" && role === "Admin" && <StaffView query={query} setQuery={setQuery} onAction={openModal} />}
          {visiblePage === "reports" && role === "Admin" && <ReportsView />}
          {visiblePage === "parts" && role === "Admin" && <PartsView onAction={openModal} />}
          {visiblePage === "settings" && role === "Admin" && <SettingsView key={settingsTab ?? "shop"} initialTab={settingsTab} onAction={openModal} />}
        </div>
      </main>

      {/* Action Modal */}
      {modal && <ActionModal type={modal.type} context={modal.context} onClose={() => setModal(null)} />}

      {/* Global Toast */}
      {store.toast && <Toast text={store.toast} onClose={store.clearToast} />}
    </div>
  );
}


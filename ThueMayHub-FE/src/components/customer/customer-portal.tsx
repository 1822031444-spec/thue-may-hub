import { useEffect, useState } from "react";
import { useHub, type CustomerTab } from "@/lib/tmh-store";
import { useLiveTickets } from "@/lib/use-live-tickets";
import { HomeTab } from "@/components/customer/home-tab";
import { OrdersTab } from "@/components/customer/orders-tab";
import { WalletTab } from "@/components/customer/wallet-tab";
import { SupportTab } from "@/components/customer/support-tab";
import { ProfileTab } from "@/components/customer/profile-tab";
import { NoticeBell } from "@/components/customer/notice-bell";
import { Toast } from "@/components/ui/toast";

export function CustomerPortal({
  customerId,
  tab,
  setTab,
  onLogout,
}: {
  customerId: string;
  tab: CustomerTab;
  setTab: (t: CustomerTab) => void;
  onLogout: () => void;
}) {
  const store = useHub();
  const me = store.customers.find((c) => c.id === customerId)!;
  const waiting = store.orders.filter((o) => o.status === "PENDING").length;
  const replies = store.tickets.filter((t) => t.status === "WAITING_CUSTOMER").length;

  // Cửa hàng duyệt yêu cầu, trả lời hỗ trợ thì khách thấy trong vòng 30 giây.
  useEffect(() => {
    const timer = window.setInterval(() => {
      useHub.getState().refresh().catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  // Tin nhắn hỗ trợ và thông báo thì hỏi riêng mỗi 5 giây.
  useLiveTickets();

  const links: [CustomerTab, string, number][] = [
    ["home", "Máy trống", 0],
    ["orders", "Đơn của tôi", waiting],
    ["wallet", "Ví tiền", 0],
    ["support", "Hỗ trợ", replies],
    ["profile", "Hồ sơ", 0],
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-ink">
            H
          </span>
          <strong className="text-base font-extrabold">{store.shop.name || "Thuê Máy Hub"}</strong>
        </div>
        <nav className="flex gap-2 overflow-auto text-sm font-bold">
          {links.map(([key, label, count]) => (
            <button
              key={key}
              className={`flex h-10 items-center gap-1.5 px-3 transition ${
                tab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-fg"
              }`}
              onClick={() => setTab(key)}
            >
              {label}
              {count > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">{count}</span>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <NoticeBell />
          <button
            className="text-sm font-bold text-rose-700 hover:text-rose-800 transition"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Xin chào, {me.name}</h1>
            <p className="text-sm text-muted">Chào mừng bạn quay trở lại cổng dịch vụ khách hàng.</p>
          </div>
        </div>

        {tab === "home" && <HomeTab onSent={() => setTab("orders")} />}
        {tab === "orders" && <OrdersTab customerId={customerId} />}
        {tab === "wallet" && <WalletTab customerId={customerId} />}
        {tab === "support" && <SupportTab customerId={customerId} />}
        {tab === "profile" && <ProfileTab customerId={customerId} />}
      </main>

      {store.toast && <Toast text={store.toast} onClose={store.clearToast} />}
    </div>
  );
}

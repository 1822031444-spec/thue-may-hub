import { useEffect, useState } from "react";
import { currentAccount, useHub, type CustomerTab } from "@/lib/tmh-store";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ProfileGate } from "@/components/auth/profile-gate";
import { CustomerPortal } from "@/components/customer/customer-portal";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Toast } from "@/components/ui/toast";

export default function HubApp() {
  const store = useHub();
  const account = currentAccount(store);
  const [customerTab, setCustomerTab] = useState<CustomerTab>("home");

  // Hỏi server xem trình duyệt này đang đăng nhập ai (cookie phiên do server giữ).
  useEffect(() => {
    void useHub.getState().init();
  }, []);

  // 0. Đang kiểm tra phiên đăng nhập
  if (store.status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-bg">
        <div className="flex items-center gap-3 text-sm font-bold text-muted">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-ink">H</span>
          Đang tải Thuê Máy Hub…
        </div>
      </main>
    );
  }

  // 1. Màn hình xác thực (Đăng nhập / Đăng ký)
  if (!account) {
    return (
      <>
        <AuthScreen />
        {store.toast && <Toast text={store.toast} onClose={store.clearToast} />}
      </>
    );
  }

  const customer = store.customers.find((c) => c.id === account.customerId);

  // 2. Chặn khách hàng chưa hoàn thiện hồ sơ bắt buộc
  if (account.role === "Customer" && customer && !customer.profileComplete) {
    return (
      <ProfileGate
        name={customer.name}
        phone={customer.phone}
        email={customer.email}
        onSave={store.completeProfile}
        onLogout={store.logout}
      />
    );
  }

  // 3. Cổng thông tin khách hàng (Customer Portal)
  if (account.role === "Customer" && customer) {
    return (
      <CustomerPortal
        customerId={customer.id}
        tab={customerTab}
        setTab={setCustomerTab}
        onLogout={store.logout}
      />
    );
  }

  // 4. Khu vực vận hành Admin / Nhân viên (Staff Dashboard)
  return <AdminLayout account={account} />;
}

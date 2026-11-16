import { ShieldOff } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import type { Admin } from './types';
import { AppChrome } from './components/AppChrome';
import { AppLayout } from './components/AppLayout';
import { EmptyState, LoadingScreen } from './components/UI';
import { isDesktop } from './lib/desktop';
import { can, type Permission } from './lib/permissions';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { DevicesPage } from './pages/DevicesPage';
import { RentalsPage } from './pages/RentalsPage';
import { FinancePage } from './pages/FinancePage';
import { RepairsPage } from './pages/RepairsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ServiceDeskPage } from './pages/ServiceDeskPage';
import { CustomerAuthProvider, useCustomerAuth } from './customer/CustomerAuth';
import { CustomerLayout } from './customer/CustomerLayout';
import { CustomerAccessPage } from './customer/CustomerAccessPage';
import { CustomerHomePage } from './customer/CustomerHomePage';
import { CatalogPage } from './customer/CatalogPage';
import { CustomerBookingsPage } from './customer/CustomerBookingsPage';
import { CustomerRentalsPage } from './customer/CustomerRentalsPage';
import { CustomerSupportPage } from './customer/CustomerSupportPage';

type AuthContextValue = {
  admin: Admin | null;
  loading: boolean;
  /** Tài khoản đang đăng nhập có quyền này không. Server vẫn kiểm tra lại. */
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthContext is missing');
  return value;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setAdmin(await api<Admin>('/auth/me'));
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAdmin(null);
  };

  const value: AuthContextValue = {
    admin,
    loading,
    can: (permission) => can(admin?.role, permission),
    refresh,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Chặn cả đường gõ thẳng địa chỉ, không chỉ ẩn mục trên menu. Server vẫn từ chối
 * mọi yêu cầu thiếu quyền; đây chỉ để người dùng thấy lời giải thích tử tế thay
 * vì một trang trống kèm thông báo lỗi.
 */
function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can: allowed } = useAuth();
  if (allowed(permission)) return <>{children}</>;
  return (
    <EmptyState
      icon={ShieldOff}
      title="Bạn không có quyền xem mục này"
      description="Khu vực này dành riêng cho chủ hệ thống. Nếu bạn cần dùng, hãy nhờ chủ cấp quyền cho tài khoản của bạn."
      action={<Link className="btn btn-secondary" to="/admin">Về trang Tổng quan</Link>}
    />
  );
}

function ProtectedApp() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen label="Đang mở trung tâm điều hành…" />;
  if (!admin) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <AppLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="rentals" element={<RentalsPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route
          path="finance"
          element={<RequirePermission permission="finance.view"><FinancePage /></RequirePermission>}
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="service-desk" element={<ServiceDeskPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppLayout>
  );
}

function ProtectedCustomerApp() {
  const { customer, loading } = useCustomerAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!customer) return <Navigate to="/portal/login" replace state={{ from: location }} />;
  return (
    <CustomerLayout>
      <Routes>
        <Route index element={<CustomerHomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="bookings" element={<CustomerBookingsPage />} />
        <Route path="rentals" element={<CustomerRentalsPage />} />
        <Route path="support" element={<CustomerSupportPage />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </CustomerLayout>
  );
}

export default function App() {
  useEffect(() => {
    document.body.classList.toggle('is-desktop', isDesktop);
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <AppChrome />
            <Routes>
              {/* Bản desktop là công cụ vận hành nội bộ nên vào thẳng khu quản trị,
                  website giới thiệu chỉ phục vụ khách truy cập qua trình duyệt. */}
              <Route path="/" element={isDesktop ? <Navigate to="/admin" replace /> : <LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/*" element={<ProtectedApp />} />
              <Route path="/portal/login" element={<CustomerAccessPage mode="login" />} />
              <Route path="/portal/register" element={<CustomerAccessPage mode="register" />} />
              <Route path="/portal/*" element={<ProtectedCustomerApp />} />
            </Routes>
          </CustomerAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

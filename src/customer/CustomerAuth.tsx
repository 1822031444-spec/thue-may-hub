import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { PortalCustomer } from '../types';

type CustomerAuthValue = {
  customer: PortalCustomer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

export function useCustomerAuth() {
  const value = useContext(CustomerAuthContext);
  if (!value) throw new Error('CustomerAuthContext is missing');
  return value;
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try { setCustomer(await api<PortalCustomer>('/customer/auth/me')); }
    catch { setCustomer(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const logout = async () => {
    await api('/customer/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCustomer(null);
  };

  return <CustomerAuthContext.Provider value={{ customer, loading, refresh, logout }}>{children}</CustomerAuthContext.Provider>;
}

export type Role = 'OWNER' | 'STAFF';

export type Admin = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
};

export type AdminAccount = Admin & {
  created_at: string;
  last_session_at?: string | null;
};

export type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  credit_limit: number;
  status: 'ACTIVE' | 'LIMITED' | 'BLOCKED';
  notes: string;
  wallet_balance: number;
  total_spent: number;
  rental_count: number;
  created_at: string;
};

export type Device = {
  id: string;
  code: string;
  name: string;
  type: 'PC' | 'BOXPHONE';
  specs: string;
  ip_address: string;
  access_note: string;
  hourly_rate: number;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  purchase_price: number;
  purchased_at?: string | null;
  status: 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'OFFLINE' | 'RETIRED';
  notes: string;
  lifetime_revenue: number;
  rental_count: number;
  current_customer?: string | null;
  current_end_at?: string | null;
  /** Tiền công sửa của các phiếu đã đóng cộng giá vốn linh kiện đã lắp vào máy. */
  repair_cost: number;
  repair_count: number;
  open_repairs: number;
  /** Trạng thái mạng do cơ chế khoá IP quản lý, tách khỏi trạng thái khai thác. */
  network_status: 'OPEN' | 'LOCKED';
  network_locked_at?: string | null;
  created_at: string;
};

export type NetworkLockSettings = {
  enabled: boolean;
  autoLock: boolean;
  lockCommand: string;
  unlockCommand: string;
  graceMinutes: number;
  timeoutSeconds: number;
};

export type NetworkLockEvent = {
  id: string;
  device_id: string;
  device_code: string;
  device_name: string;
  rental_id?: string | null;
  action: 'LOCK' | 'UNLOCK';
  source: 'AUTO' | 'MANUAL';
  status: 'SUCCESS' | 'FAILED';
  command: string;
  output: string;
  admin_name?: string | null;
  created_at: string;
};

export type DeviceDueForLock = {
  device_id: string;
  code: string;
  name: string;
  ip_address: string;
  rental_id: string;
  rental_code: string;
  end_at: string;
};

export type NetworkLockOverview = {
  settings: NetworkLockSettings;
  due: DeviceDueForLock[];
  lockedCount: number;
  events: NetworkLockEvent[];
};

export type RepairStatus = 'REPORTED' | 'IN_PROGRESS' | 'DONE' | 'UNREPAIRABLE' | 'CANCELLED';

export type Repair = {
  id: string;
  code: string;
  device_id: string;
  device_code: string;
  device_name: string;
  device_type: 'PC' | 'BOXPHONE';
  device_status: string;
  title: string;
  symptom: string;
  status: RepairStatus;
  vendor: string;
  service_cost: number;
  parts_cost: number;
  parts_count: number;
  payment_method: string;
  reference: string;
  resolution: string;
  notes: string;
  reported_at: string;
  started_at?: string | null;
  closed_at?: string | null;
};

export type RepairPartLine = {
  id: string;
  part_id: string;
  part_code: string;
  part_name: string;
  part_unit: string;
  kind: 'CONSUME' | 'RETURN';
  quantity: number;
  unit_cost: number;
  notes: string;
  occurred_at: string;
};

export type RepairDetail = Repair & { parts: RepairPartLine[] };

export type PartCategory =
  | 'RAM' | 'STORAGE' | 'GPU' | 'CPU' | 'MAINBOARD'
  | 'PSU' | 'COOLING' | 'SCREEN' | 'BATTERY' | 'CABLE' | 'OTHER';

export type Part = {
  id: string;
  code: string;
  name: string;
  category: PartCategory;
  unit: string;
  min_quantity: number;
  location: string;
  notes: string;
  quantity: number;
  average_cost: number;
  consumed_quantity: number;
  created_at: string;
};

export type PartMovement = {
  id: string;
  part_id: string;
  repair_id?: string | null;
  repair_code?: string | null;
  device_name?: string | null;
  kind: 'PURCHASE' | 'CONSUME' | 'RETURN' | 'ADJUST';
  quantity: number;
  unit_cost: number;
  notes: string;
  occurred_at: string;
};

export type Rental = {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  device_id: string;
  device_name: string;
  device_code: string;
  device_type: 'PC' | 'BOXPHONE';
  start_at: string;
  end_at: string;
  base_amount: number;
  surcharge: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  status: 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  access_note: string;
  notes: string;
  created_at: string;
};

export type FinancialTransaction = {
  id: string;
  code: string;
  customer_name?: string;
  rental_code?: string;
  kind: 'DEPOSIT' | 'RENTAL_PAYMENT' | 'REFUND' | 'PROMOTION' | 'ADJUSTMENT';
  payment_method: string;
  cash_change: number;
  wallet_change: number;
  revenue_change: number;
  reference: string;
  notes: string;
  occurred_at: string;
};

export type Expense = {
  id: string;
  code: string;
  category: string;
  amount: number;
  payment_method: string;
  vendor: string;
  reference: string;
  notes: string;
  occurred_at: string;
};

/** Sổ tiền trả về theo trang, kèm tổng số dòng để giao diện nói thật đang xem bao nhiêu. */
export type Paged<T> = {
  rows: T[];
  total: number;
};

export type DashboardData = {
  /** Các con số tiền chỉ có mặt khi tài khoản được xem tài chính; nhân viên nhận về undefined. */
  canSeeMoney: boolean;
  /** Kỳ mà các con số "tháng" đang tính. `to` rỗng nghĩa là tới hiện tại. */
  period: { from: string; to: string | null };
  monthRevenue?: number;
  monthCash?: number;
  monthExpenses?: number;
  monthProfit?: number;
  walletLiability?: number;
  receivable?: number;
  deviceTotal: number;
  deviceRented: number;
  deviceMaintenance: number;
  customerCount: number;
  monthRepairSpend?: number;
  openRepairs: number;
  lowStockParts: number;
  devicesDueForLock: number;
  devicesLocked: number;
  upcoming: Array<{
    id: string;
    code: string;
    end_at: string;
    status: string;
    customer_name: string;
    device_name: string;
  }>;
  revenueByDevice?: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    revenue: number;
  }>;
};

export type PortalCustomer = {
  accountId: string;
  customerId: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  walletBalance: number;
  unreadNotifications: number;
};

export type CatalogDevice = {
  id: string;
  code: string;
  name: string;
  type: 'PC' | 'BOXPHONE';
  specs: string;
  hourly_rate: number;
  monthly_rate: number;
  status: string;
};

export type BookingRequest = {
  id: string;
  code: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  device_id: string;
  device_code: string;
  device_name: string;
  device_type?: string;
  device_status?: string;
  billing_mode: 'HOURLY' | 'MONTHLY';
  requested_start_at: string;
  requested_end_at: string;
  estimated_amount: number;
  quoted_amount?: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  customer_note: string;
  admin_note: string;
  rental_id?: string | null;
  created_at: string;
};

export type PortalRental = Rental & { specs: string };

export type ExtensionRequest = {
  id: string;
  code: string;
  customer_id: string;
  customer_name?: string;
  rental_id: string;
  rental_code: string;
  device_name: string;
  current_end_at: string;
  requested_end_at: string;
  additional_amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  customer_note: string;
  admin_note: string;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  code: string;
  customer_id: string;
  customer_name?: string;
  rental_id?: string | null;
  rental_code?: string | null;
  subject: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  last_message: string;
  last_message_at: string;
  created_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_type: 'CUSTOMER' | 'ADMIN';
  author_id: string;
  body: string;
  created_at: string;
};

export type CustomerNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  read_at?: string | null;
  created_at: string;
};

export type ServiceDeskOverview = {
  bookings: Paged<BookingRequest>;
  extensions: Paged<ExtensionRequest>;
  tickets: Paged<SupportTicket>;
  /** Server tự đếm, không đếm từ mảng đã cắt — huy hiệu việc chờ lấy con số này. */
  pending: { bookings: number; extensions: number; tickets: number };
};

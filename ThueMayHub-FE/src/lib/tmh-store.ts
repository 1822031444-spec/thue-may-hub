import { create } from "zustand";

/*
 * Kho dữ liệu của giao diện, nối thẳng vào backend Express của dự án (server/).
 *
 * Mỗi thao tác là một lời gọi API: quy tắc tiền, khoá máy, phân quyền đều do
 * server quyết, giao diện chỉ hiển thị kết quả. Sau mỗi thao tác ghi, kho tải lại
 * toàn bộ danh sách để mọi màn hình cùng khớp. Dữ liệu chỉ cần ở một màn (cấu hình,
 * lịch sử ví, hội thoại hỗ trợ…) thì màn đó tự gọi `api()` khi mở.
 */

export type Role = "Admin" | "Staff" | "Customer";
export type Page =
  | "overview" | "devices" | "customers" | "orders" | "payments" | "repairs" | "support"
  | "wallets" | "parts" | "staff" | "reports" | "settings";
export type CustomerTab = "home" | "orders" | "wallet" | "support" | "profile";
export type DeviceStatus = "AVAILABLE" | "RESERVED" | "RENTED" | "MAINTENANCE" | "BROKEN" | "RETIRED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "EXPIRED" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type PayMethod = "Tiền mặt" | "Chuyển khoản" | "Ví khách hàng";

export type Device = {
  id: string; code: string; name: string; type: "PC" | "Boxphone"; category: string; status: DeviceStatus;
  location: string; monthly: number; hourly: number; specs: string; ipAddress: string; notes: string;
  revenue: number; repairCost: number; rentalCount: number; currentCustomer: string; networkLocked: boolean;
};
export type Customer = {
  id: string; code: string; name: string; phone: string; email: string; wallet: number; blacklist: boolean;
  address?: string; identityNumber?: string; profileComplete?: boolean; notes?: string; totalSpent?: number; rentalCount?: number;
};
/** Đơn thuê (`rental`) hoặc yêu cầu thuê khách gửi từ cổng, chưa được duyệt (`booking`). */
export type Order = {
  id: string; code: string; kind: "rental" | "booking"; customerId: string; customerName: string; deviceId: string;
  deviceName: string; status: OrderStatus; start: string; end: string; total: number; paid: number; note: string;
  /** Số khách để lại khi gửi yêu cầu (không có thì số trong hồ sơ), kênh liên hệ và cách nhận máy. */
  contactPhone: string; contactChannel: string; handover: string;
};
/** Yêu cầu nạp ví qua chuyển khoản VietQR. */
export type Topup = {
  id: string; code: string; customerId: string; customerCode: string; customerName: string; customerPhone: string;
  amount: number; note: string; status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  /** Lúc khách bấm "Tôi đã chuyển khoản"; rỗng là khách chưa báo. */
  paidAt: string; received: number; adminNote: string; reviewer: string; createdAt: string; reviewedAt: string;
};
export const CONTACT_CHANNEL: Record<string, string> = { ZALO: "Zalo", PHONE: "Gọi điện", TELEGRAM: "Telegram" };
export const HANDOVER_METHOD: Record<string, string> = {
  ULTRAVIEWER: "UltraViewer", TEAMVIEWER: "TeamViewer", ANYDESK: "AnyDesk", IN_STORE: "Nhận tại cửa hàng", OTHER: "Khác",
};
export type Payment = {
  id: string; code: string; kind: "PAYMENT" | "REFUND"; orderId: string; orderCode: string; customerName: string;
  amount: number; method: string; date: string; note: string;
};
export type Repair = {
  id: string; code: string; deviceId: string; deviceName: string; issue: string; status: string;
  priority: "Cao" | "Trung bình" | "Thấp"; technician: string; cost: number; serviceCost: number; partsCost: number; open: boolean;
};
export type StaffUser = { id: string; name: string; email: string; username: string; role: "Admin" | "Staff"; active: boolean };
export type Part = {
  id: string; code: string; name: string; category: string; unit: string; quantity: number; minQuantity: number;
  averageCost: number; location: string;
};
/** Yêu cầu gia hạn khách gửi từ cổng. */
export type Extension = {
  id: string; code: string; orderId: string; orderCode: string; customerName: string; deviceName: string;
  currentEnd: string; requestedEnd: string; status: string; note: string; adminNote: string; additional: number;
};
export type Ticket = {
  id: string; code: string; customerName: string; subject: string; category: string; priority: string;
  status: string; lastMessage: string; lastAt: string; orderCode: string;
  /** Ai gửi tin cuối: khác vai trò đang đăng nhập nghĩa là có tin nhắn mới cho mình. */
  lastAuthor: "CUSTOMER" | "ADMIN" | "";
};
export type TicketMessage = { id: string; author: "CUSTOMER" | "ADMIN"; body: string; at: string };
export type Notice = { id: string; title: string; body: string; at: string; read: boolean };
export type Shop = { name: string; address: string; hotline: string; email: string; hours: string };
export type WalletRow = { id: string; code: string; kind: string; method: string; change: number; note: string; at: string; orderCode: string };
export type Account = { id: string; name: string; email: string; username: string; role: Role; customerId?: string };

export const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
export const dateLabel = (value: string) => {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
};
export const dateTimeLabel = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

export const statusLabel: Record<string, string> = {
  AVAILABLE: "Còn trống", RESERVED: "Đang giữ chỗ", RENTED: "Đang thuê", MAINTENANCE: "Bảo trì", BROKEN: "Hỏng", RETIRED: "Ngừng dùng",
  PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", ACTIVE: "Đang thuê", EXPIRED: "Quá hạn", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy",
  REJECTED: "Bị từ chối", APPROVED: "Đã duyệt",
  OPEN: "Đang chờ cửa hàng", WAITING_CUSTOMER: "Chờ khách phản hồi", RESOLVED: "Đã xử lý", CLOSED: "Đã đóng",
};

export const TICKET_CATEGORY: Record<string, string> = {
  TECHNICAL: "Kỹ thuật", PAYMENT: "Thanh toán", RENTAL: "Đơn thuê", GENERAL: "Khác",
};

/* ---- Gọi API ------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  let data: Row | null = null;
  try {
    data = text ? (JSON.parse(text) as Row) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (!data && res.status >= 500) throw new ApiError("Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.", res.status);
    const fieldErrors = (data?.issues?.fieldErrors ?? {}) as Record<string, string[]>;
    const detail = Object.values(fieldErrors).flat()[0] ?? "";
    throw new ApiError([data?.message || `Máy chủ báo lỗi ${res.status}.`, detail].filter(Boolean).join(" "), res.status);
  }
  return data as T;
}

export const errorText = (e: unknown) =>
  e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.";

/** Thao tác lỗi ngoài hộp thoại (bấm thẳng nút trong bảng) thì báo bằng toast chung. */
export function report(error: string | null) {
  if (error) useHub.setState({ toast: error });
}

/* ---- Đổi dữ liệu server sang hình dạng giao diện dùng ------------------- */

const METHOD_LABEL: Record<string, string> = { CASH: "Tiền mặt", BANK: "Chuyển khoản", WALLET: "Ví khách hàng", OTHER: "Khác" };
const METHOD_CODE: Record<string, string> = { "Tiền mặt": "CASH", "Chuyển khoản": "BANK", "Ví khách hàng": "WALLET", "Khác": "OTHER" };
export const methodLabel = (code: string) => METHOD_LABEL[code] ?? code;
const PRIORITY_LABEL: Record<string, Repair["priority"]> = { HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
const PRIORITY_CODE: Record<Repair["priority"], string> = { "Cao": "HIGH", "Trung bình": "MEDIUM", "Thấp": "LOW" };
const REPAIR_LABEL: Record<string, string> = {
  REPORTED: "Mới báo", IN_PROGRESS: "Đang xử lý", DONE: "Hoàn thành", UNREPAIRABLE: "Không sửa được", CANCELLED: "Đã huỷ",
};
const ORDER_STATUS: Record<string, OrderStatus> = {
  RESERVED: "CONFIRMED", ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED",
};
const BOOKING_STATUS: Record<string, OrderStatus> = { PENDING: "PENDING", REJECTED: "REJECTED", CANCELLED: "CANCELLED" };

const toDevice = (r: Row): Device => ({
  id: r.id, code: r.code, name: r.name,
  type: r.type === "BOXPHONE" ? "Boxphone" : "PC",
  category: r.category || "", location: r.location || "", specs: r.specs || "",
  ipAddress: r.ip_address || "", notes: r.notes || "",
  status: r.status === "OFFLINE" ? "BROKEN" : r.status,
  monthly: Number(r.monthly_rate) || 0, hourly: Number(r.hourly_rate) || 0,
  revenue: Number(r.lifetime_revenue) || 0, repairCost: Number(r.repair_cost) || 0,
  rentalCount: Number(r.rental_count) || 0, currentCustomer: r.current_customer || "",
  networkLocked: r.network_status === "LOCKED",
});

const toCustomer = (r: Row): Customer => ({
  id: r.id, code: r.code, name: r.name || "", phone: r.phone || "", email: r.email || "",
  wallet: Number(r.wallet_balance ?? r.wallet ?? 0),
  blacklist: r.status === "BLOCKED" || r.blacklist === true,
  address: r.address || "", identityNumber: r.identity_number ?? r.identityNumber ?? "",
  profileComplete: Boolean(String(r.name || "").trim() && String(r.phone || "").trim()),
  notes: r.notes || "", totalSpent: Number(r.total_spent) || 0, rentalCount: Number(r.rental_count) || 0,
});

const toOrder = (r: Row): Order => ({
  id: r.id, code: r.code, kind: "rental",
  customerId: r.customer_id, customerName: r.customer_name || "",
  deviceId: r.device_id, deviceName: r.device_name || "",
  status: ORDER_STATUS[r.status] ?? "PENDING",
  start: r.start_at, end: r.end_at,
  total: Number(r.total_amount) || 0, paid: Number(r.paid_amount) || 0, note: r.notes || "",
  contactPhone: r.contact_phone || r.customer_phone || "", contactChannel: r.contact_channel || "", handover: r.handover_method || "",
});

const toTopup = (r: Row): Topup => ({
  id: r.id, code: r.code, customerId: r.customer_id, customerCode: r.customer_code || "", customerName: r.customer_name || "",
  customerPhone: r.customer_phone || "", amount: Number(r.amount) || 0, note: r.transfer_note, status: r.status,
  paidAt: r.customer_paid_at || "", received: Number(r.received_amount) || 0, adminNote: r.admin_note || "",
  reviewer: r.reviewer_name || "", createdAt: r.created_at, reviewedAt: r.reviewed_at || "",
});

/**
 * Yêu cầu đã duyệt thì đã thành đơn thuê, nên không hiện thêm lần nữa.
 * Chưa có giá chốt thì tạm tính theo ngày từ giá tháng — cùng cách với form gửi
 * yêu cầu và form duyệt, để khách và quầy thấy cùng một con số.
 */
const toBooking = (r: Row): Order | null => {
  const status = BOOKING_STATUS[r.status];
  if (!status) return null;
  const days = Math.max(1, Math.round((new Date(r.requested_end_at).getTime() - new Date(r.requested_start_at).getTime()) / 86_400_000));
  const estimate = Number(r.device_monthly_rate) > 0
    ? Math.round((Number(r.device_monthly_rate) / 30) * days)
    : Number(r.estimated_amount) || 0;
  return {
    id: r.id, code: r.code, kind: "booking",
    customerId: r.customer_id, customerName: r.customer_name || "",
    deviceId: r.device_id, deviceName: r.device_name || "",
    status, start: r.requested_start_at, end: r.requested_end_at,
    total: r.quoted_amount != null ? Number(r.quoted_amount) : estimate, paid: 0,
    note: r.customer_note || r.admin_note || "",
    contactPhone: r.contact_phone || r.customer_phone || "", contactChannel: r.contact_channel || "", handover: r.handover_method || "",
  };
};

const toPayment = (r: Row): Payment => ({
  id: r.id, code: r.code, kind: r.kind === "REFUND" ? "REFUND" : "PAYMENT",
  orderId: r.rental_id, orderCode: r.rental_code || "—",
  customerName: r.customer_name || "", amount: Number(r.amount) || 0,
  method: methodLabel(r.payment_method), date: r.occurred_at, note: r.notes || "",
});

const toRepair = (r: Row): Repair => ({
  id: r.id, code: r.code, deviceId: r.device_id, deviceName: r.device_name || "",
  issue: r.title, status: REPAIR_LABEL[r.status] ?? r.status,
  priority: PRIORITY_LABEL[r.priority] ?? "Trung bình",
  technician: r.vendor || "—",
  serviceCost: Number(r.service_cost) || 0,
  partsCost: Number(r.parts_cost) || 0,
  cost: (Number(r.service_cost) || 0) + (Number(r.parts_cost) || 0),
  open: r.status === "REPORTED" || r.status === "IN_PROGRESS",
});

const toStaff = (r: Row): StaffUser => ({
  id: r.id, name: r.name, email: r.email, username: r.username || String(r.email).split("@")[0],
  role: r.role === "OWNER" ? "Admin" : "Staff", active: r.status === "ACTIVE",
});

const toPart = (r: Row): Part => ({
  id: r.id, code: r.code, name: r.name, category: r.category, unit: r.unit,
  quantity: Number(r.quantity) || 0, minQuantity: Number(r.min_quantity) || 0,
  averageCost: Number(r.average_cost) || 0, location: r.location || "",
});

const toExtension = (r: Row): Extension => ({
  id: r.id, code: r.code, orderId: r.rental_id, orderCode: r.rental_code || "", customerName: r.customer_name || "",
  deviceName: r.device_name || "", currentEnd: r.current_end_at, requestedEnd: r.requested_end_at, status: r.status,
  note: r.customer_note || "", adminNote: r.admin_note || "", additional: Number(r.additional_amount) || 0,
});

const toTicket = (r: Row): Ticket => ({
  id: r.id, code: r.code, customerName: r.customer_name || "", subject: r.subject, category: r.category,
  priority: r.priority, status: r.status, lastMessage: r.last_message || "", lastAt: r.last_message_at,
  orderCode: r.rental_code || "",
  lastAuthor: r.last_author === "ADMIN" || r.last_author === "CUSTOMER" ? r.last_author : "",
});

const toNotice = (r: Row): Notice => ({ id: r.id, title: r.title, body: r.body, at: r.created_at, read: Boolean(r.read_at) });

export const toWalletRow = (r: Row): WalletRow => ({
  id: r.id, code: r.code, kind: r.kind, method: methodLabel(r.payment_method), change: Number(r.wallet_change) || 0,
  note: r.notes || "", at: r.occurred_at, orderCode: r.rental_code || "",
});

export const toTicketMessage = (r: Row): TicketMessage => ({
  id: r.id, author: r.author_type === "ADMIN" ? "ADMIN" : "CUSTOMER", body: r.body, at: r.created_at,
});

const isOrder = (o: Order | null): o is Order => o !== null;

/** Số ngày thuê của một đơn hoặc yêu cầu, dùng để báo giá theo ngày. */
export function orderDays(order: Order) {
  return Math.max(1, Math.round((new Date(order.end).getTime() - new Date(order.start).getTime()) / 86_400_000));
}

/** Giá theo ngày tính từ giá tháng — đúng cách cửa hàng báo giá. */
export const dayPrice = (monthly: number, days: number) => Math.round((monthly / 30) * Math.max(1, days));

/* ---- Kho ------------------------------------------------------------------ */

type Session = { role: Role; user: Row };
type Result = Promise<string | null>;

type DeviceFields = {
  name: string; type: "PC" | "Boxphone"; category: string; location: string; monthly: number; hourly: number;
  specs?: string; ipAddress?: string; notes?: string;
};
type CustomerFields = { name: string; phone: string; email: string; address?: string; identityNumber?: string; notes?: string };

type State = {
  status: "loading" | "guest" | "ready";
  account: Account | null;
  devices: Device[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  repairs: Repair[];
  staff: StaffUser[];
  parts: Part[];
  extensions: Extension[];
  tickets: Ticket[];
  notices: Notice[];
  /** Yêu cầu nạp ví qua chuyển khoản — chỉ chủ cửa hàng tải (quyền nạp ví). */
  topups: Topup[];
  shop: Shop;
  toast: string;
  /** Ticket đang mở hội thoại: tin mới của ticket này hiện thẳng trong hội thoại, không bật thông báo. */
  openTicketId: string | null;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Chỉ tải lại ticket (và thông báo của khách) — nhẹ, gọi vài giây một lần. */
  pollTickets: () => Promise<void>;
  setOpenTicket: (id: string | null) => void;
  /** Hội thoại đã hiện tới tin lúc `at`, không cần báo lại tin đó. */
  markTicketSeen: (id: string, at: string) => void;
  clearToast: () => void;

  login: (identity: string, password: string) => Result;
  register: (phone: string, email: string, password: string) => Result;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Result;

  addDevice: (input: DeviceFields) => Result;
  updateDevice: (id: string, input: DeviceFields) => Result;
  setDeviceStatus: (id: string, status: "AVAILABLE" | "MAINTENANCE" | "RETIRED") => Result;
  deleteDevice: (id: string) => Result;

  addCustomer: (input: CustomerFields) => Result;
  updateCustomer: (id: string, input: CustomerFields) => Result;
  setCustomerBlocked: (id: string, blocked: boolean) => Result;
  deposit: (input: { customerId: string; amount: number; method: string }) => Result;
  approveTopup: (input: { id: string; amount: number; note: string }) => Result;
  rejectTopup: (input: { id: string; note: string }) => Result;

  addOrder: (input: { customerId: string; deviceId: string; days: number; note: string; handover: boolean }) => Result;
  setOrderStatus: (id: string, status: "ACTIVE" | "COMPLETED" | "CANCELLED") => Result;
  addPayment: (input: { orderId: string; amount: number; method: string }) => Result;
  renewOrder: (input: { orderId: string; unit: "DAY" | "WEEK" | "MONTH"; quantity: number; amount: number; collect: string }) => Result;
  refundOrder: (input: { orderId: string; amount: number; destination: string; note: string }) => Result;
  approveBooking: (input: { id: string; amount: number; note: string }) => Result;
  rejectBooking: (input: { id: string; note: string }) => Result;
  approveExtension: (input: { id: string; amount: number; note: string }) => Result;
  rejectExtension: (input: { id: string; note: string }) => Result;

  addRepair: (input: { deviceId: string; issue: string; priority: Repair["priority"]; technician: string; cost: number }) => Result;
  finishRepair: (input: { id: string; cost: number }) => Result;
  failRepair: (input: { id: string; cost: number; note: string }) => Result;
  addRepairPart: (input: { repairId: string; partId: string; quantity: number }) => Result;

  addPart: (input: { name: string; category: string; unit: string; minQuantity: number; location: string }) => Result;
  purchasePart: (input: { partId: string; quantity: number; unitCost: number; method: string; vendor: string }) => Result;

  addStaff: (input: { name: string; username: string; email: string; password: string; role: "Admin" | "Staff" }) => Result;
  updateStaff: (id: string, input: { role?: "Admin" | "Staff"; active?: boolean }) => Result;
  resetStaffPassword: (id: string, password: string) => Result;
  saveShop: (input: Shop) => Result;

  replyTicket: (id: string, body: string) => Result;
  setTicketStatus: (id: string, status: "RESOLVED" | "CLOSED" | "OPEN") => Result;

  completeProfile: (fields: { name: string; phone: string; email: string; address: string; identityNumber: string }) => Result;
  requestRental: (input: {
    deviceId: string; days: number; note: string; contactPhone: string; contactChannel: string; handoverMethod: string;
  }) => Result;
  cancelBooking: (id: string) => Result;
  payWithWallet: (input: { orderId: string; amount: number }) => Result;
  requestExtension: (input: { orderId: string; days: number; note: string }) => Result;
  createTicket: (input: { subject: string; category: string; message: string; orderId: string }) => Result;
  readNotices: () => Promise<void>;
};

const SHOP_EMPTY: Shop = { name: "Thuê Máy Hub", address: "", hotline: "", email: "", hours: "" };
const empty = {
  account: null, devices: [], customers: [], orders: [], payments: [], repairs: [], staff: [], parts: [],
  extensions: [], tickets: [], notices: [], topups: [],
};

const deviceBody = (input: DeviceFields) => ({
  name: input.name, type: input.type === "Boxphone" ? "BOXPHONE" : "PC",
  category: input.category, location: input.location,
  monthlyRate: input.monthly, hourlyRate: input.hourly,
  ...(input.specs !== undefined ? { specs: input.specs } : {}),
  ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
  ...(input.notes !== undefined ? { notes: input.notes } : {}),
});

export const useHub = create<State>()((set, get) => {
  function applySession(session: Session) {
    seenTickets = null;
    seenPaidTopups = null;
    const u = session.user;
    if (session.role === "Customer") {
      const me = toCustomer(u);
      set({
        account: { id: u.id, name: me.name, email: me.email, username: me.phone, role: "Customer", customerId: u.id },
        customers: [me],
      });
    } else {
      set({ account: { id: u.id, name: u.name, email: u.email, username: u.username, role: session.role } });
    }
  }

  /** Chạy một thao tác ghi; thành công thì tải lại dữ liệu và báo toast, lỗi thì trả câu báo lỗi. */
  async function act(work: () => Promise<string>): Result {
    try {
      const message = await work();
      await get().refresh();
      set({ toast: message });
      return null;
    } catch (e) {
      return errorText(e);
    }
  }

  const isCustomer = () => get().account?.role === "Customer";

  /**
   * Thời điểm tin cuối của từng ticket mà người dùng đã được biết. `null` là chưa tải
   * lần nào sau khi đăng nhập: lần tải đầu chỉ ghi nhận, không báo tin cũ là tin mới.
   */
  let seenTickets: Map<string, string> | null = null;

  /** Đổi dòng ticket từ server và báo "có tin nhắn mới" khi bên kia vừa nhắn. */
  function takeTickets(rows: Row[]) {
    const tickets = rows.map(toTicket);
    const before = seenTickets;
    seenTickets = new Map(tickets.map((t) => {
      const known = before?.get(t.id) ?? "";
      return [t.id, known > t.lastAt ? known : t.lastAt];
    }));
    if (!before) return tickets;
    const me = isCustomer() ? "CUSTOMER" : "ADMIN";
    const openId = get().openTicketId;
    const incoming = tickets.filter((t) =>
      t.lastAuthor !== "" && t.lastAuthor !== me && t.id !== openId && t.lastAt > (before.get(t.id) ?? ""));
    if (incoming.length) {
      const t = incoming[0];
      const snippet = t.lastMessage.length > 80 ? `${t.lastMessage.slice(0, 80)}…` : t.lastMessage;
      const text = me === "CUSTOMER"
        ? `Cửa hàng vừa trả lời ${t.code}: ${snippet}`
        : before.has(t.id)
          ? `${t.customerName || "Khách"} vừa nhắn ${t.code}: ${snippet}`
          : `Yêu cầu hỗ trợ mới ${t.code} từ ${t.customerName || "khách"}: ${t.subject}`;
      set({ toast: incoming.length > 1 ? `${text} (và ${incoming.length - 1} tin khác)` : text });
    }
    return tickets;
  }

  /** Id các yêu cầu nạp mà khách đã báo chuyển khoản và chủ đã được báo. `null` như `seenTickets`. */
  let seenPaidTopups: Set<string> | null = null;

  /** Đổi dòng yêu cầu nạp và báo chủ khi có khách vừa bấm "Tôi đã chuyển khoản". */
  function takeTopups(rows: Row[]) {
    const topups = rows.map(toTopup);
    const paid = topups.filter((t) => t.status === "PENDING" && t.paidAt);
    const before = seenPaidTopups;
    seenPaidTopups = new Set(paid.map((t) => t.id));
    const fresh = before ? paid.filter((t) => !before.has(t.id)) : [];
    if (fresh.length) {
      const t = fresh[0];
      const text = `${t.customerName || "Khách"} báo đã chuyển ${money(t.amount)} (${t.note}). Kiểm tra tài khoản ngân hàng rồi xác nhận ở trang Ví khách.`;
      set({ toast: fresh.length > 1 ? `${text} (và ${fresh.length - 1} khoản khác)` : text });
    }
    return topups;
  }

  return {
    status: "loading",
    ...empty,
    shop: SHOP_EMPTY,
    toast: "",
    openTicketId: null,
    clearToast: () => set({ toast: "" }),
    setOpenTicket: (id) => set({ openTicketId: id }),
    markTicketSeen: (id, at) => {
      if (seenTickets && at > (seenTickets.get(id) ?? "")) seenTickets.set(id, at);
    },

    pollTickets: async () => {
      const account = get().account;
      if (!account) return;
      if (account.role === "Customer") {
        const [tickets, notices] = await Promise.all([api<Row[]>("/customer/tickets"), api<Row[]>("/customer/notifications")]);
        if (get().account?.id !== account.id) return;
        set({ tickets: takeTickets(tickets), notices: notices.map(toNotice) });
        return;
      }
      const [tickets, topups] = await Promise.all([
        api<Row[]>("/service-desk/tickets?limit=500"),
        account.role === "Admin" ? api<{ rows: Row[] }>("/topups") : Promise.resolve(null),
      ]);
      if (get().account?.id !== account.id) return;
      set({ tickets: takeTickets(tickets), ...(topups ? { topups: takeTopups(topups.rows) } : {}) });
    },

    init: async () => {
      try {
        const session = await api<Session | { role: null }>("/hub/me");
        if (!session.role) {
          set({ status: "guest", ...empty });
          return;
        }
        applySession(session as Session);
      } catch (e) {
        set({ status: "guest", ...empty, toast: errorText(e) });
        return;
      }
      try {
        await get().refresh();
      } catch (e) {
        set({ toast: errorText(e) });
      }
      set({ status: "ready" });
    },

    refresh: async () => {
      const account = get().account;
      if (!account) return;
      if (account.role === "Customer") {
        const [me, catalog, rentals, bookings, extensions, tickets, notices, shop] = await Promise.all([
          api<Session>("/hub/me"),
          api<Row[]>("/customer/catalog"),
          api<Row[]>("/customer/rentals"),
          api<Row[]>("/customer/bookings"),
          api<Row[]>("/customer/extensions"),
          api<Row[]>("/customer/tickets"),
          api<Row[]>("/customer/notifications"),
          api<Shop>("/hub/shop"),
        ]);
        const self = toCustomer(me.user);
        set({
          account: { ...account, name: self.name },
          customers: [self],
          devices: catalog.map(toDevice),
          orders: [...bookings.map(toBooking).filter(isOrder), ...rentals.map(toOrder)],
          extensions: extensions.map(toExtension),
          tickets: takeTickets(tickets),
          notices: notices.map(toNotice),
          shop,
        });
        return;
      }
      const admin = account.role === "Admin";
      const [devices, customers, rentals, desk, payments, repairs, staff, parts, shop, topups] = await Promise.all([
        api<Row[]>("/devices"),
        api<Row[]>("/customers"),
        api<Row[]>("/rentals"),
        api<{ bookings: { rows: Row[] }; extensions: { rows: Row[] }; tickets: { rows: Row[] } }>("/service-desk/overview?limit=500"),
        api<Row[]>("/hub/payments"),
        api<{ rows: Row[] }>("/repairs?limit=500"),
        admin ? api<Row[]>("/admins") : Promise.resolve([] as Row[]),
        api<Row[]>("/parts"),
        api<Shop>("/hub/shop"),
        admin ? api<{ rows: Row[] }>("/topups") : Promise.resolve({ rows: [] as Row[] }),
      ]);
      const pending = desk.bookings.rows.filter((b) => b.status === "PENDING").map(toBooking).filter(isOrder);
      set({
        devices: devices.map(toDevice),
        customers: customers.map(toCustomer),
        orders: [...pending, ...rentals.map(toOrder)],
        payments: payments.map(toPayment),
        repairs: repairs.rows.map(toRepair),
        staff: staff.map(toStaff),
        parts: parts.map(toPart),
        extensions: desk.extensions.rows.map(toExtension),
        tickets: takeTickets(desk.tickets.rows),
        topups: takeTopups(topups.rows),
        shop,
      });
    },

    /* ---- Tài khoản ---- */

    login: async (identity, password) => {
      try {
        applySession(await api<Session>("/hub/login", { method: "POST", body: { identity, password } }));
        await get().refresh();
        set({ status: "ready", toast: "" });
        return null;
      } catch (e) {
        return errorText(e);
      }
    },

    register: async (phone, email, password) => {
      try {
        applySession(await api<Session>("/hub/register", { method: "POST", body: { phone, email, password } }));
        set({ status: "ready", toast: "Đã tạo tài khoản khách. Hãy hoàn thiện hồ sơ." });
        return null;
      } catch (e) {
        return errorText(e);
      }
    },

    logout: async () => {
      try {
        await api("/hub/logout", { method: "POST" });
      } finally {
        seenTickets = null;
        seenPaidTopups = null;
        set({ status: "guest", ...empty, toast: "", openTicketId: null });
      }
    },

    changePassword: (current, next) => act(async () => {
      const path = isCustomer() ? "/customer/auth/change-password" : "/auth/change-password";
      await api(path, { method: "POST", body: { currentPassword: current, newPassword: next } });
      return "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.";
    }),

    /* ---- Thiết bị ---- */

    addDevice: (input) => act(async () => {
      const r = await api<{ code: string }>("/devices", { method: "POST", body: deviceBody(input) });
      return `Đã thêm máy ${r.code}.`;
    }),

    updateDevice: (id, input) => act(async () => {
      await api(`/devices/${id}`, { method: "PATCH", body: deviceBody(input) });
      return "Đã lưu thông tin máy.";
    }),

    setDeviceStatus: (id, status) => act(async () => {
      await api(`/devices/${id}`, { method: "PATCH", body: { status } });
      return { AVAILABLE: "Máy đã sẵn sàng cho thuê.", MAINTENANCE: "Đã chuyển máy sang bảo trì.", RETIRED: "Đã ngừng dùng máy." }[status];
    }),

    deleteDevice: (id) => act(async () => {
      await api(`/devices/${id}`, { method: "DELETE" });
      return "Đã xoá máy khỏi kho.";
    }),

    /* ---- Khách hàng ---- */

    addCustomer: (input) => act(async () => {
      const r = await api<{ code: string }>("/customers", { method: "POST", body: input });
      return `Đã thêm khách hàng ${r.code}.`;
    }),

    updateCustomer: (id, input) => act(async () => {
      await api(`/customers/${id}`, { method: "PATCH", body: input });
      return "Đã lưu hồ sơ khách hàng.";
    }),

    setCustomerBlocked: (id, blocked) => act(async () => {
      await api(`/customers/${id}`, { method: "PATCH", body: { status: blocked ? "BLOCKED" : "ACTIVE" } });
      return blocked ? "Đã khoá khách hàng. Khách không đăng nhập và không thuê thêm được." : "Đã mở khoá khách hàng.";
    }),

    deposit: ({ customerId, amount, method }) => act(async () => {
      await api(`/customers/${customerId}/deposit`, {
        method: "POST", body: { amount, paymentMethod: METHOD_CODE[method] === "WALLET" ? "OTHER" : (METHOD_CODE[method] ?? "BANK") },
      });
      return `Đã nạp ${money(amount)} vào ví.`;
    }),

    approveTopup: ({ id, amount, note }) => act(async () => {
      await api(`/topups/${id}/approve`, { method: "POST", body: { amount, note } });
      return `Đã xác nhận, cộng ${money(amount)} vào ví khách.`;
    }),

    rejectTopup: ({ id, note }) => act(async () => {
      await api(`/topups/${id}/reject`, { method: "POST", body: { adminNote: note } });
      return "Đã báo khách là chưa nhận được khoản nạp.";
    }),

    /* ---- Đơn thuê ---- */

    addOrder: ({ customerId, deviceId, days, note, handover }) => act(async () => {
      const device = get().devices.find((d) => d.id === deviceId);
      if (!device || device.status !== "AVAILABLE") throw new ApiError("Máy không còn trống.", 409);
      const n = Math.max(1, Math.round(days));
      const start = new Date();
      const end = new Date(start.getTime() + n * 86_400_000);
      const r = await api<{ code: string }>("/rentals", {
        method: "POST",
        body: {
          customerId, deviceId, startAt: start.toISOString(), endAt: end.toISOString(),
          baseAmount: dayPrice(device.monthly, n), status: handover ? "ACTIVE" : "RESERVED", notes: note,
        },
      });
      return `Đã tạo đơn ${r.code}.`;
    }),

    setOrderStatus: (id, status) => act(async () => {
      await api(`/rentals/${id}/status`, { method: "PATCH", body: { status } });
      return { ACTIVE: "Đã giao máy, đơn đang thuê.", COMPLETED: "Đã nhận lại máy, đơn hoàn thành.", CANCELLED: "Đã huỷ đơn." }[status];
    }),

    addPayment: ({ orderId, amount, method }) => act(async () => {
      if (!(amount > 0)) throw new ApiError("Số tiền phải lớn hơn 0.", 400);
      await api(`/rentals/${orderId}/payment`, { method: "POST", body: { amount, source: METHOD_CODE[method] ?? "CASH" } });
      return "Đã ghi nhận thu tiền.";
    }),

    renewOrder: ({ orderId, unit, quantity, amount, collect }) => act(async () => {
      const r = await api<{ endAt: string; collected: boolean }>(`/rentals/${orderId}/renew`, {
        method: "POST",
        body: { unit, quantity, amount, from: "END", collect: collect ? { source: METHOD_CODE[collect] ?? "CASH" } : null },
      });
      return `Đã gia hạn tới ${dateLabel(r.endAt)}${r.collected ? ", đã thu tiền." : ", ghi nợ phần gia hạn."}`;
    }),

    refundOrder: ({ orderId, amount, destination, note }) => act(async () => {
      const code = METHOD_CODE[destination] ?? "CASH";
      await api(`/rentals/${orderId}/refund`, { method: "POST", body: { amount, destination: code === "OTHER" ? "CASH" : code, notes: note } });
      return `Đã hoàn ${money(amount)}.`;
    }),

    approveBooking: ({ id, amount, note }) => act(async () => {
      const r = await api<{ rentalCode: string }>(`/service-desk/bookings/${id}/approve`, {
        method: "POST", body: { quotedAmount: amount, adminNote: note },
      });
      return `Đã duyệt, tạo đơn ${r.rentalCode}.`;
    }),

    rejectBooking: ({ id, note }) => act(async () => {
      await api(`/service-desk/bookings/${id}/reject`, { method: "POST", body: { adminNote: note } });
      return "Đã từ chối yêu cầu thuê.";
    }),

    approveExtension: ({ id, amount, note }) => act(async () => {
      await api(`/service-desk/extensions/${id}/approve`, { method: "POST", body: { additionalAmount: amount, adminNote: note } });
      return "Đã duyệt gia hạn, hạn đơn và tổng tiền đã cập nhật.";
    }),

    rejectExtension: ({ id, note }) => act(async () => {
      await api(`/service-desk/extensions/${id}/reject`, { method: "POST", body: { adminNote: note } });
      return "Đã từ chối yêu cầu gia hạn.";
    }),

    /* ---- Sửa chữa và linh kiện ---- */

    addRepair: (input) => act(async () => {
      const r = await api<{ code: string }>("/repairs", {
        method: "POST",
        body: {
          deviceId: input.deviceId, title: input.issue, vendor: input.technician,
          priority: PRIORITY_CODE[input.priority], serviceCost: input.cost, startNow: true,
        },
      });
      return `Đã tạo phiếu ${r.code}.`;
    }),

    finishRepair: ({ id, cost }) => act(async () => {
      const repair = get().repairs.find((r) => r.id === id);
      await api(`/repairs/${id}/status`, {
        method: "PATCH",
        body: { status: "DONE", serviceCost: cost, vendor: repair?.technician === "—" ? "" : repair?.technician ?? "" },
      });
      return "Đã đóng phiếu sửa, máy về trạng thái sẵn sàng.";
    }),

    failRepair: ({ id, cost, note }) => act(async () => {
      const repair = get().repairs.find((r) => r.id === id);
      await api(`/repairs/${id}/status`, {
        method: "PATCH",
        body: { status: "UNREPAIRABLE", serviceCost: cost, resolution: note, vendor: repair?.technician === "—" ? "" : repair?.technician ?? "" },
      });
      return "Đã đóng phiếu: máy không sửa được.";
    }),

    addRepairPart: ({ repairId, partId, quantity }) => act(async () => {
      await api(`/repairs/${repairId}/parts`, { method: "POST", body: { partId, quantity } });
      return "Đã lắp linh kiện vào phiếu sửa, tồn kho đã trừ.";
    }),

    addPart: (input) => act(async () => {
      const r = await api<{ code?: string }>("/parts", { method: "POST", body: input });
      return `Đã thêm linh kiện${r.code ? ` ${r.code}` : ""}.`;
    }),

    purchasePart: ({ partId, quantity, unitCost, method, vendor }) => act(async () => {
      const code = METHOD_CODE[method] ?? "CASH";
      await api(`/parts/${partId}/movements`, {
        method: "POST",
        body: { kind: "PURCHASE", quantity, unitCost, vendor, paymentMethod: code === "WALLET" ? "OTHER" : code },
      });
      return `Đã nhập ${quantity} vào kho.`;
    }),

    /* ---- Nhân viên, cửa hàng ---- */

    addStaff: ({ name, username, email, password, role }) => act(async () => {
      await api("/admins", { method: "POST", body: { name, username, email, password, role: role === "Admin" ? "OWNER" : "STAFF" } });
      return `Đã tạo tài khoản ${username || email}.`;
    }),

    updateStaff: (id, input) => act(async () => {
      const current = get().staff.find((s) => s.id === id);
      if (!current) throw new ApiError("Không tìm thấy tài khoản.", 404);
      const role = input.role ?? current.role;
      const active = input.active ?? current.active;
      await api(`/admins/${id}`, {
        method: "PATCH",
        body: { name: current.name, role: role === "Admin" ? "OWNER" : "STAFF", status: active ? "ACTIVE" : "DISABLED" },
      });
      return input.active === undefined ? "Đã đổi vai trò." : active ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản, phiên đang mở bị cắt.";
    }),

    resetStaffPassword: (id, password) => act(async () => {
      await api(`/admins/${id}/password`, { method: "POST", body: { password } });
      return "Đã đặt lại mật khẩu. Nhân viên đăng nhập lại bằng mật khẩu mới.";
    }),

    saveShop: (input) => act(async () => {
      await api("/hub/shop", { method: "PUT", body: input });
      return "Đã lưu thông tin cửa hàng.";
    }),

    /* ---- Hỗ trợ ---- */

    replyTicket: (id, body) => act(async () => {
      await api(isCustomer() ? `/customer/tickets/${id}/messages` : `/service-desk/tickets/${id}/messages`, { method: "POST", body: { body } });
      return "Đã gửi phản hồi.";
    }),

    setTicketStatus: (id, status) => act(async () => {
      await api(`/service-desk/tickets/${id}/status`, { method: "PATCH", body: { status } });
      return status === "OPEN" ? "Đã mở lại yêu cầu." : "Đã cập nhật trạng thái yêu cầu.";
    }),

    /* ---- Cổng khách ---- */

    completeProfile: (fields) => act(async () => {
      await api("/hub/profile", { method: "PATCH", body: fields });
      return "Đã lưu hồ sơ khách hàng.";
    }),

    requestRental: ({ deviceId, days, note, contactPhone, contactChannel, handoverMethod }) => act(async () => {
      const n = Math.max(1, Math.round(days));
      const start = new Date(Date.now() + 60_000);
      const end = new Date(start.getTime() + n * 86_400_000);
      const r = await api<{ code: string }>("/customer/bookings", {
        method: "POST",
        body: {
          deviceId, billingMode: "MONTHLY", startAt: start.toISOString(), endAt: end.toISOString(), note,
          contactPhone, contactChannel, handoverMethod,
        },
      });
      return `Đã gửi yêu cầu ${r.code}. Cửa hàng sẽ xác nhận giá và liên hệ bạn qua ${CONTACT_CHANNEL[contactChannel] ?? "điện thoại"} ${contactPhone}.`;
    }),

    cancelBooking: (id) => act(async () => {
      await api(`/customer/bookings/${id}/cancel`, { method: "PATCH" });
      return "Đã huỷ yêu cầu thuê.";
    }),

    payWithWallet: ({ orderId, amount }) => act(async () => {
      await api(`/customer/rentals/${orderId}/pay-with-wallet`, { method: "POST", body: { amount } });
      return `Đã trả ${money(amount)} từ ví.`;
    }),

    requestExtension: ({ orderId, days, note }) => act(async () => {
      const order = get().orders.find((o) => o.id === orderId);
      if (!order) throw new ApiError("Không tìm thấy đơn thuê.", 404);
      const requestedEndAt = new Date(new Date(order.end).getTime() + Math.max(1, Math.round(days)) * 86_400_000).toISOString();
      const r = await api<{ code: string }>(`/customer/rentals/${orderId}/extensions`, { method: "POST", body: { requestedEndAt, note } });
      return `Đã gửi yêu cầu gia hạn ${r.code}. Cửa hàng sẽ báo phí và xác nhận.`;
    }),

    createTicket: ({ subject, category, message, orderId }) => act(async () => {
      const r = await api<{ code: string }>("/customer/tickets", {
        method: "POST", body: { subject, category, message, rentalId: orderId || null },
      });
      return `Đã gửi yêu cầu hỗ trợ ${r.code}.`;
    }),

    readNotices: async () => {
      try {
        await api("/customer/notifications/read-all", { method: "POST" });
        set({ notices: get().notices.map((n) => ({ ...n, read: true })) });
      } catch (e) {
        set({ toast: errorText(e) });
      }
    },
  };
});

export function currentAccount(state: State) {
  return state.account;
}

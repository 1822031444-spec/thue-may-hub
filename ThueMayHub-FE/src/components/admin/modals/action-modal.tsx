import { useState } from "react";
import { X } from "lucide-react";
import { CONTACT_CHANNEL, HANDOVER_METHOD, dateLabel, dayPrice, money, orderDays, useHub, type Repair } from "@/lib/tmh-store";
import { FormField } from "@/components/ui/form-field";

export type ModalType =
  | "order" | "device" | "deviceEdit" | "customer" | "customerEdit" | "payment" | "repair"
  | "approve" | "reject" | "deposit" | "finish" | "unrepairable" | "repairPart"
  | "renew" | "refund" | "extApprove" | "extReject"
  | "part" | "purchase" | "staff" | "staffPassword" | "password" | "topupApprove" | "topupReject";

const PART_CATEGORY: [string, string][] = [
  ["RAM", "RAM"], ["STORAGE", "Ổ cứng"], ["GPU", "Card đồ hoạ"], ["CPU", "CPU"], ["MAINBOARD", "Bo mạch"],
  ["PSU", "Nguồn"], ["COOLING", "Tản nhiệt"], ["SCREEN", "Màn hình"], ["BATTERY", "Pin"], ["CABLE", "Cáp"], ["OTHER", "Khác"],
];

const UNIT_DAYS = { DAY: 1, WEEK: 7, MONTH: 30 } as const;
const PASSWORD_HINT = "Ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.";

/** `context` là id của đối tượng đang thao tác: đơn, yêu cầu, khách, máy, phiếu sửa, linh kiện hoặc nhân viên. */
export function ActionModal({
  type,
  context,
  onClose,
}: {
  type: ModalType;
  context?: string;
  onClose: () => void;
}) {
  const store = useHub();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const free = store.devices.filter((d) => d.status === "AVAILABLE");
  const openOrders = store.orders.filter((o) => o.kind === "rental" && o.status !== "CANCELLED" && o.total > o.paid);
  const order = store.orders.find((o) => o.id === context);
  const orderDevice = store.devices.find((d) => d.id === order?.deviceId);
  const customer = store.customers.find((c) => c.id === context);
  const device = store.devices.find((d) => d.id === context);
  const repair = store.repairs.find((r) => r.id === context);
  const part = store.parts.find((p) => p.id === context);
  const member = store.staff.find((s) => s.id === context);
  const extension = store.extensions.find((e) => e.id === context);
  const topup = store.topups.find((t) => t.id === context);
  const extensionDevice = store.devices.find((d) => d.name === extension?.deviceName);
  // Báo giá mặc định theo ngày từ giá tháng của máy, giống cách cửa hàng tính khi tạo đơn tại quầy.
  const suggested = order ? (orderDevice ? dayPrice(orderDevice.monthly, orderDays(order)) : order.total) : 0;
  const extensionDays = extension
    ? Math.max(1, Math.round((new Date(extension.requestedEnd).getTime() - new Date(extension.currentEnd).getTime()) / 86_400_000))
    : 0;

  // Gia hạn: tự gợi ý tiền theo đơn vị và số lượng, người dùng vẫn sửa được.
  const [renewUnit, setRenewUnit] = useState<keyof typeof UNIT_DAYS>("MONTH");
  const [renewQty, setRenewQty] = useState(1);
  const renewSuggest = orderDevice ? dayPrice(orderDevice.monthly, UNIT_DAYS[renewUnit] * Math.max(1, renewQty)) : 0;

  const title = {
    order: "Tạo đơn thuê mới",
    device: "Thêm máy mới",
    deviceEdit: `Sửa máy ${device?.code ?? ""}`,
    customer: "Thêm khách hàng",
    customerEdit: `Sửa khách hàng ${customer?.code ?? ""}`,
    payment: "Thu tiền đơn thuê",
    repair: "Tạo phiếu sửa chữa",
    approve: "Duyệt yêu cầu thuê",
    reject: "Từ chối yêu cầu thuê",
    deposit: "Nạp tiền vào ví khách",
    finish: "Đóng phiếu sửa chữa",
    unrepairable: "Máy không sửa được",
    repairPart: "Lắp linh kiện vào máy",
    renew: `Gia hạn đơn ${order?.code ?? ""}`,
    refund: `Hoàn tiền đơn ${order?.code ?? ""}`,
    extApprove: "Duyệt yêu cầu gia hạn",
    extReject: "Từ chối yêu cầu gia hạn",
    part: "Thêm linh kiện",
    purchase: `Nhập kho ${part?.name ?? ""}`,
    staff: "Thêm tài khoản nhân sự",
    staffPassword: `Đặt lại mật khẩu cho ${member?.name ?? ""}`,
    password: "Đổi mật khẩu của tôi",
    topupApprove: "Xác nhận đã nhận tiền nạp",
    topupReject: "Không thấy khoản chuyển khoản",
  }[type];

  async function submit(data: FormData) {
    const text = (key: string) => String(data.get(key) || "").trim();
    const num = (key: string) => Number(data.get(key) || 0);
    const id = context ?? "";
    switch (type) {
      case "order":
        return store.addOrder({
          customerId: text("customerId"), deviceId: text("deviceId"), days: num("days"), note: text("note"),
          handover: text("handover") === "now",
        });
      case "device":
      case "deviceEdit": {
        const fields = {
          name: text("name"), type: text("kind") as "PC" | "Boxphone", category: text("category"),
          location: text("location"), monthly: num("monthly"), hourly: num("hourly"),
          specs: text("specs"), ipAddress: text("ipAddress"),
        };
        return type === "device" ? store.addDevice(fields) : store.updateDevice(id, fields);
      }
      case "customer":
      case "customerEdit": {
        const fields = {
          name: text("name"), phone: text("phone"), email: text("email"),
          address: text("address"), identityNumber: text("identityNumber"), notes: text("notes"),
        };
        return type === "customer" ? store.addCustomer(fields) : store.updateCustomer(id, fields);
      }
      case "payment":
        return store.addPayment({ orderId: text("orderId"), amount: num("amount"), method: text("method") });
      case "repair":
        return store.addRepair({
          deviceId: text("deviceId"), issue: text("issue"), priority: text("priority") as Repair["priority"],
          technician: text("technician"), cost: num("cost"),
        });
      case "approve":
        return store.approveBooking({ id, amount: num("amount"), note: text("note") });
      case "reject":
        return store.rejectBooking({ id, note: text("note") });
      case "deposit":
        return store.deposit({ customerId: id, amount: num("amount"), method: text("method") });
      case "finish":
        return store.finishRepair({ id, cost: num("cost") });
      case "unrepairable":
        return store.failRepair({ id, cost: num("cost"), note: text("note") });
      case "repairPart":
        return store.addRepairPart({ repairId: id, partId: text("partId"), quantity: num("quantity") });
      case "renew":
        return store.renewOrder({
          orderId: id, unit: renewUnit, quantity: Math.max(1, renewQty), amount: num("amount"), collect: text("collect"),
        });
      case "refund":
        return store.refundOrder({ orderId: id, amount: num("amount"), destination: text("destination"), note: text("note") });
      case "extApprove":
        return store.approveExtension({ id, amount: num("amount"), note: text("note") });
      case "extReject":
        return store.rejectExtension({ id, note: text("note") });
      case "part":
        return store.addPart({
          name: text("name"), category: text("category"), unit: text("unit") || "cái",
          minQuantity: num("minQuantity"), location: text("location"),
        });
      case "purchase":
        return store.purchasePart({
          partId: id, quantity: num("quantity"), unitCost: num("unitCost"), method: text("method"), vendor: text("vendor"),
        });
      case "staff":
        return store.addStaff({
          name: text("name"), username: text("username").toLowerCase(), email: text("email"),
          password: String(data.get("password") || ""), role: text("role") as "Admin" | "Staff",
        });
      case "staffPassword":
        return store.resetStaffPassword(id, String(data.get("password") || ""));
      case "topupApprove":
        return store.approveTopup({ id, amount: num("amount"), note: text("note") });
      case "topupReject":
        return store.rejectTopup({ id, note: text("note") });
      case "password": {
        const next = String(data.get("next") || "");
        if (next !== String(data.get("confirm") || "")) return "Mật khẩu nhập lại không khớp.";
        return store.changePassword(String(data.get("current") || ""), next);
      }
    }
  }

  const danger = type === "reject" || type === "extReject" || type === "unrepairable" || type === "refund" || type === "topupReject";
  const submitLabel = {
    approve: "Duyệt", extApprove: "Duyệt gia hạn", reject: "Từ chối", extReject: "Từ chối",
    refund: "Hoàn tiền", renew: "Gia hạn", unrepairable: "Xác nhận", repairPart: "Lắp vào máy",
    purchase: "Nhập kho", password: "Đổi mật khẩu", staffPassword: "Đặt lại",
    topupApprove: "Cộng vào ví", topupReject: "Báo khách",
  }[type as string] ?? "Lưu";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await submit(new FormData(e.currentTarget));
          setBusy(false);
          if (err) setError(err);
          else onClose();
        }}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-muted hover:text-fg">
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>
        )}

        {type === "order" && (
          <>
            <FormField label="Khách hàng" name="customerId" as="select">
              {store.customers
                .filter((c) => c.profileComplete !== false && c.name && !c.blacklist)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
            </FormField>
            <FormField label="Máy còn trống" name="deviceId" as="select">
              {free.length === 0 ? (
                <option value="" disabled>Không còn máy trống</option>
              ) : (
                free.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name} ({money(d.monthly)}/tháng)
                  </option>
                ))
              )}
            </FormField>
            <FormField label="Số ngày thuê" name="days" type="number" defaultValue="7" min={1} required hint="Giá tính theo ngày từ giá tháng của máy." />
            <FormField label="Giao máy" name="handover" as="select" defaultValue="now">
              <option value="now">Giao ngay — đơn đang thuê</option>
              <option value="later">Giữ chỗ — giao máy sau</option>
            </FormField>
            <FormField label="Ghi chú đơn hàng" name="note" placeholder="Yêu cầu riêng, thông tin cọc..." />
          </>
        )}

        {(type === "device" || (type === "deviceEdit" && device)) && (
          <>
            <FormField label="Tên máy / cấu hình" name="name" required minLength={2} defaultValue={device?.name} placeholder="PC Gaming RTX 4070..." />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Loại thiết bị" name="kind" as="select" defaultValue={device?.type ?? "PC"}>
                <option value="PC">PC</option>
                <option value="Boxphone">Boxphone</option>
              </FormField>
              <FormField label="Phân nhóm" name="category" defaultValue={device?.category ?? "Văn phòng"} placeholder="Gaming, Đồ họa, 8 khe..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vị trí lắp đặt" name="location" defaultValue={device?.location ?? "Tầng 1 · Khu A"} />
              <FormField label="Địa chỉ IP" name="ipAddress" defaultValue={device?.ipAddress} placeholder="192.168.1.20" hint="Dùng cho khoá mạng khi hết hạn." />
            </div>
            <FormField label="Cấu hình chi tiết" name="specs" defaultValue={device?.specs} placeholder="Ryzen 7 / RAM 32GB / RTX 4060" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Giá theo giờ (đ)" name="hourly" type="number" defaultValue={String(device?.hourly ?? 30000)} min={0} required />
              <FormField label="Giá theo tháng (đ)" name="monthly" type="number" defaultValue={String(device?.monthly ?? 4000000)} min={0} required />
            </div>
          </>
        )}

        {(type === "customer" || (type === "customerEdit" && customer)) && (
          <>
            <FormField label="Họ tên khách hàng" name="name" required minLength={2} defaultValue={customer?.name} placeholder="Nguyễn Văn A" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Số điện thoại" name="phone" required defaultValue={customer?.phone} placeholder="0901234567" />
              <FormField label="Email" name="email" type="email" defaultValue={customer?.email} placeholder="khachhang@email.com" />
            </div>
            <FormField label="Địa chỉ" name="address" defaultValue={customer?.address} placeholder="Số nhà, đường, quận..." />
            <FormField label="Số CCCD" name="identityNumber" defaultValue={customer?.identityNumber} pattern="\d{9,12}" title="9 đến 12 chữ số" placeholder="079..." />
            <FormField label="Ghi chú" name="notes" defaultValue={customer?.notes} placeholder="Khách quen, hạn mức nợ..." />
          </>
        )}

        {type === "payment" && (
          <>
            <FormField label="Đơn thuê còn nợ" name="orderId" as="select" defaultValue={context}>
              {openOrders.length === 0 ? (
                <option value="" disabled>Tất cả đơn đã thanh toán đủ</option>
              ) : (
                openOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} · {o.customerName} · Còn nợ: {money(o.total - o.paid)}
                  </option>
                ))
              )}
            </FormField>
            <FormField
              label="Số tiền thu (đ)" name="amount" type="number" required min={1000} placeholder="Ví dụ: 1000000"
              defaultValue={order ? String(order.total - order.paid) : undefined}
            />
            <FormField label="Phương thức thu" name="method" as="select">
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
              <option value="Ví khách hàng">Ví khách hàng</option>
            </FormField>
          </>
        )}

        {type === "repair" && (
          <>
            <FormField label="Thiết bị gặp sự cố" name="deviceId" as="select" defaultValue={context}>
              {store.devices.filter((d) => d.status !== "RETIRED").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </option>
              ))}
            </FormField>
            <FormField label="Mô tả sự cố" name="issue" required minLength={3} placeholder="Không lên nguồn, lỗi mạng..." />
            <FormField label="Mức độ ưu tiên" name="priority" as="select">
              <option value="Trung bình">Trung bình</option>
              <option value="Cao">Cao</option>
              <option value="Thấp">Thấp</option>
            </FormField>
            <FormField label="Kỹ thuật viên phụ trách" name="technician" defaultValue="Lê Minh Tuấn" />
            <FormField label="Chi phí ước tính (đ)" name="cost" type="number" defaultValue="0" min={0} />
          </>
        )}

        {type === "approve" && order && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted">
              <strong className="text-fg">{order.customerName}</strong> muốn thuê{" "}
              <strong className="text-fg">{order.deviceName}</strong> trong {orderDays(order)} ngày. Duyệt thì hệ thống tạo đơn ở
              trạng thái <strong className="text-fg">Đã xác nhận</strong> và giữ máy cho khách.
            </p>
            <p className="mb-4 rounded-lg border border-line p-3 text-sm leading-6">
              Liên hệ giao máy: <strong>{CONTACT_CHANNEL[order.contactChannel] ?? "SĐT"} {order.contactPhone || "—"}</strong>
              {order.handover && <> · nhận máy qua <strong>{HANDOVER_METHOD[order.handover] ?? order.handover}</strong></>}
              {order.note && <span className="block text-xs text-muted">Ghi chú của khách: “{order.note}”</span>}
            </p>
            <FormField label="Giá chốt cho khách (đ)" name="amount" type="number" required min={0} defaultValue={String(suggested)} />
            <FormField label="Ghi chú gửi khách" name="note" placeholder="Hẹn giờ nhận máy, thông tin cọc..." />
          </>
        )}

        {type === "reject" && order && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              Yêu cầu {order.code} của <strong className="text-fg">{order.customerName}</strong> — {order.deviceName}.
            </p>
            <FormField label="Lý do từ chối (khách sẽ thấy)" name="note" required minLength={3} placeholder="Máy đã có người đặt trước..." />
          </>
        )}

        {type === "renew" && order && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted">
              {order.customerName} · {order.deviceName}. Hạn hiện tại <strong className="text-fg">{dateLabel(order.end)}</strong>; kỳ mới nối tiếp
              ngay sau hạn cũ. Mỗi lần gia hạn được lưu thành một kỳ thuê riêng.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="mb-3 block text-sm font-bold">
                Đơn vị
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-medium"
                  value={renewUnit}
                  onChange={(e) => setRenewUnit(e.target.value as keyof typeof UNIT_DAYS)}
                >
                  <option value="DAY">Ngày</option>
                  <option value="WEEK">Tuần</option>
                  <option value="MONTH">Tháng</option>
                </select>
              </label>
              <label className="mb-3 block text-sm font-bold">
                Số lượng
                <input
                  type="number" min={1} max={60} required
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-medium"
                  value={renewQty}
                  onChange={(e) => setRenewQty(Number(e.target.value))}
                />
              </label>
            </div>
            <FormField
              key={renewSuggest}
              label="Tiền gia hạn (đ)" name="amount" type="number" required min={0} defaultValue={String(renewSuggest)}
              hint="Gợi ý theo giá tháng của máy; sửa được."
            />
            <FormField label="Thu tiền ngay" name="collect" as="select" defaultValue="">
              <option value="">Chưa thu — ghi nợ vào đơn</option>
              <option value="Tiền mặt">Thu tiền mặt</option>
              <option value="Chuyển khoản">Thu chuyển khoản</option>
              <option value="Ví khách hàng">Trừ ví khách</option>
            </FormField>
          </>
        )}

        {type === "refund" && order && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {order.customerName} · đã thu <strong className="text-fg">{money(order.paid)}</strong>. Chỉ hoàn được tối đa số đã thu.
            </p>
            <FormField label="Số tiền hoàn (đ)" name="amount" type="number" required min={1000} max={order.paid} />
            <FormField label="Hoàn về" name="destination" as="select">
              <option value="Ví khách hàng">Ví khách hàng</option>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Chuyển khoản">Chuyển khoản</option>
            </FormField>
            <FormField label="Lý do hoàn tiền" name="note" required minLength={3} placeholder="Khách trả máy sớm, máy lỗi..." />
          </>
        )}

        {type === "extApprove" && extension && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted">
              <strong className="text-fg">{extension.customerName}</strong> xin gia hạn đơn {extension.orderCode} ({extension.deviceName}) từ{" "}
              {dateLabel(extension.currentEnd)} tới <strong className="text-fg">{dateLabel(extension.requestedEnd)}</strong> ({extensionDays} ngày).
              {extension.note && <> Ghi chú: “{extension.note}”.</>}
            </p>
            <FormField
              label="Phí gia hạn (đ)" name="amount" type="number" required min={0}
              defaultValue={String(extensionDevice ? dayPrice(extensionDevice.monthly, extensionDays) : 0)}
              hint="Cộng vào tổng tiền của đơn; khách trả sau như các khoản khác."
            />
            <FormField label="Ghi chú gửi khách" name="note" placeholder="Đã gia hạn, nhớ thanh toán trước ngày..." />
          </>
        )}

        {type === "extReject" && extension && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {extension.code} · {extension.customerName} · đơn {extension.orderCode}.
            </p>
            <FormField label="Lý do từ chối (khách sẽ thấy)" name="note" required minLength={3} placeholder="Máy đã có khách đặt..." />
          </>
        )}

        {type === "deposit" && customer && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {customer.name} ({customer.code}) · Số dư hiện tại: <strong className="text-fg">{money(customer.wallet)}</strong>
            </p>
            <FormField label="Số tiền nạp (đ)" name="amount" type="number" required min={1000} placeholder="Ví dụ: 500000" />
            <FormField label="Khách trả bằng" name="method" as="select">
              <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
              <option value="Tiền mặt">Tiền mặt</option>
            </FormField>
          </>
        )}

        {type === "topupApprove" && topup && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted">
              <strong className="text-fg">{topup.customerName}</strong> ({topup.customerCode}) xin nạp <strong className="text-fg">{money(topup.amount)}</strong>,
              nội dung chuyển khoản <strong className="font-mono text-fg">{topup.note}</strong>. Chỉ xác nhận khi đã thấy tiền về tài khoản.
            </p>
            <FormField
              label="Số tiền thực nhận (đ)" name="amount" type="number" required min={1000} defaultValue={String(topup.amount)}
              hint="Khách chuyển khác số đã chọn thì sửa lại đúng số tiền đã về tài khoản."
            />
            <FormField label="Ghi chú" name="note" placeholder="Mã giao dịch ngân hàng..." />
          </>
        )}

        {type === "topupReject" && topup && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {topup.note} · {topup.customerName} · {money(topup.amount)}.
            </p>
            <FormField label="Lý do (khách sẽ thấy)" name="note" required minLength={3} placeholder="Chưa thấy khoản chuyển khoản với nội dung này..." />
          </>
        )}

        {type === "finish" && repair && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {repair.code} · {repair.deviceName} — {repair.issue}. Đóng phiếu sẽ ghi tiền công vào sổ chi phí và trả máy về trạng thái sẵn sàng.
            </p>
            <FormField label="Tiền công thực tế (đ)" name="cost" type="number" required min={0} defaultValue={String(repair.serviceCost)} />
          </>
        )}

        {type === "unrepairable" && repair && (
          <>
            <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              {repair.code} · {repair.deviceName}. Xác nhận không sửa được thì máy chuyển sang <strong>Ngừng dùng</strong> và
              không còn xuất hiện khi tạo đơn.
            </p>
            <FormField label="Tiền công đã trả (đ)" name="cost" type="number" required min={0} defaultValue={String(repair.serviceCost)} />
            <FormField label="Kết luận của kỹ thuật" name="note" required minLength={3} placeholder="Hỏng mainboard, không còn linh kiện thay..." />
          </>
        )}

        {type === "repairPart" && repair && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {repair.code} · {repair.deviceName}. Lắp từ kho chỉ trừ tồn kho; tiền linh kiện đã tính lúc nhập mua.
            </p>
            <FormField label="Linh kiện" name="partId" as="select">
              {store.parts.filter((p) => p.quantity > 0).length === 0 ? (
                <option value="" disabled>Kho đã hết linh kiện</option>
              ) : (
                store.parts.filter((p) => p.quantity > 0).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name} (còn {p.quantity} {p.unit})
                  </option>
                ))
              )}
            </FormField>
            <FormField label="Số lượng" name="quantity" type="number" required min={1} defaultValue="1" />
          </>
        )}

        {type === "part" && (
          <>
            <FormField label="Tên linh kiện" name="name" required minLength={2} placeholder="RAM DDR4 16GB..." />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nhóm" name="category" as="select" defaultValue="OTHER">
                {PART_CATEGORY.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </FormField>
              <FormField label="Đơn vị" name="unit" defaultValue="cái" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tồn tối thiểu" name="minQuantity" type="number" min={0} defaultValue="1" hint="Dưới mức này thì cảnh báo." />
              <FormField label="Vị trí trong kho" name="location" placeholder="Tủ A2" />
            </div>
          </>
        )}

        {type === "purchase" && part && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              Tồn hiện tại {part.quantity} {part.unit} · giá vốn bình quân {money(part.averageCost)}. Nhập mua ghi một khoản chi vào sổ chi phí.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={`Số lượng (${part.unit})`} name="quantity" type="number" required min={1} defaultValue="1" />
              <FormField label="Đơn giá nhập (đ)" name="unitCost" type="number" required min={0} defaultValue={String(part.averageCost || 0)} />
            </div>
            <FormField label="Trả bằng" name="method" as="select">
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Chuyển khoản">Chuyển khoản</option>
            </FormField>
            <FormField label="Nhà cung cấp" name="vendor" placeholder="Cửa hàng linh kiện..." />
          </>
        )}

        {type === "staff" && (
          <>
            <FormField label="Họ và tên" name="name" required minLength={2} placeholder="Nguyễn Văn B" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Username" name="username" required pattern="[a-zA-Z0-9._\-]{3,40}" title="3–40 ký tự không dấu" placeholder="nhanvien1" />
              <FormField label="Vai trò" name="role" as="select" defaultValue="Staff">
                <option value="Staff">Nhân viên</option>
                <option value="Admin">Quản trị viên</option>
              </FormField>
            </div>
            <FormField label="Email nội bộ" name="email" type="email" required placeholder="nhanvien1@thuemayhub.com" />
            <FormField label="Mật khẩu ban đầu" name="password" type="password" required minLength={10} hint={PASSWORD_HINT} />
          </>
        )}

        {type === "staffPassword" && member && (
          <>
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-muted">
              {member.name} ({member.username}). Mọi phiên đăng nhập của tài khoản này sẽ bị cắt.
            </p>
            <FormField label="Mật khẩu mới" name="password" type="password" required minLength={10} hint={PASSWORD_HINT} />
          </>
        )}

        {type === "password" && (
          <>
            <FormField label="Mật khẩu hiện tại" name="current" type="password" required autoComplete="current-password" />
            <FormField label="Mật khẩu mới" name="next" type="password" required minLength={10} hint={PASSWORD_HINT} autoComplete="new-password" />
            <FormField label="Nhập lại mật khẩu mới" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            className="h-11 rounded-lg border border-line px-4 text-sm font-bold text-muted hover:text-fg"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className={`h-11 rounded-lg px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60 ${
              danger ? "bg-rose-600" : "bg-primary"
            }`}
            disabled={busy}
          >
            {busy ? "Đang lưu..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

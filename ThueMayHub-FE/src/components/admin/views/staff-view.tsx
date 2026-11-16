import { report, useHub, type StaffUser } from "@/lib/tmh-store";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { rowBtn } from "@/components/ui/buttons";
import { ListCard } from "@/components/ui/list-card";
import { Table } from "@/components/ui/table";

export function StaffView({
  query,
  setQuery,
  onAction,
}: {
  query: string;
  setQuery: (v: string) => void;
  onAction: (type: ModalType, context?: string) => void;
}) {
  const store = useHub();
  const me = store.account?.id;
  const q = query.trim().toLowerCase();

  const filtered = store.staff.filter(
    (a) =>
      a.username.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
  );

  const toggleRole = async (a: StaffUser) => {
    const next = a.role === "Admin" ? "Staff" : "Admin";
    if (!window.confirm(`Đổi ${a.name} thành ${next === "Admin" ? "quản trị viên (xem được tiền, nạp ví, cấu hình)" : "nhân viên"}?`)) return;
    report(await store.updateStaff(a.id, { role: next }));
  };

  const toggleActive = async (a: StaffUser) => {
    if (a.active && !window.confirm(`Khoá tài khoản ${a.username}? Phiên đang mở bị cắt ngay.`)) return;
    report(await store.updateStaff(a.id, { active: !a.active }));
  };

  return (
    <>
      <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Tài khoản quản trị viên và nhân viên nội bộ được cấp quyền trực tiếp trong hệ thống, không đăng ký tự do từ ngoài cổng khách.
        Luôn phải còn ít nhất một quản trị viên đang hoạt động.
      </p>
      <ListCard
        title="Tài khoản nhân sự nội bộ"
        count={`${filtered.length} nhân sự`}
        query={query}
        setQuery={setQuery}
        placeholder="Tìm theo username, họ tên hoặc email..."
      >
        <Table
          heads={["Username", "Họ và tên", "Email nội bộ", "Vai trò", "Trạng thái", "Thao tác"]}
          rows={filtered.map((a) => [
            <span key={a.id} className="font-bold text-primary">{a.username}</span>,
            a.name,
            a.email,
            <span
              key={a.id + "r"}
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                a.role === "Admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {a.role === "Admin" ? "Quản trị viên (Admin)" : "Nhân viên (Staff)"}
            </span>,
            <span key={a.id + "s"} className={`text-xs font-bold ${a.active ? "text-emerald-700" : "text-rose-700"}`}>
              {a.active ? "Đang hoạt động" : "Đã khoá"}
            </span>,
            a.id === me ? (
              <span key={a.id + "a"} className="text-xs text-muted">Tài khoản của bạn</span>
            ) : (
              <div key={a.id + "a"} className="flex flex-wrap gap-1.5">
                <button className={rowBtn.ghost} onClick={() => onAction("staffPassword", a.id)}>Đặt lại mật khẩu</button>
                <button className={rowBtn.muted} onClick={() => toggleRole(a)}>
                  {a.role === "Admin" ? "Hạ xuống nhân viên" : "Nâng lên quản trị"}
                </button>
                <button className={a.active ? rowBtn.danger : rowBtn.primary} onClick={() => toggleActive(a)}>
                  {a.active ? "Khoá" : "Mở khoá"}
                </button>
              </div>
            ),
          ])}
        />
      </ListCard>
    </>
  );
}

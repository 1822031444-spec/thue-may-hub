import { Building2, Pencil, Plus, ShieldAlert, UserRoundPlus, Users, Wallet, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, dateOnly, initials, money } from '../api';
import { useAuth } from '../App';
import { Callout, EmptyState, ErrorState, Field, Modal, PageHeader, SearchBox, Segmented, StatusBadge, TableSkeleton } from '../components/UI';
import { usePendingAction } from '../lib/pendingAction';
import { useToast } from '../lib/toast';
import type { Customer } from '../types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'LIMITED' | 'BLOCKED';

export function CustomersPage() {
  const toast = useToast();
  const { can } = useAuth();
  const canDeposit = can('customer.deposit');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [depositCustomer, setDepositCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  usePendingAction('create', () => setAddOpen(true));

  const load = async () => {
    try {
      setCustomers(await api<Customer[]>('/customers'));
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(); };

  const filtered = useMemo(() => {
    const key = query.toLowerCase().trim();
    return customers.filter((customer) => {
      if (status !== 'ALL' && customer.status !== status) return false;
      if (!key) return true;
      return [customer.name, customer.code, customer.phone, customer.email, customer.company]
        .some((value) => value.toLowerCase().includes(key));
    });
  }, [customers, query, status]);

  const walletTotal = customers.reduce((sum, customer) => sum + Number(customer.wallet_balance || 0), 0);

  const addCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          phone: form.get('phone'),
          email: form.get('email'),
          company: form.get('company'),
          creditLimit: Number(form.get('creditLimit') || 0),
          notes: form.get('notes'),
        }),
      });
      setAddOpen(false);
      toast.success('Đã thêm khách hàng mới.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể tạo khách hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editCustomer) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/customers/${editCustomer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          phone: form.get('phone'),
          email: form.get('email'),
          company: form.get('company'),
          creditLimit: Number(form.get('creditLimit') || 0),
          status: form.get('status'),
          notes: form.get('notes'),
        }),
      });
      toast.success('Đã cập nhật hồ sơ khách hàng.');
      setEditCustomer(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được khách hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  const deposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!depositCustomer) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/customers/${depositCustomer.id}/deposit`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.get('amount')),
          paymentMethod: form.get('paymentMethod'),
          reference: form.get('reference'),
          notes: form.get('notes'),
        }),
      });
      toast.success('Đã ghi nhận tiền nạp.', `${depositCustomer.name} · ${money(Number(form.get('amount')))}`);
      setDepositCustomer(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể ghi nhận tiền nạp.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="CRM nội bộ"
        title="Khách hàng"
        description="Hồ sơ, số dư ví và lịch sử sử dụng dịch vụ."
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Thêm khách hàng</button>}
      />

      <section className="mini-stats three">
        <div><Users /><span>Tổng khách</span><strong>{customers.length}</strong></div>
        <div><WalletCards /><span>Tổng số dư ví</span><strong>{money(walletTotal)}</strong></div>
        <div><Building2 /><span>Khách doanh nghiệp</span><strong>{customers.filter((item) => item.company).length}</strong></div>
      </section>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Tên, số điện thoại, mã khách…" />
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'ALL', label: 'Tất cả' },
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'LIMITED', label: 'Hạn chế' },
            { value: 'BLOCKED', label: 'Đã khoá' },
          ]}
        />
        <div className="toolbar-count"><strong>{filtered.length}</strong> khách hàng</div>
      </div>

      <section className="panel">
        {loading ? <TableSkeleton /> : loadFailed && !customers.length ? (
          <ErrorState onRetry={retry} />
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Trạng thái</th>
                  <th className="num">Số dư ví</th>
                  <th className="num">Đã sử dụng</th>
                  <th className="num">Đơn thuê</th>
                  <th>Từ ngày</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="cell-identity">
                        <div className="avatar">{initials(customer.name)}</div>
                        <div className="cell-stack">
                          <strong>{customer.name}</strong>
                          <small>{customer.company || customer.code}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>{customer.phone || 'Chưa có SĐT'}</span>
                        <small>{customer.email || 'Chưa có email'}</small>
                      </div>
                    </td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td className="num">
                      <span className={`money-cell ${Number(customer.wallet_balance) > 0 ? 'pos' : ''}`}>
                        {money(customer.wallet_balance)}
                      </span>
                    </td>
                    <td className="num money-cell">{money(customer.total_spent)}</td>
                    <td className="num">{customer.rental_count}</td>
                    <td><small className="muted">{dateOnly(customer.created_at)}</small></td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEditCustomer(customer)}><Pencil size={13} /> Sửa</button>
                        {canDeposit && (
                          <button onClick={() => setDepositCustomer(customer)}><Wallet size={13} /> Nạp ví</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={query || status !== 'ALL' ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}
            description={query || status !== 'ALL'
              ? 'Thử từ khoá khác hoặc bỏ bộ lọc trạng thái.'
              : 'Thêm khách đầu tiên để bắt đầu tạo đơn thuê.'}
            action={!query && status === 'ALL' && (
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <UserRoundPlus /> Thêm khách đầu tiên
              </button>
            )}
          />
        )}
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Thêm khách hàng"
        description="Tạo hồ sơ để quản lý đơn thuê và số dư ví."
      >
        <form className="modal-form" onSubmit={addCustomer}>
          <div className="form-grid">
            <Field label="Tên khách hàng" required>
              <input name="name" required minLength={2} placeholder="Nguyễn Văn An" />
            </Field>
            <Field label="Số điện thoại">
              <input name="phone" placeholder="09xx xxx xxx" />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Email"><input name="email" type="email" placeholder="khachhang@email.com" /></Field>
            <Field label="Công ty"><input name="company" placeholder="Nếu có" /></Field>
          </div>
          <Field label="Hạn mức công nợ" hint="Để 0 nếu khách phải thanh toán trước.">
            <input name="creditLimit" type="number" min="0" step="1000" defaultValue="0" />
          </Field>
          <Field label="Ghi chú">
            <textarea name="notes" rows={3} placeholder="Nhu cầu, nguồn khách, lưu ý hỗ trợ…" />
          </Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAddOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu…' : 'Tạo khách hàng'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        title={editCustomer?.name || 'Khách hàng'}
        description={editCustomer ? `${editCustomer.code} · ${editCustomer.rental_count} đơn thuê · Ví ${money(editCustomer.wallet_balance)}` : ''}
      >
        {editCustomer && (
          <form className="modal-form" onSubmit={updateCustomer}>
            <div className="form-grid">
              <Field label="Tên khách hàng" required>
                <input name="name" required minLength={2} defaultValue={editCustomer.name} />
              </Field>
              <Field label="Số điện thoại">
                <input name="phone" defaultValue={editCustomer.phone} placeholder="09xx xxx xxx" />
              </Field>
            </div>
            <div className="form-grid">
              <Field label="Email"><input name="email" type="email" defaultValue={editCustomer.email} /></Field>
              <Field label="Công ty"><input name="company" defaultValue={editCustomer.company} /></Field>
            </div>
            <div className="form-grid">
              <Field label="Hạn mức công nợ" hint="Để 0 nếu khách phải thanh toán trước.">
                <input name="creditLimit" type="number" min="0" step="1000" defaultValue={editCustomer.credit_limit} />
              </Field>
              <Field label="Trạng thái">
                <select name="status" defaultValue={editCustomer.status}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="LIMITED">Hạn chế</option>
                  <option value="BLOCKED">Đã khoá</option>
                </select>
              </Field>
            </div>
            <Field label="Ghi chú">
              <textarea name="notes" rows={3} defaultValue={editCustomer.notes} />
            </Field>
            <Callout icon={ShieldAlert}>
              <strong>Đã khoá</strong> có hiệu lực mạnh: khách biến mất khỏi danh sách chọn khi tạo đơn,
              đồng thời <strong>không đăng nhập được cổng khách hàng nữa</strong> và phiên đang mở của họ
              bị cắt ngay. Đơn đang chạy thì không bị ảnh hưởng.
              <br />
              <strong>Hạn chế</strong> chỉ là nhãn nhắc nhở, hệ thống không tự chặn gì.
            </Callout>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditCustomer(null)}>Huỷ</button>
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!depositCustomer}
        onClose={() => setDepositCustomer(null)}
        title="Ghi nhận nạp ví"
        description={depositCustomer ? `${depositCustomer.name} · Số dư hiện tại ${money(depositCustomer.wallet_balance)}` : ''}
      >
        <form className="modal-form" onSubmit={deposit}>
          <Field label="Số tiền" required>
            <input name="amount" type="number" min="1000" step="1000" required placeholder="1000000" />
          </Field>
          <div className="form-grid">
            <Field label="Phương thức">
              <select name="paymentMethod" defaultValue="BANK">
                <option value="BANK">Chuyển khoản</option>
                <option value="CASH">Tiền mặt</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Mã tham chiếu">
              <input name="reference" placeholder="Mã giao dịch ngân hàng" />
            </Field>
          </div>
          <Field label="Ghi chú"><textarea name="notes" rows={2} placeholder="Nội dung đối soát…" /></Field>
          <Callout icon={Wallet}>
            Tiền nạp làm tăng tiền thực thu và số dư ví, chưa được tính là doanh thu cho tới khi dùng để trả đơn thuê.
          </Callout>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDepositCustomer(null)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang ghi nhận…' : 'Xác nhận nạp ví'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

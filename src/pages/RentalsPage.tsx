import { CalendarClock, CircleDollarSign, Clock3, Plus, ReceiptText, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, dateTime, money, timeUntil, toLocalInput } from '../api';
import { useAuth } from '../App';
import { Callout, ConfirmModal, EmptyState, ErrorState, Field, Modal, PageHeader, SearchBox, Segmented, StatusBadge, TableSkeleton } from '../components/UI';
import { usePendingAction } from '../lib/pendingAction';
import { addPeriod, suggestedRate, UNIT_LABELS, type PeriodUnit } from '../lib/rental-period';
import { useToast } from '../lib/toast';
import type { Customer, Device, Rental } from '../types';

type RentalFilter = 'OPEN' | 'EXPIRING' | 'OVERDUE' | 'COMPLETED' | 'ALL';

/** Còn hạn nhưng hết trong 7 ngày tới — nhóm cần gọi nhắc khách trả tiền. */
function isExpiringSoon(rental: Rental) {
  if (!['ACTIVE', 'RESERVED'].includes(rental.status)) return false;
  const end = new Date(rental.end_at).getTime();
  const now = Date.now();
  return end >= now && end - now <= 7 * 86_400_000;
}

/** Đơn còn mở nhưng đã qua giờ kết thúc. Tính tại chỗ chứ không lưu thành trạng thái. */
function isOverdue(rental: Rental) {
  return ['ACTIVE', 'RESERVED'].includes(rental.status) && new Date(rental.end_at).getTime() < Date.now();
}

export function RentalsPage() {
  const toast = useToast();
  const { can } = useAuth();
  const canRefund = can('rental.refund');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RentalFilter>('OPEN');
  const [addOpen, setAddOpen] = useState(false);
  const [paymentRental, setPaymentRental] = useState<Rental | null>(null);
  const [refundRental, setRefundRental] = useState<Rental | null>(null);
  const [cancelRental, setCancelRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /** Mã đơn đang đổi trạng thái — chỉ khoá nút của đúng dòng đó. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [renewRental, setRenewRental] = useState<Rental | null>(null);
  const [pendingRenewId, setPendingRenewId] = useState<string | null>(null);
  const [renewForm, setRenewForm] = useState({
    unit: 'MONTH' as PeriodUnit,
    quantity: 1,
    amount: 0,
    from: 'END' as 'END' | 'NOW',
    collect: true,
    source: 'BANK',
    reference: '',
  });

  const load = async () => {
    try {
      const [rentalData, customerData, deviceData] = await Promise.all([
        api<Rental[]>('/rentals'),
        api<Customer[]>('/customers'),
        api<Device[]>('/devices'),
      ]);
      setRentals(rentalData);
      setCustomers(customerData);
      setDevices(deviceData);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh sách đơn thuê.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(); };

  const availableDevices = devices.filter((device) => device.status === 'AVAILABLE');
  const canCreate = customers.length > 0 && availableDevices.length > 0;

  usePendingAction('create', () => {
    if (canCreate) setAddOpen(true);
    else toast.error('Chưa tạo được đơn thuê.', 'Cần ít nhất một khách hàng và một thiết bị đang sẵn sàng.');
  });

  // Bấm "Gia hạn" ở trang Tổng quan sẽ nhảy sang đây kèm mã đơn và mở sẵn form.
  usePendingAction<string>('renew', (rentalId) => {
    if (!rentalId) return;
    setPendingRenewId(rentalId);
  });

  // Danh sách đơn có thể chưa tải xong lúc điều hướng tới, nên chờ có dữ liệu rồi mở.
  useEffect(() => {
    if (!pendingRenewId) return;
    const target = rentals.find((item) => item.id === pendingRenewId);
    if (!target) return;
    openRenew(target);
    setPendingRenewId(null);
  }, [pendingRenewId, rentals]);

  const filtered = useMemo(() => {
    const key = query.toLowerCase().trim();
    return rentals.filter((rental) => {
      const statusMatch = filter === 'ALL'
        || (filter === 'OPEN' ? ['ACTIVE', 'RESERVED'].includes(rental.status)
          : filter === 'EXPIRING' ? isExpiringSoon(rental)
            : filter === 'OVERDUE' ? isOverdue(rental)
              : rental.status === filter);
      if (!statusMatch) return false;
      if (!key) return true;
      return [rental.code, rental.customer_name, rental.device_name, rental.device_code]
        .some((value) => (value || '').toLowerCase().includes(key));
    });
  }, [rentals, filter, query]);

  const addRental = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/rentals', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.get('customerId'),
          deviceId: form.get('deviceId'),
          startAt: new Date(String(form.get('startAt'))).toISOString(),
          endAt: new Date(String(form.get('endAt'))).toISOString(),
          baseAmount: Number(form.get('baseAmount') || 0),
          surcharge: Number(form.get('surcharge') || 0),
          discount: Number(form.get('discount') || 0),
          status: form.get('status'),
          accessNote: form.get('accessNote'),
          notes: form.get('notes'),
        }),
      });
      setAddOpen(false);
      toast.success('Đã tạo đơn và giữ thiết bị.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể tạo đơn thuê.');
    } finally {
      setSubmitting(false);
    }
  };

  const addPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentRental) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/rentals/${paymentRental.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.get('amount')),
          source: form.get('source'),
          reference: form.get('reference'),
          notes: form.get('notes'),
        }),
      });
      toast.success('Đã ghi nhận thanh toán.', `${paymentRental.code} · ${money(Number(form.get('amount')))}`);
      setPaymentRental(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể ghi nhận thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Giá gợi ý của máy theo đơn vị đang chọn; 0 nghĩa là máy chưa khai báo giá đó. */
  const suggested = useMemo(() => {
    const device = devices.find((item) => item.id === renewRental?.device_id);
    return device ? suggestedRate(device, renewForm.unit) : 0;
  }, [devices, renewRental, renewForm.unit]);

  /** Hạn mới, tính ngay trên máy để người dùng thấy trước khi bấm. */
  const renewPreview = useMemo(() => {
    if (!renewRental) return null;
    const oldEnd = new Date(renewRental.end_at);
    const now = new Date();
    const start = renewForm.from === 'NOW' && now > oldEnd ? now : oldEnd;
    return addPeriod(start, renewForm.unit, renewForm.quantity).toISOString();
  }, [renewRental, renewForm.from, renewForm.unit, renewForm.quantity]);

  /** Mở form gia hạn với giá điền sẵn theo giá tháng của máy. */
  const openRenew = (rental: Rental) => {
    const device = devices.find((item) => item.id === rental.device_id);
    const rate = device ? suggestedRate(device, 'MONTH') : 0;
    setRenewForm({
      unit: 'MONTH', quantity: 1, amount: rate, from: 'END',
      collect: true, source: 'BANK', reference: '',
    });
    setRenewRental(rental);
  };

  // Đổi đơn vị hay số kỳ thì tính lại tiền theo giá máy. Người dùng vẫn sửa tay
  // được sau đó, và con số tự điền chỉ ghi đè khi họ đổi đơn vị/số kỳ lần nữa.
  useEffect(() => {
    if (!renewRental || suggested <= 0) return;
    setRenewForm((value) => ({ ...value, amount: suggested * value.quantity }));
  }, [renewRental?.id, renewForm.unit, renewForm.quantity, suggested]);

  const renew = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renewRental) return;
    setSubmitting(true);
    try {
      const result = await api<{ endAt: string; collected: boolean }>(`/rentals/${renewRental.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          unit: renewForm.unit,
          quantity: renewForm.quantity,
          amount: renewForm.amount,
          from: renewForm.from,
          collect: renewForm.collect
            ? { source: renewForm.source, reference: renewForm.reference }
            : null,
        }),
      });
      toast.success(
        renewForm.collect ? 'Đã gia hạn và thu tiền.' : 'Đã gia hạn, khoản này ghi nợ.',
        `${renewRental.code} · hạn mới ${dateTime(result.endAt)}`,
      );
      setRenewRental(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không gia hạn được đơn thuê.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (rental: Rental, status: string) => {
    // Bấm nhanh hai lần sẽ gửi hai lệnh PATCH; khoá dòng lại cho tới khi tải xong.
    if (busyId) return;
    setBusyId(rental.id);
    try {
      await api(`/rentals/${rental.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(status === 'ACTIVE' ? 'Đã kích hoạt đơn thuê.' : 'Đã hoàn tất đơn thuê.', rental.code);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể cập nhật trạng thái.');
    } finally {
      setBusyId(null);
    }
  };

  const refund = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refundRental) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/rentals/${refundRental.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.get('amount')),
          destination: form.get('destination'),
          reference: form.get('reference'),
          notes: form.get('notes'),
        }),
      });
      toast.success('Đã ghi nhận hoàn tiền.', refundRental.code);
      setRefundRental(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể hoàn tiền.');
    } finally {
      setSubmitting(false);
    }
  };

  const overdueCount = rentals.filter(isOverdue).length;
  const expiringCount = rentals.filter(isExpiringSoon).length;
  const activeCount = rentals.filter((rental) => rental.status === 'ACTIVE').length;
  const reservedCount = rentals.filter((rental) => rental.status === 'RESERVED').length;
  const receivable = rentals
    .filter((rental) => rental.status !== 'CANCELLED')
    .reduce((sum, rental) => sum + Math.max(rental.total_amount - rental.paid_amount, 0), 0);

  const defaultStart = toLocalInput(new Date());
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);

  return (
    <>
      <PageHeader
        eyebrow="Vòng đời dịch vụ"
        title="Đơn thuê"
        description="Tạo đơn, thu tiền, kích hoạt và kết thúc phiên thuê."
        actions={(
          <button
            className="btn btn-primary"
            onClick={() => setAddOpen(true)}
            disabled={!canCreate}
            title={canCreate ? undefined : 'Cần có khách hàng và thiết bị đang sẵn sàng'}
          >
            <Plus /> Tạo đơn thuê
          </button>
        )}
      />

      <section className="mini-stats three">
        <div><CalendarClock /><span>Đang thuê</span><strong>{activeCount}</strong></div>
        <div><Clock3 /><span>Đã giữ chỗ</span><strong>{reservedCount}</strong></div>
        <div><CircleDollarSign /><span>Cần thu</span><strong>{money(receivable)}</strong></div>
      </section>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Mã đơn, khách hoặc thiết bị…" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'OPEN', label: 'Đang mở' },
            { value: 'EXPIRING', label: `Sắp hết hạn${expiringCount ? ` (${expiringCount})` : ''}` },
            { value: 'OVERDUE', label: `Quá hạn${overdueCount ? ` (${overdueCount})` : ''}` },
            { value: 'COMPLETED', label: 'Hoàn tất' },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
        <div className="toolbar-count"><strong>{filtered.length}</strong> đơn</div>
      </div>

      <section className="panel">
        {loading ? <TableSkeleton /> : loadFailed && !rentals.length ? (
          <ErrorState onRetry={retry} />
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn / thiết bị</th>
                  <th>Khách hàng</th>
                  <th>Thời hạn</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((rental) => {
                  const remaining = Math.max(rental.total_amount - rental.paid_amount, 0);
                  const paidRatio = rental.total_amount
                    ? Math.min(100, (rental.paid_amount / rental.total_amount) * 100)
                    : 100;
                  const due = timeUntil(rental.end_at);
                  const isOpen = ['ACTIVE', 'RESERVED'].includes(rental.status);
                  return (
                    <tr key={rental.id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{rental.code}</strong>
                          <small>{rental.device_name} · {rental.device_code}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{rental.customer_name}</strong>
                          <small>{rental.customer_code}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span>{dateTime(rental.end_at)}</span>
                          <small className={isOpen && due.tone === 'late' ? 'neg' : ''}>
                            {isOpen ? due.text : `Từ ${dateTime(rental.start_at)}`}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="pay-progress">
                          <div>
                            <strong>{money(rental.paid_amount)}</strong>
                            <span>/ {money(rental.total_amount)}</span>
                          </div>
                          <i><b className={remaining > 0 ? 'partial' : ''} style={{ width: `${paidRatio}%` }} /></i>
                          {remaining > 0 && <small>Còn {money(remaining)}</small>}
                        </div>
                      </td>
                      <td><StatusBadge status={rental.status} /></td>
                      <td>
                        <div className="row-actions">
                          {rental.status !== 'CANCELLED' && (
                            <button className="primary" onClick={() => openRenew(rental)}>Gia hạn</button>
                          )}
                          {remaining > 0 && rental.status !== 'CANCELLED' && (
                            <button onClick={() => setPaymentRental(rental)}>Thu tiền</button>
                          )}
                          {rental.status === 'RESERVED' && (
                            <button disabled={busyId === rental.id} onClick={() => changeStatus(rental, 'ACTIVE')}>
                              {busyId === rental.id ? 'Đang xử lý…' : 'Kích hoạt'}
                            </button>
                          )}
                          {rental.status === 'ACTIVE' && (
                            <button disabled={busyId === rental.id} onClick={() => changeStatus(rental, 'COMPLETED')}>
                              {busyId === rental.id ? 'Đang xử lý…' : 'Hoàn tất'}
                            </button>
                          )}
                          {canRefund && rental.paid_amount > 0 && (
                            <button className="danger" onClick={() => setRefundRental(rental)}>Hoàn tiền</button>
                          )}
                          {rental.status === 'RESERVED' && rental.paid_amount === 0 && (
                            <button className="danger" onClick={() => setCancelRental(rental)}>Huỷ đơn</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Chưa có đơn phù hợp"
            description={!customers.length
              ? 'Hãy thêm khách hàng trước khi tạo đơn.'
              : !availableDevices.length
                ? 'Hiện không có thiết bị nào đang sẵn sàng để cho thuê.'
                : 'Đổi bộ lọc hoặc tạo đơn thuê mới.'}
            action={canCreate && (
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Tạo đơn thuê</button>
            )}
          />
        )}
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tạo đơn thuê"
        description="Chọn khách, thiết bị và thời hạn cung cấp dịch vụ."
      >
        <form className="modal-form" onSubmit={addRental}>
          <div className="form-grid">
            <Field label="Khách hàng" required>
              <select name="customerId" required defaultValue="">
                <option value="" disabled>Chọn khách hàng</option>
                {customers.filter((customer) => customer.status !== 'BLOCKED').map((customer) => (
                  <option value={customer.id} key={customer.id}>
                    {customer.name} · Ví {money(customer.wallet_balance)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Thiết bị" required>
              <select name="deviceId" required defaultValue="">
                <option value="" disabled>Chọn thiết bị</option>
                {availableDevices.map((device) => (
                  <option value={device.id} key={device.id}>{device.name} · {device.code}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Bắt đầu" required>
              <input name="startAt" type="datetime-local" required defaultValue={defaultStart} />
            </Field>
            <Field label="Kết thúc" required>
              <input name="endAt" type="datetime-local" required defaultValue={toLocalInput(defaultEnd)} />
            </Field>
          </div>

          <div className="form-grid three">
            <Field label="Tiền thuê"><input name="baseAmount" type="number" min="0" step="1000" required defaultValue="0" /></Field>
            <Field label="Phụ phí"><input name="surcharge" type="number" min="0" step="1000" defaultValue="0" /></Field>
            <Field label="Giảm giá"><input name="discount" type="number" min="0" step="1000" defaultValue="0" /></Field>
          </div>

          <Field label="Trạng thái ban đầu">
            <select name="status" defaultValue="RESERVED">
              <option value="RESERVED">Giữ chỗ — chưa bàn giao</option>
              <option value="ACTIVE">Đang thuê — đã bàn giao</option>
            </select>
          </Field>

          <Field label="Thông tin bàn giao">
            <textarea name="accessNote" rows={2} placeholder="Tên đăng nhập, gateway hoặc hướng dẫn riêng…" />
          </Field>
          <Field label="Ghi chú"><textarea name="notes" rows={2} /></Field>

          <Callout icon={ReceiptText}>
            Tạo đơn chưa làm tăng tiền thực thu. Sau khi tạo, dùng nút “Thu tiền” để đối soát thanh toán.
          </Callout>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAddOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo…' : 'Tạo và giữ thiết bị'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!cancelRental}
        title="Huỷ đơn thuê"
        description={cancelRental
          ? `Đơn ${cancelRental.code} giữ chỗ ${cancelRental.device_name} cho ${cancelRental.customer_name} sẽ bị huỷ, và thiết bị trở lại danh sách máy sẵn sàng. Đơn đã huỷ không khôi phục được.`
          : ''}
        confirmLabel="Huỷ đơn"
        danger
        busy={submitting}
        onConfirm={async () => {
          if (!cancelRental) return;
          setSubmitting(true);
          try {
            await api(`/rentals/${cancelRental.id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'CANCELLED' }),
            });
            toast.success('Đã huỷ đơn và trả thiết bị về kho.', cancelRental.code);
            setCancelRental(null);
            await load();
          } catch (err) {
            toast.fromError(err, 'Không huỷ được đơn thuê.');
          } finally {
            setSubmitting(false);
          }
        }}
        onClose={() => setCancelRental(null)}
      />

      <Modal
        open={!!renewRental}
        onClose={() => setRenewRental(null)}
        busy={submitting}
        title="Gia hạn đơn thuê"
        description={renewRental
          ? `${renewRental.code} · ${renewRental.device_name} · hạn hiện tại ${dateTime(renewRental.end_at)}`
          : ''}
      >
        <form className="modal-form" onSubmit={renew}>
          <div className="form-grid">
            <Field label="Thuê thêm" required>
              <input
                name="quantity"
                type="number"
                min="1"
                max="60"
                required
                value={renewForm.quantity}
                onChange={(event) => setRenewForm({ ...renewForm, quantity: Number(event.target.value) })}
              />
            </Field>
            <Field label="Đơn vị" required>
              <select
                name="unit"
                value={renewForm.unit}
                onChange={(event) => setRenewForm({ ...renewForm, unit: event.target.value as PeriodUnit })}
              >
                <option value="DAY">Ngày</option>
                <option value="WEEK">Tuần</option>
                <option value="MONTH">Tháng</option>
                <option value="HOUR">Giờ</option>
              </select>
            </Field>
          </div>

          <Field
            label="Số tiền"
            required
            hint={suggested > 0
              ? `Giá khai báo của máy: ${money(suggested)}/${UNIT_LABELS[renewForm.unit]} × ${renewForm.quantity} = ${money(suggested * renewForm.quantity)}`
              : `Máy này chưa khai báo giá theo ${UNIT_LABELS[renewForm.unit]} — nhập tay hoặc sửa giá trong Kho thiết bị.`}
          >
            <input
              name="amount"
              type="number"
              min="0"
              step="1000"
              required
              value={renewForm.amount}
              onChange={(event) => setRenewForm({ ...renewForm, amount: Number(event.target.value) })}
            />
          </Field>

          <Field label="Tính từ">
            <Segmented
              value={renewForm.from}
              onChange={(value) => setRenewForm({ ...renewForm, from: value as 'END' | 'NOW' })}
              options={[
                { value: 'END', label: 'Nối tiếp hạn cũ' },
                { value: 'NOW', label: 'Tính từ hôm nay' },
              ]}
            />
          </Field>

          {renewPreview && (
            <Callout icon={CalendarClock}>
              Hạn mới: <strong>{dateTime(renewPreview)}</strong>
              {renewForm.from === 'NOW' && ' (bỏ phần đã quá hạn, tính lại từ hôm nay)'}
            </Callout>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={renewForm.collect}
              onChange={(event) => setRenewForm({ ...renewForm, collect: event.target.checked })}
            />
            <span>
              Thu tiền luôn
              <small>Bỏ chọn nếu khách chưa trả — đơn sẽ ghi nợ khoản này.</small>
            </span>
          </label>

          {renewForm.collect && (
            <div className="form-grid">
              <Field label="Nguồn tiền">
                <select
                  value={renewForm.source}
                  onChange={(event) => setRenewForm({ ...renewForm, source: event.target.value })}
                >
                  <option value="BANK">Chuyển khoản</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="WALLET">Trừ ví khách</option>
                  <option value="OTHER">Khác</option>
                </select>
              </Field>
              <Field label="Tham chiếu" hint="Mã giao dịch, tên người chuyển…">
                <input
                  value={renewForm.reference}
                  onChange={(event) => setRenewForm({ ...renewForm, reference: event.target.value })}
                />
              </Field>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setRenewRental(null)} disabled={submitting}>
              Huỷ
            </button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý…' : renewForm.collect ? 'Gia hạn & thu tiền' : 'Gia hạn (ghi nợ)'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!paymentRental}
        onClose={() => setPaymentRental(null)}
        title="Ghi nhận thanh toán"
        description={paymentRental
          ? `${paymentRental.code} · Còn phải thu ${money(paymentRental.total_amount - paymentRental.paid_amount)}`
          : ''}
      >
        <form className="modal-form" onSubmit={addPayment}>
          <Field label="Số tiền" required>
            <input
              name="amount"
              type="number"
              min="1000"
              step="1000"
              max={paymentRental ? paymentRental.total_amount - paymentRental.paid_amount : undefined}
              defaultValue={paymentRental ? paymentRental.total_amount - paymentRental.paid_amount : 0}
              required
            />
          </Field>
          <div className="form-grid">
            <Field label="Nguồn tiền">
              <select name="source" defaultValue="BANK">
                <option value="BANK">Chuyển khoản trực tiếp</option>
                <option value="CASH">Tiền mặt trực tiếp</option>
                <option value="WALLET">Trừ ví khách hàng</option>
                <option value="OTHER">Phương thức khác</option>
              </select>
            </Field>
            <Field label="Mã tham chiếu"><input name="reference" placeholder="Mã ngân hàng / phiếu thu" /></Field>
          </div>
          <Field label="Ghi chú"><textarea name="notes" rows={2} /></Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPaymentRental(null)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang ghi nhận…' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!refundRental}
        onClose={() => setRefundRental(null)}
        title="Ghi nhận hoàn tiền"
        description={refundRental ? `${refundRental.code} · Đã thanh toán ròng ${money(refundRental.paid_amount)}` : ''}
      >
        <form className="modal-form" onSubmit={refund}>
          <Field label="Số tiền hoàn" required>
            <input name="amount" type="number" min="1000" step="1000" max={refundRental?.paid_amount} required />
          </Field>
          <div className="form-grid">
            <Field label="Hoàn về">
              <select name="destination" defaultValue="WALLET">
                <option value="WALLET">Ví khách hàng</option>
                <option value="BANK">Chuyển khoản</option>
                <option value="CASH">Tiền mặt</option>
              </select>
            </Field>
            <Field label="Mã tham chiếu"><input name="reference" placeholder="Mã giao dịch hoàn" /></Field>
          </div>
          <Field label="Lý do hoàn" required>
            <textarea name="notes" rows={3} minLength={3} required placeholder="Máy lỗi, khách dừng sớm…" />
          </Field>
          <Callout icon={Undo2}>
            Hoàn về ví làm tăng số dư ví và giảm doanh thu. Hoàn qua ngân hàng hoặc tiền mặt làm giảm cả tiền thực và doanh thu.
          </Callout>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setRefundRental(null)}>Huỷ</button>
            <button className="btn btn-danger" disabled={submitting}>
              {submitting ? 'Đang ghi nhận…' : 'Xác nhận hoàn tiền'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

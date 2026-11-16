import { CalendarPlus, CircleDollarSign, Clock3, MonitorSmartphone, PackageCheck, WalletCards } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateTime, money, timeUntil, toLocalInput } from '../api';
import { Callout, EmptyState, ErrorState, Field, Modal, PageHeader, StatusBadge, TableSkeleton } from '../components/UI';
import { useToast } from '../lib/toast';
import type { ExtensionRequest, PortalRental } from '../types';
import { useCustomerAuth } from './CustomerAuth';

export function CustomerRentalsPage() {
  const toast = useToast();
  const { customer, refresh } = useCustomerAuth();
  const [rentals, setRentals] = useState<PortalRental[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [paymentRental, setPaymentRental] = useState<PortalRental | null>(null);
  const [extendRental, setExtendRental] = useState<PortalRental | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    try {
      const [rentalData, extensionData] = await Promise.all([
        api<PortalRental[]>('/customer/rentals'),
        api<ExtensionRequest[]>('/customer/extensions'),
      ]);
      setRentals(rentalData);
      setExtensions(extensionData);
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

  const walletBalance = customer?.walletBalance || 0;

  const pay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentRental) return;
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      await api(`/customer/rentals/${paymentRental.id}/pay-with-wallet`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(data.get('amount')) }),
      });
      toast.success('Đã thanh toán từ ví.', `${paymentRental.code} · ${money(Number(data.get('amount')))}`);
      setPaymentRental(null);
      await Promise.all([load(), refresh()]);
    } catch (err) {
      toast.fromError(err, 'Không thanh toán được.');
    } finally {
      setSubmitting(false);
    }
  };

  const extend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!extendRental) return;
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ code: string }>(`/customer/rentals/${extendRental.id}/extensions`, {
        method: 'POST',
        body: JSON.stringify({
          requestedEndAt: new Date(String(data.get('requestedEndAt'))).toISOString(),
          note: data.get('note'),
        }),
      });
      toast.success(`Đã gửi yêu cầu ${result.code}.`, 'Phí gia hạn sẽ được vận hành xác nhận.');
      setExtendRental(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không gửi được yêu cầu gia hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingExtensionFor = (rentalId: string) =>
    extensions.find((item) => item.rental_id === rentalId && item.status === 'PENDING');

  return (
    <>
      <PageHeader
        eyebrow="Dịch vụ của tôi"
        title="Đơn thuê và thanh toán"
        description="Xem thời hạn, công nợ và gửi yêu cầu gia hạn thiết bị."
        actions={(
          <div className="record-line" style={{ margin: 0 }}>
            <WalletCards />
            <div>
              <span>Số dư ví</span>
              <strong>{money(walletBalance)}</strong>
            </div>
          </div>
        )}
      />

      {loading ? (
        <section className="panel"><TableSkeleton rows={4} /></section>
      ) : loadFailed && !rentals.length ? (
        <section className="panel"><ErrorState onRetry={retry} /></section>
      ) : rentals.length ? (
        <section className="card-grid">
          {rentals.map((rental) => {
            const remaining = Math.max(rental.total_amount - rental.paid_amount, 0);
            const pendingExtension = pendingExtensionFor(rental.id);
            const due = timeUntil(rental.end_at);
            const isOpen = ['ACTIVE', 'RESERVED'].includes(rental.status);

            return (
              <article className="record-card" key={rental.id}>
                <header>
                  <div className={`device-type ${rental.device_type.toLowerCase()}`}><MonitorSmartphone /></div>
                  <div>
                    <span>{rental.code}</span>
                    <h2>{rental.device_name}</h2>
                    <small>{rental.device_code}</small>
                  </div>
                  <StatusBadge status={rental.status} />
                </header>

                <p>{rental.specs || 'Cấu hình đang được cập nhật.'}</p>

                <div className="record-line">
                  <Clock3 />
                  <div>
                    <span>Thời hạn sử dụng</span>
                    <strong>{dateTime(rental.end_at)}</strong>
                    <small className={isOpen && due.tone === 'late' ? 'neg' : ''}>
                      {isOpen ? due.text : `Từ ${dateTime(rental.start_at)}`}
                    </small>
                  </div>
                </div>

                <div className="record-figures">
                  <div><span>Tổng đơn</span><strong>{money(rental.total_amount)}</strong></div>
                  <div><span>Đã trả</span><strong className="pos">{money(rental.paid_amount)}</strong></div>
                  <div><span>Còn lại</span><strong className={remaining ? 'neg' : ''}>{money(remaining)}</strong></div>
                </div>

                {rental.status === 'ACTIVE' && rental.access_note && (
                  <p className="record-note access">
                    <strong>Thông tin bàn giao:</strong> {rental.access_note}
                  </p>
                )}

                {pendingExtension && (
                  <p className="record-note pending">
                    <CalendarPlus />
                    {pendingExtension.code} đang chờ duyệt đến {dateTime(pendingExtension.requested_end_at)}
                  </p>
                )}

                {(remaining > 0 || (isOpen && !pendingExtension)) && (
                  <footer>
                    {remaining > 0 && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setPaymentRental(rental)}
                        disabled={walletBalance <= 0}
                        title={walletBalance <= 0 ? 'Ví chưa có số dư khả dụng' : undefined}
                      >
                        <CircleDollarSign size={15} /> Thanh toán từ ví
                      </button>
                    )}
                    {isOpen && !pendingExtension && (
                      <button className="btn btn-secondary" onClick={() => setExtendRental(rental)}>
                        <CalendarPlus size={15} /> Gia hạn
                      </button>
                    )}
                  </footer>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="panel">
          <EmptyState
            icon={PackageCheck}
            title="Chưa có đơn thuê"
            description="Đơn sẽ xuất hiện sau khi đội vận hành duyệt yêu cầu thuê của bạn."
          />
        </section>
      )}

      <Modal
        open={!!paymentRental}
        onClose={() => setPaymentRental(null)}
        title="Thanh toán từ ví"
        description={paymentRental
          ? `${paymentRental.code} · Còn ${money(paymentRental.total_amount - paymentRental.paid_amount)}`
          : ''}
      >
        <form className="modal-form" onSubmit={pay}>
          <Field label="Số tiền" required hint={`Số dư ví khả dụng: ${money(walletBalance)}`}>
            <input
              name="amount"
              type="number"
              step="1000"
              min="1000"
              max={paymentRental ? Math.min(paymentRental.total_amount - paymentRental.paid_amount, walletBalance) : 0}
              defaultValue={paymentRental ? Math.min(paymentRental.total_amount - paymentRental.paid_amount, walletBalance) : 0}
              required
            />
          </Field>
          <Callout icon={WalletCards}>
            Khoản này được trừ khỏi ví và ghi nhận vào doanh thu đơn thuê. Không phát sinh thu tiền lần hai.
          </Callout>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPaymentRental(null)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý…' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!extendRental}
        onClose={() => setExtendRental(null)}
        title="Yêu cầu gia hạn"
        description={extendRental ? `${extendRental.device_name} · Hiện tại đến ${dateTime(extendRental.end_at)}` : ''}
      >
        <form className="modal-form" onSubmit={extend}>
          <Field label="Thời hạn mới" required>
            <input
              name="requestedEndAt"
              type="datetime-local"
              min={extendRental ? toLocalInput(new Date(extendRental.end_at)) : undefined}
              defaultValue={extendRental
                ? toLocalInput(new Date(new Date(extendRental.end_at).getTime() + 30 * 86_400_000))
                : undefined}
              required
            />
          </Field>
          <Field label="Ghi chú">
            <textarea name="note" rows={3} placeholder="Thời gian mong muốn hoặc yêu cầu liên quan…" />
          </Field>
          <Callout icon={CalendarPlus}>
            Đội vận hành sẽ kiểm tra lịch máy và báo phí bổ sung trước khi cập nhật đơn.
          </Callout>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setExtendRental(null)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

import { CalendarDays, ClipboardList, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dateTime, money } from '../api';
import { ConfirmModal, EmptyState, ErrorState, PageHeader, StatusBadge, TableSkeleton } from '../components/UI';
import { useToast } from '../lib/toast';
import type { BookingRequest } from '../types';

export function CustomerBookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [cancelTarget, setCancelTarget] = useState<BookingRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => api<BookingRequest[]>('/customer/bookings')
    .then((list) => { setBookings(list); setLoadFailed(false); })
    .catch((err) => {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh sách yêu cầu.');
    })
    .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(); };

  const cancel = async () => {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await api(`/customer/bookings/${cancelTarget.id}/cancel`, { method: 'PATCH' });
      toast.success(`Đã huỷ yêu cầu ${cancelTarget.code}.`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không huỷ được yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Lịch sử yêu cầu"
        title="Yêu cầu thuê máy"
        description="Theo dõi trạng thái xác nhận, báo giá và lý do cần điều chỉnh."
        actions={<Link className="btn btn-primary" to="/portal/catalog"><Plus size={16} /> Tạo yêu cầu</Link>}
      />

      {loading ? (
        <section className="panel"><TableSkeleton rows={4} /></section>
      ) : loadFailed && !bookings.length ? (
        <section className="panel"><ErrorState onRetry={retry} /></section>
      ) : bookings.length ? (
        <section className="card-grid">
          {bookings.map((item) => (
            <article className="record-card" key={item.id}>
              <header>
                <div className="avatar lg">{item.device_type === 'BOXPHONE' ? 'BP' : 'PC'}</div>
                <div>
                  <span>{item.code}</span>
                  <h2>{item.device_name}</h2>
                  <small>{item.device_code} · {item.billing_mode === 'HOURLY' ? 'Theo giờ' : 'Theo tháng'}</small>
                </div>
                <StatusBadge status={item.status} />
              </header>

              <div className="record-line">
                <CalendarDays />
                <div>
                  <span>Thời gian yêu cầu</span>
                  <strong>{dateTime(item.requested_start_at)}</strong>
                  <small>đến {dateTime(item.requested_end_at)}</small>
                </div>
              </div>

              <div className="record-figures two">
                <div><span>Tạm tính</span><strong>{money(item.estimated_amount)}</strong></div>
                <div>
                  <span>Giá xác nhận</span>
                  <strong>{item.quoted_amount == null ? 'Chờ duyệt' : money(item.quoted_amount)}</strong>
                </div>
              </div>

              {item.admin_note && (
                <p className="record-note">
                  <strong>Phản hồi vận hành:</strong> {item.admin_note}
                </p>
              )}

              <footer>
                <span>Gửi lúc {dateTime(item.created_at)}</span>
                {item.status === 'PENDING' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto', flex: '0 0 auto' }}
                    onClick={() => setCancelTarget(item)}
                  >
                    Huỷ yêu cầu
                  </button>
                )}
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel">
          <EmptyState
            icon={ClipboardList}
            title="Bạn chưa có yêu cầu thuê"
            description="Chọn một thiết bị đang sẵn sàng và gửi thời gian mong muốn."
            action={<Link className="btn btn-primary" to="/portal/catalog">Xem thiết bị</Link>}
          />
        </section>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Huỷ yêu cầu thuê"
        description={cancelTarget
          ? `Yêu cầu ${cancelTarget.code} cho ${cancelTarget.device_name} sẽ bị huỷ và không thể khôi phục. Bạn có thể gửi yêu cầu mới bất cứ lúc nào.`
          : ''}
        confirmLabel="Huỷ yêu cầu"
        danger
        busy={submitting}
        onConfirm={cancel}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}

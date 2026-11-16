import { ArrowRight, CalendarClock, Check, Cpu, MonitorSmartphone, Send, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, money, toLocalInput } from '../api';
import { EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, TableSkeleton } from '../components/UI';
import { useToast } from '../lib/toast';
import type { CatalogDevice } from '../types';

type TypeFilter = 'ALL' | 'PC' | 'BOXPHONE';

export function CatalogPage() {
  const toast = useToast();
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [filter, setFilter] = useState<TypeFilter>('ALL');
  const [selected, setSelected] = useState<CatalogDevice | null>(null);
  const [billingMode, setBillingMode] = useState<'HOURLY' | 'MONTHLY'>('MONTHLY');
  const [startAt, setStartAt] = useState(toLocalInput(new Date()));
  const [endAt, setEndAt] = useState(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return toLocalInput(end);
  });
  const [submitting, setSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => api<CatalogDevice[]>('/customer/catalog')
    .then((list) => { setDevices(list); setLoadFailed(false); })
    .catch((err) => {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh mục thiết bị.');
    })
    .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(); };

  const filtered = devices.filter((item) => filter === 'ALL' || item.type === filter);

  const estimate = useMemo(() => {
    if (!selected) return 0;
    const duration = new Date(endAt).getTime() - new Date(startAt).getTime();
    if (duration <= 0) return 0;
    const quantity = billingMode === 'HOURLY'
      ? Math.ceil(duration / 3_600_000)
      : Math.ceil(duration / (30 * 86_400_000));
    return Math.max(1, quantity) * (billingMode === 'HOURLY' ? selected.hourly_rate : selected.monthly_rate);
  }, [selected, billingMode, startAt, endAt]);

  const openBooking = (device: CatalogDevice) => {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    setSelected(device);
    setBillingMode('MONTHLY');
    setStartAt(toLocalInput(new Date()));
    setEndAt(toLocalInput(end));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ code: string }>('/customer/bookings', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: selected.id,
          billingMode,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          note: data.get('note'),
        }),
      });
      setSelected(null);
      toast.success(`Đã gửi yêu cầu ${result.code}.`, 'Đội vận hành sẽ xác nhận giá và lịch máy.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không gửi được yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Danh mục đang mở"
        title="Chọn thiết bị phù hợp"
        description="Giá hiển thị là giá tham khảo; đội vận hành xác nhận trước khi tạo đơn."
        actions={(
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'PC', label: 'PC' },
              { value: 'BOXPHONE', label: 'Boxphone' },
            ]}
          />
        )}
      />

      {loading ? (
        <section className="panel"><TableSkeleton rows={4} /></section>
      ) : loadFailed && !devices.length ? (
        <section className="panel"><ErrorState onRetry={retry} /></section>
      ) : filtered.length ? (
        <section className="catalog-grid">
          {filtered.map((device) => (
            <article className="catalog-card" key={device.id}>
              <header>
                <div className={`device-type ${device.type.toLowerCase()}`}>
                  {device.type === 'PC' ? <Cpu /> : <Smartphone />}
                </div>
                <span className="badge tone-ok">Sẵn sàng</span>
              </header>

              <small>{device.code} · {device.type === 'PC' ? 'PC từ xa' : 'Android thật'}</small>
              <h2>{device.name}</h2>
              <p>{device.specs || 'Cấu hình sẽ được đội vận hành cập nhật.'}</p>

              <div className="catalog-features">
                <span><Check /> Thiết bị riêng theo phiên</span>
                <span><Check /> Hỗ trợ kỹ thuật trong giờ làm việc</span>
                <span><Check /> Gia hạn trực tuyến</span>
              </div>

              <div className="catalog-price">
                <div>
                  <span>Từ</span>
                  <strong>{money(device.monthly_rate)}<small>/tháng</small></strong>
                  <em>{money(device.hourly_rate)}/giờ</em>
                </div>
                <button className="btn btn-primary" onClick={() => openBooking(device)}>
                  Yêu cầu thuê <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel">
          <EmptyState
            icon={MonitorSmartphone}
            title="Chưa có thiết bị sẵn sàng"
            description="Các máy đang được sử dụng hoặc bảo trì. Vui lòng quay lại sau hoặc gửi ticket hỗ trợ."
          />
        </section>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Gửi yêu cầu thuê"
        description={selected ? `${selected.name} · ${selected.code}` : ''}
      >
        <form className="modal-form" onSubmit={submit}>
          <Field label="Cách tính giá">
            <div className="billing-picker">
              <button
                type="button"
                className={billingMode === 'HOURLY' ? 'active' : ''}
                onClick={() => setBillingMode('HOURLY')}
              >
                <CalendarClock /> Theo giờ
                <strong>{selected ? money(selected.hourly_rate) : ''}</strong>
              </button>
              <button
                type="button"
                className={billingMode === 'MONTHLY' ? 'active' : ''}
                onClick={() => setBillingMode('MONTHLY')}
              >
                <CalendarClock /> Theo tháng
                <strong>{selected ? money(selected.monthly_rate) : ''}</strong>
              </button>
            </div>
          </Field>

          <div className="form-grid">
            <Field label="Bắt đầu" required>
              <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </Field>
            <Field label="Kết thúc" required>
              <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required />
            </Field>
          </div>

          <Field label="Nhu cầu và lưu ý">
            <textarea name="note" rows={3} placeholder="Phần mềm cần cài, mục đích sử dụng, yêu cầu cấu hình…" />
          </Field>

          <div className="estimate-box">
            <div>
              <span>Tạm tính</span>
              <strong>{money(estimate)}</strong>
            </div>
            <p>
              Giá cuối cùng chỉ có hiệu lực sau khi quản trị duyệt. Gửi yêu cầu chưa trừ tiền và chưa giữ máy.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting || estimate <= 0}>
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'} <Send size={15} />
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

import { CalendarClock, CircleAlert, MessageCircle, Phone, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, dateTime, money, timeUntil } from '../api';
import { EmptyState, ErrorState, Panel, Segmented, TableSkeleton } from './UI';
import { copyToClipboard, fillTemplate, loadZaloTemplate } from '../lib/message-template';
import { useToast } from '../lib/toast';

type ExpiringRental = {
  id: string;
  code: string;
  end_at: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  device_name: string;
  device_code: string;
  device_monthly_rate: number;
};

type ExpiringData = {
  rows: ExpiringRental[];
  counts: { overdue: number; today: number; within3: number; later: number };
  days: number;
  unpaidTotal: number;
};

const WINDOWS = [
  { value: '3', label: '3 ngày' },
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
];

/** Nhóm mức gấp, quyết định màu chấm và thứ tự đọc. */
function urgency(endAt: string) {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  if (end <= now) return { key: 'overdue', tone: 'late', label: 'Quá hạn' };
  if (end - now <= 86_400_000) return { key: 'today', tone: 'late', label: 'Trong 24 giờ' };
  if (end - now <= 3 * 86_400_000) return { key: 'soon', tone: 'due', label: 'Trong 3 ngày' };
  return { key: 'later', tone: '', label: '' };
}

export function ExpiringPanel() {
  const toast = useToast();
  const navigate = useNavigate();
  const [days, setDays] = useState('7');
  const [data, setData] = useState<ExpiringData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = async (window: string) => {
    try {
      setData(await api<ExpiringData>(`/rentals/expiring?days=${window}`));
      setFailed(false);
    } catch (err) {
      setFailed(true);
      toast.fromError(err, 'Không tải được danh sách sắp hết hạn.');
    }
  };

  useEffect(() => { void load(days); }, [days]);

  /** Sang trang Đơn thuê và mở sẵn form gia hạn đúng đơn vừa bấm. */
  const renew = (rental: ExpiringRental) => {
    navigate('/admin/rentals', { state: { action: 'renew', payload: rental.id } });
  };

  /**
   * Soạn sẵn tin nhắc rồi chép vào clipboard để dán sang Zalo.
   *
   * Zalo không mở API cho tài khoản cá nhân nên không gửi tự động được; cách này
   * mất vài giây mỗi khách nhưng không phụ thuộc gì vào Zalo và không có rủi ro
   * khoá tài khoản.
   */
  const soanTin = async (rental: ExpiringRental) => {
    const text = fillTemplate(loadZaloTemplate(), {
      ten: rental.customer_name,
      may: rental.device_name,
      endAt: rental.end_at,
      giaThang: rental.device_monthly_rate ?? 0,
      con: Math.max(rental.total_amount - rental.paid_amount, 0),
    });
    const ok = await copyToClipboard(text);
    if (ok) toast.success('Đã chép tin nhắn.', 'Mở Zalo và dán vào khung chat của khách.');
    else toast.error('Không chép được vào clipboard.', 'Bạn có thể sửa mẫu tin trong Cài đặt → Nhắc khách.');
  };

  const header = (
    <Segmented value={days} onChange={setDays} options={WINDOWS} />
  );

  if (!data) {
    return (
      <Panel eyebrow="Cần nhắc khách" title="Sắp hết hạn" icon={CalendarClock} action={header}>
        {failed ? <ErrorState onRetry={() => void load(days)} /> : <TableSkeleton rows={4} />}
      </Panel>
    );
  }

  const { counts } = data;
  const canhBao = counts.overdue + counts.today;

  return (
    <Panel eyebrow="Cần nhắc khách" title="Sắp hết hạn" icon={CalendarClock} action={header}>
      {data.rows.length ? (
        <>
          <div className="expiring-summary">
            <div className={counts.overdue ? 'danger' : ''}>
              <span>Đã quá hạn</span>
              <strong>{counts.overdue}</strong>
            </div>
            <div className={counts.today ? 'warn' : ''}>
              <span>Trong 24 giờ</span>
              <strong>{counts.today}</strong>
            </div>
            <div>
              <span>Trong {data.days} ngày</span>
              <strong>{data.rows.length}</strong>
            </div>
            <div>
              <span>Chưa thu</span>
              <strong className={data.unpaidTotal ? 'neg' : ''}>{money(data.unpaidTotal)}</strong>
            </div>
          </div>

          {canhBao > 0 && (
            <div className="notice error" style={{ margin: '0 0 10px' }}>
              <CircleAlert />
              <span>
                <strong>{canhBao} máy</strong> đã hết hạn hoặc hết trong hôm nay mà chưa gia hạn.
                Máy vẫn đang chạy cho tới khi bạn khoá mạng.
              </span>
            </div>
          )}

          <div className="expiring-list">
            {data.rows.map((rental) => {
              const due = timeUntil(rental.end_at);
              const mark = urgency(rental.end_at);
              const owed = Math.max(rental.total_amount - rental.paid_amount, 0);
              return (
                <div key={rental.id}>
                  <div className={`timeline-dot ${mark.tone}`} />
                  <div className="expiring-body">
                    <strong>{rental.customer_name}</strong>
                    <span>{rental.device_name} · {rental.code}</span>
                    {rental.customer_phone && (
                      <small className="selectable"><Phone size={11} /> {rental.customer_phone}</small>
                    )}
                  </div>
                  <div className="expiring-when">
                    <strong className={mark.tone === 'late' ? 'neg' : ''}>{due.text}</strong>
                    <small title={dateTime(rental.end_at)}>{dateTime(rental.end_at)}</small>
                    {owed > 0 && <small className="neg">Còn nợ {money(owed)}</small>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => soanTin(rental)}
                      title="Chép sẵn tin nhắn để dán vào Zalo"
                    >
                      <MessageCircle size={13} /> Soạn tin
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => renew(rental)}>
                      Gia hạn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title={`Không có máy nào hết hạn trong ${data.days} ngày tới`}
          description="Chọn khoảng thời gian dài hơn để nhìn xa hơn, hoặc tạo đơn thuê mới."
          action={(
            <Link className="btn btn-primary" to="/admin/rentals" state={{ action: 'create' }}>
              <Plus /> Tạo đơn thuê
            </Link>
          )}
        />
      )}
    </Panel>
  );
}

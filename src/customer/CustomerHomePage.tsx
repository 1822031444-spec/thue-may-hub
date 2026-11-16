import {
  ArrowRight, CircleDollarSign, Clock3, Headphones, MonitorSmartphone, PackageCheck, WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dateTime, money, timeUntil } from '../api';
import { EmptyState, ErrorState, PageHeader, Panel, StatusBadge, TableSkeleton } from '../components/UI';
import type { BookingRequest, PortalRental, SupportTicket } from '../types';
import { useCustomerAuth } from './CustomerAuth';

export function CustomerHomePage() {
  const { customer } = useCustomerAuth();
  const [rentals, setRentals] = useState<PortalRental[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api<PortalRental[]>('/customer/rentals'),
      api<BookingRequest[]>('/customer/bookings'),
      api<SupportTicket[]>('/customer/tickets'),
    ])
      .then(([rentalData, bookingData, ticketData]) => {
        setRentals(rentalData);
        setBookings(bookingData);
        setTickets(ticketData);
        setLoadFailed(false);
      })
      // Nuốt lỗi ở đây làm khách thấy trang trống trơn mà không hiểu vì sao,
      // dễ tưởng đơn thuê của mình biến mất.
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const active = rentals.filter((item) => ['ACTIVE', 'RESERVED'].includes(item.status));
  const pending = bookings.filter((item) => item.status === 'PENDING').length;
  const openTickets = tickets.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)).length;
  const nextRental = [...active].sort((a, b) => new Date(a.end_at).getTime() - new Date(b.end_at).getTime())[0];
  const firstName = customer?.name.split(' ').slice(-1)[0] || 'bạn';

  return (
    <>
      <PageHeader
        eyebrow="Tổng quan tài khoản"
        title={`Không gian của ${firstName}`}
        description="Theo dõi dịch vụ đang dùng và những việc cần xử lý."
        actions={<Link className="btn btn-primary" to="/portal/catalog">Thuê thiết bị <ArrowRight size={16} /></Link>}
      />

      <section className="portal-stats">
        <article className="portal-stat">
          <div><WalletCards /></div>
          <span>Số dư ví</span>
          <strong>{money(customer?.walletBalance || 0)}</strong>
          <small>Sẵn sàng thanh toán</small>
        </article>
        <article className="portal-stat">
          <div className="ok"><PackageCheck /></div>
          <span>Đơn đang mở</span>
          <strong>{active.length}</strong>
          <small>Đang thuê hoặc giữ chỗ</small>
        </article>
        <article className="portal-stat">
          <div className="warn"><Clock3 /></div>
          <span>Chờ xác nhận</span>
          <strong>{pending}</strong>
          <small>Yêu cầu thuê máy</small>
        </article>
        <article className="portal-stat">
          <div className="violet"><Headphones /></div>
          <span>Hỗ trợ đang mở</span>
          <strong>{openTickets}</strong>
          <small>Ticket cần theo dõi</small>
        </article>
      </section>

      <section className="portal-home-grid">
        <Panel eyebrow="Dịch vụ gần nhất" title="Thiết bị của bạn" icon={MonitorSmartphone}>
          {loading ? <TableSkeleton rows={3} /> : loadFailed ? (
            <ErrorState onRetry={load} />
          ) : nextRental ? (
            <div className="next-device">
              <div className="next-device-top">
                <div className={`device-type ${nextRental.device_type.toLowerCase()}`}><MonitorSmartphone /></div>
                <div>
                  <small>{nextRental.device_code}</small>
                  <h3>{nextRental.device_name}</h3>
                  <p>{nextRental.specs || 'Cấu hình đang được cập nhật.'}</p>
                </div>
                <StatusBadge status={nextRental.status} />
              </div>

              <div className="next-device-meta">
                <div>
                  <span>Hết hạn</span>
                  <strong>{dateTime(nextRental.end_at)}</strong>
                  <span className={timeUntil(nextRental.end_at).tone === 'late' ? 'neg' : ''}>
                    {timeUntil(nextRental.end_at).text}
                  </span>
                </div>
                <div>
                  <span>Đã thanh toán</span>
                  <strong>{money(nextRental.paid_amount)}</strong>
                  <span>trên {money(nextRental.total_amount)}</span>
                </div>
              </div>

              <Link className="btn btn-secondary" to="/portal/rentals">
                Xem chi tiết đơn thuê <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={MonitorSmartphone}
              title="Chưa có thiết bị đang thuê"
              description="Xem danh mục máy sẵn sàng và gửi yêu cầu thuê đầu tiên."
              action={<Link className="btn btn-primary" to="/portal/catalog">Xem thiết bị</Link>}
            />
          )}
        </Panel>

        <Panel eyebrow="Yêu cầu mới nhất" title="Tiến trình xử lý" icon={Clock3}>
          {loading ? <TableSkeleton rows={3} /> : loadFailed ? (
            <ErrorState onRetry={load} />
          ) : bookings.length ? (
            <div className="request-list">
              {bookings.slice(0, 5).map((item) => (
                <div key={item.id}>
                  <i />
                  <div>
                    <strong>{item.device_name}</strong>
                    <span>{item.code} · {dateTime(item.created_at)}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock3}
              title="Chưa có yêu cầu"
              description="Yêu cầu thuê mới sẽ xuất hiện tại đây để bạn theo dõi tiến trình."
            />
          )}
        </Panel>
      </section>

      <section className="help-banner">
        <div><CircleDollarSign /></div>
        <div>
          <strong>Cần nạp tiền hoặc xuất biên nhận?</strong>
          <span>Gửi ticket thanh toán để đội vận hành đối soát và cập nhật ví.</span>
        </div>
        <Link className="btn btn-secondary" to="/portal/support">Liên hệ hỗ trợ <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}

import {
  CalendarPlus, CheckCircle2, ClipboardCheck, Headphones, Inbox, MessageCircle, Send,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateTime, money } from '../api';
import { Callout, EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, StatusBadge, TableSkeleton, Tabs } from '../components/UI';
import { useToast } from '../lib/toast';
import type { BookingRequest, ExtensionRequest, ServiceDeskOverview, SupportTicket, TicketMessage } from '../types';

/** Mỗi lần tải thêm bấy nhiêu dòng cho cả ba danh sách. */
const PAGE_SIZE = 100;

type ReviewTarget = {
  type: 'booking' | 'extension';
  item: BookingRequest | ExtensionRequest;
  action: 'approve' | 'reject';
};

export function ServiceDeskPage() {
  const toast = useToast();
  const EMPTY = { rows: [], total: 0 };
  const [data, setData] = useState<ServiceDeskOverview>({
    bookings: EMPTY, extensions: EMPTY, tickets: EMPTY,
    pending: { bookings: 0, extensions: 0, tickets: 0 },
  });
  const [tab, setTab] = useState<'bookings' | 'extensions' | 'tickets'>('bookings');
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [onlyPending, setOnlyPending] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (size = PAGE_SIZE) => {
    try {
      setData(await api<ServiceDeskOverview>(`/service-desk/overview?limit=${size}`));
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh sách yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    void load(limit);
  };

  useEffect(() => { void load(); }, []);

  /** Tải thêm một trang. Ba danh sách dùng chung một mức, đỡ rối cho người dùng. */
  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = limit + PAGE_SIZE;
    setLimit(next);
    await load(next);
    setLoadingMore(false);
  };

  // Con số của huy hiệu và thẻ thống kê lấy từ server, không đếm từ mảng đã cắt.
  const pendingBookings = data.pending.bookings;
  const pendingExtensions = data.pending.extensions;
  const openTickets = data.pending.tickets;

  // Việc chính ở trang này là xử lý cái đang chờ; mặc định lọc sẵn để khỏi phải
  // dò giữa những yêu cầu đã duyệt từ lâu.
  const showBookings = onlyPending ? data.bookings.rows.filter((item) => item.status === 'PENDING') : data.bookings.rows;
  const showExtensions = onlyPending ? data.extensions.rows.filter((item) => item.status === 'PENDING') : data.extensions.rows;
  const showTickets = onlyPending
    ? data.tickets.rows.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status))
    : data.tickets.rows;

  const current = tab === 'bookings' ? data.bookings : tab === 'extensions' ? data.extensions : data.tickets;
  const hasMore = current.rows.length < current.total;

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!review) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const base = review.type === 'booking' ? 'bookings' : 'extensions';
    try {
      const body = review.action === 'approve'
        ? review.type === 'booking'
          ? { quotedAmount: Number(form.get('amount')), adminNote: form.get('note'), accessNote: form.get('accessNote') }
          : { additionalAmount: Number(form.get('amount')), adminNote: form.get('note') }
        : { adminNote: form.get('note') };
      await api(`/service-desk/${base}/${review.item.id}/${review.action}`, { method: 'POST', body: JSON.stringify(body) });
      toast.success(review.action === 'approve' ? 'Đã duyệt yêu cầu.' : 'Đã từ chối yêu cầu.', review.item.code);
      setReview(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không xử lý được yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  const openTicket = async (item: SupportTicket) => {
    setTicket(item);
    // Xoá nội dung ticket cũ trước khi tải: không thì hội thoại của khách trước
    // vẫn nằm đó vài giây, rất dễ trả lời nhầm người.
    setMessages(null);
    try {
      setMessages(await api<TicketMessage[]>(`/service-desk/tickets/${item.id}/messages`));
    } catch (err) {
      setMessages([]);
      toast.fromError(err, 'Không tải được nội dung ticket.');
    }
  };

  const reply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket) return;
    setSubmitting(true);
    const form = event.currentTarget;
    const body = new FormData(form).get('body');
    try {
      await api(`/service-desk/tickets/${ticket.id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
      form.reset();
      setMessages(await api<TicketMessage[]>(`/service-desk/tickets/${ticket.id}/messages`));
      await load();
    } catch (err) {
      toast.fromError(err, 'Không gửi được phản hồi.');
    } finally {
      setSubmitting(false);
    }
  };

  const resolveTicket = async () => {
    if (!ticket || resolving) return;
    setResolving(true);
    try {
      await api(`/service-desk/tickets/${ticket.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }) });
      toast.success('Đã đánh dấu ticket hoàn tất.', ticket.code);
      setTicket(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được ticket.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Customer service desk"
        title="Yêu cầu & hỗ trợ"
        description="Duyệt yêu cầu thuê, báo giá gia hạn và phản hồi khách hàng."
      />

      <section className="mini-stats three">
        <div><ClipboardCheck /><span>Thuê máy chờ duyệt</span><strong>{pendingBookings}</strong></div>
        <div><CalendarPlus /><span>Gia hạn chờ duyệt</span><strong>{pendingExtensions}</strong></div>
        <div><Headphones /><span>Ticket đang mở</span><strong>{openTickets}</strong></div>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'bookings', label: 'Yêu cầu thuê', count: pendingBookings },
          { value: 'extensions', label: 'Gia hạn', count: pendingExtensions },
          { value: 'tickets', label: 'Hỗ trợ', count: openTickets },
        ]}
      />

      <div className="toolbar">
        <Segmented
          value={onlyPending ? 'PENDING' : 'ALL'}
          onChange={(value) => setOnlyPending(value === 'PENDING')}
          options={[
            { value: 'PENDING', label: 'Đang chờ' },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
        <div className="toolbar-count">
          <strong>{tab === 'bookings' ? showBookings.length : tab === 'extensions' ? showExtensions.length : showTickets.length}</strong>
          {tab === 'tickets' ? ' ticket' : ' yêu cầu'}
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <div style={{ padding: 16 }}><TableSkeleton /></div>
        ) : loadFailed ? (
          <ErrorState onRetry={retry} />
        ) : tab === 'bookings' ? (
          showBookings.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Yêu cầu</th>
                    <th>Khách hàng</th>
                    <th>Thiết bị</th>
                    <th>Thời gian</th>
                    <th className="num">Tạm tính</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {showBookings.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.code}</strong>
                          <small>{dateTime(item.created_at)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.customer_name}</strong>
                          <small>{item.customer_phone}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.device_name}</strong>
                          <small>{item.device_code} · {item.device_status}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span>{dateTime(item.requested_start_at)}</span>
                          <small>đến {dateTime(item.requested_end_at)}</small>
                        </div>
                      </td>
                      <td className="num money-cell">{money(item.estimated_amount)}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        {item.status === 'PENDING' && (
                          <div className="row-actions">
                            <button onClick={() => setReview({ type: 'booking', item, action: 'approve' })}>Duyệt</button>
                            <button className="danger" onClick={() => setReview({ type: 'booking', item, action: 'reject' })}>Từ chối</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title={onlyPending ? 'Không còn yêu cầu nào đang chờ' : 'Chưa có yêu cầu thuê'}
              description={onlyPending
                ? 'Chọn "Tất cả" để xem lại những yêu cầu đã xử lý.'
                : 'Yêu cầu khách gửi từ cổng sẽ xuất hiện tại đây.'}
            />
          )
        ) : tab === 'extensions' ? (
          showExtensions.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Yêu cầu</th>
                    <th>Khách hàng</th>
                    <th>Đơn / thiết bị</th>
                    <th>Hạn hiện tại</th>
                    <th>Hạn mong muốn</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {showExtensions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.code}</strong>
                          <small>{dateTime(item.created_at)}</small>
                        </div>
                      </td>
                      <td>{item.customer_name}</td>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.device_name}</strong>
                          <small>{item.rental_code}</small>
                        </div>
                      </td>
                      <td><small className="muted">{dateTime(item.current_end_at)}</small></td>
                      <td><strong>{dateTime(item.requested_end_at)}</strong></td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        {item.status === 'PENDING' && (
                          <div className="row-actions">
                            <button onClick={() => setReview({ type: 'extension', item, action: 'approve' })}>Báo giá & duyệt</button>
                            <button className="danger" onClick={() => setReview({ type: 'extension', item, action: 'reject' })}>Từ chối</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={CalendarPlus}
              title={onlyPending ? 'Không còn yêu cầu gia hạn đang chờ' : 'Chưa có yêu cầu gia hạn'}
              description={onlyPending
                ? 'Chọn "Tất cả" để xem lại những yêu cầu đã xử lý.'
                : 'Gia hạn từ khách hàng sẽ xuất hiện tại đây.'}
            />
          )
        ) : showTickets.length ? (
          <div className="ticket-rows">
            {showTickets.map((item) => (
              <button className="ticket-row" key={item.id} onClick={() => openTicket(item)}>
                <div className={`ticket-icon ${item.priority.toLowerCase()}`}><MessageCircle /></div>
                <div>
                  <span>{item.code} · {item.customer_name}</span>
                  <strong>{item.subject}</strong>
                  <p>{item.last_message}</p>
                </div>
                <div>
                  <StatusBadge status={item.status} />
                  <small>{dateTime(item.last_message_at)}</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Headphones}
            title={onlyPending ? 'Không còn ticket nào đang mở' : 'Chưa có ticket hỗ trợ'}
            description={onlyPending
              ? 'Chọn "Tất cả" để xem lại những ticket đã đóng.'
              : 'Yêu cầu hỗ trợ của khách sẽ xuất hiện tại đây.'}
          />
        )}

        {!loading && !loadFailed && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore
                ? 'Đang tải…'
                : `Xem thêm — còn ${current.total - current.rows.length} dòng`}
            </button>
          </div>
        )}
      </section>

      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.action === 'approve'
          ? review.type === 'booking' ? 'Duyệt yêu cầu thuê' : 'Duyệt gia hạn'
          : 'Từ chối yêu cầu'}
        description={review ? `${review.item.code} · ${review.item.device_name}` : ''}
      >
        <form className="modal-form" onSubmit={submitReview}>
          {review?.action === 'approve' && (
            <Field
              label={review.type === 'booking' ? 'Giá xác nhận' : 'Phí bổ sung'}
              required
              hint={review.type === 'booking' ? 'Giá này sẽ trở thành tiền thuê của đơn được tạo.' : undefined}
            >
              <input
                name="amount"
                type="number"
                min="0"
                step="1000"
                defaultValue={review.type === 'booking' ? (review.item as BookingRequest).estimated_amount : 0}
                required
              />
            </Field>
          )}

          {review?.action === 'approve' && review.type === 'booking' && (
            <Field label="Thông tin bàn giao">
              <textarea name="accessNote" rows={2} placeholder="Gateway, tài khoản truy cập hoặc thời điểm cấp máy…" />
            </Field>
          )}

          <Field
            label={review?.action === 'reject' ? 'Lý do' : 'Ghi chú cho khách'}
            required={review?.action === 'reject'}
          >
            <textarea
              name="note"
              rows={4}
              required={review?.action === 'reject'}
              minLength={review?.action === 'reject' ? 3 : undefined}
              placeholder={review?.action === 'reject'
                ? 'Lý do chưa thể đáp ứng…'
                : 'Thông tin bàn giao hoặc lưu ý báo giá…'}
            />
          </Field>

          {review?.action === 'approve' && review.type === 'booking' && (
            <Callout icon={ClipboardCheck}>
              Duyệt sẽ tạo một đơn giữ chỗ và chuyển thiết bị khỏi danh sách máy sẵn sàng.
            </Callout>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setReview(null)}>Huỷ</button>
            <button className={`btn ${review?.action === 'approve' ? 'btn-primary' : 'btn-danger'}`} disabled={submitting}>
              {submitting ? 'Đang xử lý…' : review?.action === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!ticket}
        onClose={() => setTicket(null)}
        title={ticket?.subject || 'Ticket hỗ trợ'}
        description={ticket ? `${ticket.code} · ${ticket.customer_name}` : ''}
        wide
      >
        <div className="modal-body ticket-thread">
          <div className="message-list">
            {messages === null ? (
              <TableSkeleton rows={3} />
            ) : messages.length ? (
              messages.map((message) => (
                <div className={`message ${message.author_type.toLowerCase()}`} key={message.id}>
                  <span>{message.author_type === 'ADMIN' ? 'Đội vận hành' : ticket?.customer_name}</span>
                  <p>{message.body}</p>
                  <time>{dateTime(message.created_at)}</time>
                </div>
              ))
            ) : (
              <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', padding: '16px 0' }}>
                Ticket này chưa có nội dung trao đổi.
              </p>
            )}
          </div>

          {ticket && !['RESOLVED', 'CLOSED'].includes(ticket.status) && (
            <>
              <form className="message-form" onSubmit={reply}>
                <textarea name="body" required minLength={2} placeholder="Nhập phản hồi cho khách…" />
                <button disabled={submitting} aria-label="Gửi phản hồi"><Send /></button>
              </form>
              <button className="resolve-btn" onClick={resolveTicket} disabled={resolving}>
                <CheckCircle2 /> {resolving ? 'Đang cập nhật…' : 'Đánh dấu đã xử lý'}
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

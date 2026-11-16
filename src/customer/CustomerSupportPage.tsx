import { ArrowRight, Headphones, MessageCircle, Plus, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateTime } from '../api';
import { EmptyState, ErrorState, Field, Modal, PageHeader, StatusBadge, TableSkeleton } from '../components/UI';
import { useToast } from '../lib/toast';
import type { PortalRental, SupportTicket, TicketMessage } from '../types';

const CATEGORY_NAMES: Record<string, string> = {
  TECHNICAL: 'Kỹ thuật',
  PAYMENT: 'Thanh toán',
  RENTAL: 'Đơn thuê',
  GENERAL: 'Chung',
};

export function CustomerSupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [rentals, setRentals] = useState<PortalRental[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    try {
      const [ticketData, rentalData] = await Promise.all([
        api<SupportTicket[]>('/customer/tickets'),
        api<PortalRental[]>('/customer/rentals'),
      ]);
      setTickets(ticketData);
      setRentals(rentalData);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh sách hỗ trợ.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(); };

  const openTicket = async (ticket: SupportTicket) => {
    setSelected(ticket);
    // Dọn hội thoại cũ trước khi tải, không thì nội dung ticket trước còn nằm đó.
    setMessages(null);
    try {
      setMessages(await api<TicketMessage[]>(`/customer/tickets/${ticket.id}/messages`));
    } catch (err) {
      setMessages([]);
      toast.fromError(err, 'Không tải được nội dung trao đổi.');
    }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ code: string }>('/customer/tickets', {
        method: 'POST',
        body: JSON.stringify({
          rentalId: data.get('rentalId') || null,
          subject: data.get('subject'),
          category: data.get('category'),
          priority: data.get('priority'),
          message: data.get('message'),
        }),
      });
      setNewOpen(false);
      toast.success(`Đã tạo ${result.code}.`, 'Đội vận hành sẽ phản hồi sớm nhất có thể.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không tạo được yêu cầu hỗ trợ.');
    } finally {
      setSubmitting(false);
    }
  };

  const reply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(`/customer/tickets/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: data.get('body') }),
      });
      form.reset();
      setMessages(await api<TicketMessage[]>(`/customer/tickets/${selected.id}/messages`));
      await load();
    } catch (err) {
      toast.fromError(err, 'Không gửi được phản hồi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Trung tâm trợ giúp"
        title="Hỗ trợ vận hành"
        description="Trao đổi về kỹ thuật, thanh toán hoặc đơn thuê với đội ngũ phụ trách."
        actions={<button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Tạo yêu cầu</button>}
      />

      <section className="support-layout">
        <aside className="ticket-side">
          <header>
            <strong>Yêu cầu của bạn</strong>
            <span>{tickets.length} ticket</span>
          </header>
          <div className="ticket-side-list">
            {loading ? <TableSkeleton rows={3} /> : loadFailed && !tickets.length ? (
              <ErrorState onRetry={retry} />
            ) : tickets.length ? tickets.map((ticket) => (
              <button
                key={ticket.id}
                className={selected?.id === ticket.id ? 'active' : ''}
                onClick={() => openTicket(ticket)}
              >
                <div>
                  <span>{ticket.code} · {CATEGORY_NAMES[ticket.category] || ticket.category}</span>
                  <strong>{ticket.subject}</strong>
                  <p>{ticket.last_message}</p>
                </div>
                <StatusBadge status={ticket.status} />
              </button>
            )) : (
              <EmptyState
                icon={Headphones}
                title="Chưa có ticket"
                description="Tạo yêu cầu khi bạn cần hỗ trợ về máy hoặc thanh toán."
              />
            )}
          </div>
        </aside>

        <article className="conversation">
          {selected ? (
            <>
              <header>
                <div>
                  <span>{selected.code} · {CATEGORY_NAMES[selected.category] || selected.category}</span>
                  <h2>{selected.subject}</h2>
                  <small>Tạo lúc {dateTime(selected.created_at)}</small>
                </div>
                <StatusBadge status={selected.status} />
              </header>

              <div className="message-list">
                {messages === null ? (
                  <TableSkeleton rows={3} />
                ) : messages.length ? (
                  messages.map((message) => (
                    <div
                      className={`message ${message.author_type === 'CUSTOMER' ? 'message-mine' : ''}`}
                      key={message.id}
                    >
                      <span>{message.author_type === 'CUSTOMER' ? 'Bạn' : 'Đội vận hành'}</span>
                      <p>{message.body}</p>
                      <time>{dateTime(message.created_at)}</time>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', padding: '16px 0' }}>
                    Chưa có nội dung trao đổi.
                  </p>
                )}
              </div>

              {selected.status !== 'CLOSED' && (
                <form className="message-form" onSubmit={reply}>
                  <textarea name="body" required minLength={2} placeholder="Nhập phản hồi…" />
                  <button disabled={submitting} aria-label="Gửi"><Send /></button>
                </form>
              )}
            </>
          ) : (
            <div className="conversation-empty">
              <MessageCircle />
              <h3>Chọn một yêu cầu</h3>
              <p>Nội dung trao đổi sẽ hiển thị tại đây.</p>
            </div>
          )}
        </article>
      </section>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Tạo yêu cầu hỗ trợ"
        description="Mô tả rõ vấn đề để được xử lý nhanh hơn."
      >
        <form className="modal-form" onSubmit={create}>
          <div className="form-grid">
            <Field label="Nhóm vấn đề">
              <select name="category">
                <option value="TECHNICAL">Kỹ thuật</option>
                <option value="PAYMENT">Thanh toán</option>
                <option value="RENTAL">Đơn thuê</option>
                <option value="GENERAL">Khác</option>
              </select>
            </Field>
            <Field label="Mức độ">
              <select name="priority">
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Khẩn cấp</option>
              </select>
            </Field>
          </div>

          <Field label="Đơn liên quan">
            <select name="rentalId">
              <option value="">Không gắn đơn</option>
              {rentals.map((item) => (
                <option key={item.id} value={item.id}>{item.code} · {item.device_name}</option>
              ))}
            </select>
          </Field>

          <Field label="Tiêu đề" required>
            <input name="subject" required minLength={4} placeholder="Ví dụ: Không kết nối được PC" />
          </Field>

          <Field label="Nội dung" required>
            <textarea
              name="message"
              rows={5}
              required
              minLength={5}
              placeholder="Thời điểm xảy ra, thông báo lỗi và những gì bạn đã thử…"
            />
          </Field>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setNewOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'} <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

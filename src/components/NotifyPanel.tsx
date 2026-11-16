import { AlertTriangle, MessageCircle, Search, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateTime } from '../api';
import { DEFAULT_ZALO_TEMPLATE, loadZaloTemplate, saveZaloTemplate } from '../lib/message-template';
import { useToast } from '../lib/toast';
import { Callout, ErrorState, Field, Panel, TableSkeleton } from './UI';

type TelegramStatus = {
  settings: { enabled: boolean; token: string; chatId: string; hour: number; days: number };
  hasToken: boolean;
  lastSentAt: string;
  lastError: string;
};

type Chat = { id: string; ten: string; loai: string };

export function NotifyPanel() {
  const toast = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState({ enabled: false, token: '', chatId: '', hour: 8, days: 7 });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [finding, setFinding] = useState(false);
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [template, setTemplate] = useState(loadZaloTemplate());

  const load = async () => {
    try {
      const data = await api<TelegramStatus>('/telegram');
      setStatus(data);
      // Token trả về đã bị che, để trống ô nhập nghĩa là "giữ token cũ".
      setForm({ ...data.settings, token: '' });
      setFailed(false);
    } catch (err) {
      setFailed(true);
      toast.fromError(err, 'Không tải được cấu hình nhắc khách.');
    }
  };
  useEffect(() => { void load(); }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api<TelegramStatus>('/telegram/settings', { method: 'PUT', body: JSON.stringify(form) });
      setStatus(data);
      setForm({ ...data.settings, token: '' });
      toast.success('Đã lưu cấu hình nhắc khách.');
    } catch (err) {
      toast.fromError(err, 'Không lưu được cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const guiThu = async () => {
    if (testing) return;
    setTesting(true);
    try {
      await api('/telegram/test', {
        method: 'POST',
        body: JSON.stringify({ token: form.token, chatId: form.chatId }),
      });
      toast.success('Đã gửi tin thử.', 'Mở Telegram kiểm tra xem đã nhận được chưa.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không gửi được tin thử.');
    } finally {
      setTesting(false);
    }
  };

  const timChatId = async () => {
    if (finding) return;
    setFinding(true);
    try {
      const data = await api<{ chats: Chat[] }>('/telegram/discover', {
        method: 'POST',
        body: JSON.stringify({ token: form.token }),
      });
      setChats(data.chats);
      if (!data.chats.length) {
        toast.error('Chưa thấy ai nhắn cho bot.', 'Mở Telegram, tìm bot của bạn rồi bấm /start, sau đó thử lại.');
      }
    } catch (err) {
      toast.fromError(err, 'Không đọc được danh sách.');
    } finally {
      setFinding(false);
    }
  };

  if (!status) {
    return (
      <Panel eyebrow="Nhắc khách" title="Thông báo sắp hết hạn" icon={Send}>
        {failed ? <ErrorState onRetry={() => void load()} /> : <TableSkeleton rows={4} />}
      </Panel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel eyebrow="Nhắc chính bạn" title="Bot Telegram" icon={Send}>
        <div className="panel-body">
          <Callout icon={ShieldCheck}>
            Bot này nhắn cho <strong>bạn</strong>, mỗi ngày một lần, danh sách khách sắp hết hạn kèm
            số điện thoại và tiền còn nợ. Nó <strong>không nhắn cho khách</strong> — muốn nhận tin từ
            bot thì người nhận phải tự cài Telegram và bấm <code>/start</code>, mà khách của bạn dùng
            Zalo. Phần nhắn cho khách xem ở ô bên dưới.
          </Callout>

          <div className="notice" style={{ margin: '12px 0 0' }}>
            <MessageCircle />
            <span>
              Cách lấy token: mở Telegram, tìm <strong>@BotFather</strong>, gõ <code>/newbot</code>,
              đặt tên rồi nó đưa cho một chuỗi dạng <code>1234567:AAE…</code>. Dán chuỗi đó vào đây.
              Sau đó nhắn <code>/start</code> cho chính bot vừa tạo rồi bấm <strong>Tìm chat id</strong>.
            </span>
          </div>

          {status.lastError && (
            <div style={{ marginTop: 10 }}>
              <Callout icon={AlertTriangle}>Lần gửi trước thất bại: {status.lastError}</Callout>
            </div>
          )}

          {status.lastSentAt && (
            <div className="pref-row" style={{ marginTop: 12 }}>
              <div>
                <strong>Lần nhắc gần nhất</strong>
                <span>{dateTime(status.lastSentAt)}</span>
              </div>
            </div>
          )}

          <form className="settings-form" onSubmit={save} style={{ marginTop: 14 }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              <span>
                Bật nhắc qua Telegram
                <small>Chỉ gửi khi app đang mở. Tắt app cả ngày thì hôm đó không có tin.</small>
              </span>
            </label>

            <Field
              label="Token của bot"
              hint={status.hasToken
                ? `Đang lưu: ${status.settings.token}. Để trống nếu không muốn đổi.`
                : 'Lấy từ @BotFather trên Telegram.'}
            >
              <input
                type="password"
                value={form.token}
                placeholder={status.hasToken ? '•••••• (giữ nguyên)' : '1234567:AAE...'}
                onChange={(event) => setForm({ ...form, token: event.target.value })}
              />
            </Field>

            <Field label="Chat id nơi nhận" hint="Bấm “Tìm chat id” sau khi đã nhắn /start cho bot.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input
                  style={{ flex: '1 1 200px', minWidth: 0 }}
                  value={form.chatId}
                  placeholder="123456789"
                  onChange={(event) => setForm({ ...form, chatId: event.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: '0 0 auto' }}
                  onClick={timChatId}
                  disabled={finding}
                >
                  <Search size={14} /> {finding ? 'Đang tìm…' : 'Tìm chat id'}
                </button>
              </div>
            </Field>

            {chats && chats.length > 0 && (
              <div className="notice" style={{ margin: 0 }}>
                <MessageCircle />
                <span>
                  Tìm thấy: {chats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 6 }}
                      onClick={() => setForm({ ...form, chatId: chat.id })}
                    >
                      {chat.ten} ({chat.id})
                    </button>
                  ))}
                </span>
              </div>
            )}

            <div className="form-grid">
              <Field label="Giờ nhắc mỗi ngày" hint="0–23. Ví dụ 8 là 8 giờ sáng.">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.hour}
                  onChange={(event) => setForm({ ...form, hour: Number(event.target.value) })}
                />
              </Field>
              <Field label="Nhắc trước bao nhiêu ngày" hint="Gồm cả máy đã quá hạn.">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.days}
                  onChange={(event) => setForm({ ...form, days: Number(event.target.value) })}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={guiThu} disabled={testing}>
                <Send size={14} /> {testing ? 'Đang gửi…' : 'Gửi thử ngay'}
              </button>
            </div>
          </form>
        </div>
      </Panel>

      <Panel eyebrow="Nhắn cho khách" title="Mẫu tin gửi qua Zalo" icon={MessageCircle}>
        <div className="panel-body">
          <Callout icon={MessageCircle}>
            Zalo không cho gửi tự động từ tài khoản cá nhân. App soạn sẵn tin, bạn bấm
            <strong> Soạn tin</strong> ở trang Tổng quan rồi dán vào Zalo gửi cho khách.
          </Callout>

          <Field
            label="Mẫu tin"
            hint="Các chỗ trong ngoặc nhọn sẽ được thay bằng dữ liệu thật của từng khách."
          >
            <textarea
              rows={6}
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
            />
          </Field>

          <p className="muted" style={{ fontSize: 12, margin: '0 0 12px' }}>
            Dùng được: <code>{'{ten}'}</code> tên khách · <code>{'{may}'}</code> tên máy ·
            {' '}<code>{'{ngay}'}</code> ngày hết hạn · <code>{'{conLai}'}</code> số ngày còn lại ·
            {' '}<code>{'{gia}'}</code> giá thuê tháng · <code>{'{no}'}</code> số tiền còn nợ
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => { saveZaloTemplate(template); toast.success('Đã lưu mẫu tin.'); }}
            >
              Lưu mẫu tin
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setTemplate(DEFAULT_ZALO_TEMPLATE); saveZaloTemplate(DEFAULT_ZALO_TEMPLATE); }}
            >
              Về mẫu mặc định
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

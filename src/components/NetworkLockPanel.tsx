import {
  AlertTriangle, CheckCircle2, Lock, LockOpen, PlayCircle, RefreshCw, ShieldAlert, Terminal, XCircle,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateTime, timeUntil } from '../api';
import { useToast } from '../lib/toast';
import type { Device, NetworkLockOverview } from '../types';
import { Callout, ErrorState, Field, Panel, TableSkeleton } from './UI';

/**
 * Mẫu lệnh cho vài thiết bị mạng hay gặp. Bấm vào là điền sẵn để người dùng chỉ
 * phải sửa địa chỉ router, thay vì tự mò cú pháp từ đầu.
 */
const PRESETS = [
  {
    id: 'mikrotik',
    label: 'MikroTik qua SSH',
    lock: 'ssh admin@192.168.1.1 "/ip firewall address-list add list=thuemay-blocked address={ip} comment={code}"',
    unlock: 'ssh admin@192.168.1.1 "/ip firewall address-list remove [find comment={code}]"',
  },
  {
    id: 'windows',
    label: 'Tường lửa Windows của máy này',
    lock: 'netsh advfirewall firewall add rule name="thuemay-{code}" dir=in action=block remoteip={ip}',
    unlock: 'netsh advfirewall firewall delete rule name="thuemay-{code}"',
  },
  {
    id: 'webhook',
    label: 'Gọi API/script riêng',
    lock: 'curl -s -X POST http://127.0.0.1:9000/block -H "Content-Type: application/json" -d "{\\"ip\\":\\"{ip}\\",\\"code\\":\\"{code}\\"}"',
    unlock: 'curl -s -X POST http://127.0.0.1:9000/unblock -H "Content-Type: application/json" -d "{\\"ip\\":\\"{ip}\\",\\"code\\":\\"{code}\\"}"',
  },
];

export function NetworkLockPanel() {
  const toast = useToast();
  const [data, setData] = useState<NetworkLockOverview | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState({
    enabled: false,
    autoLock: true,
    lockCommand: '',
    unlockCommand: '',
    graceMinutes: 15,
    timeoutSeconds: 20,
  });
  const [preview, setPreview] = useState<{ lock: string; unlock: string } | null>(null);
  const [previewDevice, setPreviewDevice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    try {
      const [overview, deviceList] = await Promise.all([
        api<NetworkLockOverview>('/network-lock'),
        api<Device[]>('/devices'),
      ]);
      setData(overview);
      setForm(overview.settings);
      setDevices(deviceList);
      if (!previewDevice && deviceList.length) setPreviewDevice(deviceList[0].id);
      setLoadFailed(false);
    } catch (err) {
      // Không có dòng này thì `data` mãi là null và panel kẹt ở skeleton, người
      // dùng ngồi chờ một thứ không bao giờ tới.
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được cấu hình khoá mạng.');
    }
  };
  useEffect(() => { void load(); }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/network-lock/settings', { method: 'PUT', body: JSON.stringify(form) });
      toast.success('Đã lưu cấu hình khoá mạng.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không lưu được cấu hình.');
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    if (!previewDevice) return;
    try {
      const result = await api<{ lock: { ok: boolean; command: string }; unlock: { ok: boolean; command: string } }>(
        '/network-lock/preview',
        { method: 'POST', body: JSON.stringify({ deviceId: previewDevice }) },
      );
      setPreview({ lock: result.lock.command, unlock: result.unlock.command });
    } catch (err) {
      toast.fromError(err, 'Không dựng được câu lệnh.');
    }
  };

  const act = async (deviceId: string, action: 'lock' | 'unlock') => {
    setBusy(true);
    try {
      await api(`/network-lock/devices/${deviceId}/${action}`, { method: 'POST' });
      toast.success(action === 'lock' ? 'Đã khoá mạng thiết bị.' : 'Đã mở mạng thiết bị.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Lệnh chạy không thành công. Xem nhật ký bên dưới để biết lý do.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const sweepNow = async () => {
    setBusy(true);
    try {
      const result = await api<{ locked: number; unlocked: number; failed: number; skipped: boolean }>(
        '/network-lock/sweep', { method: 'POST' },
      );
      if (result.skipped) toast.error('Cơ chế đang tắt hoặc không bật tự động khoá.');
      else toast.success(`Đã khoá ${result.locked}, mở ${result.unlocked}, lỗi ${result.failed}.`);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không chạy được vòng quét.');
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setForm((value) => ({ ...value, lockCommand: preset.lock, unlockCommand: preset.unlock }));
    setPreview(null);
  };

  if (!data) {
    return (
      <Panel eyebrow="Kiểm soát truy cập" title="Khoá mạng khi hết hạn" icon={ShieldAlert}>
        {loadFailed ? <ErrorState onRetry={() => void load()} /> : <TableSkeleton rows={4} />}
      </Panel>
    );
  }

  const lockedDevices = devices.filter((device) => device.network_status === 'LOCKED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel eyebrow="Kiểm soát truy cập" title="Khoá mạng khi hết hạn" icon={ShieldAlert}>
        <div className="panel-body">
          <Callout icon={Terminal}>
            App không tự biết cách chặn IP vì mỗi router mỗi khác. Bạn khai báo câu lệnh, app thay
            <code> {'{ip}'} </code> và <code> {'{code}'} </code> rồi chạy đúng lệnh đó. Chỉ hai chỗ trống này được
            thay, và giá trị phải đúng khuôn IP/mã máy — tên thiết bị không bao giờ được ghép vào lệnh
            để tránh bị lợi dụng chạy lệnh khác.
          </Callout>

          <form className="settings-form" onSubmit={save} style={{ marginTop: 14 }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              <span>
                Bật cơ chế khoá mạng
                <small>Tắt thì app không chạy bất kỳ lệnh nào, kể cả khi đơn đã quá hạn.</small>
              </span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.autoLock}
                onChange={(event) => setForm({ ...form, autoLock: event.target.checked })}
              />
              <span>
                Tự động khoá khi hết hạn
                <small>Mỗi phút app quét một lần. Tắt mục này thì bạn tự bấm khoá bằng tay.</small>
              </span>
            </label>

            <div className="preset-row">
              <span>Mẫu có sẵn:</span>
              {PRESETS.map((preset) => (
                <button type="button" key={preset.id} className="btn btn-secondary btn-sm" onClick={() => applyPreset(preset)}>
                  {preset.label}
                </button>
              ))}
            </div>

            <Field label="Lệnh khoá" required hint="Chạy khi đơn thuê quá hạn hoặc khi bạn bấm Khoá.">
              <textarea
                rows={2}
                className="mono"
                value={form.lockCommand}
                onChange={(event) => setForm({ ...form, lockCommand: event.target.value })}
                placeholder="ssh admin@192.168.1.1 &quot;/ip firewall address-list add list=blocked address={ip}&quot;"
              />
            </Field>

            <Field label="Lệnh mở" hint="Chạy khi khách gia hạn hoặc khi bạn bấm Mở.">
              <textarea
                rows={2}
                className="mono"
                value={form.unlockCommand}
                onChange={(event) => setForm({ ...form, unlockCommand: event.target.value })}
              />
            </Field>

            <div className="form-grid">
              <Field label="Ân hạn (phút)" hint="Chờ thêm bao lâu sau giờ hết hạn rồi mới khoá.">
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={form.graceMinutes}
                  onChange={(event) => setForm({ ...form, graceMinutes: Number(event.target.value) })}
                />
              </Field>
              <Field label="Giới hạn chạy lệnh (giây)" hint="Quá thời gian này coi như lệnh treo và bị dừng.">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.timeoutSeconds}
                  onChange={(event) => setForm({ ...form, timeoutSeconds: Number(event.target.value) })}
                />
              </Field>
            </div>

            <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
          </form>

          <div className="preview-box">
            <div className="section-label">Xem trước câu lệnh sẽ chạy</div>
            <div className="part-add">
              <select value={previewDevice} onChange={(event) => { setPreviewDevice(event.target.value); setPreview(null); }}>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} · {device.ip_address || 'chưa có IP'}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary" onClick={runPreview} disabled={!previewDevice}>
                <PlayCircle size={15} /> Dựng thử
              </button>
            </div>
            {preview && (
              <div className="command-preview">
                <div><b>Khoá</b><code>{preview.lock}</code></div>
                <div><b>Mở</b><code>{preview.unlock}</code></div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        eyebrow="Trạng thái"
        title="Máy cần khoá và máy đang khoá"
        action={(
          <button className="btn btn-secondary btn-sm" onClick={sweepNow} disabled={busy}>
            <RefreshCw size={14} /> Quét ngay
          </button>
        )}
      >
        {data.due.length > 0 && (
          <div className="lock-list">
            {data.due.map((item) => (
              <div key={item.device_id}>
                <div className="lock-icon due"><AlertTriangle /></div>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.code} · {item.ip_address || 'chưa có IP'} · {item.rental_code}</small>
                </div>
                <span className="badge tone-warn">{timeUntil(item.end_at).text}</span>
                <button className="btn btn-danger btn-sm" onClick={() => act(item.device_id, 'lock')} disabled={busy}>
                  <Lock size={14} /> Khoá ngay
                </button>
              </div>
            ))}
          </div>
        )}

        {lockedDevices.length > 0 && (
          <div className="lock-list">
            {lockedDevices.map((device) => (
              <div key={device.id}>
                <div className="lock-icon locked"><Lock /></div>
                <div>
                  <strong>{device.name}</strong>
                  <small>
                    {device.code} · {device.ip_address || 'chưa có IP'}
                    {device.network_locked_at ? ` · khoá lúc ${dateTime(device.network_locked_at)}` : ''}
                  </small>
                </div>
                <span className="badge tone-danger">Đang khoá</span>
                <button className="btn btn-secondary btn-sm" onClick={() => act(device.id, 'unlock')} disabled={busy}>
                  <LockOpen size={14} /> Mở mạng
                </button>
              </div>
            ))}
          </div>
        )}

        {!data.due.length && !lockedDevices.length && (
          <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)' }}>
            Không có máy nào quá hạn cần khoá, cũng không có máy nào đang bị khoá.
          </div>
        )}
      </Panel>

      {/* Panel này cố ý chỉ giữ 50 lần chạy gần nhất — nói rõ trên tiêu đề để không
          ai tưởng đây là toàn bộ lịch sử rồi đi tìm những lần cũ hơn. */}
      <Panel eyebrow="Nhật ký" title="50 lần chạy lệnh gần nhất" icon={Terminal}>
        {data.events.length ? (
          <div className="lock-events">
            {data.events.map((event) => (
              <div key={event.id}>
                <div className={`lock-icon ${event.status === 'SUCCESS' ? 'ok' : 'failed'}`}>
                  {event.status === 'SUCCESS' ? <CheckCircle2 /> : <XCircle />}
                </div>
                <div>
                  <strong>
                    {event.action === 'LOCK' ? 'Khoá' : 'Mở'} {event.device_name}
                    <span className="chip" style={{ marginLeft: 6 }}>{event.source === 'AUTO' ? 'Tự động' : 'Thủ công'}</span>
                  </strong>
                  <code>{event.command}</code>
                  {event.output && <small className={event.status === 'FAILED' ? 'neg' : ''}>{event.output}</small>}
                </div>
                <time>{dateTime(event.created_at)}</time>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)' }}>
            Chưa có lần chạy nào được ghi nhận.
          </div>
        )}
      </Panel>
    </div>
  );
}

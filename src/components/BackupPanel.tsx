import { AlertTriangle, DatabaseBackup, FolderSymlink, HardDriveDownload, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateTime } from '../api';
import { desktop, isDesktop } from '../lib/desktop';
import { useToast } from '../lib/toast';
import { Callout, ErrorState, Field, Panel, TableSkeleton } from './UI';

type BackupFile = { name: string; size: number; createdAt: string };

type BackupStatus = {
  settings: { enabled: boolean; dir: string; intervalHours: number; keep: number };
  defaultDir: string;
  activeDir: string;
  lastAt: string;
  lastFile: string;
  lastSource: string;
  lastError: string;
  files: BackupFile[];
};

function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Bản sao nằm cùng ổ với database thì hỏng ổ là mất cả hai — phải nói thẳng. */
function sameDisk(activeDir: string, defaultDir: string) {
  if (!activeDir || !defaultDir) return true;
  return activeDir.slice(0, 2).toLowerCase() === defaultDir.slice(0, 2).toLowerCase();
}

export function BackupPanel() {
  const toast = useToast();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState({ enabled: true, dir: '', intervalHours: 24, keep: 14 });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const data = await api<BackupStatus>('/backups');
      setStatus(data);
      setForm(data.settings);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được thông tin sao lưu.');
    }
  };
  useEffect(() => { void load(); }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api<BackupStatus>('/backups/settings', { method: 'PUT', body: JSON.stringify(form) });
      setStatus(data);
      setForm(data.settings);
      toast.success('Đã lưu cấu hình sao lưu.');
    } catch (err) {
      toast.fromError(err, 'Không lưu được cấu hình sao lưu.');
    } finally {
      setSaving(false);
    }
  };

  const backupNow = async () => {
    if (running) return;
    setRunning(true);
    try {
      const result = await api<{ name: string; size: number }>('/backups', { method: 'POST' });
      toast.success('Đã tạo bản sao lưu.', `${result.name} · ${fileSize(result.size)}`);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không tạo được bản sao lưu.');
    } finally {
      setRunning(false);
    }
  };

  const pickFolder = async () => {
    const dir = await desktop?.chooseFolder('Chọn thư mục lưu bản sao lưu');
    if (dir) setForm((value) => ({ ...value, dir }));
  };

  if (!status) {
    return (
      <Panel eyebrow="An toàn dữ liệu" title="Sao lưu cơ sở dữ liệu" icon={DatabaseBackup}>
        {loadFailed ? <ErrorState onRetry={() => void load()} /> : <TableSkeleton rows={4} />}
      </Panel>
    );
  }

  const risky = sameDisk(status.activeDir, status.defaultDir);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel eyebrow="An toàn dữ liệu" title="Sao lưu cơ sở dữ liệu" icon={DatabaseBackup}>
        <div className="panel-body">
          <Callout icon={risky ? AlertTriangle : ShieldCheck}>
            {risky ? (
              <>
                Bản sao đang nằm <strong>cùng ổ đĩa</strong> với dữ liệu gốc. Như vậy cứu được khi
                file hỏng hoặc lỡ xoá nhầm, nhưng <strong>hỏng ổ cứng là mất cả hai</strong>.
                Muốn an toàn thật, hãy đổi sang một ổ khác hoặc USB cắm sẵn.
              </>
            ) : (
              <>
                Bản sao đang nằm ở ổ khác với dữ liệu gốc — hỏng một ổ vẫn còn ổ kia.
                Thỉnh thoảng nên chép thêm một bản ra chỗ thứ ba để chắc chắn.
              </>
            )}
          </Callout>

          <div className="pref-row" style={{ marginTop: 14 }}>
            <div>
              <strong>Lần sao lưu gần nhất</strong>
              <span>
                {status.lastAt
                  ? `${dateTime(status.lastAt)} · ${status.lastFile}${status.lastSource === 'AUTO' ? ' (tự động)' : ' (thủ công)'}`
                  : 'Chưa có bản sao lưu nào'}
              </span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={backupNow} disabled={running}>
              <HardDriveDownload size={14} /> {running ? 'Đang sao lưu…' : 'Sao lưu ngay'}
            </button>
          </div>

          {status.lastError && (
            <div style={{ marginTop: 10 }}>
              <Callout icon={AlertTriangle}>
                Lần sao lưu trước thất bại: {status.lastError}
              </Callout>
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
                Tự động sao lưu
                <small>App kiểm mỗi 15 phút; tới hạn thì tạo bản sao. Tắt thì chỉ sao lưu khi bạn tự bấm.</small>
              </span>
            </label>

            <div className="form-grid">
              <Field label="Sao lưu mỗi (giờ)" hint="24 giờ là mỗi ngày một bản.">
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={form.intervalHours}
                  onChange={(event) => setForm({ ...form, intervalHours: Number(event.target.value) })}
                />
              </Field>
              <Field label="Giữ lại bao nhiêu bản" hint="Bản cũ hơn sẽ tự bị xoá để khỏi đầy ổ.">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={form.keep}
                  onChange={(event) => setForm({ ...form, keep: Number(event.target.value) })}
                />
              </Field>
            </div>

            <Field
              label="Thư mục lưu bản sao"
              hint={`Để trống là dùng thư mục mặc định: ${status.defaultDir}`}
            >
              {/* Không dùng lại .part-add: class đó ép ô nhập còn 84px, vừa đủ cho
                  số lượng linh kiện nhưng quá hẹp cho một đường dẫn thư mục. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input
                  style={{ flex: '1 1 260px', minWidth: 0 }}
                  value={form.dir}
                  placeholder={status.defaultDir}
                  onChange={(event) => setForm({ ...form, dir: event.target.value })}
                />
                {isDesktop && (
                  <button type="button" className="btn btn-secondary" style={{ flex: '0 0 auto' }} onClick={pickFolder}>
                    <FolderSymlink size={14} /> Chọn
                  </button>
                )}
                {form.dir && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: '0 0 auto' }}
                    onClick={() => setForm({ ...form, dir: '' })}
                  >
                    Mặc định
                  </button>
                )}
              </div>
            </Field>

            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </form>
        </div>
      </Panel>

      <Panel
        eyebrow="Lịch sử"
        title={`Các bản sao lưu đang có (${status.files.length})`}
        icon={HardDriveDownload}
      >
        <div className="panel-body">
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
            Thư mục hiện tại: <code className="selectable">{status.activeDir}</code>
          </p>
          {status.files.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tên file</th>
                    <th className="num">Dung lượng</th>
                    <th>Thời điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {status.files.map((file) => (
                    <tr key={file.name}>
                      <td><code className="selectable">{file.name}</code></td>
                      <td className="num">{fileSize(file.size)}</td>
                      <td><small className="muted">{dateTime(file.createdAt)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12.5, padding: '10px 0' }}>
              Chưa có bản sao lưu nào. Bấm <strong>Sao lưu ngay</strong> để tạo bản đầu tiên.
            </p>
          )}
        </div>
      </Panel>

      <Callout icon={ShieldCheck}>
        Cách phục hồi: đóng hẳn app, chép file sao lưu vào thư mục dữ liệu và đổi tên
        thành <code>thue-may.db</code> (xoá luôn hai file <code>-wal</code> và <code>-shm</code> cũ
        nếu có), rồi mở lại app. Nên thử phục hồi vào một thư mục riêng ít nhất một lần
        để chắc là bản sao dùng được thật.
      </Callout>
    </div>
  );
}

import { FolderOpen, FolderSymlink, Fingerprint, Globe, HardDrive, KeyRound, Monitor, Palette, ScrollText, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, dateTime } from '../api';
import { useAuth } from '../App';
import { AccountsPanel } from '../components/AccountsPanel';
import { BackupPanel } from '../components/BackupPanel';
import { NotifyPanel } from '../components/NotifyPanel';
import { NetworkLockPanel } from '../components/NetworkLockPanel';
import { Callout, ErrorState, Field, PageHeader, Panel, SearchBox, Segmented, TableSkeleton, Tabs } from '../components/UI';
import { desktop, isDesktop } from '../lib/desktop';
import { useTheme, type ThemePreference } from '../lib/theme';
import { useToast } from '../lib/toast';
import type { Paged } from '../types';

type AuditLog = {
  id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  created_at: string;
};

const ACTION_NAMES: Record<string, string> = {
  LOGIN: 'Đăng nhập',
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  STATUS: 'Đổi trạng thái',
  DEPOSIT: 'Nạp ví',
  PAYMENT: 'Thu tiền đơn',
  REFUND: 'Hoàn tiền',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
};

export function SettingsPage() {
  const toast = useToast();
  const { preference, setPreference } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dataInfo, setDataInfo] = useState<{ dir: string; portable: boolean; custom: boolean } | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsFailed, setLogsFailed] = useState(false);
  const [logQuery, setLogQuery] = useState('');
  const [logLimit, setLogLimit] = useState(100);
  const [logTotal, setLogTotal] = useState(0);
  const [tab, setTab] = useState<'general' | 'network' | 'notify' | 'backup' | 'accounts'>('general');
  const { can } = useAuth();
  const canManageLock = can('settings.networkLock');
  const canManageAccounts = can('settings.accounts');
  const canSeeAudit = can('settings.audit');
  const canManageBackup = can('settings.backup');
  const canManageNotify = can('settings.notify');

  const load = () => {
    if (!canSeeAudit) return Promise.resolve();
    return api<Paged<AuditLog>>(`/audit-logs?limit=${logLimit}`)
      .then((data) => { setLogs(data.rows); setLogTotal(data.total); setLogsFailed(false); })
      .catch((err) => {
        setLogsFailed(true);
        toast.fromError(err, 'Không tải được nhật ký thao tác.');
      })
      .finally(() => setLogsLoading(false));
  };

  // Tải lại mỗi khi người dùng bấm xem thêm, vì phần còn lại nằm ở server.
  useEffect(() => { void load(); }, [logLimit]);

  const retryLogs = () => { setLogsLoading(true); void load(); };

  const filteredLogs = useMemo(() => {
    const key = logQuery.toLowerCase().trim();
    if (!key) return logs;
    return logs.filter((log) => [
      ACTION_NAMES[log.action] || log.action,
      log.admin_name,
      log.entity_type,
      log.detail,
      log.entity_id,
    ].filter(Boolean).join(' ').toLowerCase().includes(key));
  }, [logs, logQuery]);

  // Lọc chỉ áp lên phần đã tải; còn dòng ở server thì nút "Xem thêm" xin tiếp.
  const visibleLogs = filteredLogs;
  const moreLogsOnServer = logs.length < logTotal;

  useEffect(() => {
    void desktop?.dataDir().then(setDataInfo);
  }, []);

  /** App tự khởi động lại khi đổi thành công, nên nhánh thành công không cần làm gì thêm. */
  const changeDataDir = async () => {
    const result = await desktop?.chooseDataDir();
    if (result && !result.ok && result.message) toast.error(result.message);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const next = String(data.get('newPassword'));

    if (next !== data.get('confirmPassword')) {
      toast.error('Xác nhận mật khẩu mới chưa khớp.');
      return;
    }

    setSubmitting(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: data.get('currentPassword'), newPassword: next }),
      });
      form.reset();
      toast.success('Đã đổi mật khẩu.', 'Các phiên đăng nhập khác đã bị đăng xuất.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không đổi được mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Bảo mật & kiểm soát"
        title="Cài đặt hệ thống"
        description="Bảo vệ tài khoản, chỉnh giao diện và kiểm tra lịch sử thao tác quản trị."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'general', label: 'Chung' },
          ...(canManageLock ? [{ value: 'network' as const, label: 'Khoá mạng khi hết hạn' }] : []),
          ...(canManageNotify ? [{ value: 'notify' as const, label: 'Nhắc khách' }] : []),
          ...(canManageBackup ? [{ value: 'backup' as const, label: 'Sao lưu' }] : []),
          ...(canManageAccounts ? [{ value: 'accounts' as const, label: 'Tài khoản' }] : []),
        ]}
      />

      {tab === 'network' ? <NetworkLockPanel /> : tab === 'notify' ? <NotifyPanel /> : tab === 'backup' ? <BackupPanel /> : tab === 'accounts' ? <AccountsPanel /> : (
      <section className="settings-grid" style={canSeeAudit ? undefined : { gridTemplateColumns: 'minmax(0, 460px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel eyebrow="Giao diện" title="Hiển thị" icon={Palette}>
            <div className="pref-row">
              <div>
                <strong>Chế độ nền</strong>
                <span>Áp dụng cho cả bản desktop và bản web trên máy này.</span>
              </div>
              <Segmented
                value={preference}
                onChange={(value) => setPreference(value as ThemePreference)}
                options={[
                  { value: 'light' as ThemePreference, label: 'Sáng' },
                  { value: 'dark' as ThemePreference, label: 'Tối' },
                  { value: 'system' as ThemePreference, label: 'Theo máy' },
                ]}
              />
            </div>
            <div className="pref-row">
              <div>
                <strong>Phiên bản đang chạy</strong>
                <span>{isDesktop ? `Ứng dụng desktop ${desktop?.appVersion || ''}` : 'Trình duyệt web'}</span>
              </div>
              <span className="chip">
                {isDesktop ? <Monitor size={13} /> : <Globe size={13} />}
                {isDesktop ? 'Desktop' : 'Web'}
              </span>
            </div>

            {isDesktop && (
              <div className="pref-row">
                <div>
                  <strong>
                    Thư mục dữ liệu
                    {dataInfo?.portable && <span className="chip" style={{ marginLeft: 6 }}>Portable</span>}
                    {dataInfo?.custom && <span className="chip" style={{ marginLeft: 6 }}>Tự chọn</span>}
                  </strong>
                  <span className="truncate" title={dataInfo?.dir}>
                    {dataInfo?.dir || 'Đang đọc…'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => desktop?.openDataDir()}>
                    <FolderOpen size={14} /> Mở
                  </button>
                  {!dataInfo?.portable && (
                    <button className="btn btn-secondary btn-sm" onClick={changeDataDir}>
                      <FolderSymlink size={14} /> Đổi
                    </button>
                  )}
                </div>
              </div>
            )}
          </Panel>

          {isDesktop && (
            <Callout icon={HardDrive}>
              {dataInfo?.portable ? (
                <>
                  Bản portable lưu dữ liệu <strong>ngay cạnh file chạy</strong>. Chép cả thư mục này
                  sang USB hay máy khác là mở ra đúng dữ liệu cũ, không phải đồng bộ tay.
                  Vẫn chỉ dùng được ở một máy tại một thời điểm.
                </>
              ) : (
                <>
                  Bấm <strong>Đổi</strong> để trỏ app sang thư mục khác, ví dụ một thư mục trên USB.
                  Thư mục đích trống thì dữ liệu hiện tại được chép sang; thư mục đã có dữ liệu thì
                  app dùng luôn dữ liệu đó — đây là cách máy thứ hai mở chung một USB.
                  Sao lưu thì đóng app rồi chép cả thư mục sang ổ khác.
                </>
              )}
            </Callout>
          )}

          <Panel eyebrow="Bảo mật tài khoản" title="Đổi mật khẩu quản trị" icon={KeyRound}>
            <div className="panel-body">
              <form className="settings-form" onSubmit={changePassword}>
                <Field label="Mật khẩu hiện tại" required>
                  <input name="currentPassword" type="password" required autoComplete="current-password" />
                </Field>
                <Field label="Mật khẩu mới" required hint="Ít nhất 10 ký tự, gồm chữ hoa, chữ thường và chữ số.">
                  <input name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
                </Field>
                <Field label="Nhập lại mật khẩu mới" required>
                  <input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" />
                </Field>
                <button className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang cập nhật…' : 'Đổi mật khẩu'}
                </button>
              </form>

              <div style={{ marginTop: 14 }}>
                <Callout icon={ShieldCheck}>
                  Mật khẩu được băm bằng scrypt và cookie phiên không thể đọc bằng JavaScript.
                  Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác.
                </Callout>
              </div>
            </div>
          </Panel>
        </div>

        {canSeeAudit && (
        <Panel
          eyebrow="Audit log"
          title="Thao tác gần đây"
          icon={ScrollText}
          action={logs.length ? (
            <SearchBox value={logQuery} onChange={setLogQuery} placeholder="Tìm thao tác, người làm…" />
          ) : undefined}
        >
          <div className="audit-list">
            {logsLoading ? <div style={{ padding: 14 }}><TableSkeleton rows={5} /></div> : logsFailed && !logs.length ? (
              <ErrorState onRetry={retryLogs} />
            ) : visibleLogs.length ? (
              <>
                {visibleLogs.map((log) => (
                  <div key={log.id}>
                    <div className="audit-icon"><Fingerprint /></div>
                    <div>
                      <strong>{ACTION_NAMES[log.action] || log.action}</strong>
                      <span>{log.admin_name || 'Hệ thống'} · {log.entity_type}</span>
                      <small>{log.detail || log.entity_id}</small>
                    </div>
                    <time>{dateTime(log.created_at)}</time>
                  </div>
                ))}
                {moreLogsOnServer && (
                  <button
                    className="btn btn-secondary"
                    style={{ margin: '10px auto' }}
                    disabled={logsLoading}
                    onClick={() => setLogLimit((value) => value + 100)}
                  >
                    {logsLoading ? 'Đang tải…' : `Xem thêm — còn ${logTotal - logs.length} thao tác`}
                  </button>
                )}
              </>
            ) : (
              <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)' }}>
                {logQuery ? 'Không có thao tác nào khớp từ khoá.' : 'Chưa có thao tác nào được ghi nhận.'}
              </div>
            )}
          </div>
        </Panel>
        )}
      </section>
      )}
    </>
  );
}

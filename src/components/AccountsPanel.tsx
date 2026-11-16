import { KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, dateOnly, initials } from '../api';
import { useAuth } from '../App';
import { ROLE_LABELS } from '../lib/permissions';
import { useToast } from '../lib/toast';
import type { AdminAccount } from '../types';
import { Callout, EmptyState, Field, Modal, Panel, TableSkeleton } from './UI';

export function AccountsPanel() {
  const toast = useToast();
  const { admin, refresh } = useAuth();
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [resetting, setResetting] = useState<AdminAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setAccounts(await api<AdminAccount[]>('/admins'));
    } catch (err) {
      toast.fromError(err, 'Không tải được danh sách tài khoản.');
      setAccounts([]);
    }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          role: form.get('role'),
        }),
      });
      setCreateOpen(false);
      toast.success('Đã tạo tài khoản.', 'Nhớ đưa mật khẩu cho người dùng và dặn họ đổi lại.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không tạo được tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/admins/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          role: form.get('role') || editing.role,
          status: form.get('status') || editing.status,
        }),
      });
      toast.success('Đã cập nhật tài khoản.');
      setEditing(null);
      await load();
      // Tự sửa tên mình thì thanh bên phải hiện tên mới ngay.
      if (editing.id === admin?.id) await refresh();
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetting) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/admins/${resetting.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: form.get('password') }),
      });
      toast.success('Đã đặt lại mật khẩu.', `${resetting.name} đã bị đăng xuất khỏi mọi thiết bị.`);
      setResetting(null);
    } catch (err) {
      toast.fromError(err, 'Không đặt lại được mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel
        eyebrow="Người dùng"
        title="Tài khoản quản trị"
        action={(
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <UserPlus size={14} /> Thêm tài khoản
          </button>
        )}
      >
        {!accounts ? <TableSkeleton rows={3} /> : accounts.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Tạo ngày</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const isSelf = account.id === admin?.id;
                  return (
                    <tr key={account.id}>
                      <td>
                        <div className="cell-identity">
                          <div className="avatar">{initials(account.name)}</div>
                          <div className="cell-stack">
                            <strong>
                              {account.name}
                              {isSelf && <span className="chip" style={{ marginLeft: 6 }}>Bạn</span>}
                            </strong>
                            <small>{account.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${account.role === 'OWNER' ? 'tone-accent' : 'tone-neutral'}`}>
                          {ROLE_LABELS[account.role]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${account.status === 'ACTIVE' ? 'tone-ok' : 'tone-danger'}`}>
                          {account.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khoá'}
                        </span>
                      </td>
                      <td><small className="muted">{dateOnly(account.created_at)}</small></td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => setEditing(account)}>Sửa</button>
                          <button onClick={() => setResetting(account)}>
                            <KeyRound size={13} /> Đặt mật khẩu
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Users} title="Chưa có tài khoản nào" description="Thêm tài khoản cho nhân viên để không phải dùng chung tài khoản chủ." />
        )}
      </Panel>

      <div style={{ padding: '0 2px' }}>
        <Callout icon={ShieldCheck}>
          Nhân viên làm được việc hằng ngày: khách hàng, thiết bị, đơn thuê, thu tiền, sửa chữa, duyệt yêu cầu
          và đổi giá máy. Không xem được trang Tài chính, không nạp ví, không hoàn tiền, không đụng cấu hình
          khoá mạng, nhật ký thao tác hay tài khoản.
        </Callout>
      </div>

      {/* ---- Tạo tài khoản ---- */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm tài khoản"
        description="Người dùng sẽ đăng nhập bằng email và mật khẩu bạn đặt ở đây."
      >
        <form className="modal-form" onSubmit={create}>
          <div className="form-grid">
            <Field label="Họ và tên" required>
              <input name="name" required minLength={2} placeholder="Nguyễn Văn An" />
            </Field>
            <Field label="Vai trò">
              <select name="role" defaultValue="STAFF">
                <option value="STAFF">Nhân viên</option>
                <option value="OWNER">Chủ hệ thống</option>
              </select>
            </Field>
          </div>
          <Field label="Email đăng nhập" required>
            <input name="email" type="email" required placeholder="nhanvien@thuemay.local" />
          </Field>
          <Field label="Mật khẩu" required hint="Ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.">
            <input name="password" type="text" required minLength={10} autoComplete="new-password" />
          </Field>
          <Callout icon={KeyRound}>
            Mật khẩu hiện rõ để bạn chép gửi cho nhân viên. Dặn họ vào Cài đặt đổi lại ngay sau lần đăng nhập đầu.
          </Callout>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo…' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---- Sửa tài khoản ---- */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name || 'Tài khoản'}
        description={editing?.email}
      >
        {editing && (
          <form className="modal-form" onSubmit={update}>
            <Field label="Họ và tên" required>
              <input name="name" required minLength={2} defaultValue={editing.name} />
            </Field>

            {editing.id === admin?.id ? (
              <Callout icon={ShieldCheck}>
                Đây là tài khoản bạn đang dùng. Không thể tự đổi vai trò hay tự khoá mình, để tránh tự nhốt
                mình ra khỏi hệ thống. Nhờ một tài khoản chủ khác làm việc đó nếu cần.
              </Callout>
            ) : (
              <div className="form-grid">
                <Field label="Vai trò">
                  <select name="role" defaultValue={editing.role}>
                    <option value="STAFF">Nhân viên</option>
                    <option value="OWNER">Chủ hệ thống</option>
                  </select>
                </Field>
                <Field label="Trạng thái" hint="Khoá sẽ đăng xuất người này khỏi mọi thiết bị.">
                  <select name="status" defaultValue={editing.status}>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="DISABLED">Đã khoá</option>
                  </select>
                </Field>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Huỷ</button>
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---- Đặt lại mật khẩu ---- */}
      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        title="Đặt lại mật khẩu"
        description={resetting ? `${resetting.name} · ${resetting.email}` : ''}
      >
        <form className="modal-form" onSubmit={resetPassword}>
          <Field label="Mật khẩu mới" required hint="Ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.">
            <input name="password" type="text" required minLength={10} autoComplete="new-password" />
          </Field>
          <Callout icon={KeyRound}>
            Người này sẽ bị đăng xuất khỏi mọi thiết bị và phải đăng nhập lại bằng mật khẩu mới.
          </Callout>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setResetting(null)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang đặt…' : 'Đặt mật khẩu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

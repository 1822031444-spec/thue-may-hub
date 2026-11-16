import { Box, Cpu, LayoutGrid, List, Lock, Plus, Smartphone, Trash2, UserRound, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, dateOnly, dateTime, money } from '../api';
import { ConfirmModal, EmptyState, ErrorState, Field, Modal, PageHeader, SearchBox, Segmented, StatusBadge, TableSkeleton } from '../components/UI';
import { usePendingAction } from '../lib/pendingAction';
import { useToast } from '../lib/toast';
import type { Device, Paged, Repair } from '../types';

type TypeFilter = 'ALL' | 'PC' | 'BOXPHONE';
const VIEW_KEY = 'thuemay.devices.view';

export function DevicesPage() {
  const toast = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('ALL');
  const [view, setView] = useState<'grid' | 'table'>(() => (localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'));
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  usePendingAction('create', () => setAddOpen(true));

  const load = async () => {
    try {
      setDevices(await api<Device[]>('/devices'));
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được danh sách thiết bị.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(); };

  const switchView = (next: 'grid' | 'table') => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const filtered = useMemo(() => {
    const key = query.toLowerCase().trim();
    return devices.filter((device) => {
      if (filter !== 'ALL' && device.type !== filter) return false;
      if (!key) return true;
      return [device.name, device.code, device.specs, device.ip_address]
        .some((value) => (value || '').toLowerCase().includes(key));
    });
  }, [devices, filter, query]);

  const addDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/devices', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          type: form.get('type'),
          specs: form.get('specs'),
          ipAddress: form.get('ipAddress'),
          accessNote: form.get('accessNote'),
          hourlyRate: Number(form.get('hourlyRate') || 0),
          dailyRate: Number(form.get('dailyRate') || 0),
          weeklyRate: Number(form.get('weeklyRate') || 0),
          monthlyRate: Number(form.get('monthlyRate') || 0),
          purchasePrice: Number(form.get('purchasePrice') || 0),
          purchasedAt: form.get('purchasedAt') || null,
          notes: form.get('notes'),
        }),
      });
      setAddOpen(false);
      toast.success('Đã thêm thiết bị vào kho.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể thêm thiết bị.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Xoá hẳn thiết bị. Server từ chối nếu máy đã có lịch sử — lúc đó gợi ý luôn
   * cách thay thế thay vì chỉ báo lỗi rồi để người dùng tự đoán phải làm gì.
   */
  const removeDevice = async () => {
    if (!deleteDevice) return;
    setSubmitting(true);
    try {
      await api(`/devices/${deleteDevice.id}`, { method: 'DELETE' });
      toast.success('Đã xoá thiết bị.', `${deleteDevice.name} · ${deleteDevice.code}`);
      setDeleteDevice(null);
      setEditDevice(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không xoá được thiết bị.');
      setDeleteDevice(null);
    } finally {
      setSubmitting(false);
    }
  };

  const updateDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editDevice) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/devices/${editDevice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          type: form.get('type'),
          specs: form.get('specs'),
          ipAddress: form.get('ipAddress'),
          accessNote: form.get('accessNote'),
          hourlyRate: Number(form.get('hourlyRate') || 0),
          dailyRate: Number(form.get('dailyRate') || 0),
          weeklyRate: Number(form.get('weeklyRate') || 0),
          monthlyRate: Number(form.get('monthlyRate') || 0),
          purchasePrice: Number(form.get('purchasePrice') || 0),
          status: form.get('status'),
          notes: form.get('notes'),
        }),
      });
      toast.success('Đã cập nhật thiết bị.', editDevice.name);
      setEditDevice(null);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể cập nhật thiết bị.');
    } finally {
      setSubmitting(false);
    }
  };

  const pcCount = devices.filter((item) => item.type === 'PC').length;
  const phoneCount = devices.filter((item) => item.type === 'BOXPHONE').length;
  const availableCount = devices.filter((item) => item.status === 'AVAILABLE').length;
  const attentionCount = devices.filter((item) => item.status === 'MAINTENANCE' || item.status === 'OFFLINE').length;

  return (
    <>
      <PageHeader
        eyebrow="Tài sản vận hành"
        title="Kho thiết bị"
        description="Theo dõi tình trạng, cấu hình và hiệu suất từng PC, boxphone."
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Thêm thiết bị</button>}
      />

      <section className="mini-stats">
        <div><Cpu /><span>PC</span><strong>{pcCount}</strong></div>
        <div><Smartphone /><span>Boxphone</span><strong>{phoneCount}</strong></div>
        <div><Box /><span>Sẵn sàng</span><strong>{availableCount}</strong></div>
        <div><Wrench /><span>Cần xử lý</span><strong>{attentionCount}</strong></div>
      </section>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Mã máy, cấu hình, IP…" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'Tất cả' },
            { value: 'PC', label: 'PC' },
            { value: 'BOXPHONE', label: 'Boxphone' },
          ]}
        />
        <div className="toolbar-count"><strong>{filtered.length}</strong> thiết bị</div>
        <div className="segmented">
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => switchView('grid')}
            title="Dạng thẻ"
            aria-label="Xem dạng thẻ"
            aria-pressed={view === 'grid'}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            className={view === 'table' ? 'active' : ''}
            onClick={() => switchView('table')}
            title="Dạng bảng"
            aria-label="Xem dạng bảng"
            aria-pressed={view === 'table'}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <section className="panel"><TableSkeleton /></section>
      ) : loadFailed && !devices.length ? (
        <section className="panel"><ErrorState onRetry={retry} /></section>
      ) : !filtered.length ? (
        <section className="panel">
          <EmptyState
            icon={Cpu}
            title={query || filter !== 'ALL' ? 'Không có thiết bị phù hợp' : 'Chưa có thiết bị'}
            description={query || filter !== 'ALL'
              ? 'Thử từ khoá khác hoặc chọn lại loại thiết bị.'
              : 'Thêm PC hoặc boxphone đầu tiên để bắt đầu quản lý kho.'}
            action={!query && filter === 'ALL' && (
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Thêm thiết bị</button>
            )}
          />
        </section>
      ) : view === 'grid' ? (
        <section className="device-grid">
          {filtered.map((device) => (
            <button className="device-card" key={device.id} onClick={() => setEditDevice(device)}>
              <header>
                <div className={`device-type ${device.type.toLowerCase()}`}>
                  {device.type === 'PC' ? <Cpu /> : <Smartphone />}
                </div>
                <StatusBadge status={device.status} />
              </header>
              <span className="device-code">{device.code}</span>
              <h3>{device.name}</h3>
              <p>{device.specs || 'Chưa cập nhật cấu hình'}</p>

              {device.current_customer && (
                <div className="device-holder">
                  <UserRound />
                  Đang giữ bởi <strong>{device.current_customer}</strong>
                </div>
              )}

              <div className="device-figures three">
                <div><span>Giá tháng</span><strong>{money(device.monthly_rate)}</strong></div>
                <div><span>Doanh thu</span><strong>{money(device.lifetime_revenue)}</strong></div>
                <div>
                  <span>Tiền sửa</span>
                  <strong className={device.repair_cost ? 'neg' : ''}>{money(device.repair_cost)}</strong>
                </div>
              </div>

              <footer>
                <span>{device.ip_address || 'Chưa gán IP'}</span>
                {device.network_status === 'LOCKED'
                  ? <strong className="net-lock"><Lock size={12} /> Đã khoá mạng</strong>
                  : device.open_repairs > 0
                    ? <strong className="warn-text"><Wrench size={12} /> Đang sửa</strong>
                    : <strong>{device.rental_count} lượt thuê</strong>}
              </footer>
            </button>
          ))}
        </section>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thiết bị</th>
                  <th>Cấu hình</th>
                  <th>IP</th>
                  <th>Trạng thái</th>
                  <th>Đang giữ</th>
                  <th className="num">Giá tháng</th>
                  <th className="num">Doanh thu</th>
                  <th className="num">Tiền sửa</th>
                  <th className="num">Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => setEditDevice(device)}
                    // Hàng bảng vốn không nhận được Tab. Không có ba dòng dưới thì
                    // ở dạng bảng, người dùng bàn phím không cách nào mở được máy.
                    tabIndex={0}
                    role="button"
                    aria-label={`Mở thiết bị ${device.name}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setEditDevice(device);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="cell-identity">
                        <div className={`device-type ${device.type.toLowerCase()}`} style={{ width: 28, height: 28 }}>
                          {device.type === 'PC' ? <Cpu size={14} /> : <Smartphone size={14} />}
                        </div>
                        <div className="cell-stack">
                          <strong>{device.name}</strong>
                          <small>{device.code}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className="truncate" style={{ display: 'block', maxWidth: 260 }}>{device.specs || '—'}</span></td>
                    <td>
                      <span className="code-chip">{device.ip_address || '—'}</span>
                      {device.network_status === 'LOCKED' && (
                        <span className="net-lock" style={{ marginLeft: 6, fontSize: 11 }}>
                          <Lock size={11} /> khoá
                        </span>
                      )}
                    </td>
                    <td><StatusBadge status={device.status} /></td>
                    <td>{device.current_customer || <span className="muted">—</span>}</td>
                    <td className="num money-cell">{money(device.monthly_rate)}</td>
                    <td className="num money-cell">{money(device.lifetime_revenue)}</td>
                    <td className={`num money-cell ${device.repair_cost ? 'neg' : 'muted'}`}>
                      {device.repair_cost ? money(device.repair_cost) : '—'}
                    </td>
                    <td className="num money-cell">
                      {money(device.lifetime_revenue - device.repair_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Thêm thiết bị"
        description="Mã tài sản sẽ được hệ thống sinh tự động."
      >
        <DeviceForm onSubmit={addDevice} submitting={submitting} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal
        open={!!editDevice}
        onClose={() => setEditDevice(null)}
        title={editDevice?.name || 'Thiết bị'}
        description={editDevice
          ? `${editDevice.code} · ${editDevice.type === 'PC' ? 'Máy tính' : 'Boxphone'}${editDevice.current_end_at ? ` · Hết hạn ${dateTime(editDevice.current_end_at)}` : ''}`
          : ''}
      >
        {editDevice && (
          <>
            <DeviceRepairHistory device={editDevice} />
            <DeviceForm
              device={editDevice}
              onSubmit={updateDevice}
              submitting={submitting}
              onCancel={() => setEditDevice(null)}
              onDelete={() => setDeleteDevice(editDevice)}
            />
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteDevice}
        title="Xoá thiết bị"
        description={deleteDevice
          ? `${deleteDevice.name} (${deleteDevice.code}) sẽ bị xoá hẳn khỏi kho. Chỉ xoá được máy chưa từng có đơn thuê, yêu cầu thuê hay phiếu sửa — nếu đã có, app sẽ báo lại và bạn nên chọn "Ngừng dùng" thay vì xoá.`
          : ''}
        confirmLabel="Xoá thiết bị"
        danger
        busy={submitting}
        onConfirm={removeDevice}
        onClose={() => setDeleteDevice(null)}
      />
    </>
  );
}

/**
 * Lịch sử sửa của riêng thiết bị đang mở. Đặt ngay trên form vì lúc quyết định
 * giữ hay thanh lý một máy, câu hỏi đầu tiên là máy này đã ngốn bao nhiêu tiền.
 */
function DeviceRepairHistory({ device }: { device: Device }) {
  const [repairs, setRepairs] = useState<Repair[] | null>(null);
  const [repairTotal, setRepairTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setRepairs(null);
    setRepairTotal(0);
    setFailed(false);
    // Chỉ cần vài phiếu gần nhất để hiện tóm tắt, nhưng `total` phải là tổng thật
    // vì dòng "Xem tất cả N phiếu sửa" bên dưới dựa vào nó.
    api<Paged<Repair>>(`/repairs?deviceId=${device.id}&limit=5`)
      .then((data) => { setRepairs(data.rows); setRepairTotal(data.total); })
      // Tải hỏng mà báo "chưa có phiếu sửa nào" là nói sai với người đang cân nhắc
      // giữ hay thanh lý máy — đúng lúc họ cần con số thật nhất.
      .catch(() => { setFailed(true); setRepairs([]); });
  }, [device.id]);

  const net = device.lifetime_revenue - device.repair_cost;

  return (
    <div className="device-repairs">
      <div className="device-repairs-summary">
        <div><span>Doanh thu</span><strong>{money(device.lifetime_revenue)}</strong></div>
        <div><span>Tiền sửa</span><strong className={device.repair_cost ? 'neg' : ''}>{money(device.repair_cost)}</strong></div>
        <div><span>Còn lại</span><strong className={net < 0 ? 'neg' : 'pos'}>{money(net)}</strong></div>
      </div>

      {repairs === null ? (
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>Đang tải lịch sử sửa…</p>
      ) : failed ? (
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
          Không tải được lịch sử sửa của máy này.
        </p>
      ) : repairs.length ? (
        <div className="device-repair-list">
          {repairs.slice(0, 4).map((item) => (
            <div key={item.id}>
              <Wrench />
              <div>
                <strong>{item.title}</strong>
                <small>{dateOnly(item.reported_at)} · {item.vendor || 'Tự sửa'}</small>
              </div>
              <StatusBadge status={item.status} />
              <b>{money(item.service_cost + item.parts_cost)}</b>
            </div>
          ))}
          {repairTotal > 4 && (
            <Link to="/admin/repairs" className="device-repair-more">
              Xem tất cả {repairTotal} phiếu sửa
            </Link>
          )}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
          Máy này chưa có phiếu sửa nào.{' '}
          <Link to="/admin/repairs" state={{ action: 'create' }} style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
            Tạo phiếu sửa
          </Link>
        </p>
      )}
    </div>
  );
}

function DeviceForm({ device, onSubmit, onCancel, onDelete, submitting }: {
  device?: Device;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  submitting: boolean;
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <Field label="Tên thiết bị" required>
          <input name="name" required minLength={2} defaultValue={device?.name} placeholder="PC Render 01" />
        </Field>
        <Field label="Loại thiết bị">
          <select name="type" defaultValue={device?.type || 'PC'}>
            <option value="PC">PC</option>
            <option value="BOXPHONE">Boxphone</option>
          </select>
        </Field>
      </div>

      {device && (
        <Field label="Trạng thái" hint="Chọn “Ngừng dùng” khi không cho thuê máy này nữa nhưng vẫn muốn giữ lịch sử.">
          <select name="status" defaultValue={device.status}>
            <option value="AVAILABLE">Sẵn sàng</option>
            <option value="RESERVED">Đã giữ chỗ</option>
            <option value="RENTED">Đang thuê</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="OFFLINE">Mất kết nối</option>
            <option value="RETIRED">Ngừng dùng</option>
          </select>
        </Field>
      )}

      <Field label="Cấu hình">
        <textarea name="specs" rows={2} defaultValue={device?.specs} placeholder="Ryzen 7 · RAM 32GB · RTX 4060 · NVMe 1TB" />
      </Field>

      <div className="form-grid">
        <Field label="IP / hostname"><input name="ipAddress" defaultValue={device?.ip_address} placeholder="10.10.20.101" /></Field>
        <Field label="Giá mua"><input name="purchasePrice" type="number" min="0" step="1000" defaultValue={device?.purchase_price || 0} /></Field>
      </div>

      {/* Bốn mức giá để gia hạn theo đơn vị nào cũng có sẵn số, khỏi gõ tay mỗi lần.
          Để 0 nghĩa là không cho thuê theo đơn vị đó. */}
      <div className="form-grid">
        <Field label="Giá theo giờ"><input name="hourlyRate" type="number" min="0" step="1000" defaultValue={device?.hourly_rate || 0} /></Field>
        <Field label="Giá theo ngày"><input name="dailyRate" type="number" min="0" step="1000" defaultValue={device?.daily_rate || 0} /></Field>
      </div>

      <div className="form-grid">
        <Field label="Giá theo tuần"><input name="weeklyRate" type="number" min="0" step="1000" defaultValue={device?.weekly_rate || 0} /></Field>
        <Field label="Giá theo tháng"><input name="monthlyRate" type="number" min="0" step="1000" defaultValue={device?.monthly_rate || 0} /></Field>
      </div>

      {!device && <Field label="Ngày mua"><input name="purchasedAt" type="date" /></Field>}

      <Field label="Thông tin truy cập nội bộ" hint="Chỉ hiển thị cho quản trị viên.">
        <textarea name="accessNote" rows={2} defaultValue={device?.access_note} placeholder="Gateway, tài khoản hoặc vị trí rack…" />
      </Field>

      <Field label="Ghi chú"><textarea name="notes" rows={2} defaultValue={device?.notes} /></Field>

      <div className="modal-actions">
        {device && onDelete && (
          // Đẩy sang trái, tách hẳn khỏi cụm Huỷ / Lưu để không bấm nhầm.
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginRight: 'auto' }}
            onClick={onDelete}
            disabled={submitting}
          >
            <Trash2 size={15} /> Xoá thiết bị
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Huỷ</button>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Đang lưu…' : device ? 'Lưu thay đổi' : 'Thêm thiết bị'}
        </button>
      </div>
    </form>
  );
}

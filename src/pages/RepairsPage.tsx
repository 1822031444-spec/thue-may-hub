import {
  AlertTriangle, Boxes, CircleDollarSign, ClipboardList, Package, PackagePlus, Pencil, Plus,
  Trash2, TriangleAlert, Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, dateTime, money, toLocalInput } from '../api';
import {
  Callout, EmptyState, ErrorState, Field, Modal, PageHeader, SearchBox, Segmented, StatusBadge, TableSkeleton, Tabs,
} from '../components/UI';
import { usePendingAction } from '../lib/pendingAction';
import { useToast } from '../lib/toast';
import type { Device, Paged, Part, PartMovement, Repair, RepairDetail } from '../types';

const PART_CATEGORIES: Record<string, string> = {
  RAM: 'RAM',
  STORAGE: 'Ổ cứng',
  GPU: 'Card màn hình',
  CPU: 'CPU',
  MAINBOARD: 'Bo mạch chủ',
  PSU: 'Nguồn',
  COOLING: 'Tản nhiệt',
  SCREEN: 'Màn hình',
  BATTERY: 'Pin',
  CABLE: 'Dây và cáp',
  OTHER: 'Khác',
};

const MOVEMENT_NAMES: Record<string, string> = {
  PURCHASE: 'Nhập mua',
  CONSUME: 'Lắp vào máy',
  RETURN: 'Trả về kho',
  ADJUST: 'Kiểm kê',
};

const OPEN_STATUSES = ['REPORTED', 'IN_PROGRESS'];

/** Mỗi lần tải thêm bấy nhiêu phiếu sửa / dòng lịch sử kho. */
const REPAIR_PAGE = 100;
const MOVEMENT_PAGE = 50;

export function RepairsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'repairs' | 'parts'>('repairs');

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'OPEN' | 'CLOSED' | 'ALL'>('OPEN');
  const [newRepairOpen, setNewRepairOpen] = useState(false);
  const [openRepairId, setOpenRepairId] = useState<string | null>(null);
  const [newPartOpen, setNewPartOpen] = useState(false);
  const [stockPart, setStockPart] = useState<Part | null>(null);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [historyPart, setHistoryPart] = useState<Part | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [repairTotal, setRepairTotal] = useState(0);
  const [repairLimit, setRepairLimit] = useState(REPAIR_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  usePendingAction('create', () => setNewRepairOpen(true));

  const load = async (size = REPAIR_PAGE) => {
    try {
      const [repairData, partData, deviceData] = await Promise.all([
        api<Paged<Repair>>(`/repairs?limit=${size}`),
        api<Part[]>('/parts'),
        api<Device[]>('/devices'),
      ]);
      setRepairs(repairData.rows);
      setRepairTotal(repairData.total);
      setParts(partData);
      setDevices(deviceData);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được dữ liệu sửa chữa.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const retry = () => { setLoading(true); void load(repairLimit); };

  const loadMoreRepairs = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = repairLimit + REPAIR_PAGE;
    setRepairLimit(next);
    await load(next);
    setLoadingMore(false);
  };

  const openCount = repairs.filter((item) => OPEN_STATUSES.includes(item.status)).length;
  const lowStock = parts.filter((item) => item.min_quantity > 0 && item.quantity < item.min_quantity);
  const stockValue = parts.reduce((sum, item) => sum + item.quantity * item.average_cost, 0);
  const spentThisMonth = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return repairs
      .filter((item) => item.closed_at && new Date(item.closed_at) >= monthStart)
      .reduce((sum, item) => sum + item.service_cost + item.parts_cost, 0);
  }, [repairs]);

  const filteredRepairs = useMemo(() => {
    const key = query.toLowerCase().trim();
    return repairs.filter((item) => {
      const isOpen = OPEN_STATUSES.includes(item.status);
      if (filter === 'OPEN' && !isOpen) return false;
      if (filter === 'CLOSED' && isOpen) return false;
      if (!key) return true;
      return [item.code, item.title, item.device_name, item.device_code, item.vendor]
        .some((value) => (value || '').toLowerCase().includes(key));
    });
  }, [repairs, filter, query]);

  const filteredParts = useMemo(() => {
    const key = query.toLowerCase().trim();
    if (!key) return parts;
    return parts.filter((item) => [item.name, item.code, item.location]
      .some((value) => (value || '').toLowerCase().includes(key)));
  }, [parts, query]);

  const createRepair = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ code: string }>('/repairs', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: form.get('deviceId'),
          title: form.get('title'),
          symptom: form.get('symptom'),
          vendor: form.get('vendor'),
          notes: form.get('notes'),
          startNow: form.get('startNow') === 'on',
        }),
      });
      setNewRepairOpen(false);
      toast.success(`Đã tạo phiếu ${result.code}.`);
      await load();
    } catch (err) {
      toast.fromError(err, 'Không tạo được phiếu sửa chữa.');
    } finally {
      setSubmitting(false);
    }
  };

  const createPart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/parts', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          category: form.get('category'),
          unit: form.get('unit'),
          minQuantity: Number(form.get('minQuantity') || 0),
          location: form.get('location'),
          notes: form.get('notes'),
        }),
      });
      setNewPartOpen(false);
      toast.success('Đã thêm linh kiện vào danh mục.');
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thêm được linh kiện.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Bảo trì tài sản"
        title="Sửa chữa & linh kiện"
        description="Theo dõi máy đang hỏng, tiền sửa từng thiết bị và tồn kho phụ tùng thay thế."
        actions={tab === 'repairs' ? (
          <button className="btn btn-primary" onClick={() => setNewRepairOpen(true)}><Plus /> Tạo phiếu sửa</button>
        ) : (
          <button className="btn btn-primary" onClick={() => setNewPartOpen(true)}><Plus /> Thêm linh kiện</button>
        )}
      />

      <section className="mini-stats">
        <div><Wrench /><span>Phiếu đang mở</span><strong>{openCount}</strong></div>
        <div><CircleDollarSign /><span>Chi sửa tháng này</span><strong>{money(spentThisMonth)}</strong></div>
        <div><Package /><span>Giá trị tồn kho</span><strong>{money(stockValue)}</strong></div>
        <div><TriangleAlert /><span>Linh kiện sắp hết</span><strong>{lowStock.length}</strong></div>
      </section>

      {lowStock.length > 0 && tab === 'parts' && (
        <div className="notice error">
          <AlertTriangle />
          <span>
            Sắp hết: {lowStock.map((item) => `${item.name} (còn ${item.quantity} ${item.unit})`).join(' · ')}
          </span>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={(value) => { setTab(value); setQuery(''); }}
        options={[
          { value: 'repairs', label: 'Phiếu sửa chữa', count: openCount },
          { value: 'parts', label: 'Kho linh kiện', count: parts.length },
        ]}
      />

      <div className="toolbar">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder={tab === 'repairs' ? 'Mã phiếu, thiết bị, nơi sửa…' : 'Tên linh kiện, mã, vị trí…'}
        />
        {tab === 'repairs' && (
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'OPEN', label: 'Đang mở' },
              { value: 'CLOSED', label: 'Đã đóng' },
              { value: 'ALL', label: 'Tất cả' },
            ]}
          />
        )}
        <div className="toolbar-count">
          <strong>{tab === 'repairs' ? filteredRepairs.length : filteredParts.length}</strong>
          {tab === 'repairs' ? ' phiếu' : ' loại linh kiện'}
        </div>
      </div>

      <section className="panel">
        {loading ? <TableSkeleton /> : loadFailed && !repairs.length && !parts.length ? (
          <ErrorState onRetry={retry} />
        ) : tab === 'repairs' ? (
          filteredRepairs.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Phiếu</th>
                    <th>Thiết bị</th>
                    <th>Nơi sửa</th>
                    <th className="num">Linh kiện</th>
                    <th className="num">Tiền công</th>
                    <th className="num">Tổng chi</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredRepairs.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.title}</strong>
                          <small>{item.code} · {dateTime(item.reported_at)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.device_name}</strong>
                          <small>{item.device_code}</small>
                        </div>
                      </td>
                      <td>{item.vendor || <span className="muted">—</span>}</td>
                      <td className="num">{item.parts_count || <span className="muted">—</span>}</td>
                      <td className="num money-cell">{item.service_cost ? money(item.service_cost) : <span className="muted">—</span>}</td>
                      <td className="num money-cell">{money(item.service_cost + item.parts_cost)}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => setOpenRepairId(item.id)}>
                            {OPEN_STATUSES.includes(item.status) ? 'Xử lý' : 'Xem'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title={query || filter !== 'ALL' ? 'Không có phiếu phù hợp' : 'Chưa có phiếu sửa chữa'}
              description={query || filter !== 'ALL'
                ? 'Thử từ khoá khác hoặc đổi bộ lọc trạng thái.'
                : 'Khi một máy hỏng, tạo phiếu để theo dõi tiến độ và tiền đã chi cho máy đó.'}
              action={!query && filter === 'ALL' && (
                <button className="btn btn-primary" onClick={() => setNewRepairOpen(true)}><Plus /> Tạo phiếu sửa</button>
              )}
            />
          )
        ) : filteredParts.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Linh kiện</th>
                  <th>Nhóm</th>
                  <th>Vị trí</th>
                  <th className="num">Tồn kho</th>
                  <th className="num">Giá vốn</th>
                  <th className="num">Giá trị</th>
                  <th className="num">Đã dùng</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((item) => {
                  const low = item.min_quantity > 0 && item.quantity < item.min_quantity;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.name}</strong>
                          <small>{item.code}</small>
                        </div>
                      </td>
                      <td><span className="chip">{PART_CATEGORIES[item.category] || item.category}</span></td>
                      <td>{item.location || <span className="muted">—</span>}</td>
                      <td className="num">
                        <strong className={low ? 'neg' : ''}>{item.quantity}</strong>
                        <small className="muted"> {item.unit}</small>
                        {low && <div><small className="neg">Tối thiểu {item.min_quantity}</small></div>}
                      </td>
                      <td className="num money-cell">{money(item.average_cost)}</td>
                      <td className="num money-cell">{money(item.quantity * item.average_cost)}</td>
                      <td className="num">{item.consumed_quantity || <span className="muted">—</span>}</td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => setStockPart(item)}><PackagePlus size={13} /> Nhập kho</button>
                          <button onClick={() => setEditPart(item)}><Pencil size={13} /> Sửa</button>
                          <button onClick={() => setHistoryPart(item)}>Lịch sử</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Boxes}
            title={query ? 'Không tìm thấy linh kiện' : 'Kho linh kiện đang trống'}
            description={query
              ? 'Thử từ khoá khác.'
              : 'Khai báo các phụ tùng bạn trữ sẵn như RAM, SSD, nguồn, quạt tản nhiệt để trừ kho mỗi lần thay.'}
            action={!query && (
              <button className="btn btn-primary" onClick={() => setNewPartOpen(true)}><Plus /> Thêm linh kiện</button>
            )}
          />
        )}

        {/* Chỉ tab phiếu sửa mới phân trang; kho linh kiện là danh sách chủng loại,
            không phình theo từng lần thao tác nên server trả hết. */}
        {tab === 'repairs' && !loading && !loadFailed && repairs.length < repairTotal && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <button className="btn btn-secondary" onClick={loadMoreRepairs} disabled={loadingMore}>
              {loadingMore ? 'Đang tải…' : `Xem thêm — còn ${repairTotal - repairs.length} phiếu`}
            </button>
          </div>
        )}
      </section>

      {/* ---- Tạo phiếu sửa ---- */}
      <Modal
        open={newRepairOpen}
        onClose={() => setNewRepairOpen(false)}
        title="Tạo phiếu sửa chữa"
        description="Ghi lại máy hỏng để theo dõi tiến độ và chi phí."
      >
        <form className="modal-form" onSubmit={createRepair}>
          <Field label="Thiết bị" required>
            <select name="deviceId" required defaultValue="">
              <option value="" disabled>Chọn thiết bị</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} · {device.code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hỏng gì" required>
            <input name="title" required minLength={3} placeholder="Ví dụ: Máy không lên nguồn" />
          </Field>
          <Field label="Mô tả chi tiết">
            <textarea name="symptom" rows={3} placeholder="Hiện tượng, thời điểm phát hiện, đã thử cách nào…" />
          </Field>
          <Field label="Nơi sửa" hint="Tên cửa hàng hoặc thợ; có thể điền sau.">
            <input name="vendor" placeholder="Cửa hàng Anh Tuấn…" />
          </Field>
          <Field label="Ghi chú"><textarea name="notes" rows={2} /></Field>
          <label className="checkbox-row">
            <input type="checkbox" name="startNow" defaultChecked />
            <span>
              Bắt đầu sửa ngay và chuyển máy sang <strong>Bảo trì</strong>
              <small>Máy sẽ không xuất hiện trong danh sách cho thuê cho tới khi đóng phiếu. Máy khách đang cầm thì giữ nguyên trạng thái.</small>
            </span>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setNewRepairOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang tạo…' : 'Tạo phiếu'}</button>
          </div>
        </form>
      </Modal>

      {/* ---- Thêm linh kiện ---- */}
      <Modal
        open={newPartOpen}
        onClose={() => setNewPartOpen(false)}
        title="Thêm linh kiện"
        description="Khai báo loại phụ tùng. Số lượng được nhập ở bước nhập kho."
      >
        <form className="modal-form" onSubmit={createPart}>
          <div className="form-grid">
            <Field label="Tên linh kiện" required>
              <input name="name" required minLength={2} placeholder="RAM DDR4 16GB Kingston" />
            </Field>
            <Field label="Nhóm">
              <select name="category" defaultValue="OTHER">
                {Object.entries(PART_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid three">
            <Field label="Đơn vị"><input name="unit" defaultValue="cái" /></Field>
            <Field label="Tồn tối thiểu" hint="Dưới mức này sẽ cảnh báo.">
              <input name="minQuantity" type="number" min="0" defaultValue="0" />
            </Field>
            <Field label="Vị trí cất"><input name="location" placeholder="Kệ A2" /></Field>
          </div>
          <Field label="Ghi chú"><textarea name="notes" rows={2} placeholder="Thông số, máy tương thích…" /></Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setNewPartOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu…' : 'Thêm linh kiện'}</button>
          </div>
        </form>
      </Modal>

      {openRepairId && (
        <RepairDetailModal
          repairId={openRepairId}
          parts={parts}
          onClose={() => setOpenRepairId(null)}
          onChanged={load}
        />
      )}

      {stockPart && (
        <StockModal part={stockPart} onClose={() => setStockPart(null)} onChanged={load} />
      )}

      {editPart && (
        <EditPartModal part={editPart} onClose={() => setEditPart(null)} onChanged={load} />
      )}

      {historyPart && (
        <HistoryModal part={historyPart} onClose={() => setHistoryPart(null)} />
      )}
    </>
  );
}

/* ---- Chi tiết phiếu sửa --------------------------------------------------- */

function RepairDetailModal({ repairId, parts, onClose, onChanged }: {
  repairId: string;
  parts: Part[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState<'DONE' | 'UNREPAIRABLE' | null>(null);
  const [editing, setEditing] = useState(false);
  /** Dòng linh kiện đang được trả về kho. */
  const [removingPart, setRemovingPart] = useState<string | null>(null);

  const load = async () => {
    try {
      setRepair(await api<RepairDetail>(`/repairs/${repairId}`));
    } catch (err) {
      toast.fromError(err, 'Không tải được phiếu sửa chữa.');
      onClose();
    }
  };
  useEffect(() => { void load(); }, [repairId]);

  const refresh = async () => {
    await load();
    await onChanged();
  };

  const isOpen = repair ? OPEN_STATUSES.includes(repair.status) : false;
  const availableParts = parts.filter((part) => part.quantity > 0);

  const addPart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(`/repairs/${repairId}/parts`, {
        method: 'POST',
        body: JSON.stringify({ partId: data.get('partId'), quantity: Number(data.get('quantity')) }),
      });
      form.reset();
      toast.success('Đã lắp linh kiện vào máy và trừ kho.');
      await refresh();
    } catch (err) {
      toast.fromError(err, 'Không lắp được linh kiện.');
    } finally {
      setSubmitting(false);
    }
  };

  const removePart = async (movementId: string) => {
    // Bấm hai lần sẽ hoàn kho hai lần, tồn kho lệch hẳn so với thực tế.
    if (removingPart) return;
    setRemovingPart(movementId);
    try {
      await api(`/repairs/${repairId}/parts/${movementId}`, { method: 'DELETE' });
      toast.success('Đã trả linh kiện về kho.');
      await refresh();
    } catch (err) {
      toast.fromError(err, 'Không gỡ được linh kiện.');
    } finally {
      setRemovingPart(null);
    }
  };

  const changeStatus = async (status: string, body: Record<string, unknown> = {}) => {
    setSubmitting(true);
    try {
      await api(`/repairs/${repairId}/status`, { method: 'PATCH', body: JSON.stringify({ status, ...body }) });
      toast.success(
        status === 'IN_PROGRESS' ? 'Đã chuyển sang đang sửa.'
          : status === 'DONE' ? 'Đã đóng phiếu và ghi chi phí.'
            : status === 'UNREPAIRABLE' ? 'Đã đánh dấu không sửa được, máy chuyển sang Ngừng dùng.'
              : 'Đã huỷ phiếu.',
      );
      if (status === 'IN_PROGRESS') {
        await refresh();
      } else {
        await onChanged();
        onClose();
      }
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được phiếu.');
    } finally {
      setSubmitting(false);
      setClosing(null);
    }
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      await api(`/repairs/${repairId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: data.get('title'),
          symptom: data.get('symptom'),
          vendor: data.get('vendor'),
          serviceCost: Number(data.get('serviceCost') || 0),
          notes: data.get('notes'),
        }),
      });
      toast.success('Đã cập nhật phiếu sửa.');
      setEditing(false);
      await refresh();
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được phiếu sửa.');
    } finally {
      setSubmitting(false);
    }
  };

  const close = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!closing) return;
    const data = new FormData(event.currentTarget);
    await changeStatus(closing, {
      serviceCost: Number(data.get('serviceCost') || 0),
      vendor: data.get('vendor'),
      paymentMethod: data.get('paymentMethod'),
      reference: data.get('reference'),
      resolution: data.get('resolution'),
    });
  };

  const partsCost = repair?.parts.reduce((sum, line) => sum + -line.quantity * line.unit_cost, 0) || 0;

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={repair?.title || 'Phiếu sửa chữa'}
      description={repair ? `${repair.code} · ${repair.device_name} (${repair.device_code})` : ''}
    >
      {!repair ? (
        <div className="modal-body"><TableSkeleton rows={4} /></div>
      ) : editing ? (
        <form className="modal-form" onSubmit={saveContent}>
          <Field label="Hỏng gì" required>
            <input name="title" required minLength={3} defaultValue={repair.title} />
          </Field>
          <Field label="Mô tả chi tiết">
            <textarea name="symptom" rows={3} defaultValue={repair.symptom} />
          </Field>
          <div className="form-grid">
            <Field label="Nơi sửa"><input name="vendor" defaultValue={repair.vendor} /></Field>
            <Field label="Tiền công tạm tính" hint="Số cuối cùng nhập lại khi đóng phiếu.">
              <input name="serviceCost" type="number" min="0" step="1000" defaultValue={repair.service_cost} />
            </Field>
          </div>
          <Field label="Ghi chú"><textarea name="notes" rows={2} defaultValue={repair.notes} /></Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Quay lại</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      ) : closing ? (
        <form className="modal-form" onSubmit={close}>
          <Callout icon={CircleDollarSign}>
            {closing === 'DONE'
              ? 'Tiền công nhập ở đây sẽ được ghi vào sổ chi phí ngay khi đóng phiếu. Giá vốn linh kiện đã lắp không tính lại vì tiền đã chi lúc nhập kho.'
              : 'Máy sẽ chuyển sang Ngừng dùng. Tiền công đã bỏ ra vẫn được ghi nhận vào chi phí.'}
          </Callout>
          <div className="form-grid">
            <Field label="Tiền công thợ" hint="Để 0 nếu tự sửa, không mất tiền công.">
              <input name="serviceCost" type="number" min="0" step="1000" defaultValue={repair.service_cost || 0} />
            </Field>
            <Field label="Nơi sửa"><input name="vendor" defaultValue={repair.vendor} /></Field>
          </div>
          <div className="form-grid">
            <Field label="Phương thức trả">
              <select name="paymentMethod" defaultValue="CASH">
                <option value="CASH">Tiền mặt</option>
                <option value="BANK">Chuyển khoản</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Mã tham chiếu"><input name="reference" placeholder="Số phiếu / mã giao dịch" /></Field>
          </div>
          <Field label={closing === 'DONE' ? 'Đã xử lý thế nào' : 'Lý do không sửa được'}>
            <textarea name="resolution" rows={3} placeholder={closing === 'DONE' ? 'Thay nguồn, vệ sinh tản nhiệt…' : 'Bo mạch chết, chi phí sửa cao hơn giá máy…'} />
          </Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setClosing(null)}>Quay lại</button>
            <button className={`btn ${closing === 'DONE' ? 'btn-primary' : 'btn-danger'}`} disabled={submitting}>
              {submitting ? 'Đang lưu…' : closing === 'DONE' ? 'Đóng phiếu & ghi chi phí' : 'Xác nhận bỏ máy'}
            </button>
          </div>
        </form>
      ) : (
        <div className="modal-body">
          <div className="repair-head">
            <StatusBadge status={repair.status} />
            <span className="muted">Báo hỏng {dateTime(repair.reported_at)}</span>
            {repair.closed_at && <span className="muted">· Đóng {dateTime(repair.closed_at)}</span>}
          </div>

          {repair.symptom && <p className="record-note">{repair.symptom}</p>}
          {repair.resolution && (
            <p className="record-note access"><strong>Kết quả:</strong> {repair.resolution}</p>
          )}

          <div className="repair-figures">
            <div><span>Tiền công</span><strong>{money(repair.service_cost)}</strong></div>
            <div><span>Linh kiện</span><strong>{money(partsCost)}</strong></div>
            <div><span>Tổng chi cho máy</span><strong>{money(repair.service_cost + partsCost)}</strong></div>
          </div>

          <div>
            <div className="section-label">Linh kiện đã dùng</div>
            {repair.parts.length ? (
              <div className="part-lines">
                {repair.parts.map((line) => (
                  <div className={`part-line ${line.kind === 'RETURN' ? 'returned' : ''}`} key={line.id}>
                    <Package />
                    <div>
                      <strong>{line.part_name}</strong>
                      <small>
                        {MOVEMENT_NAMES[line.kind]} · {Math.abs(line.quantity)} {line.part_unit} × {money(line.unit_cost)}
                      </small>
                    </div>
                    <b className={line.kind === 'RETURN' ? 'pos' : ''}>
                      {line.kind === 'RETURN' ? '− ' : ''}{money(Math.abs(line.quantity) * line.unit_cost)}
                    </b>
                    {isOpen && line.kind === 'CONSUME' && (
                      <button
                        className="icon-btn"
                        onClick={() => removePart(line.id)}
                        disabled={removingPart === line.id}
                        title="Trả về kho"
                        aria-label={`Trả ${line.part_name} về kho`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12.5, padding: '8px 0' }}>Chưa lắp linh kiện nào từ kho.</p>
            )}

            {isOpen && (
              availableParts.length ? (
                <form className="part-add" onSubmit={addPart}>
                  <select name="partId" required defaultValue="">
                    <option value="" disabled>Chọn linh kiện trong kho</option>
                    {availableParts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.name} — còn {part.quantity} {part.unit}
                      </option>
                    ))}
                  </select>
                  <input name="quantity" type="number" min="1" defaultValue="1" required />
                  <button className="btn btn-secondary" disabled={submitting}><Plus size={15} /> Lắp</button>
                </form>
              ) : (
                <p className="muted" style={{ fontSize: 12, paddingTop: 6 }}>
                  Kho chưa có linh kiện nào còn hàng. Nhập kho ở tab <strong>Kho linh kiện</strong> trước khi lắp.
                </p>
              )
            )}
          </div>

          {isOpen && (
            <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" disabled={submitting} onClick={() => setEditing(true)}>
                <Pencil size={15} /> Sửa nội dung
              </button>
              {repair.status === 'REPORTED' && (
                <button className="btn btn-secondary" disabled={submitting} onClick={() => changeStatus('IN_PROGRESS')}>
                  <Wrench size={15} /> Bắt đầu sửa
                </button>
              )}
              {repair.parts_count === 0 && (
                <button className="btn btn-ghost" disabled={submitting} onClick={() => changeStatus('CANCELLED')}>
                  Huỷ phiếu
                </button>
              )}
              <button className="btn btn-danger" disabled={submitting} onClick={() => setClosing('UNREPAIRABLE')}>
                Không sửa được
              </button>
              <button className="btn btn-primary" disabled={submitting} onClick={() => setClosing('DONE')}>
                Đã sửa xong
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---- Sửa thông tin linh kiện ---------------------------------------------- */

function EditPartModal({ part, onClose, onChanged }: { part: Part; onClose: () => void; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      await api(`/parts/${part.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.get('name'),
          category: data.get('category'),
          unit: data.get('unit'),
          minQuantity: Number(data.get('minQuantity') || 0),
          location: data.get('location'),
          notes: data.get('notes'),
        }),
      });
      toast.success('Đã cập nhật linh kiện.');
      onClose();
      await onChanged();
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được linh kiện.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={part.name} description={`${part.code} · đang còn ${part.quantity} ${part.unit}`}>
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Tên linh kiện" required>
            <input name="name" required minLength={2} defaultValue={part.name} />
          </Field>
          <Field label="Nhóm">
            <select name="category" defaultValue={part.category}>
              {Object.entries(PART_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-grid three">
          <Field label="Đơn vị"><input name="unit" defaultValue={part.unit} /></Field>
          <Field label="Tồn tối thiểu" hint="Dưới mức này sẽ cảnh báo.">
            <input name="minQuantity" type="number" min="0" defaultValue={part.min_quantity} />
          </Field>
          <Field label="Vị trí cất"><input name="location" defaultValue={part.location} /></Field>
        </div>
        <Field label="Ghi chú"><textarea name="notes" rows={2} defaultValue={part.notes} /></Field>
        <Callout icon={Package}>
          Sửa ở đây chỉ đổi thông tin mô tả. Số lượng tồn và giá vốn tính từ lịch sử nhập xuất,
          muốn chỉnh thì dùng <strong>Nhập kho → Kiểm kê</strong>.
        </Callout>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---- Nhập kho / kiểm kê --------------------------------------------------- */

function StockModal({ part, onClose, onChanged }: { part: Part; onClose: () => void; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [kind, setKind] = useState<'PURCHASE' | 'ADJUST'>('PURCHASE');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      await api(`/parts/${part.id}/movements`, {
        method: 'POST',
        body: JSON.stringify({
          kind,
          quantity: Number(data.get('quantity')),
          unitCost: Number(data.get('unitCost') || 0),
          paymentMethod: data.get('paymentMethod'),
          vendor: data.get('vendor'),
          reference: data.get('reference'),
          notes: data.get('notes'),
          occurredAt: data.get('occurredAt'),
        }),
      });
      toast.success(kind === 'PURCHASE' ? 'Đã nhập kho và ghi chi phí.' : 'Đã điều chỉnh tồn kho.');
      onClose();
      await onChanged();
    } catch (err) {
      toast.fromError(err, 'Không cập nhật được kho.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={part.name}
      description={`${part.code} · Đang còn ${part.quantity} ${part.unit}`}
    >
      <form className="modal-form" onSubmit={submit}>
        <Field label="Loại thao tác">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'PURCHASE', label: 'Nhập mua' },
              { value: 'ADJUST', label: 'Kiểm kê' },
            ]}
          />
        </Field>

        {kind === 'PURCHASE' ? (
          <>
            <div className="form-grid">
              <Field label="Số lượng nhập" required>
                <input name="quantity" type="number" min="1" defaultValue="1" required />
              </Field>
              <Field label="Đơn giá" required hint="Giá mỗi đơn vị, dùng để tính giá vốn.">
                <input name="unitCost" type="number" min="0" step="1000" defaultValue={part.average_cost || 0} required />
              </Field>
            </div>
            <div className="form-grid">
              <Field label="Phương thức trả">
                <select name="paymentMethod" defaultValue="CASH">
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Chuyển khoản</option>
                  <option value="OTHER">Khác</option>
                </select>
              </Field>
              <Field label="Ngày mua">
                <input name="occurredAt" type="datetime-local" defaultValue={toLocalInput(new Date())} />
              </Field>
            </div>
            <div className="form-grid">
              <Field label="Nhà cung cấp"><input name="vendor" placeholder="Cửa hàng linh kiện…" /></Field>
              <Field label="Mã hoá đơn"><input name="reference" /></Field>
            </div>
            <Callout icon={CircleDollarSign}>
              Nhập mua sẽ tự tạo một khoản chi phí nhóm <strong>Linh kiện</strong> trong sổ chi phí.
              Đừng ghi tay khoản này lần nữa ở trang Tài chính.
            </Callout>
          </>
        ) : (
          <>
            <Field label="Chênh lệch" required hint="Số dương là thừa so với sổ, số âm là thiếu. Ví dụ −1 khi phát hiện mất một cái.">
              <input name="quantity" type="number" defaultValue="-1" required />
            </Field>
            <input type="hidden" name="unitCost" value="0" />
            <Callout icon={ClipboardList}>
              Kiểm kê chỉ chỉnh số lượng cho khớp thực tế, không sinh chi phí và không đổi giá vốn.
            </Callout>
          </>
        )}

        <Field label="Ghi chú"><textarea name="notes" rows={2} /></Field>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang lưu…' : kind === 'PURCHASE' ? 'Nhập kho' : 'Cập nhật tồn'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---- Lịch sử nhập xuất ---------------------------------------------------- */

function HistoryModal({ part, onClose }: { part: Part; onClose: () => void }) {
  const toast = useToast();
  const [movements, setMovements] = useState<PartMovement[] | null>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(MOVEMENT_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = (size: number) => api<Paged<PartMovement>>(`/parts/${part.id}/movements?limit=${size}`)
    .then((data) => { setMovements(data.rows); setTotal(data.total); })
    .catch((err) => { toast.fromError(err, 'Không tải được lịch sử kho.'); setMovements([]); });

  useEffect(() => {
    setMovements(null);
    setLimit(MOVEMENT_PAGE);
    void fetchPage(MOVEMENT_PAGE);
  }, [part.id]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = limit + MOVEMENT_PAGE;
    setLimit(next);
    await fetchPage(next);
    setLoadingMore(false);
  };

  return (
    <Modal open onClose={onClose} wide title={`Lịch sử kho · ${part.name}`} description={part.code}>
      <div className="modal-body">
        {!movements ? <TableSkeleton rows={4} /> : movements.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thao tác</th>
                  <th>Gắn với</th>
                  <th className="num">Số lượng</th>
                  <th className="num">Đơn giá</th>
                  <th>Thời điểm</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-stack">
                        <strong>{MOVEMENT_NAMES[item.kind] || item.kind}</strong>
                        {item.notes && <small>{item.notes}</small>}
                      </div>
                    </td>
                    <td>
                      {item.repair_code
                        ? <div className="cell-stack"><span>{item.device_name}</span><small>{item.repair_code}</small></div>
                        : <span className="muted">—</span>}
                    </td>
                    <td className={`num ${item.quantity > 0 ? 'pos' : 'neg'}`}>
                      {item.quantity > 0 ? '+' : ''}{item.quantity} {part.unit}
                    </td>
                    <td className="num money-cell">{item.unit_cost ? money(item.unit_cost) : <span className="muted">—</span>}</td>
                    <td><small className="muted">{dateTime(item.occurred_at)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Package} title="Chưa có giao dịch kho" description="Nhập kho lần đầu để bắt đầu theo dõi tồn." />
        )}

        {movements && movements.length < total && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Đang tải…' : `Xem thêm — còn ${total - movements.length} dòng`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

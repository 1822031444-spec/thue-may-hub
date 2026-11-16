import {
  ArrowDownLeft, ArrowUpRight, CircleDollarSign, Download, Landmark, Plus, ReceiptText, Repeat, WalletCards, Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, dateTime, money, toLocalInput } from '../api';
import { EmptyState, ErrorState, Field, Modal, PageHeader, SearchBox, Segmented, Tabs, TableSkeleton } from '../components/UI';
import { downloadCsv } from '../lib/csv';
import { usePendingAction } from '../lib/pendingAction';
import { useToast } from '../lib/toast';
import type { DashboardData, Expense, FinancialTransaction, Paged } from '../types';

const TRANSACTION_NAMES: Record<string, string> = {
  DEPOSIT: 'Nạp ví',
  RENTAL_PAYMENT: 'Thanh toán đơn',
  REFUND: 'Hoàn tiền',
  PROMOTION: 'Khuyến mại',
  ADJUSTMENT: 'Điều chỉnh',
};

const EXPENSE_NAMES: Record<string, string> = {
  ELECTRICITY: 'Điện',
  INTERNET: 'Internet',
  RENT: 'Mặt bằng',
  SALARY: 'Nhân sự',
  MAINTENANCE: 'Sửa chữa',
  PARTS: 'Linh kiện',
  MARKETING: 'Marketing',
  SOFTWARE: 'Phần mềm / Server',
  TAX: 'Thuế và phí',
  OTHER: 'Khác',
};

/** Mỗi lần tải một trang bấy nhiêu dòng; server chặn trần ở 500. */
const PAGE_SIZE = 100;

type PeriodKey = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

const PERIOD_LABELS: Array<{ value: PeriodKey; label: string }> = [
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Tháng trước' },
  { value: 'THIS_YEAR', label: 'Năm nay' },
  { value: 'ALL', label: 'Tất cả' },
  { value: 'CUSTOM', label: 'Tuỳ chọn' },
];

/**
 * Quy kỳ về mốc đầu và mốc cuối dạng ISO.
 *
 * Mốc cuối luôn là cuối ngày, vì người dùng chọn "đến 30/09" là có ý gồm cả ngày
 * 30 — lấy 00:00 sẽ cắt mất nguyên ngày cuối mà không ai nhận ra.
 */
function periodRange(period: PeriodKey, custom: { from: string; to: string }) {
  const startOfDay = (date: Date) => { date.setHours(0, 0, 0, 0); return date; };

  if (period === 'ALL') return { from: '', to: '' };

  if (period === 'CUSTOM') {
    const from = custom.from ? startOfDay(new Date(custom.from)).toISOString() : '';
    let to = '';
    if (custom.to) {
      const end = new Date(custom.to);
      end.setHours(23, 59, 59, 999);
      to = end.toISOString();
    }
    return { from, to };
  }

  const now = new Date();
  if (period === 'THIS_YEAR') {
    return { from: startOfDay(new Date(now.getFullYear(), 0, 1)).toISOString(), to: '' };
  }
  if (period === 'LAST_MONTH') {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: end.toISOString() };
  }
  return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(), to: '' };
}

export function FinancePage() {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tab, setTab] = useState<'transactions' | 'expenses'>('transactions');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [txQuery, setTxQuery] = useState('');
  const [expenseQuery, setExpenseQuery] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('ALL');
  const [period, setPeriod] = useState<PeriodKey>('THIS_MONTH');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [txTotal, setTxTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  usePendingAction('create', () => setExpenseOpen(true));

  const range = useMemo(() => periodRange(period, custom), [period, custom]);

  /** Chuỗi query dùng chung cho cả ba lời gọi, để ba con số luôn cùng một kỳ. */
  const rangeQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    return params.toString();
  }, [range]);

  const load = async () => {
    try {
      const suffix = rangeQuery ? `&${rangeQuery}` : '';
      const [summary, ledger, spending] = await Promise.all([
        api<DashboardData>(`/dashboard${rangeQuery ? `?${rangeQuery}` : ''}`),
        api<Paged<FinancialTransaction>>(`/finance/transactions?limit=${PAGE_SIZE}${suffix}`),
        api<Paged<Expense>>(`/finance/expenses?limit=${PAGE_SIZE}${suffix}`),
      ]);
      setDashboard(summary);
      setTransactions(ledger.rows);
      setTxTotal(ledger.total);
      setExpenses(spending.rows);
      setExpenseTotal(spending.total);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      toast.fromError(err, 'Không tải được sổ tiền.');
    } finally {
      setLoading(false);
    }
  };

  // Đổi kỳ là phải tải lại từ server, vì số liệu của kỳ khác không nằm sẵn ở máy.
  useEffect(() => { void load(); }, [rangeQuery]);

  const retry = () => { setLoading(true); void load(); };

  /** Tải thêm một trang, nối vào danh sách đang xem chứ không thay thế. */
  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const suffix = rangeQuery ? `&${rangeQuery}` : '';
    try {
      if (tab === 'transactions') {
        const next = await api<Paged<FinancialTransaction>>(
          `/finance/transactions?limit=${PAGE_SIZE}&offset=${transactions.length}${suffix}`,
        );
        setTransactions((current) => [...current, ...next.rows]);
        setTxTotal(next.total);
      } else {
        const next = await api<Paged<Expense>>(
          `/finance/expenses?limit=${PAGE_SIZE}&offset=${expenses.length}${suffix}`,
        );
        setExpenses((current) => [...current, ...next.rows]);
        setExpenseTotal(next.total);
      }
    } catch (err) {
      toast.fromError(err, 'Không tải thêm được.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Sổ tiền là danh sách phình nhanh nhất: mỗi lần thu tiền, nạp ví, ghi chi phí
  // là thêm một dòng. Không lọc được thì sau vài tháng không tra nổi.
  const filteredTransactions = useMemo(() => {
    const key = txQuery.toLowerCase().trim();
    if (!key) return transactions;
    return transactions.filter((item) => [
      item.code,
      item.customer_name,
      item.rental_code,
      item.reference,
      item.payment_method,
      TRANSACTION_NAMES[item.kind] || item.kind,
    ].filter(Boolean).join(' ').toLowerCase().includes(key));
  }, [transactions, txQuery]);

  const filteredExpenses = useMemo(() => {
    const key = expenseQuery.toLowerCase().trim();
    return expenses.filter((item) => {
      if (expenseCategory !== 'ALL' && item.category !== expenseCategory) return false;
      if (!key) return true;
      return [
        item.code,
        item.vendor,
        item.reference,
        item.notes,
        EXPENSE_NAMES[item.category] || item.category,
      ].filter(Boolean).join(' ').toLowerCase().includes(key);
    });
  }, [expenses, expenseQuery, expenseCategory]);

  /** Xuất đúng những dòng đang nhìn thấy, để đối chiếu sổ sách hoặc gửi kế toán. */
  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (tab === 'transactions') {
      downloadCsv(
        `so-giao-dich-${stamp}.csv`,
        ['Mã', 'Loại', 'Khách hàng', 'Đơn thuê', 'Phương thức', 'Tiền thực', 'Biến động ví', 'Doanh thu', 'Thời điểm'],
        filteredTransactions.map((item) => [
          item.code,
          TRANSACTION_NAMES[item.kind] || item.kind,
          item.customer_name || '',
          item.rental_code || '',
          item.payment_method,
          String(item.cash_change),
          String(item.wallet_change),
          String(item.revenue_change),
          dateTime(item.occurred_at),
        ]),
      );
    } else {
      downloadCsv(
        `so-chi-phi-${stamp}.csv`,
        ['Mã', 'Nhóm chi', 'Nhà cung cấp', 'Phương thức', 'Số tiền', 'Tham chiếu', 'Ngày chi'],
        filteredExpenses.map((item) => [
          item.code,
          EXPENSE_NAMES[item.category] || item.category,
          item.vendor || '',
          item.payment_method,
          String(item.amount),
          item.reference || item.notes || '',
          dateTime(item.occurred_at),
        ]),
      );
    }
    toast.success('Đã xuất file CSV.', 'Mở bằng Excel để đối chiếu sổ sách.');
  };

  /** Chỉ hiện những nhóm chi thật sự có phát sinh, đỡ phải cuộn qua mục rỗng. */
  const usedCategories = useMemo(
    () => Array.from(new Set(expenses.map((item) => item.category))),
    [expenses],
  );

  const periodLabel = PERIOD_LABELS.find((item) => item.value === period)?.label ?? '';
  const isLedger = tab === 'transactions';
  const visibleCount = isLedger ? filteredTransactions.length : filteredExpenses.length;
  /** Số dòng đã tải về máy so với tổng số dòng server có trong kỳ này. */
  const loadedCount = isLedger ? transactions.length : expenses.length;
  const periodTotal = isLedger ? txTotal : expenseTotal;
  const hasMore = loadedCount < periodTotal;

  const addExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: form.get('category'),
          amount: Number(form.get('amount')),
          paymentMethod: form.get('paymentMethod'),
          vendor: form.get('vendor'),
          reference: form.get('reference'),
          notes: form.get('notes'),
          occurredAt: new Date(String(form.get('occurredAt'))).toISOString(),
        }),
      });
      setExpenseOpen(false);
      toast.success('Đã ghi nhận khoản chi.', money(Number(form.get('amount'))));
      await load();
    } catch (err) {
      toast.fromError(err, 'Không thể ghi nhận chi phí.');
    } finally {
      setSubmitting(false);
    }
  };

  const profit = dashboard?.monthProfit || 0;

  return (
    <>
      <PageHeader
        eyebrow="Sổ tiền quản trị"
        title="Tài chính"
        description="Phân biệt rõ tiền thực thu, doanh thu, số dư ví và chi phí."
        actions={
          <>
            <button className="btn btn-secondary" onClick={exportCsv} disabled={!visibleCount}>
              <Download size={16} /> Xuất CSV
            </button>
            <button className="btn btn-primary" onClick={() => setExpenseOpen(true)}><Plus /> Ghi chi phí</button>
          </>
        }
      />

      <div className="toolbar">
        <Segmented
          value={period}
          onChange={(value) => setPeriod(value as PeriodKey)}
          options={PERIOD_LABELS}
        />
        {period === 'CUSTOM' && (
          <>
            <input
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(event) => setCustom({ ...custom, from: event.target.value })}
              aria-label="Từ ngày"
            />
            <span className="muted" style={{ fontSize: 12.5 }}>đến</span>
            <input
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(event) => setCustom({ ...custom, to: event.target.value })}
              aria-label="Đến ngày"
            />
          </>
        )}
      </div>

      <section className="stat-grid">
        <article className="stat">
          <div className="stat-top"><div className="stat-icon"><CircleDollarSign /></div><span>Doanh thu</span></div>
          <strong>{money(dashboard?.monthRevenue || 0)}</strong>
          <small>Dịch vụ đã thanh toán</small>
        </article>
        <article className="stat">
          <div className="stat-top"><div className="stat-icon info"><Landmark /></div><span>Tiền thực thu</span></div>
          <strong>{money(dashboard?.monthCash || 0)}</strong>
          <small>Bao gồm tiền khách nạp ví</small>
        </article>
        <article className="stat">
          <div className="stat-top"><div className="stat-icon warn"><ArrowDownLeft /></div><span>Chi phí</span></div>
          <strong>{money(dashboard?.monthExpenses || 0)}</strong>
          <small>Khoản chi đã ghi nhận</small>
        </article>
        <article className="stat">
          <div className="stat-top">
            <div className={`stat-icon ${profit < 0 ? 'danger' : 'violet'}`}><ArrowUpRight /></div>
            <span>Lợi nhuận quản trị</span>
          </div>
          <strong className={profit < 0 ? 'neg' : ''}>{money(profit)}</strong>
          <small>Doanh thu trừ chi phí</small>
        </article>
      </section>

      <section className="strip">
        <div>
          <span><WalletCards /> Số dư ví phải cung cấp dịch vụ</span>
          <strong>{money(dashboard?.walletLiability || 0)}</strong>
          <small>Khách đã trả tiền nhưng chưa dùng hết</small>
        </div>
        <div>
          <span><ReceiptText /> Công nợ đơn cần thu</span>
          <strong>{money(dashboard?.receivable || 0)}</strong>
          <small>Đơn đã tạo nhưng chưa thu đủ</small>
        </div>
        <Link to="/admin/repairs" className="strip-link">
          <span><Wrench /> Chi sửa chữa & linh kiện</span>
          <strong>{money(dashboard?.monthRepairSpend || 0)}</strong>
          <small>
            {dashboard?.openRepairs
              ? `${dashboard.openRepairs} phiếu đang mở — xem chi tiết`
              : `Trong kỳ: ${periodLabel.toLowerCase()}`}
          </small>
        </Link>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'transactions', label: 'Sổ giao dịch', count: txTotal },
          { value: 'expenses', label: 'Sổ chi phí', count: expenseTotal },
        ]}
      />

      <div className="toolbar">
        {tab === 'transactions' ? (
          <>
            <SearchBox
              value={txQuery}
              onChange={setTxQuery}
              placeholder="Tìm theo mã, khách hàng, mã đơn…"
            />
            <div className="toolbar-count">
              <strong>{filteredTransactions.length}</strong>
              {txQuery ? ` / ${transactions.length} đã tải` : hasMore ? ` / ${txTotal} giao dịch` : ' giao dịch'}
            </div>
          </>
        ) : (
          <>
            <SearchBox
              value={expenseQuery}
              onChange={setExpenseQuery}
              placeholder="Tìm theo mã, nhà cung cấp, ghi chú…"
            />
            <select
              value={expenseCategory}
              onChange={(event) => setExpenseCategory(event.target.value)}
              aria-label="Lọc theo nhóm chi"
            >
              <option value="ALL">Tất cả nhóm chi</option>
              {usedCategories.map((category) => (
                <option value={category} key={category}>{EXPENSE_NAMES[category] || category}</option>
              ))}
            </select>
            <div className="toolbar-count">
              <strong>{filteredExpenses.length}</strong>
              {expenseQuery || expenseCategory !== 'ALL'
                ? ` / ${expenses.length} đã tải`
                : hasMore ? ` / ${expenseTotal} khoản chi` : ' khoản chi'}
            </div>
          </>
        )}
      </div>

      <section className="panel">
        {loading ? <TableSkeleton rows={8} /> : loadFailed && !transactions.length && !expenses.length ? (
          <ErrorState onRetry={retry} />
        ) : tab === 'transactions' ? (
          filteredTransactions.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Giao dịch</th>
                    <th>Khách / đơn</th>
                    <th>Phương thức</th>
                    <th className="num">Tiền thực</th>
                    <th className="num">Biến động ví</th>
                    <th className="num">Doanh thu</th>
                    <th>Thời điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="ledger-row-kind">
                          <div className={`ledger-icon ${ledgerTone(item)}`}>{ledgerIcon(item)}</div>
                          <div className="cell-stack">
                            <strong>{TRANSACTION_NAMES[item.kind] || item.kind}</strong>
                            <small>{item.code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span>{item.customer_name || '—'}</span>
                          <small>{item.rental_code || item.reference || 'Không gắn đơn'}</small>
                        </div>
                      </td>
                      <td><span className="chip">{item.payment_method}</span></td>
                      <td className={`num money-cell ${signClass(item.cash_change)}`}>{signedMoney(item.cash_change)}</td>
                      <td className={`num money-cell ${signClass(item.wallet_change)}`}>{signedMoney(item.wallet_change)}</td>
                      <td className={`num money-cell ${signClass(item.revenue_change)}`}>{signedMoney(item.revenue_change)}</td>
                      <td><small className="muted">{dateTime(item.occurred_at)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Repeat}
              title={txQuery ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch'}
              description={txQuery
                ? 'Thử từ khoá khác, ví dụ mã đơn hoặc tên khách hàng.'
                : 'Giao dịch nạp ví và thanh toán đơn sẽ xuất hiện tại đây.'}
            />
          )
        ) : filteredExpenses.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khoản chi</th>
                  <th>Nhà cung cấp</th>
                  <th>Phương thức</th>
                  <th className="num">Số tiền</th>
                  <th>Tham chiếu</th>
                  <th>Ngày chi</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="ledger-row-kind">
                        <div className="ledger-icon out"><ArrowDownLeft size={14} /></div>
                        <div className="cell-stack">
                          <strong>{EXPENSE_NAMES[item.category] || item.category}</strong>
                          <small>{item.code}</small>
                        </div>
                      </div>
                    </td>
                    <td>{item.vendor || <span className="muted">—</span>}</td>
                    <td><span className="chip">{item.payment_method}</span></td>
                    <td className="num money-cell neg">− {money(item.amount)}</td>
                    <td><small className="muted">{item.reference || item.notes || '—'}</small></td>
                    <td><small className="muted">{dateTime(item.occurred_at)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ArrowDownLeft}
            title={expenseQuery || expenseCategory !== 'ALL' ? 'Không có khoản chi phù hợp' : 'Chưa có chi phí'}
            description={expenseQuery || expenseCategory !== 'ALL'
              ? 'Thử từ khoá khác hoặc chọn lại nhóm chi.'
              : 'Ghi tiền điện, Internet, mặt bằng và các khoản vận hành tại đây.'}
            action={!expenseQuery && expenseCategory === 'ALL' && (
              <button className="btn btn-primary" onClick={() => setExpenseOpen(true)}><Plus /> Ghi chi phí đầu tiên</button>
            )}
          />
        )}

        {!loading && !loadFailed && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore
                ? 'Đang tải…'
                : `Xem thêm — còn ${periodTotal - loadedCount} dòng trong kỳ này`}
            </button>
          </div>
        )}
      </section>

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Ghi nhận chi phí"
        description="Khoản chi được dùng để tính lợi nhuận quản trị trong tháng."
      >
        <form className="modal-form" onSubmit={addExpense}>
          <div className="form-grid">
            <Field label="Nhóm chi phí">
              <select name="category" defaultValue="ELECTRICITY">
                {Object.entries(EXPENSE_NAMES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Số tiền" required>
              <input name="amount" type="number" min="1000" step="1000" required />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Phương thức">
              <select name="paymentMethod">
                <option value="BANK">Chuyển khoản</option>
                <option value="CASH">Tiền mặt</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Ngày chi">
              <input name="occurredAt" type="datetime-local" defaultValue={toLocalInput(new Date())} required />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Nhà cung cấp"><input name="vendor" placeholder="Điện lực, nhà mạng…" /></Field>
            <Field label="Mã tham chiếu"><input name="reference" placeholder="Mã hoá đơn / giao dịch" /></Field>
          </div>
          <Field label="Ghi chú"><textarea name="notes" rows={2} /></Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setExpenseOpen(false)}>Huỷ</button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang ghi…' : 'Ghi nhận chi phí'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function signedMoney(value: number) {
  if (!value) return '—';
  return `${value > 0 ? '+' : '−'} ${money(Math.abs(value))}`;
}

function signClass(value: number) {
  if (!value) return 'muted';
  return value > 0 ? 'pos' : 'neg';
}

/** Màu của biểu tượng bám theo hướng dòng tiền thực, không theo loại giao dịch. */
function ledgerTone(item: FinancialTransaction) {
  if (item.cash_change > 0) return 'in';
  if (item.cash_change < 0) return 'out';
  return 'move';
}

function ledgerIcon(item: FinancialTransaction) {
  if (item.cash_change > 0) return <ArrowUpRight size={14} />;
  if (item.cash_change < 0) return <ArrowDownLeft size={14} />;
  return <Repeat size={14} />;
}

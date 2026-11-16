import {
  ArrowUpRight, Banknote, CircleDollarSign, MonitorSmartphone,
  Lock, Plus, ReceiptText, TriangleAlert, Users, WalletCards, Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dateTime, money, shortMoney } from '../api';
import { useAuth } from '../App';
import { ExpiringPanel } from '../components/ExpiringPanel';
import { EmptyState, LoadingScreen, PageHeader, Panel } from '../components/UI';
import type { DashboardData } from '../types';

export function DashboardPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/dashboard').then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data && !error) return <LoadingScreen label="Đang tổng hợp số liệu…" />;
  if (!data) return <div className="page-error">{error}</div>;

  const occupancy = data.deviceTotal ? Math.round((data.deviceRented / data.deviceTotal) * 100) : 0;
  const revenueByDevice = data.revenueByDevice || [];
  const maxRevenue = Math.max(...revenueByDevice.map((item) => Number(item.revenue)), 1);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <>
      <PageHeader
        eyebrow="Báo cáo trực tiếp"
        title={`${greeting}, ${admin?.name || 'bạn'}`}
        description={data.canSeeMoney
          ? 'Toàn cảnh kinh doanh và trạng thái phòng máy trong tháng này.'
          : 'Tình hình phòng máy và những việc cần xử lý hôm nay.'}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/admin/devices" state={{ action: 'create' }}>
              <Plus /> Thiết bị
            </Link>
            <Link className="btn btn-primary" to="/admin/rentals" state={{ action: 'create' }}>
              <Plus /> Tạo đơn thuê
            </Link>
          </>
        )}
      />

      <section className="stat-grid">
        {data.canSeeMoney ? (
          <>
            <article className="stat feature">
              <div className="stat-top">
                <div className="stat-icon"><CircleDollarSign /></div>
                <span>Doanh thu tháng</span>
              </div>
              <strong>{money(data.monthRevenue)}</strong>
              <small><ArrowUpRight size={13} /> Doanh thu dịch vụ đã ghi nhận</small>
            </article>

            <article className="stat">
              <div className="stat-top">
                <div className="stat-icon violet"><Banknote /></div>
                <span>Lợi nhuận quản trị</span>
              </div>
              <strong className={(data.monthProfit || 0) < 0 ? 'neg' : ''}>{money(data.monthProfit)}</strong>
              <small>Sau {shortMoney(data.monthExpenses)} chi phí</small>
            </article>
          </>
        ) : (
          <>
            <article className="stat">
              <div className="stat-top">
                <div className="stat-icon warn"><Wrench /></div>
                <span>Máy đang sửa</span>
              </div>
              <strong>{data.openRepairs}</strong>
              <small>Phiếu sửa chữa chưa đóng</small>
            </article>

            <article className="stat">
              <div className="stat-top">
                <div className="stat-icon danger"><Lock /></div>
                <span>Máy quá hạn chưa khoá</span>
              </div>
              <strong>{data.devicesDueForLock}</strong>
              <small>Đơn đã hết hạn nhưng mạng còn mở</small>
            </article>
          </>
        )}

        <article className="stat">
          <div className="stat-top">
            <div className="stat-icon warn"><MonitorSmartphone /></div>
            <span>Thiết bị đang thuê</span>
          </div>
          <strong>{data.deviceRented}<em>/{data.deviceTotal}</em></strong>
          <small>{occupancy}% tỷ lệ sử dụng tức thời</small>
        </article>

        <article className="stat">
          <div className="stat-top">
            <div className="stat-icon info"><Users /></div>
            <span>Khách đang quản lý</span>
          </div>
          <strong>{data.customerCount}</strong>
          <small>Hồ sơ khách hàng đang hoạt động</small>
        </article>
      </section>

      {data.devicesDueForLock > 0 && (
        <Link className="alert-row danger" to="/admin/settings">
          <Lock />
          <span>{data.devicesDueForLock} máy đã quá hạn thuê nhưng mạng vẫn đang mở</span>
          <b>Mở khoá mạng <ArrowUpRight size={14} /></b>
        </Link>
      )}

      {(data.openRepairs > 0 || data.lowStockParts > 0) && (
        <Link className="alert-row" to="/admin/repairs">
          <TriangleAlert />
          <span>
            {[
              data.openRepairs > 0 ? `${data.openRepairs} máy đang nằm xưởng` : '',
              data.lowStockParts > 0 ? `${data.lowStockParts} linh kiện sắp hết` : '',
            ].filter(Boolean).join(' · ')}
          </span>
          <b>Mở trang sửa chữa <ArrowUpRight size={14} /></b>
        </Link>
      )}

      {data.canSeeMoney && (
      <section className="strip">
        <div>
          <span><WalletCards /> Số dư ví khách</span>
          <strong>{money(data.walletLiability)}</strong>
          <small>Nghĩa vụ dịch vụ còn phải cung cấp</small>
        </div>
        <div>
          <span><ReceiptText /> Công nợ đơn thuê</span>
          <strong>{money(data.receivable)}</strong>
          <small>Chưa ghi nhận thanh toán</small>
        </div>
        <div>
          <span><Banknote /> Tiền thực thu tháng</span>
          <strong>{money(data.monthCash)}</strong>
          <small>Bao gồm tiền khách nạp ví</small>
        </div>
      </section>
      )}

      <section className="dash-grid" style={data.canSeeMoney ? undefined : { gridTemplateColumns: '1fr' }}>
        {data.canSeeMoney && (
        <Panel eyebrow="Hiệu suất tài sản" title="Doanh thu theo thiết bị" icon={MonitorSmartphone}>
          {revenueByDevice.length ? (
            <div className="bar-list">
              {revenueByDevice.map((item) => (
                <div className="bar-row" key={item.id}>
                  <div className="bar-label">
                    <span className={`type-dot ${item.type.toLowerCase()}`} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.code}</small>
                    </div>
                  </div>
                  <div className="bar-track">
                    <i style={{ width: `${Math.max(3, (Number(item.revenue) / maxRevenue) * 100)}%` }} />
                  </div>
                  <b>{shortMoney(item.revenue)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={MonitorSmartphone}
              title="Chưa có doanh thu"
              description="Doanh thu theo thiết bị sẽ xuất hiện sau giao dịch thuê đầu tiên."
            />
          )}
        </Panel>
        )}

        <ExpiringPanel />
      </section>
    </>
  );
}

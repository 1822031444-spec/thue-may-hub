import {
  ArrowRight, BarChart3, Check, Cpu, Menu, ShieldCheck, Smartphone, X, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SERVICES = [
  {
    tone: 'a',
    icon: Cpu,
    title: 'PC từ xa',
    description: 'Máy tính cấu hình cao cho công việc, render và kiểm thử phần mềm.',
    points: ['RAM và GPU tuỳ chọn', 'Thuê theo giờ hoặc theo tháng'],
  },
  {
    tone: 'b',
    icon: Smartphone,
    title: 'Boxphone Android',
    description: 'Thiết bị thật đặt tại phòng máy, quản lý tập trung và có hỗ trợ kỹ thuật.',
    points: ['Thiết bị riêng từng khách', 'Giám sát trạng thái liên tục'],
  },
  {
    tone: 'c',
    icon: BarChart3,
    title: 'Quản trị minh bạch',
    description: 'Đơn thuê, thanh toán và lịch sử sử dụng được ghi nhận rõ ràng.',
    points: ['Nhắc hạn chủ động', 'Biên nhận cho mọi giao dịch'],
  },
];

const STEPS = [
  { title: 'Chọn cấu hình', hint: 'Xem danh mục máy đang sẵn sàng' },
  { title: 'Xác nhận thời gian', hint: 'Thuê theo giờ hoặc theo tháng' },
  { title: 'Thanh toán', hint: 'Chuyển khoản hoặc trừ ví' },
  { title: 'Nhận quyền truy cập', hint: 'Đội vận hành bàn giao thông tin máy' },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="public">
      <header className="pub-nav">
        <div className="wrap pub-nav-inner">
          <Link className="pub-brand" to="/"><span className="brand-mark">TM</span> Thuê Máy Hub</Link>
          <nav className={menuOpen ? 'open' : ''}>
            <a href="#dich-vu" onClick={() => setMenuOpen(false)}>Dịch vụ</a>
            <a href="#quy-trinh" onClick={() => setMenuOpen(false)}>Quy trình</a>
            <a href="#bang-gia" onClick={() => setMenuOpen(false)}>Báo giá</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Quản trị</Link>
            <Link className="btn-outline" to="/portal/login" onClick={() => setMenuOpen(false)}>
              Cổng khách hàng <ArrowRight size={15} />
            </Link>
          </nav>
          <button className="pub-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div className="hero-copy">
            <div className="pill"><i /> Hạ tầng sẵn sàng 24/7</div>
            <h1>Sức mạnh thiết bị,<br /><em>không cần sở hữu.</em></h1>
            <p>
              Thuê PC hiệu năng cao và boxphone từ xa. Cấu hình rõ ràng, thời gian linh hoạt,
              vận hành và thanh toán minh bạch.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to="/portal/register">
                Bắt đầu thuê máy <ArrowRight size={17} />
              </Link>
              <a className="btn btn-secondary btn-lg" href="#quy-trinh">Cách hoạt động</a>
            </div>
            <div className="hero-trust">
              <span><Check /> Cấp máy nhanh</span>
              <span><Check /> Hỗ trợ kỹ thuật</span>
              <span><Check /> Thanh toán minh bạch</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-glow" />
            <div className="console-card">
              <div className="console-head"><span>TM // LIVE SYSTEM</span><i /></div>
              <div className="console-device">
                <div><Cpu /></div>
                <div>
                  <small>PC HIỆU NĂNG</small>
                  <strong>RTX Workstation 01</strong>
                </div>
                <b>ONLINE</b>
              </div>
              <div className="console-metrics">
                <div><span>Uptime</span><strong>99.8%</strong></div>
                <div><span>Độ trễ</span><strong>18ms</strong></div>
              </div>
              <div className="console-chart">
                {[25, 38, 68, 45, 84, 58, 25, 45, 68, 38, 84, 58].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="console-foot">
                <ShieldCheck /><span>Kết nối được bảo vệ</span><strong>SECURE</strong>
              </div>
            </div>

            <div className="float-card float-a">
              <Smartphone />
              <div><strong>Boxphone</strong><span>Sẵn sàng</span></div>
              <i />
            </div>
            <div className="float-card float-b">
              <Zap />
              <div><strong>Cấp tức thì</strong><span>Sau xác nhận</span></div>
            </div>
          </div>
        </section>

        <section className="pub-section alt" id="dich-vu">
          <div className="wrap">
            <div className="section-head">
              <span>Hạ tầng theo nhu cầu</span>
              <h2>Một nơi cho mọi thiết bị</h2>
              <p>Bắt đầu nhỏ, gia hạn linh hoạt và theo dõi rõ từng phiên thuê.</p>
            </div>
            <div className="service-grid">
              {SERVICES.map((service, index) => {
                const Icon = service.icon;
                return (
                  <article className="service-card" key={service.title}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <div className={`service-icon ${service.tone}`}><Icon /></div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <ul>
                      {service.points.map((point) => <li key={point}><Check /> {point}</li>)}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pub-section" id="quy-trinh">
          <div className="wrap">
            <div className="section-head">
              <span>Bốn bước đơn giản</span>
              <h2>Từ nhu cầu đến máy sẵn sàng</h2>
            </div>
            <div className="steps">
              {STEPS.map((step, index) => (
                <div key={step.title}>
                  <b>{String(index + 1).padStart(2, '0')}</b>
                  <strong>{step.title}</strong>
                  <span>{step.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pub-section alt" id="bang-gia">
          <div className="wrap">
            <div className="cta-card">
              <div>
                <span>Giai đoạn thử nghiệm</span>
                <h2>Cần cấu hình phù hợp?</h2>
                <p>
                  Để lại nhu cầu về PC hoặc boxphone. Đội vận hành sẽ tư vấn cấu hình và
                  báo giá theo thời gian sử dụng thực tế.
                </p>
              </div>
              <Link className="btn btn-light btn-lg" to="/portal/register">
                Tạo tài khoản <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap pub-footer">
        <span>© 2026 Thuê Máy Hub</span>
        <span>Dịch vụ thiết bị từ xa có kiểm soát</span>
      </footer>
    </div>
  );
}

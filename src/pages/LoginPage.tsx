import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { Field, Notice } from '../components/UI';
import { isDesktop } from '../lib/desktop';
import type { Admin } from '../types';

export function LoginPage() {
  const { admin, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@thuemay.local');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && admin) return <Navigate to="/admin" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api<Admin>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await refresh();
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-form-side">
        {!isDesktop && (
          <Link className="back-link" to="/"><ArrowLeft /> Về trang chủ</Link>
        )}

        <div className="auth-card">
          <div className="brand-mark lg">TM</div>
          <div className="eyebrow">Khu vực nội bộ</div>
          <h1>Đăng nhập vận hành</h1>
          <p>Quản lý thiết bị, đơn thuê và dòng tiền tại một nơi.</p>

          {error && <Notice type="error">{error}</Notice>}

          <form onSubmit={submit}>
            <Field label="Email quản trị" required>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </Field>

            <Field label="Mật khẩu" required>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Hiện mật khẩu">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            <button className="btn btn-primary btn-lg btn-block" disabled={submitting}>
              {submitting ? 'Đang đăng nhập…' : 'Vào trung tâm điều hành'}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="auth-hint">
            <strong>Tài khoản khởi tạo lần đầu</strong>
            <span><code>admin@thuemay.local</code> · <code>Admin@123</code></span>
            <span>Hãy đổi mật khẩu ngay trong mục Cài đặt sau khi đăng nhập.</span>
          </div>

          {!isDesktop && (
            <div className="auth-alt">
              Bạn là khách hàng? <Link to="/portal/login">Vào cổng khách hàng</Link>
            </div>
          )}
        </div>
      </section>

      <section className="auth-art">
        <div className="auth-art-grid" />
        <div className="auth-art-brand"><div className="brand-mark">TM</div> Thuê Máy Hub</div>

        <div className="auth-art-copy">
          <span>Operations / 01</span>
          <h2>Kiểm soát từng thiết bị.<br />Minh bạch từng đồng.</h2>
          <p>Một nền tảng thống nhất cho vận hành dịch vụ cho thuê PC và boxphone.</p>
          <div className="auth-benefits">
            <div><CheckCircle2 /> Trạng thái kho máy theo thời gian thực</div>
            <div><CheckCircle2 /> Sổ tiền tách bạch doanh thu, ví và công nợ</div>
            <div><CheckCircle2 /> Nhật ký thao tác đầy đủ cho mọi thay đổi</div>
          </div>
        </div>

        <div className="auth-secure"><ShieldCheck /> Mật khẩu được băm, phiên đăng nhập lưu bằng cookie HttpOnly</div>
      </section>
    </div>
  );
}

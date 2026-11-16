import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Field, Notice } from '../components/UI';
import type { PortalCustomer } from '../types';
import { useCustomerAuth } from './CustomerAuth';

export function CustomerAccessPage({ mode }: { mode: 'login' | 'register' }) {
  const { customer, loading, refresh } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && customer) return <Navigate to="/portal" replace />;

  const isRegister = mode === 'register';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      if (isRegister) {
        const password = String(data.get('password'));
        if (password !== data.get('confirmPassword')) throw new Error('Xác nhận mật khẩu chưa khớp.');
        await api<PortalCustomer>('/customer/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email'),
            password,
          }),
        });
      } else {
        await api<PortalCustomer>('/customer/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
        });
      }
      await refresh();
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/portal';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-art">
        <div className="auth-art-grid" />
        <Link className="auth-art-brand" to="/"><span className="brand-mark">TM</span> Thuê Máy Hub</Link>

        <div className="auth-art-copy">
          <span><Sparkles size={14} /> Không gian khách hàng</span>
          <h2>Thiết bị sẵn sàng.<br />Công việc liền mạch.</h2>
          <p>Đặt máy, theo dõi thời gian sử dụng và nhận hỗ trợ tại cùng một nơi.</p>
          <div className="auth-benefits">
            <div><CheckCircle2 /> Xem danh mục máy đang sẵn sàng</div>
            <div><CheckCircle2 /> Theo dõi đơn thuê theo thời gian thực</div>
            <div><CheckCircle2 /> Hỗ trợ trực tiếp từ đội vận hành</div>
          </div>
        </div>

        <div className="auth-secure"><ShieldCheck /> Kết nối và phiên đăng nhập được bảo vệ</div>
      </section>

      <section className="auth-form-side">
        <Link className="back-link" to="/"><ArrowLeft /> Trang chủ</Link>

        <div className="auth-card">
          <div className="eyebrow">{isRegister ? 'Bắt đầu sử dụng' : 'Chào mừng trở lại'}</div>
          <h1>{isRegister ? 'Tạo tài khoản khách hàng' : 'Đăng nhập tài khoản'}</h1>
          <p>
            {isRegister
              ? 'Đăng ký để gửi yêu cầu thuê PC hoặc boxphone.'
              : 'Theo dõi thiết bị, đơn thuê và số dư ví của bạn.'}
          </p>

          {error && <Notice type="error">{error}</Notice>}

          <form onSubmit={submit}>
            {isRegister && (
              <div className="form-grid">
                <Field label="Họ và tên" required>
                  <input name="name" required minLength={2} placeholder="Nguyễn Văn An" />
                </Field>
                <Field label="Số điện thoại" required>
                  <input name="phone" required minLength={8} placeholder="09xx xxx xxx" />
                </Field>
              </div>
            )}

            <Field label="Email" required>
              <input name="email" type="email" required placeholder="ban@email.com" autoComplete="email" />
            </Field>

            <Field
              label="Mật khẩu"
              required
              hint={isRegister ? 'Ít nhất 10 ký tự, có chữ hoa, chữ thường và số.' : undefined}
            >
              <div className="password-input">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isRegister ? 10 : 6}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Hiện mật khẩu">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            {isRegister && (
              <Field label="Nhập lại mật khẩu" required>
                <input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" />
              </Field>
            )}

            <button className="btn btn-primary btn-lg btn-block" disabled={submitting}>
              {submitting ? 'Đang xử lý…' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <Link to={isRegister ? '/portal/login' : '/portal/register'}>
              {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
            </Link>
          </div>

          <div className="auth-alt">
            Bạn là nhân viên vận hành? <Link to="/login">Đăng nhập quản trị</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

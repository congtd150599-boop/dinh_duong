import { useState } from 'react';
import { register } from '../../api/auth';
import { ApiError } from '../../api/client';
import { InfoBox } from '../shared/InfoBox';

export function RegisterPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setIsSubmitting(true);
    try {
      const { message } = await register({ name, email, password });
      setSuccessMessage(message);
    } catch (err) {
      const details = err instanceof ApiError ? (err.details as { error?: string } | undefined) : undefined;
      setError(details?.error ?? 'Đăng ký thất bại, thử lại sau');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div className="card-header">
          <div className="icon" style={{ background: '#E3F2FD' }}>
            📝
          </div>
          <h3>Đăng Ký Tài Khoản</h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Đánh Giá Dinh Dưỡng Nhi Khoa — tài khoản cần được quản trị viên phê duyệt trước khi sử dụng được.
          </p>

          {successMessage ? (
            <>
              <InfoBox tone="success">{successMessage}</InfoBox>
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={onSwitchToLogin}>
                Quay lại Đăng Nhập
              </button>
            </>
          ) : (
            <>
              {error && (
                <div style={{ marginBottom: 12 }}>
                  <InfoBox tone="danger">{error}</InfoBox>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    Họ và tên<span className="required">*</span>
                  </label>
                  <input className="form-control" autoFocus required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Email<span className="required">*</span>
                  </label>
                  <input type="email" className="form-control" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Mật khẩu<span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="form-hint">Tối thiểu 8 ký tự</div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Xác nhận mật khẩu<span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang gửi...' : 'Đăng Ký'}
                </button>
              </form>

              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  style={{ border: 'none', background: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  Đăng nhập
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

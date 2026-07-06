import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { InfoBox } from '../shared/InfoBox';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Email hoặc mật khẩu không đúng' : 'Đăng nhập thất bại, thử lại sau');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div className="card-header">
          <div className="icon" style={{ background: '#E3F2FD' }}>
            🏥
          </div>
          <h3>Đăng Nhập</h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Đánh Giá Dinh Dưỡng Nhi Khoa</p>

          {error && (
            <div style={{ marginBottom: 12 }}>
              <InfoBox tone="danger">{error}</InfoBox>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Email<span className="required">*</span>
              </label>
              <input
                type="email"
                className="form-control"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Mật khẩu<span className="required">*</span>
              </label>
              <input
                type="password"
                className="form-control"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng Nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

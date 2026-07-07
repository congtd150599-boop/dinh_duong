import type { Role } from '@dinhduong/shared';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  bac_si: 'Bác sĩ',
  dieu_duong: 'Điều dưỡng',
};

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Mở/đóng menu">
          ☰
        </button>
        <div className="header-logo">🏥</div>
        <div className="header-title">
          <h1>Đánh Giá Dinh Dưỡng Nhi Khoa</h1>
          <p>Tiêu chuẩn WHO 2006/2007 · Quyết định 3777/QĐ-BYT-2024</p>
        </div>
        {user && (
          <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontSize: 13 }}>
            <span className="header-user-name">
              {user.name} <span style={{ opacity: 0.75 }}>({ROLE_LABELS[user.role]})</span>
            </span>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => logout()}>
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

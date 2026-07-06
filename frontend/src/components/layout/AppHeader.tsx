import type { Role } from '@dinhduong/shared';
import { useAuth } from '../../context/AuthContext';
import { useAppState, type TabName } from '../../context/AppStateContext';

const BASE_TABS: { id: TabName; label: string }[] = [
  { id: 'input', label: '📋 Nhập Liệu' },
  { id: 'result', label: '📊 Kết Quả' },
  { id: 'log', label: '📁 Nhật Ký BN' },
  { id: 'growthStandards', label: '📐 Chuẩn Tăng Trưởng' },
];

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  bac_si: 'Bác sĩ',
  dieu_duong: 'Điều dưỡng',
};

export function AppHeader() {
  const { activeTab, setActiveTab } = useAppState();
  const { user, logout } = useAuth();

  const tabs = user?.role === 'admin' ? [...BASE_TABS, { id: 'users' as TabName, label: '👤 Người dùng' }] : BASE_TABS;

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-logo">🏥</div>
        <div className="header-title">
          <h1>Đánh Giá Dinh Dưỡng Nhi Khoa</h1>
          <p>Tiêu chuẩn WHO 2006/2007 · Quyết định 3777/QĐ-BYT-2024</p>
        </div>
        <div className="header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontSize: 13, marginLeft: 16 }}>
            <span>
              {user.name} <span style={{ opacity: 0.75 }}>({ROLE_LABELS[user.role]})</span>
            </span>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => logout()}
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

import { useAppState, type TabName } from '../../context/AppStateContext';

const TABS: { id: TabName; label: string }[] = [
  { id: 'input', label: '📋 Nhập Liệu' },
  { id: 'result', label: '📊 Kết Quả' },
  { id: 'log', label: '📁 Nhật Ký BN' },
  { id: 'growthStandards', label: '📐 Chuẩn Tăng Trưởng' },
];

export function AppHeader() {
  const { activeTab, setActiveTab } = useAppState();

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-logo">🏥</div>
        <div className="header-title">
          <h1>Đánh Giá Dinh Dưỡng Nhi Khoa</h1>
          <p>Tiêu chuẩn WHO 2006/2007 · Quyết định 3777/QĐ-BYT-2024</p>
        </div>
        <div className="header-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

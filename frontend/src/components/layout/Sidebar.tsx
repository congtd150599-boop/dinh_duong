import { useState } from 'react';
import type { TabName } from '../../context/AppStateContext';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

const BASE_TABS: { id: TabName; label: string; icon: string }[] = [
  { id: 'input', label: 'Nhập Liệu', icon: '📋' },
  { id: 'result', label: 'Kết Quả', icon: '📊' },
  { id: 'log', label: 'Nhật Ký BN', icon: '📁' },
  { id: 'growthStandards', label: 'Chuẩn Tăng Trưởng', icon: '📐' },
  { id: 'labReferences', label: 'Chuẩn Xét Nghiệm', icon: '🧪' },
  { id: 'foods', label: 'Danh Sách Thực Phẩm', icon: '🍎' },
  { id: 'reports', label: 'Báo Cáo Thống Kê', icon: '📈' },
];

const COLLAPSED_STORAGE_KEY = 'sidebarCollapsed';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { activeTab, setActiveTab } = useAppState();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true');

  const tabs = user?.role === 'admin' ? [...BASE_TABS, { id: 'users' as TabName, label: 'Người dùng', icon: '👤' }] : BASE_TABS;

  function handleSelect(tab: TabName) {
    setActiveTab(tab);
    onClose();
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {collapsed ? '»' : '«'}
        </button>
        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleSelect(tab.id)}
              title={tab.label}
            >
              <span className="sidebar-btn-icon">{tab.icon}</span>
              <span className="sidebar-btn-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

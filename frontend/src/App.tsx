import { useState } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { FoodsTab } from './components/foods/FoodsTab';
import { GrowthStandardsTab } from './components/growthStandards/GrowthStandardsTab';
import { InputTab } from './components/input/InputTab';
import { LabReferencesTab } from './components/labReferences/LabReferencesTab';
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';
import { LogTab } from './components/log/LogTab';
import { ClinicStatsTab } from './components/reports/ClinicStatsTab';
import { ResultTab } from './components/result/ResultTab';
import { UsersTab } from './components/users/UsersTab';
import { useAppState } from './context/AppStateContext';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { activeTab } = useAppState();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <AppHeader onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="main">
          {activeTab === 'input' && <InputTab />}
          {activeTab === 'result' && <ResultTab />}
          {activeTab === 'log' && <LogTab />}
          {activeTab === 'growthStandards' && <GrowthStandardsTab />}
          {activeTab === 'labReferences' && <LabReferencesTab />}
          {activeTab === 'foods' && <FoodsTab />}
          {activeTab === 'reports' && <ClinicStatsTab />}
          {activeTab === 'users' && user.role === 'admin' && <UsersTab />}
        </main>
      </div>
    </div>
  );
}

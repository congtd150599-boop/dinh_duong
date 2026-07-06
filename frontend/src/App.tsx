import { LoginPage } from './components/auth/LoginPage';
import { AppHeader } from './components/layout/AppHeader';
import { GrowthStandardsTab } from './components/growthStandards/GrowthStandardsTab';
import { InputTab } from './components/input/InputTab';
import { LogTab } from './components/log/LogTab';
import { ResultTab } from './components/result/ResultTab';
import { UsersTab } from './components/users/UsersTab';
import { useAppState } from './context/AppStateContext';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { activeTab } = useAppState();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <AppHeader />
      <main className="main">
        {activeTab === 'input' && <InputTab />}
        {activeTab === 'result' && <ResultTab />}
        {activeTab === 'log' && <LogTab />}
        {activeTab === 'growthStandards' && <GrowthStandardsTab />}
        {activeTab === 'users' && user.role === 'admin' && <UsersTab />}
      </main>
    </>
  );
}

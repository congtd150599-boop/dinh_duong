import { AppHeader } from './components/layout/AppHeader';
import { GrowthStandardsTab } from './components/growthStandards/GrowthStandardsTab';
import { InputTab } from './components/input/InputTab';
import { LogTab } from './components/log/LogTab';
import { ResultTab } from './components/result/ResultTab';
import { useAppState } from './context/AppStateContext';

export default function App() {
  const { activeTab } = useAppState();

  return (
    <>
      <AppHeader />
      <main className="main">
        {activeTab === 'input' && <InputTab />}
        {activeTab === 'result' && <ResultTab />}
        {activeTab === 'log' && <LogTab />}
        {activeTab === 'growthStandards' && <GrowthStandardsTab />}
      </main>
    </>
  );
}

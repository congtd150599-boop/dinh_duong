import type { AssessmentResult } from '@dinhduong/shared';
import { createContext, useContext, useState, type ReactNode } from 'react';

export type TabName = 'input' | 'result' | 'log' | 'growthStandards';

interface AppStateContextValue {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  currentResult: AssessmentResult | null;
  setCurrentResult: (result: AssessmentResult | null) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabName>('input');
  const [currentResult, setCurrentResult] = useState<AssessmentResult | null>(null);

  return (
    <AppStateContext.Provider value={{ activeTab, setActiveTab, currentResult, setCurrentResult }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}

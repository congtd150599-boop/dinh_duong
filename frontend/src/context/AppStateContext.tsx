import type { AssessmentInput, AssessmentResult } from '@dinhduong/shared';
import { createContext, useContext, useState, type ReactNode } from 'react';

export type TabName = 'input' | 'result' | 'log' | 'growthStandards' | 'labReferences' | 'foods' | 'reports' | 'users';

interface AppStateContextValue {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  currentResult: AssessmentResult | null;
  setCurrentResult: (result: AssessmentResult | null) => void;
  /** id of the saved Patient row behind currentResult, or null when it's an unsaved live preview — see EmailReportButton, which is disabled without one. */
  currentPatientId: string | null;
  setCurrentPatientId: (id: string | null) => void;
  /** The exact payload InputTab would POST to save currentResult (incl. childId/representativeGuardian) — lets ResultTab's own "Lưu hồ sơ" button reuse it instead of reconstructing a partial one that's missing guardian info. Null when currentResult came from viewing an already-saved patient in LogTab. */
  currentAssessmentInput: AssessmentInput | null;
  setCurrentAssessmentInput: (input: AssessmentInput | null) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabName>('input');
  const [currentResult, setCurrentResult] = useState<AssessmentResult | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [currentAssessmentInput, setCurrentAssessmentInput] = useState<AssessmentInput | null>(null);

  return (
    <AppStateContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentResult,
        setCurrentResult,
        currentPatientId,
        setCurrentPatientId,
        currentAssessmentInput,
        setCurrentAssessmentInput,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}

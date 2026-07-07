import type { ChildRecord, GuardianInput, GuardianRecord, GrowthAlert } from '@dinhduong/shared';
import { apiClient } from './client';

export function searchChildren(query: string): Promise<ChildRecord[]> {
  return apiClient.get<ChildRecord[]>(`/children/search?q=${encodeURIComponent(query)}`);
}

export interface ChildHistoryVisit {
  id: string;
  examDate: string;
  weight: number;
  height: number;
  bmi: number;
  wfaZ: number | null;
}

export interface ChildHistory {
  child: ChildRecord;
  guardians: GuardianRecord[];
  visits: ChildHistoryVisit[];
  alerts: Record<string, GrowthAlert[]>;
}

export function getChildHistory(childId: string): Promise<ChildHistory> {
  return apiClient.get<ChildHistory>(`/children/${childId}/history`);
}

export function upsertGuardian(childId: string, input: GuardianInput): Promise<GuardianRecord[]> {
  return apiClient.put<GuardianRecord[]>(`/children/${childId}/guardians`, input);
}

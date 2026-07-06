import type { AssessmentInput, PatientRecord } from '@dinhduong/shared';
import { apiClient } from './client';

export function createPatient(input: AssessmentInput): Promise<PatientRecord> {
  return apiClient.post<PatientRecord>('/patients', input);
}

export function listPatients(): Promise<PatientRecord[]> {
  return apiClient.get<PatientRecord[]>('/patients');
}

export function getPatient(id: string): Promise<PatientRecord> {
  return apiClient.get<PatientRecord>(`/patients/${id}`);
}

export function deletePatient(id: string): Promise<void> {
  return apiClient.delete(`/patients/${id}`);
}

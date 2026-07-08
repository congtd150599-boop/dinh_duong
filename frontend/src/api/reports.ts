import type { ClinicStatsReport } from '@dinhduong/shared';
import { apiClient } from './client';

export function getClinicStatsReport(): Promise<ClinicStatsReport> {
  return apiClient.get<ClinicStatsReport>('/reports/clinic-stats');
}

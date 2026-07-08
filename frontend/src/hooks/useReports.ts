import { useQuery } from '@tanstack/react-query';
import { getClinicStatsReport } from '../api/reports';

export function useClinicStatsReport() {
  return useQuery({ queryKey: ['reports', 'clinic-stats'], queryFn: getClinicStatsReport });
}

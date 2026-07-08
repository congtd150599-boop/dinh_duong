import { useQuery } from '@tanstack/react-query';
import { listAuditLogs, listBackups } from '../api/admin';

export function useBackups() {
  return useQuery({ queryKey: ['admin', 'backups'], queryFn: listBackups });
}

export function useAuditLogs() {
  return useQuery({ queryKey: ['admin', 'audit-log'], queryFn: listAuditLogs });
}

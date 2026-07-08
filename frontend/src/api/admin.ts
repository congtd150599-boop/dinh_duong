import type { AuditLogRecord, BackupFileRecord } from '@dinhduong/shared';
import { apiClient } from './client';

export function listBackups(): Promise<BackupFileRecord[]> {
  return apiClient.get<BackupFileRecord[]>('/admin/backups');
}

export function triggerBackup(): Promise<BackupFileRecord> {
  return apiClient.post<BackupFileRecord>('/admin/backups', {});
}

export function listAuditLogs(): Promise<AuditLogRecord[]> {
  return apiClient.get<AuditLogRecord[]>('/admin/audit-log');
}

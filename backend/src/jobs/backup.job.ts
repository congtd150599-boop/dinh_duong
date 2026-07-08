import cron from 'node-cron';
import { runDatabaseBackup } from '../services/backup.service';

export function startBackupJob(): void {
  const schedule = process.env.BACKUP_CRON ?? '0 2 * * *';
  cron.schedule(schedule, async () => {
    try {
      const backup = await runDatabaseBackup();
      console.log(`[backup] Đã sao lưu dữ liệu: ${backup.fileName} (${backup.sizeBytes} bytes)`);
    } catch (err) {
      console.error('[backup] Sao lưu dữ liệu thất bại:', err);
    }
  });
  console.log(`[backup] Đã lên lịch sao lưu dữ liệu định kỳ: "${schedule}"`);
}

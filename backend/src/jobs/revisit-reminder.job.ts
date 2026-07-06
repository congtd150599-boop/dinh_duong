import type { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { scanAndSendRevisitReminders } from '../services/revisit-reminder.service';

export function startRevisitReminderJob(prisma: PrismaClient): void {
  const schedule = process.env.REVISIT_REMINDER_CRON ?? '0 8 * * *';
  cron.schedule(schedule, async () => {
    const sent = await scanAndSendRevisitReminders(prisma);
    console.log(`[revisit-reminder] Đã gửi ${sent} email nhắc lịch tái khám.`);
  });
  console.log(`[revisit-reminder] Đã lên lịch quét nhắc lịch tái khám: "${schedule}"`);
}

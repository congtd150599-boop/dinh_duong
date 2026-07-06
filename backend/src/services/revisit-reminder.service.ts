import type { PrismaClient } from '@prisma/client';
import { sendEmail } from './email.service';

function reminderEmailHtml(patientName: string, revisitDate: Date): string {
  const dateStr = revisitDate.toLocaleDateString('vi-VN');
  return `<p>Xin chào,</p><p>Đây là email nhắc lịch tái khám dinh dưỡng cho <strong>${patientName}</strong> vào ngày <strong>${dateStr}</strong>.</p><p>Vui lòng liên hệ phòng khám nếu cần đổi lịch hẹn.</p>`;
}

/**
 * Scans for patients whose revisit date falls within the reminder window,
 * have a guardian email, and haven't been reminded yet — sends one email per
 * match and marks revisitReminderSentAt so the next scan never double-sends.
 * A failure on one patient (bad address, SMTP hiccup) doesn't stop the batch.
 */
export async function scanAndSendRevisitReminders(prisma: PrismaClient): Promise<number> {
  const leadDays = Number(process.env.REVISIT_REMINDER_DAYS_BEFORE ?? 3);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + leadDays);

  const candidates = await prisma.patient.findMany({
    where: {
      revisit: { gte: today, lte: windowEnd },
      guardianEmail: { not: null },
      revisitReminderSentAt: null,
    },
  });

  let sent = 0;
  for (const patient of candidates) {
    try {
      await sendEmail(patient.guardianEmail!, 'Nhắc lịch tái khám dinh dưỡng', reminderEmailHtml(patient.name, patient.revisit!));
      await prisma.patient.update({ where: { id: patient.id }, data: { revisitReminderSentAt: new Date() } });
      sent++;
    } catch (err) {
      console.error(`[revisit-reminder] Gửi nhắc lịch thất bại cho bệnh nhân ${patient.id}:`, err);
    }
  }
  return sent;
}

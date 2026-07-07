import type { PrismaClient } from '@prisma/client';
import { sendEmail } from './email.service';

function reminderEmailHtml(patientName: string, revisitDate: Date): string {
  const dateStr = revisitDate.toLocaleDateString('vi-VN');
  return `<p>Xin chào,</p><p>Đây là email nhắc lịch tái khám dinh dưỡng cho <strong>${patientName}</strong> vào ngày <strong>${dateStr}</strong>.</p><p>Vui lòng liên hệ phòng khám nếu cần đổi lịch hẹn.</p>`;
}

/**
 * Scans for patients whose revisit date falls within the reminder window,
 * whose child has at least one guardian (Bố or Mẹ) with an email on file,
 * and haven't been reminded yet — sends one email to EVERY such guardian
 * (both parents get notified when both have an email), then marks
 * revisitReminderSentAt once per patient so the next scan never double-sends.
 * Reads guardians from Child (not this visit's own row) so a follow-up visit
 * that didn't re-type contact info still gets reminded, as long as ANY past
 * visit for that child ever captured one. A failure sending to one guardian
 * (bad address, SMTP hiccup) doesn't stop the others, or the rest of the batch.
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
      revisitReminderSentAt: null,
      child: { guardians: { some: { email: { not: null } } } },
    },
    include: { child: { include: { guardians: true } } },
  });

  let sent = 0;
  for (const patient of candidates) {
    const recipients = patient.child.guardians.filter((g) => g.email);
    let anySucceeded = false;
    for (const guardian of recipients) {
      try {
        await sendEmail(guardian.email!, 'Nhắc lịch tái khám dinh dưỡng', reminderEmailHtml(patient.name, patient.revisit!));
        anySucceeded = true;
      } catch (err) {
        console.error(`[revisit-reminder] Gửi nhắc lịch thất bại cho bệnh nhân ${patient.id} (${guardian.relationship}):`, err);
      }
    }
    if (anySucceeded) {
      await prisma.patient.update({ where: { id: patient.id }, data: { revisitReminderSentAt: new Date() } });
      sent++;
    }
  }
  return sent;
}

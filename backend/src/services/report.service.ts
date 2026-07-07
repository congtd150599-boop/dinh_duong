import type { PrismaClient } from '@prisma/client';
import { getGuardiansForChild } from './guardian.service';
import { sendEmail } from './email.service';

export class ReportServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

function reportEmailHtml(patientName: string, examDate: Date): string {
  const dateStr = examDate.toLocaleDateString('vi-VN');
  return `<p>Xin chào,</p><p>Đính kèm là báo cáo khám dinh dưỡng cho <strong>${patientName}</strong>, ngày khám <strong>${dateStr}</strong>.</p><p>Vui lòng liên hệ phòng khám nếu có thắc mắc.</p>`;
}

export interface SendPatientReportResult {
  sent: number;
  recipients: string[];
}

/**
 * Emails the given PDF (already rendered client-side — see plan notes on why
 * PDF generation stays in the browser, not server-side) to every guardian
 * (Bố/Mẹ) of the patient's child who has an email on file. A failure sending
 * to one guardian doesn't stop the others, matching the same tolerance
 * pattern as scanAndSendRevisitReminders().
 */
export async function sendPatientReportEmail(prisma: PrismaClient, patientId: string, pdfBuffer: Buffer): Promise<SendPatientReportResult> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new ReportServiceError('Không tìm thấy bệnh nhân', 404);

  const guardians = await getGuardiansForChild(prisma, patient.childId);
  const recipients = guardians.filter((g) => g.email);
  if (recipients.length === 0) {
    throw new ReportServiceError('Chưa có người đại diện nào có email để gửi báo cáo', 400);
  }

  const filename = `BaoCao_${patient.name.replace(/\s+/g, '_')}_${patient.examDate.toISOString().slice(0, 10)}.pdf`;
  const html = reportEmailHtml(patient.name, patient.examDate);
  const subject = `Báo cáo khám dinh dưỡng - ${patient.name}`;

  const sentTo: string[] = [];
  for (const guardian of recipients) {
    try {
      await sendEmail(guardian.email!, subject, html, [{ filename, content: pdfBuffer }]);
      sentTo.push(guardian.email!);
    } catch (err) {
      console.error(`[send-report] Gửi báo cáo thất bại cho bệnh nhân ${patientId} (${guardian.relationship}):`, err);
    }
  }

  if (sentTo.length === 0) {
    throw new ReportServiceError('Gửi email thất bại cho tất cả người đại diện', 502);
  }

  return { sent: sentTo.length, recipients: sentTo };
}

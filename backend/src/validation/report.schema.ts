import { z } from 'zod';

export const sendReportSchema = z.object({
  pdfBase64: z.string().min(1, 'Thiếu dữ liệu PDF'),
});

export type SendReportPayload = z.infer<typeof sendReportSchema>;

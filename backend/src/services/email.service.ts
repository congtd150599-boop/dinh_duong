import nodemailer from 'nodemailer';

const DEFAULT_FROM = '"Phòng khám Dinh Dưỡng" <no-reply@dinhduong.local>';

let transporter: nodemailer.Transporter | null | undefined;

/**
 * Lazily builds (and caches) the SMTP transport. Returns null when any of the
 * required env vars are missing — callers fall back to a dry-run log instead
 * of sending, so the reminder feature works today and starts sending for real
 * the moment .env is filled in, with no code/restart-breaking change needed.
 */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[email dry-run] SMTP chưa được cấu hình — sẽ gửi tới ${to}: "${subject}"`);
    return;
  }
  const from = process.env.SMTP_FROM || DEFAULT_FROM;
  await t.sendMail({ from, to, subject, html });
}

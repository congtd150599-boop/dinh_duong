import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test' });
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock },
  createTransport: createTransportMock,
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('sendEmail', () => {
  it('dry-run: logs instead of sending when SMTP env vars are unset', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;

    const { sendEmail } = await import('./email.service');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendEmail('parent@test.local', 'Nhắc lịch', '<p>Hi</p>');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('parent@test.local'));
    expect(createTransportMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('sends via nodemailer when SMTP env vars are set', async () => {
    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';

    const { sendEmail } = await import('./email.service');
    await sendEmail('parent@test.local', 'Nhắc lịch', '<p>Hi</p>');

    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.test.local' }));
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'parent@test.local', subject: 'Nhắc lịch' }),
    );
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const sendEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('./email.service', () => ({ sendEmail: sendEmailMock }));

import { scanAndSendRevisitReminders } from './revisit-reminder.service';

beforeAll(async () => {
  await truncateAllTables();
});

afterEach(async () => {
  await truncateAllTables();
  sendEmailMock.mockClear();
  sendEmailMock.mockResolvedValue(undefined);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

const basePatient = {
  name: 'Test Patient',
  dob: new Date('2024-01-01'),
  examDate: new Date('2026-07-01'),
  gender: 'Nam',
  child: { create: { name: 'Test Patient', dob: new Date('2024-01-01'), gender: 'Nam' } },
  weight: 10,
  height: 80,
  tuvan: 'Có',
  months: 24,
  bmi: 15.6,
  wfa: 'Bình thường',
  hfa: 'Bình thường',
  wfh: 'Bình thường',
  stdEnergy: 1000,
  targetEnergy: 1000,
  carbG: 100,
  proteinG: 30,
  lipidG: 30,
  labAssessmentSummary: 'Bình thường',
  fullResult: {},
};

describe('scanAndSendRevisitReminders', () => {
  it('sends to a patient with revisit in-window + a guardian email, and marks revisitReminderSentAt', async () => {
    const p = await testPrisma.patient.create({
      data: { ...basePatient, revisit: daysFromNow(2), guardianEmail: 'parent@test.local' },
    });

    const sent = await scanAndSendRevisitReminders(testPrisma);

    expect(sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledWith('parent@test.local', expect.any(String), expect.any(String));
    const updated = await testPrisma.patient.findUnique({ where: { id: p.id } });
    expect(updated?.revisitReminderSentAt).not.toBeNull();
  });

  it('skips a patient without a guardian email', async () => {
    await testPrisma.patient.create({ data: { ...basePatient, revisit: daysFromNow(1), guardianEmail: null } });
    const sent = await scanAndSendRevisitReminders(testPrisma);
    expect(sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('skips a patient whose revisit is outside the reminder window', async () => {
    await testPrisma.patient.create({ data: { ...basePatient, revisit: daysFromNow(30), guardianEmail: 'far@test.local' } });
    const sent = await scanAndSendRevisitReminders(testPrisma);
    expect(sent).toBe(0);
  });

  it('does not re-send to a patient already reminded', async () => {
    await testPrisma.patient.create({
      data: { ...basePatient, revisit: daysFromNow(1), guardianEmail: 'again@test.local', revisitReminderSentAt: new Date() },
    });
    const sent = await scanAndSendRevisitReminders(testPrisma);
    expect(sent).toBe(0);
  });

  it('a failing send for one patient does not block others in the same scan', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendEmailMock.mockRejectedValueOnce(new Error('smtp down')).mockResolvedValueOnce(undefined);
    await testPrisma.patient.create({ data: { ...basePatient, name: 'A', revisit: daysFromNow(1), guardianEmail: 'a@test.local' } });
    await testPrisma.patient.create({ data: { ...basePatient, name: 'B', revisit: daysFromNow(1), guardianEmail: 'b@test.local' } });

    const sent = await scanAndSendRevisitReminders(testPrisma);

    expect(sent).toBe(1);
    errorSpy.mockRestore();
  });
});

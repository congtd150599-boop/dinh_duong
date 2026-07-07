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

/** Builds a nested Child-create with 0-2 guardians, one per non-null email given. */
function childWithGuardians(motherEmail: string | null, fatherEmail: string | null = null) {
  const guardians = [];
  if (motherEmail !== null) guardians.push({ relationship: 'Mẹ', name: 'Test Mẹ', email: motherEmail, phone: '0900000000' });
  if (fatherEmail !== null) guardians.push({ relationship: 'Bố', name: 'Test Bố', email: fatherEmail, phone: '0900000001' });
  return { create: { name: 'Test Patient', dob: new Date('2024-01-01'), gender: 'Nam', guardians: { create: guardians } } };
}

describe('scanAndSendRevisitReminders', () => {
  it('sends to a patient whose child has a guardian email, and marks revisitReminderSentAt', async () => {
    const p = await testPrisma.patient.create({
      data: { ...basePatient, revisit: daysFromNow(2), child: childWithGuardians('parent@test.local') },
    });

    const sent = await scanAndSendRevisitReminders(testPrisma);

    expect(sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledWith('parent@test.local', expect.any(String), expect.any(String));
    const updated = await testPrisma.patient.findUnique({ where: { id: p.id } });
    expect(updated?.revisitReminderSentAt).not.toBeNull();
  });

  it('sends to BOTH guardians when both Bố and Mẹ have an email', async () => {
    await testPrisma.patient.create({
      data: { ...basePatient, revisit: daysFromNow(1), child: childWithGuardians('mother@test.local', 'father@test.local') },
    });

    const sent = await scanAndSendRevisitReminders(testPrisma);

    expect(sent).toBe(1); // still 1 patient reminded, even though 2 emails went out
    expect(sendEmailMock).toHaveBeenCalledWith('mother@test.local', expect.any(String), expect.any(String));
    expect(sendEmailMock).toHaveBeenCalledWith('father@test.local', expect.any(String), expect.any(String));
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it('skips a patient whose child has no guardian email', async () => {
    await testPrisma.patient.create({ data: { ...basePatient, revisit: daysFromNow(1), child: childWithGuardians(null) } });
    const sent = await scanAndSendRevisitReminders(testPrisma);
    expect(sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('skips a patient whose revisit is outside the reminder window', async () => {
    await testPrisma.patient.create({ data: { ...basePatient, revisit: daysFromNow(30), child: childWithGuardians('far@test.local') } });
    const sent = await scanAndSendRevisitReminders(testPrisma);
    expect(sent).toBe(0);
  });

  it('does not re-send to a patient already reminded', async () => {
    await testPrisma.patient.create({
      data: { ...basePatient, revisit: daysFromNow(1), child: childWithGuardians('again@test.local'), revisitReminderSentAt: new Date() },
    });
    const sent = await scanAndSendRevisitReminders(testPrisma);
    expect(sent).toBe(0);
  });

  it('a failing send for one patient does not block others in the same scan', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendEmailMock.mockRejectedValueOnce(new Error('smtp down')).mockResolvedValueOnce(undefined);
    await testPrisma.patient.create({ data: { ...basePatient, name: 'A', revisit: daysFromNow(1), child: childWithGuardians('a@test.local') } });
    await testPrisma.patient.create({ data: { ...basePatient, name: 'B', revisit: daysFromNow(1), child: childWithGuardians('b@test.local') } });

    const sent = await scanAndSendRevisitReminders(testPrisma);

    expect(sent).toBe(1);
    errorSpy.mockRestore();
  });

  it('a follow-up visit that set no contact of its own still gets reminded, because the guardian lives on the shared Child', async () => {
    const first = await testPrisma.patient.create({
      data: { ...basePatient, examDate: new Date('2026-01-01'), revisit: null, child: childWithGuardians('onfile@test.local') },
    });
    // Second visit for the SAME child (connect, not create) — this exercises
    // exactly the bug fix: the reminder must resolve guardians via patient.child, not this row.
    const second = await testPrisma.patient.create({
      data: { ...basePatient, examDate: new Date('2026-07-01'), revisit: daysFromNow(1), childId: first.childId },
    });

    const sent = await scanAndSendRevisitReminders(testPrisma);

    expect(sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledWith('onfile@test.local', expect.any(String), expect.any(String));
    const updated = await testPrisma.patient.findUnique({ where: { id: second.id } });
    expect(updated?.revisitReminderSentAt).not.toBeNull();
  });
});

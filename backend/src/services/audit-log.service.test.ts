import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';
import { listAuditLogs, recordAudit } from './audit-log.service';

beforeAll(async () => {
  await truncateAllTables();
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const testUser = { id: 'u1', name: 'Test User', email: 'test@test.local', role: 'admin' as const };

describe('recordAudit', () => {
  it('writes a row with the given fields', async () => {
    await recordAudit(testPrisma, {
      user: testUser,
      action: 'patient.create',
      targetType: 'Patient',
      targetId: 'p1',
      summary: 'Tạo hồ sơ bệnh nhân "A"',
    });

    const logs = await listAuditLogs(testPrisma);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      userId: 'u1',
      userName: 'Test User',
      userEmail: 'test@test.local',
      action: 'patient.create',
      targetType: 'Patient',
      targetId: 'p1',
      summary: 'Tạo hồ sơ bệnh nhân "A"',
    });
  });

  it('targetId omitted → stored as null', async () => {
    await recordAudit(testPrisma, { user: testUser, action: 'food.import', targetType: 'Food', summary: 'Nhập CSV: 5 dòng' });
    const logs = await listAuditLogs(testPrisma);
    expect(logs[0].targetId).toBeNull();
  });
});

describe('listAuditLogs', () => {
  it('most recent first', async () => {
    await recordAudit(testPrisma, { user: testUser, action: 'a', targetType: 'X', summary: 'first' });
    await recordAudit(testPrisma, { user: testUser, action: 'b', targetType: 'X', summary: 'second' });

    const logs = await listAuditLogs(testPrisma);
    expect(logs.map((l) => l.summary)).toEqual(['second', 'first']);
  });

  it('no entries → empty array', async () => {
    expect(await listAuditLogs(testPrisma)).toEqual([]);
  });
});

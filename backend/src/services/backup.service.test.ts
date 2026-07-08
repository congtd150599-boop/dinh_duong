import { mkdtemp, readFile, rm, utimes, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listBackups, runDatabaseBackup } from './backup.service';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('runDatabaseBackup', () => {
  it('runs pg_dump against the given database and writes a non-empty .sql file', async () => {
    const backup = await runDatabaseBackup({ databaseUrl: process.env.DATABASE_URL_TEST, dir: tmpDir });

    expect(backup.fileName).toMatch(/^backup_.*\.sql$/);
    expect(backup.sizeBytes).toBeGreaterThan(0);

    const content = await readFile(path.join(tmpDir, backup.fileName), 'utf-8');
    expect(content).toContain('PostgreSQL database dump');
    expect(content).toContain('CREATE TABLE');
  });

  it('missing databaseUrl → throws', async () => {
    await expect(runDatabaseBackup({ databaseUrl: '', dir: tmpDir })).rejects.toThrow();
  });

  it('deletes backups older than retentionDays after a successful run', async () => {
    const oldFile = path.join(tmpDir, 'backup_old.sql');
    await writeFile(oldFile, 'old dump');
    const oldTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldFile, oldTime, oldTime);

    await runDatabaseBackup({ databaseUrl: process.env.DATABASE_URL_TEST, dir: tmpDir, retentionDays: 14 });

    const remaining = await listBackups(tmpDir);
    expect(remaining.find((b) => b.fileName === 'backup_old.sql')).toBeUndefined();
  });

  it('keeps backups within the retention window', async () => {
    const recentFile = path.join(tmpDir, 'backup_recent.sql');
    await writeFile(recentFile, 'recent dump');

    await runDatabaseBackup({ databaseUrl: process.env.DATABASE_URL_TEST, dir: tmpDir, retentionDays: 14 });

    const remaining = await listBackups(tmpDir);
    expect(remaining.find((b) => b.fileName === 'backup_recent.sql')).toBeDefined();
  });
});

describe('listBackups', () => {
  it('empty dir → empty array', async () => {
    expect(await listBackups(tmpDir)).toEqual([]);
  });

  it('ignores non-backup files', async () => {
    await writeFile(path.join(tmpDir, 'random.txt'), 'not a backup');
    expect(await listBackups(tmpDir)).toEqual([]);
  });

  it('sorts most recent first', async () => {
    await writeFile(path.join(tmpDir, 'backup_a.sql'), 'a');
    await new Promise((r) => setTimeout(r, 20));
    await writeFile(path.join(tmpDir, 'backup_b.sql'), 'b');

    const list = await listBackups(tmpDir);
    expect(list.map((f) => f.fileName)).toEqual(['backup_b.sql', 'backup_a.sql']);
  });
});

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import type { BackupFileRecord } from '@dinhduong/shared';

const execAsync = promisify(exec);

export class BackupError extends Error {}

function defaultBackupDir(): string {
  // Same relative distance from backend/ in both dev (ts-node from src/services)
  // and prod (compiled dist/services) — see tsconfig's outDir. BACKUP_DIR
  // overrides this in Docker, pointed at a dedicated named volume so backups
  // survive container recreation independent of the `pgdata` volume itself
  // (the whole point of a backup is to not share fate with the thing it backs up).
  return process.env.BACKUP_DIR ?? path.join(__dirname, '../../backups');
}

function defaultRetentionDays(): number {
  return Number(process.env.BACKUP_RETENTION_DAYS ?? 14);
}

function timestampedFileName(): string {
  const iso = new Date().toISOString().replace(/:/g, '-').split('.')[0]; // '2026-07-08T05-30-00'
  return `backup_${iso}.sql`;
}

/**
 * Prisma's DATABASE_URL carries `?schema=public` — a Prisma-only convention,
 * not a libpq/pg_dump-recognized URI parameter (`pg_dump` rejects it outright
 * with "invalid URI query parameter"). Strip it from the URL and pass the
 * schema via pg_dump's own `-n` flag instead.
 */
function toPgDumpArgs(databaseUrl: string): { url: string; schema: string | null } {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema');
  url.searchParams.delete('schema');
  return { url: url.toString(), schema };
}

async function statOne(filePath: string, fileName: string): Promise<BackupFileRecord> {
  const stat = await fs.stat(filePath);
  return { fileName, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
}

async function cleanupOldBackups(dir: string, retentionDays: number): Promise<void> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (!file.startsWith('backup_') || !file.endsWith('.sql')) continue;
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.mtimeMs < cutoff) await fs.unlink(filePath);
  }
}

export interface BackupOptions {
  /** Defaults to DATABASE_URL — overridable so tests can target DATABASE_URL_TEST instead of the real dev DB. */
  databaseUrl?: string;
  /** Defaults to BACKUP_DIR / a bundled fallback — overridable so tests can point at a throwaway temp dir. */
  dir?: string;
  retentionDays?: number;
}

/**
 * Runs `pg_dump` against the target database, writing a plain-SQL dump into
 * `dir`, then deletes any dump in that same directory older than
 * `retentionDays`. Requires the `postgresql-client` package (pg_dump binary)
 * in the runtime image — see backend/Dockerfile[.dev].
 */
export async function runDatabaseBackup(options: BackupOptions = {}): Promise<BackupFileRecord> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new BackupError('DATABASE_URL chưa được cấu hình');
  const dir = options.dir ?? defaultBackupDir();
  const retentionDays = options.retentionDays ?? defaultRetentionDays();

  await fs.mkdir(dir, { recursive: true });
  const fileName = timestampedFileName();
  const filePath = path.join(dir, fileName);

  try {
    const { url, schema } = toPgDumpArgs(databaseUrl);
    const schemaArg = schema ? `-n "${schema}"` : '';
    await execAsync(`pg_dump "${url}" ${schemaArg} -F p -f "${filePath}"`);
  } catch (err) {
    throw new BackupError(`pg_dump thất bại: ${err instanceof Error ? err.message : String(err)}`);
  }

  await cleanupOldBackups(dir, retentionDays);
  return statOne(filePath, fileName);
}

/** Most recent first. */
export async function listBackups(dir: string = defaultBackupDir()): Promise<BackupFileRecord[]> {
  await fs.mkdir(dir, { recursive: true });
  const files = await fs.readdir(dir);
  const records = await Promise.all(
    files.filter((f) => f.startsWith('backup_') && f.endsWith('.sql')).map((f) => statOne(path.join(dir, f), f)),
  );
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

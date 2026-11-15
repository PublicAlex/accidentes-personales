import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPool, type Pool } from '../../src/infrastructure/persistence/pg/pool.js';

export function testDatabaseUrl(): string {
  if (!process.env.TEST_DATABASE_URL) {
    const envFile = resolve(import.meta.dirname, '../../../.env');
    if (existsSync(envFile)) process.loadEnvFile(envFile);
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL no está definida');
  return url;
}

export function createTestPool(): Pool {
  return createPool(testDatabaseUrl());
}

export async function truncate(pool: Pool): Promise<void> {
  const db = (await pool.query<{ n: string }>('SELECT current_database() AS n')).rows[0]?.n ?? '';
  if (!db.endsWith('_test')) throw new Error(`truncate rechazado: la BD "${db}" no termina en _test`);
  await pool.query('TRUNCATE users, accidents, revoked_tokens CASCADE');
}

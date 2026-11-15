import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPool, testDatabaseUrl, truncate } from '../support/db.js';

const raiz = resolve(import.meta.dirname, '../../..');
const tsx = resolve(raiz, 'node_modules/tsx/dist/cli.mjs');
const entrada = resolve(raiz, 'backend/src/main/seedReviewer.ts');

const pool = createTestPool();
beforeEach(() => truncate(pool));
afterAll(() => pool.end());

function ejemplo(clave: string): string {
  const linea = readFileSync(resolve(raiz, '.env.example'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${clave}=`));
  return (linea ?? '').slice(clave.length + 1).trim();
}

function correr(password: string) {
  return spawnSync(process.execPath, [tsx, entrada], {
    cwd: raiz,
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      PATH: process.env.PATH ?? '',
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: 'x'.repeat(32),
      FRONTEND_ORIGIN: 'http://localhost:3000',
      REVIEWER_EMAIL: 'revisor@example.test',
      REVIEWER_PASSWORD: password,
      REVIEWER_FULL_NAME: 'Revisor Demo',
    },
  });
}

describe('main/seedReviewer (entrypoint real)', () => {
  it('con la contraseña de .env.example sale != 0 y no escribe nada', async () => {
    const r = correr(ejemplo('REVIEWER_PASSWORD'));
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('REVIEWER_PASSWORD');
    expect((await pool.query('SELECT 1 FROM users')).rowCount).toBe(0);
  }, 70_000);

  it('con credenciales válidas crea un REVIEWER con hash $2b$12$', async () => {
    const r = correr('Clave-De-Prueba-2026');
    expect(r.status).toBe(0);
    const f = await pool.query<{ role: string; h: string }>('SELECT role, left(password_hash,7) AS h FROM users');
    expect(f.rows).toEqual([{ role: 'REVIEWER', h: '$2b$12$' }]);
  }, 70_000);
});

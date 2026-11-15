import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');

export default function setup(): void {
  const envFile = resolve(root, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL no está definida; no se puede migrar la BD de pruebas.');
  try {
    execFileSync(
    process.execPath,
    [
      resolve(root, 'node_modules/node-pg-migrate/bin/node-pg-migrate.js'),
      'up',
      '-m',
      resolve(root, 'backend/migrations'),
      '-d',
      'TEST_DATABASE_URL',
    ],
    { cwd: root, env: process.env, stdio: 'pipe' },
  );
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`Migración de la BD de pruebas falló:\n${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`);
  }
}

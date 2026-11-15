import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const tsx = resolve(raiz, 'node_modules/tsx/dist/cli.mjs');
const servidor = resolve(raiz, 'backend/src/main/server.ts');

describe('arranque del backend (fail-fast, AC-33)', () => {
  it('termina con código != 0 y nombra las variables faltantes sin volcar valores', () => {
    const r = spawnSync(process.execPath, [tsx, servidor], {
      cwd: raiz,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', FRONTEND_ORIGIN: 'http://valor-visible.test' },
      timeout: 30_000,
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('JWT_SECRET');
    expect(r.stderr).toContain('DATABASE_URL');
    expect(r.stderr).not.toContain('valor-visible.test');
  }, 40_000);
});

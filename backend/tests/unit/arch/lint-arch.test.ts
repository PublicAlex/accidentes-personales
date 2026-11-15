import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

function lintArch() {
  return spawnSync('npm', ['run', 'lint:arch'], { cwd: raiz, encoding: 'utf8', timeout: 50_000 });
}

function conTemporal(rutaRelativa: string, contenido: string, fn: () => void) {
  const ruta = join(raiz, rutaRelativa);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido);
  try {
    fn();
  } finally {
    rmSync(ruta, { force: true });
  }
}

describe('lint:arch (AC-36)', () => {
  it('pasa con el árbol limpio', () => {
    expect(lintArch().status).toBe(0);
  }, 60_000);

  it('falla si application/ importa pg (incluido import type)', () => {
    conTemporal(
      'backend/src/application/__tmp_prohibido.ts',
      "import type { Pool } from 'pg';\nexport type P = Pool;\n",
      () => {
        const r = lintArch();
        expect(r.status).not.toBe(0);
        expect(r.stdout + r.stderr).toContain('application-solo-domain');
      },
    );
    expect(lintArch().status).toBe(0);
  }, 60_000);

  it('falla con una importación resoluble prohibida (solo regla de capas, sin irresolubles)', () => {
    conTemporal(
      'backend/src/application/__tmp_prohibido.ts',
      "import { readFileSync } from 'node:fs';\nexport const f = readFileSync;\n",
      () => {
        const r = lintArch();
        const salida = r.stdout + r.stderr;
        expect(r.status).not.toBe(0);
        expect(salida).toContain('application-solo-domain');
        expect(salida).not.toContain('sin-irresolubles');
      },
    );
    conTemporal(
      'backend/src/domain/__tmp_prohibido.ts',
      "import { readFileSync } from 'node:fs';\nexport const f = readFileSync;\n",
      () => {
        const r = lintArch();
        expect(r.status).not.toBe(0);
        expect(r.stdout + r.stderr).toContain('domain-puro');
      },
    );
    expect(lintArch().status).toBe(0);
  }, 60_000);

  it('falla si domain/ usa new Date(', () => {
    conTemporal(
      'backend/src/domain/__tmp_prohibido.ts',
      'export const ahora = new Date();\n',
      () => {
        const r = lintArch();
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('__tmp_prohibido.ts:1');
      },
    );
    expect(lintArch().status).toBe(0);
  }, 60_000);
});

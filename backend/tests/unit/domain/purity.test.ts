import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../../src/domain');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('pureza del dominio', () => {
  const all = files(ROOT);

  it('hay archivos de dominio', () => expect(all.length).toBeGreaterThan(0));

  it.each(all.map((f) => [f.slice(ROOT.length + 1), f]))('%s solo importa rutas relativas', (_n, f) => {
    const src = readFileSync(f as string, 'utf8');
    const specs = [...src.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1] as string);
    const dynamic = [...src.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1] as string);
    const sideEffect = [...src.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)].map((m) => m[1] as string);
    for (const s of [...specs, ...dynamic, ...sideEffect]) {
      expect(s.startsWith('./') || s.startsWith('../')).toBe(true);
      expect(resolve(dirname(f as string), s).startsWith(ROOT)).toBe(true); // no escapa de domain/
    }
  });

  it.each(all.map((f) => [f.slice(ROOT.length + 1), f]))('%s no usa globales impuros', (_n, f) => {
    const src = readFileSync(f as string, 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/new\s+Date\s*\(|Date\.now|Math\.random|performance\.|globalThis|setTimeout|fetch\(|crypto\.|process\.|Buffer\.|console\./);
  });
});

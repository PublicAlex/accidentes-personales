import { describe, expect, it } from 'vitest';
import { InvalidTransitionError } from '../../../src/domain/errors.js';
import { ACCIDENT_STATUSES, TRANSITIONS, assertTransition, isAccidentStatus } from '../../../src/domain/accident/AccidentStatus.js';

// Matriz esperada. Agregar RECHAZADO = una fila/columna aquí + AccidentStatus.ts.
const ALLOWED = new Set(['REGISTRADO>EN_REVISION', 'EN_REVISION>CERRADO']);
const pairs = ACCIDENT_STATUSES.flatMap((f) => ACCIDENT_STATUSES.map((t) => [f, t, ALLOWED.has(`${f}>${t}`)] as const));

describe('assertTransition', () => {
  it('cubre las 9 combinaciones de la matriz 3x3', () => {
    expect(pairs).toHaveLength(9);
    expect(pairs.filter(([, , ok]) => ok)).toHaveLength(2);
  });

  it.each(pairs)('%s -> %s (permitida: %s)', (from, to, ok) => {
    if (ok) {
      expect(() => assertTransition(from, to)).not.toThrow();
    } else {
      expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
    }
  });

  it('el error lleva code, from y to', () => {
    try {
      assertTransition('REGISTRADO', 'CERRADO');
      expect.unreachable();
    } catch (e) {
      const err = e as InvalidTransitionError;
      expect(err.code).toBe('INVALID_TRANSITION');
      expect(err.from).toBe('REGISTRADO');
      expect(err.to).toBe('CERRADO');
    }
  });

  it.each([
    ['DESCONOCIDO', 'CERRADO'],
    ['REGISTRADO', 'RECHAZADO'],
    [undefined, 'CERRADO'],
    ['REGISTRADO', null],
  ])('estado desconocido %s -> %s lanza', (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
  });
});

describe('TRANSITIONS', () => {
  it('sus claves son exactamente los estados', () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ACCIDENT_STATUSES].sort());
  });
  it('todos los destinos son estados válidos', () => {
    for (const dests of Object.values(TRANSITIONS)) for (const d of dests) expect(isAccidentStatus(d)).toBe(true);
  });
  it('isAccidentStatus rechaza valores ajenos', () => {
    expect(isAccidentStatus('X')).toBe(false);
    expect(isAccidentStatus(1)).toBe(false);
  });
});

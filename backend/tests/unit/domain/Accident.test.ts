import { describe, expect, it } from 'vitest';
import { Accident, type AccidentInput } from '../../../src/domain/accident/Accident.js';
import { ValidationError } from '../../../src/domain/errors.js';

const UUID = '123e4567-e89b-12d3-a456-426614174000';
const OWNER = '123e4567-e89b-12d3-a456-426614174001';
const NOW = new Date('2026-11-15T12:00:00Z');
const TODAY = '2026-11-15';
const ctx = { id: UUID, now: NOW, today: TODAY };

const valid: AccidentInput = {
  affectedName: 'Ana Pérez',
  documentType: 'CC',
  documentNumber: 'ABC12345',
  phone: '+573001234567',
  contactEmail: 'ana@example.com',
  accidentType: 'TRANSITO',
  occurredOn: TODAY,
  place: 'Bogotá, Calle 1',
  description: 'Descripción suficientemente larga del accidente.',
  ownerId: OWNER,
};

function fail(overrides: Partial<Record<keyof AccidentInput, unknown>>, c = ctx): ValidationError {
  try {
    Accident.create({ ...valid, ...overrides } as AccidentInput, c);
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    return e as ValidationError;
  }
  throw new Error('no lanzó');
}

describe('Accident.create válido', () => {
  it('crea con estado inicial y marcas de tiempo', () => {
    const a = Accident.create(valid, ctx);
    expect(a.id).toBe(UUID);
    expect(a.status).toBe('REGISTRADO');
    expect(a.statusChangedBy).toBeNull();
    expect(a.statusChangedAt).toBeNull();
    expect(a.createdAt).toBe(NOW);
    expect(a.updatedAt).toBe(NOW);
    expect(a.ownerId).toBe(OWNER);
    expect(a.occurredOn).toBe(TODAY);
  });

  it('no expone vía de mutar status', () => {
    const a = Accident.create(valid, ctx);
    expect(() => { (a as unknown as { status: string }).status = 'CERRADO'; }).toThrow();
    expect(a.status).toBe('REGISTRADO');
  });

  it.each<[string, Partial<AccidentInput>]>([
    ['nombre 3', { affectedName: 'Ana' }],
    ['nombre 120', { affectedName: 'a'.repeat(120) }],
    ['documento 5', { documentNumber: 'a1b2c' }],
    ['documento 20', { documentNumber: 'a'.repeat(20) }],
    ['teléfono 7', { phone: '1234567' }],
    ['teléfono 15 con +', { phone: '+123456789012345' }],
    ['lugar 3', { place: 'abc' }],
    ['lugar 200', { place: 'a'.repeat(200) }],
    ['descripción 20', { description: 'a'.repeat(20) }],
    ['descripción 2000', { description: 'a'.repeat(2000) }],
    ['email 254', { contactEmail: 'a'.repeat(242) + '@example.com' }],
    ['fecha 1900-01-01', { occurredOn: '1900-01-01' }],
    ['29 feb bisiesto', { occurredOn: '2024-02-29' }],
    ['29 feb 2000 (siglo bisiesto)', { occurredOn: '2000-02-29' }],
    ['emoji cuenta como 1 code point', { affectedName: '😀😀😀' }],
  ])('límite exacto: %s', (_n, o) => {
    expect(() => Accident.create({ ...valid, ...o }, ctx)).not.toThrow();
  });
});

describe('Accident.create inválido', () => {
  it.each<[string, Partial<Record<keyof AccidentInput, unknown>>, string, string]>([
    ['nombre 2', { affectedName: 'An' }, 'affectedName', 'INVALID_LENGTH'],
    ['nombre 121', { affectedName: 'a'.repeat(121) }, 'affectedName', 'INVALID_LENGTH'],
    ['nombre en blanco', { affectedName: '   ' }, 'affectedName', 'INVALID_VALUE'],
    ['nombre no texto', { affectedName: 5 }, 'affectedName', 'INVALID_VALUE'],
    ['documento 4', { documentNumber: 'abcd' }, 'documentNumber', 'INVALID_FORMAT'],
    ['documento 21', { documentNumber: 'a'.repeat(21) }, 'documentNumber', 'INVALID_FORMAT'],
    ['documento con símbolo', { documentNumber: 'abc-12345' }, 'documentNumber', 'INVALID_FORMAT'],
    ['teléfono 6', { phone: '123456' }, 'phone', 'INVALID_FORMAT'],
    ['teléfono 16', { phone: '1234567890123456' }, 'phone', 'INVALID_FORMAT'],
    ['teléfono con letras', { phone: '12345a7' }, 'phone', 'INVALID_FORMAT'],
    ['lugar 2', { place: 'ab' }, 'place', 'INVALID_LENGTH'],
    ['lugar 201', { place: 'a'.repeat(201) }, 'place', 'INVALID_LENGTH'],
    ['lugar en blanco', { place: '     ' }, 'place', 'INVALID_VALUE'],
    ['descripción 19', { description: 'a'.repeat(19) }, 'description', 'INVALID_LENGTH'],
    ['descripción 2001', { description: 'a'.repeat(2001) }, 'description', 'INVALID_LENGTH'],
    ['descripción en blanco', { description: ' '.repeat(30) }, 'description', 'INVALID_VALUE'],
    ['email 255', { contactEmail: 'a'.repeat(243) + '@example.com' }, 'contactEmail', 'INVALID_LENGTH'],
    ['email sin formato', { contactEmail: 'no-es-email' }, 'contactEmail', 'INVALID_FORMAT'],
    ['fecha mañana', { occurredOn: '2026-11-16' }, 'occurredOn', 'DATE_IN_FUTURE'],
    ['fecha 1899-12-31', { occurredOn: '1899-12-31' }, 'occurredOn', 'DATE_TOO_OLD'],
    ['fecha 2026-02-30', { occurredOn: '2026-02-30' }, 'occurredOn', 'INVALID_DATE'],
    ['29 feb no bisiesto', { occurredOn: '2025-02-29' }, 'occurredOn', 'INVALID_DATE'],
    ['29 feb 1900 (siglo no bisiesto)', { occurredOn: '1900-02-29' }, 'occurredOn', 'INVALID_DATE'],
    ['año 0000', { occurredOn: '0000-02-29' }, 'occurredOn', 'INVALID_DATE'],
    ['fecha formato distinto', { occurredOn: '15/11/2026' }, 'occurredOn', 'INVALID_DATE'],
    ['fecha vacía', { occurredOn: '' }, 'occurredOn', 'INVALID_DATE'],
    ['fecha no texto', { occurredOn: undefined }, 'occurredOn', 'INVALID_DATE'],
    ['accidentType fuera de catálogo', { accidentType: 'VOLCAN' }, 'accidentType', 'INVALID_VALUE'],
    ['documentType fuera de catálogo', { documentType: 'DNI' }, 'documentType', 'INVALID_VALUE'],
    ['ownerId no UUID', { ownerId: 'x' }, 'ownerId', 'INVALID_FORMAT'],
  ])('%s', (_n, o, field, code) => {
    const e = fail(o);
    expect(e.field).toBe(field);
    expect(e.code).toBe(code);
  });

  it('id no UUID', () => {
    const e = fail({}, { ...ctx, id: 'x' });
    expect([e.field, e.code]).toEqual(['id', 'INVALID_FORMAT']);
  });

  it('today mal formado', () => {
    const e = fail({}, { ...ctx, today: '15-11-2026' });
    expect([e.field, e.code]).toEqual(['today', 'INVALID_FORMAT']);
  });
});

describe('Accident.rehydrate', () => {
  const base = { id: UUID, ...valid, status: 'REGISTRADO', statusChangedBy: null, statusChangedAt: null, createdAt: NOW, updatedAt: NOW } as const;
  it.each([
    ['status', { status: 'X' }],
    ['catálogo documentType', { documentType: 'ZZ' }],
    ['catálogo accidentType', { accidentType: 'ZZ' }],
  ])('rechaza persistido desconocido: %s', (_n, o) => {
    expect(() => Accident.rehydrate({ ...base, ...o } as never)).toThrow(ValidationError);
  });
  it('create rechaza now inválido', () => {
    expect(() => Accident.create(valid, { ...ctx, now: new Date('x') })).toThrow(ValidationError);
  });
  it('reconstruye sin revalidar reglas de negocio', () => {
    const a = Accident.rehydrate({
      id: UUID, ...valid, occurredOn: '1850-01-01', status: 'CERRADO',
      statusChangedBy: OWNER, statusChangedAt: NOW, createdAt: NOW, updatedAt: NOW,
    });
    expect(a.status).toBe('CERRADO');
    expect(a.statusChangedBy).toBe(OWNER);
    expect(a.occurredOn).toBe('1850-01-01');
  });
});

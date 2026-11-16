import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ request: vi.fn().mockResolvedValue({}) }));
import { request } from './client';
import { createAccident, getAccident } from './accidents';
import type { CreateAccidentInput } from './types';

const input: CreateAccidentInput = {
  affectedName: 'Ana Pérez',
  documentType: 'CC',
  documentNumber: '12345678',
  phone: '+573001234567',
  contactEmail: 'ana@example.test',
  accidentType: 'TRANSITO',
  occurredOn: '2026-11-10',
  place: 'Calle 10',
  description: 'Choque leve entre dos vehículos.',
};

describe('api/accidents', () => {
  beforeEach(() => vi.mocked(request).mockClear());

  it('createAccident envía exactamente los 9 campos del contrato', async () => {
    await createAccident({ ...input, status: 'CERRADO', ownerId: 'x', userId: 'y' } as CreateAccidentInput);
    const [metodo, ruta, cuerpo] = vi.mocked(request).mock.calls[0];
    expect(metodo).toBe('POST');
    expect(ruta).toBe('/accidents');
    expect(Object.keys(cuerpo as object).sort()).toEqual(Object.keys(input).sort());
  });

  it('getAccident codifica el id en la ruta', async () => {
    await getAccident('a/b');
    expect(vi.mocked(request).mock.calls[0][1]).toBe('/accidents/a%2Fb');
  });
});

import { describe, expect, it } from 'vitest';
import { formatDate, todayInBogota, validateAccident, type AccidentFormValues } from './accidentSchema';

const ok: AccidentFormValues = {
  affectedName: 'Ana Pérez',
  documentType: 'CC',
  documentNumber: 'ABC12345',
  phone: '+573001234567',
  contactEmail: 'ana@correo.co',
  accidentType: 'TRANSITO',
  occurredOn: '2026-11-10',
  place: 'Bogotá',
  description: 'x'.repeat(20),
};
const HOY = '2026-11-15';
const val = (o: Partial<AccidentFormValues>) => validateAccident({ ...ok, ...o }, HOY);

describe('validateAccident', () => {
  it('acepta datos válidos', () => expect(val({})).toEqual({}));
  it('formulario vacío marca los 9 campos', () => {
    const v = validateAccident(
      { affectedName: '', documentType: '', documentNumber: '', phone: '', contactEmail: '', accidentType: '', occurredOn: '', place: '', description: '' },
      HOY,
    );
    expect(Object.keys(v).sort()).toEqual(Object.keys(ok).sort());
  });
  it('nombre 2 y 121 caracteres fallan; 3 y 120 pasan', () => {
    expect(val({ affectedName: 'Al' }).affectedName).toBeTruthy();
    expect(val({ affectedName: 'a'.repeat(121) }).affectedName).toBeTruthy();
    expect(val({ affectedName: 'abc' }).affectedName).toBeUndefined();
    expect(val({ affectedName: 'a'.repeat(120) }).affectedName).toBeUndefined();
  });
  it('cuenta code points', () => {
    expect(val({ affectedName: '😀'.repeat(3) }).affectedName).toBeUndefined();
    expect(val({ affectedName: '😀'.repeat(121) }).affectedName).toBeTruthy();
  });
  it('trim antes de medir', () => expect(val({ place: '  a  ' }).place).toBeTruthy());
  it('documento fuera de catálogo', () => expect(val({ documentType: 'XX' }).documentType).toBeTruthy());
  it('número de documento con símbolos o corto/largo', () => {
    expect(val({ documentNumber: 'AB-1234' }).documentNumber).toBeTruthy();
    expect(val({ documentNumber: 'ABCD' }).documentNumber).toBeTruthy();
    expect(val({ documentNumber: 'A'.repeat(21) }).documentNumber).toBeTruthy();
    expect(val({ documentNumber: 'A'.repeat(20) }).documentNumber).toBeUndefined();
  });
  it('teléfono corto, con letras o sin +', () => {
    expect(val({ phone: '123456' }).phone).toBeTruthy();
    expect(val({ phone: '12345a7' }).phone).toBeTruthy();
    expect(val({ phone: '1234567' }).phone).toBeUndefined();
    expect(val({ phone: '1'.repeat(16) }).phone).toBeTruthy();
  });
  it('email inválido', () => {
    expect(val({ contactEmail: 'mal' }).contactEmail).toBeTruthy();
    expect(val({ contactEmail: 'a@b' }).contactEmail).toBeTruthy();
  });
  it('tipo de accidente fuera de catálogo', () => expect(val({ accidentType: 'X' }).accidentType).toBeTruthy());
  it('fecha futura, 1899, inexistente y formato', () => {
    expect(val({ occurredOn: '2026-11-16' }).occurredOn).toBeTruthy();
    expect(val({ occurredOn: HOY }).occurredOn).toBeUndefined();
    expect(val({ occurredOn: '1899-12-31' }).occurredOn).toBeTruthy();
    expect(val({ occurredOn: '1900-01-01' }).occurredOn).toBeUndefined();
    expect(val({ occurredOn: '2026-02-30' }).occurredOn).toBeTruthy();
    expect(val({ occurredOn: '2024-02-29' }).occurredOn).toBeUndefined();
    expect(val({ occurredOn: '10/11/2026' }).occurredOn).toBeTruthy();
  });
  it('lugar y descripción: límites', () => {
    expect(val({ place: 'ab' }).place).toBeTruthy();
    expect(val({ place: 'a'.repeat(201) }).place).toBeTruthy();
    expect(val({ description: 'x'.repeat(19) }).description).toBeTruthy();
    expect(val({ description: 'x'.repeat(2001) }).description).toBeTruthy();
    expect(val({ description: 'x'.repeat(2000) }).description).toBeUndefined();
  });
});

describe('todayInBogota / formatDate', () => {
  it('usa la zona de Bogotá', () => {
    expect(todayInBogota(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-15');
    expect(todayInBogota(new Date('2026-11-16T05:00:00Z'))).toBe('2026-11-16');
  });
  it('formatea dd/mm/aaaa', () => expect(formatDate('2026-11-10')).toBe('10/11/2026'));
});

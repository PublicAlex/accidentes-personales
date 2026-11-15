import { describe, expect, it } from 'vitest';
import { ACCIDENT_TYPES, isAccidentType } from '../../../src/domain/accident/AccidentType.js';
import { DOCUMENT_TYPES, isDocumentType } from '../../../src/domain/accident/DocumentType.js';
import { DEFAULT_ROLE, ROLES, isRole } from '../../../src/domain/user/Role.js';

describe('catálogos', () => {
  it('contenido cerrado', () => {
    expect([...ACCIDENT_TYPES]).toEqual(['TRANSITO', 'LABORAL', 'DOMESTICO', 'DEPORTIVO', 'OTRO']);
    expect([...DOCUMENT_TYPES]).toEqual(['CC', 'CE', 'TI', 'PASAPORTE']);
    expect([...ROLES]).toEqual(['USER', 'REVIEWER']);
    expect(DEFAULT_ROLE).toBe('USER');
  });
  it.each([
    [isAccidentType, ACCIDENT_TYPES],
    [isDocumentType, DOCUMENT_TYPES],
    [isRole, ROLES],
  ] as const)('el guard acepta sus valores y rechaza otros', (guard, values) => {
    for (const v of values) expect(guard(v)).toBe(true);
    for (const bad of ['', 'otro', 'cc', 1, null, undefined]) expect(guard(bad)).toBe(false);
  });
});

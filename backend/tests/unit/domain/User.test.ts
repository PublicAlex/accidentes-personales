import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../src/domain/errors.js';
import { User } from '../../../src/domain/user/User.js';

const ID = '123e4567-e89b-12d3-a456-426614174000';
const NOW = new Date('2026-11-15T12:00:00Z');
const base = { id: ID, email: 'ana@example.com', passwordHash: '$2b$12$hash', fullName: 'Ana Pérez' };

describe('User.create', () => {
  it('rol por defecto USER', () => {
    const u = User.create(base, { now: NOW });
    expect(u.role).toBe('USER');
    expect(u.createdAt).toBe(NOW);
    expect(u.email).toBe('ana@example.com');
  });

  it('acepta REVIEWER y límites de nombre 3/120', () => {
    expect(User.create({ ...base, role: 'REVIEWER' }, { now: NOW }).role).toBe('REVIEWER');
    expect(() => User.create({ ...base, fullName: 'Ana' }, { now: NOW })).not.toThrow();
    expect(() => User.create({ ...base, fullName: 'a'.repeat(120) }, { now: NOW })).not.toThrow();
  });

  it.each<[string, Record<string, unknown>, string]>([
    ['email con mayúsculas', { email: 'Ana@example.com' }, 'email'],
    ['email sin formato', { email: 'ana' }, 'email'],
    ['email > 254', { email: 'a'.repeat(243) + '@example.com' }, 'email'],
    ['nombre 2', { fullName: 'An' }, 'fullName'],
    ['nombre 121', { fullName: 'a'.repeat(121) }, 'fullName'],
    ['hash vacío', { passwordHash: '' }, 'passwordHash'],
    ['rol fuera de catálogo', { role: 'ADMIN' }, 'role'],
    ['id no UUID', { id: 'x' }, 'id'],
  ])('inválido: %s', (_n, o, field) => {
    try {
      User.create({ ...base, ...o } as never, { now: NOW });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe(field);
    }
  });

  it('rehydrate rechaza rol desconocido', () => {
    expect(() => User.rehydrate({ ...base, role: 'ADMIN' as never, createdAt: NOW })).toThrow(ValidationError);
  });
  it('create rechaza now inválido', () => {
    expect(() => User.create(base, { now: new Date('x') })).toThrow(ValidationError);
  });
  it('rehydrate no revalida', () => {
    const u = User.rehydrate({ ...base, email: 'MAYUS', role: 'REVIEWER', createdAt: NOW });
    expect(u.email).toBe('MAYUS');
  });
});

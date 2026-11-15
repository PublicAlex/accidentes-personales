import { randomUUID } from 'node:crypto';
import { Accident, type AccidentInput } from '../../src/domain/accident/Accident.js';
import { User } from '../../src/domain/user/User.js';
import type { Role } from '../../src/domain/user/Role.js';

export const NOW = new Date('2026-11-15T12:00:00.000Z');
export const TODAY = '2026-11-15';

export function buildUser(over: { email?: string; role?: Role; id?: string; fullName?: string; now?: Date; passwordHash?: string } = {}): User {
  return User.create(
    {
      id: over.id ?? randomUUID(),
      email: over.email ?? `u-${randomUUID()}@example.test`,
      passwordHash: over.passwordHash ?? '$2b$12$hashdeprueba',
      fullName: over.fullName ?? 'Persona de Prueba',
      role: over.role ?? 'USER',
    },
    { now: over.now ?? NOW },
  );
}

export function accidentInput(ownerId: string, over: Partial<AccidentInput> = {}): AccidentInput {
  return {
    affectedName: 'Juan Perez',
    documentType: 'CC',
    documentNumber: '12345678',
    phone: '+573001234567',
    contactEmail: 'juan@example.test',
    accidentType: 'TRANSITO',
    occurredOn: '2026-11-01',
    place: 'Bogota, Calle 80',
    description: 'Colision leve entre dos vehiculos en la via.',
    ownerId,
    ...over,
  };
}

export function buildAccident(ownerId: string, over: Partial<AccidentInput> = {}, now: Date = NOW): Accident {
  return Accident.create(accidentInput(ownerId, over), { id: randomUUID(), now, today: TODAY });
}

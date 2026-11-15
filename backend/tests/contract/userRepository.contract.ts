import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../../src/application/errors.js';
import type { UserRepository } from '../../src/application/ports/UserRepository.js';
import { buildUser } from '../support/builders.js';

export function userRepositoryContract(name: string, setup: () => Promise<UserRepository>): void {
  describe(`UserRepository contract: ${name}`, () => {
    let repo: UserRepository;
    beforeEach(async () => {
      repo = await setup();
    });

    it('create y findById/findByEmail devuelven el usuario', async () => {
      const u = buildUser({ email: 'ana@example.test' });
      const created = await repo.create(u);
      expect(created.id).toBe(u.id);
      expect((await repo.findById(u.id))?.email).toBe('ana@example.test');
      expect((await repo.findByEmail('ana@example.test'))?.id).toBe(u.id);
      expect((await repo.findByEmail('ANA@example.test'))?.id).toBe(u.id);
    });

    it('devuelve null si no hay fila', async () => {
      expect(await repo.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
      expect(await repo.findByEmail('nadie@example.test')).toBeNull();
    });

    it('email duplicado lanza ConflictError EMAIL_TAKEN', async () => {
      await repo.create(buildUser({ email: 'dup@example.test' }));
      await expect(repo.create(buildUser({ email: 'dup@example.test' }))).rejects.toMatchObject({
        constructor: ConflictError,
        code: 'EMAIL_TAKEN',
      });
    });

    it('upsertReviewer es idempotente por email y fuerza rol REVIEWER', async () => {
      const first = await repo.upsertReviewer(buildUser({ email: 'rev@example.test', role: 'REVIEWER' }));
      const second = await repo.upsertReviewer(
        buildUser({ email: 'rev@example.test', role: 'REVIEWER', fullName: 'Otro Nombre' }),
      );
      expect(second.id).toBe(first.id);
      expect(second.fullName).toBe('Otro Nombre');
      expect(second.role).toBe('REVIEWER');
    });

    it('upsertReviewer promueve un USER existente y rota su hash', async () => {
      const user = await repo.create(buildUser({ email: 'rev2@example.test', passwordHash: 'hash-viejo' }));
      expect(user.role).toBe('USER');
      const up = await repo.upsertReviewer(
        buildUser({ email: 'rev2@example.test', role: 'REVIEWER', passwordHash: 'hash-nuevo' }),
      );
      expect(up.id).toBe(user.id);
      expect(up.role).toBe('REVIEWER');
      expect(up.passwordHash).toBe('hash-nuevo');
    });
  });
}

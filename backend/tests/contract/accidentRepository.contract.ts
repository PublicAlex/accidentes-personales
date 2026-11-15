import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../../src/application/errors.js';
import type { AccidentRepository } from '../../src/application/ports/AccidentRepository.js';
import type { UserRepository } from '../../src/application/ports/UserRepository.js';
import { buildAccident, buildUser, NOW } from '../support/builders.js';

export interface AccidentContractDeps {
  accidents: AccidentRepository;
  users: UserRepository;
}

export function accidentRepositoryContract(name: string, setup: () => Promise<AccidentContractDeps>): void {
  describe(`AccidentRepository contract: ${name}`, () => {
    let accidents: AccidentRepository;
    let users: UserRepository;
    beforeEach(async () => {
      ({ accidents, users } = await setup());
    });

    it('create y findByIdForOwner devuelven los mismos datos (occurredOn como YYYY-MM-DD)', async () => {
      const owner = await users.create(buildUser());
      const a = buildAccident(owner.id, { occurredOn: '2026-03-05' });
      const created = await accidents.create(a);
      expect(created.occurredOn).toBe('2026-03-05');
      const found = await accidents.findByIdForOwner(a.id, owner.id);
      expect(found?.id).toBe(a.id);
      expect(found?.status).toBe('REGISTRADO');
      expect(found?.occurredOn).toBe('2026-03-05');
      expect(found?.createdAt.getTime()).toBe(NOW.getTime());
    });

    it('aislamiento: otro dueño no lo ve ni lo lista', async () => {
      const a1 = await users.create(buildUser());
      const b = await users.create(buildUser());
      const acc = await accidents.create(buildAccident(a1.id));
      expect(await accidents.findByIdForOwner(acc.id, b.id)).toBeNull();
      expect(await accidents.listByOwner(b.id, 100)).toEqual([]);
      expect(await accidents.listByOwner(a1.id, 100)).toHaveLength(1);
    });

    it('devuelve null si no existe', async () => {
      const owner = await users.create(buildUser());
      const id = randomUUID();
      expect(await accidents.findByIdForOwner(id, owner.id)).toBeNull();
      expect(await accidents.findStatusById(id)).toBeNull();
    });

    it('listByOwner ordena occurred_on DESC, created_at DESC, id y respeta limit', async () => {
      const owner = await users.create(buildUser());
      const old = await accidents.create(buildAccident(owner.id, { occurredOn: '2026-01-01' }));
      const newest = await accidents.create(buildAccident(owner.id, { occurredOn: '2026-06-01' }));
      const sameDayLater = await accidents.create(
        buildAccident(owner.id, { occurredOn: '2026-06-01' }, new Date(NOW.getTime() + 1000)),
      );
      const list = await accidents.listByOwner(owner.id, 100);
      expect(list.map((s) => s.id)).toEqual([sameDayLater.id, newest.id, old.id]);
      expect(list[0]).toEqual({
        id: sameDayLater.id,
        accidentType: 'TRANSITO',
        occurredOn: '2026-06-01',
        status: 'REGISTRADO',
      });
      expect(await accidents.listByOwner(owner.id, 2)).toHaveLength(2);
    });

    it('findStatusById devuelve solo {id,status}', async () => {
      const owner = await users.create(buildUser());
      const acc = await accidents.create(buildAccident(owner.id));
      expect(await accidents.findStatusById(acc.id)).toEqual({ id: acc.id, status: 'REGISTRADO' });
    });

    it('updateStatus con expected vigente actualiza y registra quien/cuando', async () => {
      const owner = await users.create(buildUser());
      const reviewer = await users.create(buildUser({ role: 'REVIEWER' }));
      const acc = await accidents.create(buildAccident(owner.id));
      const at = new Date(NOW.getTime() + 60_000);
      const res = await accidents.updateStatus({
        id: acc.id,
        expected: 'REGISTRADO',
        next: 'EN_REVISION',
        by: reviewer.id,
        at,
      });
      expect(res).toEqual({ id: acc.id, status: 'EN_REVISION', updatedAt: at });
      const found = await accidents.findByIdForOwner(acc.id, owner.id);
      expect(found?.status).toBe('EN_REVISION');
      expect(found?.statusChangedBy).toBe(reviewer.id);
      expect(found?.statusChangedAt?.getTime()).toBe(at.getTime());
    });

    it('updateStatus con expected obsoleto o id inexistente lanza CONCURRENT_UPDATE', async () => {
      const owner = await users.create(buildUser());
      const acc = await accidents.create(buildAccident(owner.id));
      const base = { by: owner.id, at: NOW };
      await expect(
        accidents.updateStatus({ id: acc.id, expected: 'EN_REVISION', next: 'CERRADO', ...base }),
      ).rejects.toMatchObject({ constructor: ConflictError, code: 'CONCURRENT_UPDATE' });
      await expect(
        accidents.updateStatus({ id: randomUUID(), expected: 'REGISTRADO', next: 'EN_REVISION', ...base }),
      ).rejects.toMatchObject({ constructor: ConflictError, code: 'CONCURRENT_UPDATE' });
    });

    it('dos updateStatus paralelos: exactamente uno gana', async () => {
      const owner = await users.create(buildUser());
      const acc = await accidents.create(buildAccident(owner.id));
      const attempt = () =>
        accidents.updateStatus({ id: acc.id, expected: 'REGISTRADO', next: 'EN_REVISION', by: owner.id, at: NOW });
      const results = await Promise.allSettled([attempt(), attempt()]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({ code: 'CONCURRENT_UPDATE' });
    });
  });
}

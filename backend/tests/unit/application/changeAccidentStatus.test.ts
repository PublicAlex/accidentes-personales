import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../src/application/errors.js';
import type { UpdateStatusInput } from '../../../src/application/ports/AccidentRepository.js';
import { ChangeAccidentStatus } from '../../../src/application/use-cases/accidents/ChangeAccidentStatus.js';
import { ACCIDENT_STATUSES, type AccidentStatus } from '../../../src/domain/accident/AccidentStatus.js';
import { InvalidTransitionError } from '../../../src/domain/errors.js';
import { FakeClock, InMemoryAccidentRepository } from '../../fakes/index.js';
import { buildAccident } from '../../support/builders.js';

const REVIEWER = { userId: randomUUID(), role: 'REVIEWER' as const };
const USER = { userId: randomUUID(), role: 'USER' as const };

async function setup(status: AccidentStatus = 'REGISTRADO') {
  const repo = new InMemoryAccidentRepository();
  const clock = new FakeClock();
  let acc = await repo.create(buildAccident(USER.userId));
  if (status !== 'REGISTRADO') {
    if (status === 'EN_REVISION' || status === 'CERRADO')
      await repo.updateStatus({ id: acc.id, expected: 'REGISTRADO', next: 'EN_REVISION', by: REVIEWER.userId, at: clock.now() });
    if (status === 'CERRADO')
      await repo.updateStatus({ id: acc.id, expected: 'EN_REVISION', next: 'CERRADO', by: REVIEWER.userId, at: clock.now() });
    acc = repo.items.get(acc.id)!;
  }
  return { repo, clock, acc, uc: new ChangeAccidentStatus(repo, clock) };
}

describe('ChangeAccidentStatus: matriz de transiciones', () => {
  const valid: [AccidentStatus, AccidentStatus][] = [
    ['REGISTRADO', 'EN_REVISION'],
    ['EN_REVISION', 'CERRADO'],
  ];
  const invalid = ACCIDENT_STATUSES.flatMap((f) => ACCIDENT_STATUSES.map((t) => [f, t] as const)).filter(
    ([f, t]) => !valid.some(([a, b]) => a === f && b === t),
  );
  it('hay 2 válidas y 7 inválidas', () => {
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(7);
  });
  it.each(valid)('%s -> %s es válida', async (from, to) => {
    const { uc, acc } = await setup(from);
    const res = await uc.execute({ actor: REVIEWER, id: acc.id, status: to });
    expect(res).toMatchObject({ id: acc.id, status: to });
  });
  it.each(invalid)('%s -> %s lanza InvalidTransitionError y no cambia', async (from, to) => {
    const { uc, acc, repo } = await setup(from);
    await expect(uc.execute({ actor: REVIEWER, id: acc.id, status: to })).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(repo.items.get(acc.id)!.status).toBe(from);
  });
});

describe('ChangeAccidentStatus: otros casos', () => {
  it('USER (aunque sea dueño) -> ForbiddenError sin consultar el repositorio', async () => {
    const { uc, acc, repo } = await setup();
    let calls = 0;
    repo.findStatusById = async () => {
      calls++;
      return null;
    };
    for (const id of [acc.id, randomUUID(), 'no-uuid'])
      await expect(uc.execute({ actor: USER, id, status: 'EN_REVISION' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls).toBe(0);
  });
  it('inexistente y no-UUID -> NotFoundError', async () => {
    const { uc } = await setup();
    await expect(uc.execute({ actor: REVIEWER, id: randomUUID(), status: 'EN_REVISION' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(uc.execute({ actor: REVIEWER, id: 'no-uuid', status: 'EN_REVISION' })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('guarda by y at (clock)', async () => {
    const { uc, acc, repo, clock } = await setup();
    const res = await uc.execute({ actor: REVIEWER, id: acc.id, status: 'EN_REVISION' });
    const saved = repo.items.get(acc.id)!;
    expect(saved.statusChangedBy).toBe(REVIEWER.userId);
    expect(saved.statusChangedAt).toEqual(clock.now());
    expect(res.updatedAt).toEqual(clock.now());
  });
  it('propaga el conflicto de concurrencia', async () => {
    const { uc, acc, repo } = await setup();
    repo.updateStatus = async (_i: UpdateStatusInput) => {
      throw new ConflictError('CONCURRENT_UPDATE');
    };
    await expect(uc.execute({ actor: REVIEWER, id: acc.id, status: 'EN_REVISION' })).rejects.toMatchObject({ code: 'CONCURRENT_UPDATE' });
  });
});

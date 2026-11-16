import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../src/application/errors.js';
import { CreateAccident } from '../../../src/application/use-cases/accidents/CreateAccident.js';
import { GetMyAccident } from '../../../src/application/use-cases/accidents/GetMyAccident.js';
import { ListMyAccidents } from '../../../src/application/use-cases/accidents/ListMyAccidents.js';
import { ValidationError } from '../../../src/domain/errors.js';
import { FakeClock, FakeIdGenerator, InMemoryAccidentRepository } from '../../fakes/index.js';
import { accidentInput, buildAccident } from '../../support/builders.js';

const A = randomUUID();
const B = randomUUID();

function setup() {
  const repo = new InMemoryAccidentRepository();
  return { repo, create: new CreateAccident(repo, new FakeClock(), new FakeIdGenerator()), list: new ListMyAccidents(repo), get: new GetMyAccident(repo) };
}
const { ownerId: _o, ...fields } = accidentInput(A);

describe('CreateAccident', () => {
  it('usa el actor como propietario e ignora un ownerId en el input', async () => {
    const { create } = setup();
    const acc = await create.execute({ actor: { userId: A }, fields: { ...fields, ownerId: B } as never });
    expect(acc.ownerId).toBe(A);
    expect(acc.status).toBe('REGISTRADO');
  });
  it('fecha futura -> ValidationError y no persiste', async () => {
    const { create, repo } = setup();
    await expect(create.execute({ actor: { userId: A }, fields: { ...fields, occurredOn: '2026-11-16' } })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.items.size).toBe(0);
  });
});

describe('ListMyAccidents', () => {
  it('vacío y solo propios', async () => {
    const { list, repo } = setup();
    expect(await list.execute({ actor: { userId: A } })).toEqual([]);
    await repo.create(buildAccident(A));
    await repo.create(buildAccident(B));
    expect(await list.execute({ actor: { userId: A } })).toHaveLength(1);
  });
  it('máximo 100', async () => {
    const { list, repo } = setup();
    for (let i = 0; i < 105; i++) await repo.create(buildAccident(A));
    expect(await list.execute({ actor: { userId: A } })).toHaveLength(100);
  });
});

describe('GetMyAccident', () => {
  it('propio ok; ajeno, inexistente y no-UUID -> NotFoundError', async () => {
    const { get, repo } = setup();
    const mine = await repo.create(buildAccident(A));
    expect((await get.execute({ actor: { userId: A }, id: mine.id })).id).toBe(mine.id);
    for (const id of [mine.id, randomUUID(), 'no-es-uuid', "' OR 1=1"]) {
      await expect(get.execute({ actor: { userId: B }, id })).rejects.toBeInstanceOf(NotFoundError);
    }
  });
});

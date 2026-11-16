import { ConflictError } from '../../src/application/errors.js';
import type { AccidentRepository } from '../../src/application/ports/AccidentRepository.js';
import { ChangeAccidentStatus } from '../../src/application/use-cases/accidents/ChangeAccidentStatus.js';
import { PgAccidentRepository } from '../../src/infrastructure/persistence/pg/PgAccidentRepository.js';
import { SystemClock } from '../../src/infrastructure/system/SystemClock.js';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAccident, signUp } from '../support/accidentHelpers.js';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';

const pool = createTestPool();
const { app } = buildTestApp(pool);
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

const patch = (id: string, cookie: string | null, body: unknown) => {
  const r = request(app).patch(`/api/accidents/${id}/status`);
  return (cookie ? r.set('Cookie', cookie) : r).send(body as object);
};

async function world() {
  const owner = await signUp(app, pool, 'owner@example.test');
  const rev = await signUp(app, pool, 'rev@example.test', 'REVIEWER');
  const acc = await createAccident(app, owner.cookie);
  expect(acc.status).toBe(201);
  return { owner, rev, id: acc.body.id as string };
}

describe('PATCH /api/accidents/:id/status', () => {
  it('flujo completo, respuesta con 3 claves, persistencia y dueño ve el estado', async () => {
    const { owner, rev, id } = await world();
    const r1 = await patch(id, rev.cookie, { status: 'EN_REVISION' });
    expect(r1.status).toBe(200);
    expect(Object.keys(r1.body).sort()).toEqual(['id', 'status', 'updatedAt']);
    expect(r1.body).toMatchObject({ id, status: 'EN_REVISION' });
    expect(new Date(r1.body.updatedAt).toISOString()).toBe(r1.body.updatedAt);
    const row = await pool.query('SELECT status_changed_by, status_changed_at FROM accidents WHERE id = $1', [id]);
    expect(row.rows[0].status_changed_by).toBe(rev.id);
    expect(row.rows[0].status_changed_at).not.toBeNull();
    expect((await patch(id, rev.cookie, { status: 'CERRADO' })).status).toBe(200);
    const get = await request(app).get(`/api/accidents/${id}`).set('Cookie', owner.cookie);
    expect(get.body.status).toBe('CERRADO');
  });

  it('409 INVALID_TRANSITION por salto, retroceso, mismo estado y desde CERRADO', async () => {
    const { rev, id } = await world();
    const expect409 = async (status: string, current: string) => {
      const res = await patch(id, rev.cookie, { status });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
      const r = await pool.query('SELECT status FROM accidents WHERE id = $1', [id]);
      expect(r.rows[0].status).toBe(current);
    };
    await expect409('CERRADO', 'REGISTRADO');
    await expect409('REGISTRADO', 'REGISTRADO');
    expect((await patch(id, rev.cookie, { status: 'EN_REVISION' })).status).toBe(200);
    await expect409('REGISTRADO', 'EN_REVISION');
    await expect409('EN_REVISION', 'EN_REVISION');
    expect((await patch(id, rev.cookie, { status: 'CERRADO' })).status).toBe(200);
    await expect409('EN_REVISION', 'CERRADO');
    await expect409('CERRADO', 'CERRADO');
  });

  it('403 idéntico para USER (propio, ajeno, inexistente, no-UUID), antes de 404 y de 400', async () => {
    const { owner, id } = await world();
    const other = await signUp(app, pool, 'other@example.test');
    const bodies = new Set<string>();
    for (const [who, target] of [
      [owner, id],
      [other, id],
      [owner, '00000000-0000-4000-8000-0000000000ff'],
      [owner, 'no-uuid'],
    ] as const) {
      const res = await patch(target, who.cookie, { status: 'EN_REVISION' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      bodies.add(res.text);
    }
    expect((await patch(id, owner.cookie, { status: 'BASURA' })).status).toBe(403);
    expect(bodies.size).toBe(1);
    const r = await pool.query('SELECT status FROM accidents WHERE id = $1', [id]);
    expect(r.rows[0].status).toBe('REGISTRADO');
  });

  it('401 sin sesión', async () => {
    const { id } = await world();
    const res = await patch(id, null, { status: 'EN_REVISION' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('400 por status desconocido, campo extra, body vacío o status inválido', async () => {
    const { rev, id } = await world();
    for (const body of [{ status: 'BASURA' }, { status: 'EN_REVISION', extra: 1 }, {}, { status: 5 }]) {
      const res = await patch(id, rev.cookie, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const empty = await request(app).patch(`/api/accidents/${id}/status`).set('Cookie', rev.cookie);
    expect(empty.status).toBe(400);
  });

  it('404 para id inexistente o no-UUID (REVIEWER)', async () => {
    const { rev } = await world();
    for (const id of ['00000000-0000-4000-8000-0000000000ff', 'no-uuid']) {
      const res = await patch(id, rev.cookie, { status: 'EN_REVISION' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('dos PATCH concurrentes al mismo estado: uno 200 y otro 409', async () => {
    const { rev, id } = await world();
    const rev2 = await signUp(app, pool, 'rev2@example.test', 'REVIEWER');
    const results = await Promise.all([
      patch(id, rev.cookie, { status: 'EN_REVISION' }),
      patch(id, rev2.cookie, { status: 'EN_REVISION' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(['INVALID_TRANSITION', 'CONCURRENT_UPDATE']).toContain(loser.body.error.code);
  });
});

describe('ChangeAccidentStatus con PgAccidentRepository: lectura obsoleta forzada', () => {
  it('dos ejecuciones que leen REGISTRADO: el UPDATE condicional deja un solo ganador y el otro recibe CONCURRENT_UPDATE', async () => {
    const { rev, id } = await world();
    const real = new PgAccidentRepository(pool);
    let reads = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const stale: AccidentRepository = {
      create: (a) => real.create(a),
      listByOwner: (o, l) => real.listByOwner(o, l),
      findByIdForOwner: (i, o) => real.findByIdForOwner(i, o),
      updateStatus: (i) => real.updateStatus(i),
      async findStatusById(i) {
        const row = await real.findStatusById(i);
        if (++reads === 2) release();
        await gate; // ambas lecturas terminan antes de que cualquiera actualice
        return row;
      },
    };
    const uc = new ChangeAccidentStatus(stale, new SystemClock());
    const actor = { userId: rev.id, role: 'REVIEWER' as const };
    const results = await Promise.allSettled([
      uc.execute({ actor, id, status: 'EN_REVISION' }),
      uc.execute({ actor, id, status: 'EN_REVISION' }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const bad = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    expect(bad[0]!.reason).toBeInstanceOf(ConflictError);
    expect((bad[0]!.reason as ConflictError).code).toBe('CONCURRENT_UPDATE');
  });
});

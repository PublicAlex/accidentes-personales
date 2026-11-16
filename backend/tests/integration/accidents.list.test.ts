import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAccident, signUp } from '../support/accidentHelpers.js';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';

const pool = createTestPool();
const { app } = buildTestApp(pool);
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

describe('GET /api/accidents', () => {
  it('usuario nuevo -> 200 []', async () => {
    const u = await signUp(app, pool, 'a@example.test');
    const res = await request(app).get('/api/accidents').set('Cookie', u.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('solo propios, resumen, fecha desc; REVIEWER solo los suyos', async () => {
    const a = await signUp(app, pool, 'a@example.test');
    const b = await signUp(app, pool, 'b@example.test');
    const r = await signUp(app, pool, 'r@example.test', 'REVIEWER');
    const old = await createAccident(app, a.cookie, { occurredOn: '2026-01-01' });
    const recent = await createAccident(app, a.cookie, { occurredOn: '2026-06-01', accidentType: 'LABORAL' });
    await createAccident(app, b.cookie);
    const rev = await createAccident(app, r.cookie);

    const resA = await request(app).get('/api/accidents').set('Cookie', a.cookie);
    expect(resA.status).toBe(200);
    expect(resA.body).toEqual([
      { id: recent.body.id, accidentType: 'LABORAL', occurredOn: '2026-06-01', status: 'REGISTRADO' },
      { id: old.body.id, accidentType: 'TRANSITO', occurredOn: '2026-01-01', status: 'REGISTRADO' },
    ]);
    const resR = await request(app).get('/api/accidents').set('Cookie', r.cookie);
    expect(resR.body.map((x: { id: string }) => x.id)).toEqual([rev.body.id]);
  });
});

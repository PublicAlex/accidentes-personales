import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAccident, signUp } from '../support/accidentHelpers.js';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';

const pool = createTestPool();
const { app } = buildTestApp(pool);
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

describe('aislamiento por propietario en GET /api/accidents/:id', () => {
  it('ajeno, inexistente y no-UUID dan el mismo 404 sin datos de A (también REVIEWER)', async () => {
    const a = await signUp(app, pool, 'a@example.test');
    const b = await signUp(app, pool, 'b@example.test');
    const r = await signUp(app, pool, 'r@example.test', 'REVIEWER');
    const acc = await createAccident(app, a.cookie, { affectedName: 'Nombre Secreto Alfa' });
    const ids = [acc.body.id, '00000000-0000-4000-8000-0000000000ff', 'no-uuid', '1%20OR%201=1'];
    for (const who of [b, r]) {
      const bodies: string[] = [];
      for (const id of ids) {
        const res = await request(app).get(`/api/accidents/${id}`).set('Cookie', who.cookie);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.text).not.toContain('Secreto');
        bodies.push(res.text);
      }
      expect(new Set(bodies).size).toBe(1);
    }
    const own = await request(app).get(`/api/accidents/${acc.body.id}`).set('Cookie', a.cookie);
    expect(own.status).toBe(200);
  });
});

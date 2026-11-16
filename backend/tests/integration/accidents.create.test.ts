import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAccident, signUp, validAccident } from '../support/accidentHelpers.js';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';

const pool = createTestPool();
const { app } = buildTestApp(pool);
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

describe('POST /api/accidents', () => {
  it('201 con detalle, REGISTRADO, dueño = usuario, y GET posterior igual', async () => {
    const u = await signUp(app, pool, 'a@example.test');
    const res = await createAccident(app, u.cookie);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...validAccident, status: 'REGISTRADO' });
    expect(Object.keys(res.body).sort()).toEqual(
      [...Object.keys(validAccident), 'id', 'status', 'createdAt', 'updatedAt'].sort(),
    );
    expect(res.body.createdAt).toMatch(/Z$/);
    const owner = await pool.query('SELECT owner_id FROM accidents WHERE id = $1', [res.body.id]);
    expect(owner.rows[0].owner_id).toBe(u.id);
    const got = await request(app).get(`/api/accidents/${res.body.id}`).set('Cookie', u.cookie);
    expect(got.status).toBe(200);
    expect(got.body).toEqual(res.body);
  });

  it('límites exactos: descripción 20 y 2000, fecha 1900-01-01 y hoy', async () => {
    const u = await signUp(app, pool, 'a@example.test');
    expect((await createAccident(app, u.cookie, { description: 'a'.repeat(20) })).status).toBe(201);
    expect((await createAccident(app, u.cookie, { description: 'a'.repeat(2000) })).status).toBe(201);
    expect((await createAccident(app, u.cookie, { occurredOn: '1900-01-01' })).status).toBe(201);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    expect((await createAccident(app, u.cookie, { occurredOn: today })).status).toBe(201);
  });
});

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAccident, signUp } from '../support/accidentHelpers.js';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';

const pool = createTestPool();
const { app } = buildTestApp(pool);
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

const count = async () => (await pool.query('SELECT count(*)::int AS n FROM accidents')).rows[0].n as number;

describe('validación de POST /api/accidents', () => {
  it('body vacío -> 400 con details por campo', async () => {
    const u = await signUp(app, pool, 'a@example.test');
    const res = await request(app).post('/api/accidents').set('Cookie', u.cookie).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['affectedName', 'documentType', 'documentNumber', 'phone', 'contactEmail', 'accidentType', 'occurredOn', 'place', 'description']));
  });

  it.each([
    ['userId', { userId: '00000000-0000-4000-8000-000000000001' }],
    ['ownerId', { ownerId: '00000000-0000-4000-8000-000000000001' }],
    ['status', { status: 'CERRADO' }],
    ['id', { id: '00000000-0000-4000-8000-000000000001' }],
    ['desconocido', { foo: 'bar' }],
  ])('campo extra %s -> 400 y nada persistido', async (_n, extra) => {
    const u = await signUp(app, pool, 'a@example.test');
    const res = await createAccident(app, u.cookie, extra);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await count()).toBe(0);
  });

  it.each([
    ['fecha futura', { occurredOn: '2999-01-01' }],
    ['fecha inexistente', { occurredOn: '2026-02-30' }],
    ['fecha anterior a 1900', { occurredOn: '1899-12-31' }],
    ['formato de fecha', { occurredOn: '01/02/2026' }],
    ['tipo inexistente', { accidentType: 'VOLCAN' }],
    ['documento inexistente', { documentType: 'XX' }],
    ['descripción corta', { description: 'a'.repeat(19) }],
    ['descripción larga', { description: 'a'.repeat(2001) }],
    ['tipos erróneos', { phone: 3001234567, place: 5 }],
    ['teléfono inválido', { phone: '12345' }],
    ['documento inválido', { documentNumber: 'ab' }],
    ['correo inválido', { contactEmail: 'nope' }],
  ])('%s -> 400', async (_n, over) => {
    const u = await signUp(app, pool, 'a@example.test');
    const res = await createAccident(app, u.cookie, over);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await count()).toBe(0);
  });
});

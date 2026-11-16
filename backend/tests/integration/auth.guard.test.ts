import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestPool } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';
import { validAccident } from '../support/accidentHelpers.js';

const pool = createTestPool();
const { app } = buildTestApp(pool);
afterAll(() => pool.end());

describe('rutas de accidentes sin sesión', () => {
  it.each([
    ['post', '/api/accidents'],
    ['get', '/api/accidents'],
    ['get', '/api/accidents/00000000-0000-4000-8000-000000000001'],
  ] as const)('%s %s -> 401', async (method, path) => {
    const res = await request(app)[method](path).send(method === 'post' ? validAccident : undefined);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('401 antes que 400 con body inválido', async () => {
    const res = await request(app).post('/api/accidents').send({});
    expect(res.status).toBe(401);
  });
});

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp, TEST_JWT_SECRET, TEST_ORIGIN, validUser } from '../support/httpApp.js';

const pool = createTestPool();
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

describe('encabezados de seguridad y CORS', () => {
  const { app } = buildTestApp(pool);

  it('helmet está activo y no hay x-powered-by', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CORS solo permite FRONTEND_ORIGIN, con credentials', async () => {
    const ok = await request(app).get('/api/auth/me').set('Origin', TEST_ORIGIN);
    expect(ok.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const bad = await request(app).get('/api/auth/me').set('Origin', 'http://evil.test');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rate limit', () => {
  it('el 11.º intento de login da 429 con Retry-After', async () => {
    const { app } = buildTestApp(pool, { rateLimit: { windowMs: 15 * 60_000, max: 10 } });
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post('/api/auth/login').send({ email: 'x@example.test', password: 'mala-clave-1' });
      expect(r.status).toBe(401);
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'x@example.test', password: 'mala-clave-1' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('también limita el registro', async () => {
    const { app } = buildTestApp(pool, { rateLimit: { windowMs: 15 * 60_000, max: 10 } });
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/register').send({ ...validUser, email: `u${i}@example.test` }).expect(201);
    }
    await request(app).post('/api/auth/register').send({ ...validUser, email: 'u11@example.test' }).expect(429);
  });
});

describe('filtración de secretos', () => {
  it('ninguna respuesta ni log contiene password_hash, JWT_SECRET ni la contraseña', async () => {
    const { app, logs } = buildTestApp(pool);
    const bodies: string[] = [];
    const keep = (r: request.Response) => bodies.push(JSON.stringify(r.headers) + r.text);
    keep(await request(app).post('/api/auth/register').send(validUser));
    const login = await request(app).post('/api/auth/login').send({ email: validUser.email, password: validUser.password });
    keep(login);
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    keep(await request(app).get('/api/auth/me').set('Cookie', cookie));
    keep(await request(app).post('/api/auth/login').send({ email: validUser.email, password: 'mala-clave-1' }));
    keep(await request(app).post('/api/auth/logout').set('Cookie', cookie));
    const all = bodies.join('\n') + logs();
    for (const needle of ['password_hash', 'passwordHash', 'JWT_SECRET', TEST_JWT_SECRET, validUser.password, '$2b$']) {
      expect(all.includes(needle), needle).toBe(false);
    }
  });

  it('un 500 no expone stack y se loguea sin body ni PII', async () => {
    const { app, logs } = buildTestApp(pool);
    await pool.query('ALTER TABLE users RENAME TO users_tmp');
    try {
      const res = await request(app).post('/api/auth/login').send({ email: validUser.email, password: validUser.password });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
      expect(res.text).not.toMatch(/at .*\.ts|stack|users_tmp|relation/i);
      const l = logs();
      expect(l).toContain('Error no controlado');
      expect(l).not.toContain(validUser.password);
      expect(l).not.toContain(validUser.email);
    } finally {
      await pool.query('ALTER TABLE users_tmp RENAME TO users');
    }
  });
});

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { TokenRevocationRepository } from '../../src/application/ports/TokenRevocationRepository.js';
import { DependencyUnavailableError } from '../../src/application/errors.js';
import { createTestPool, truncate } from '../support/db.js';
import { buildTestApp, sessionCookie, TEST_JWT_SECRET, validUser } from '../support/httpApp.js';

const pool = createTestPool();
afterAll(() => pool.end());
beforeEach(() => truncate(pool));

async function registerAndLogin(app: ReturnType<typeof buildTestApp>['app']) {
  await request(app).post('/api/auth/register').send(validUser).expect(201);
  const res = await request(app).post('/api/auth/login').send({ email: validUser.email, password: validUser.password });
  return res;
}

describe('registro', () => {
  const { app } = buildTestApp(pool);

  it('201 con {id,email,fullName,role:USER} y sin password_hash', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, email: ' ANA@Example.test ' });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['email', 'fullName', 'id', 'role']);
    expect(res.body).toMatchObject({ email: 'ana@example.test', fullName: 'Ana Perez', role: 'USER' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('400 si el body trae role u otro campo extra, y no crea usuario', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, role: 'REVIEWER' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'role' })]));
    const n = await pool.query('SELECT count(*)::int AS n FROM users');
    expect(n.rows[0].n).toBe(0);
  });

  it('409 EMAIL_TAKEN con el mismo email en mayúsculas', async () => {
    await request(app).post('/api/auth/register').send(validUser).expect(201);
    const res = await request(app).post('/api/auth/register').send({ ...validUser, email: 'ANA@EXAMPLE.TEST' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it.each([
    ['corta', 'abc1234'],
    ['más de 72 bytes', 'a'.repeat(73)],
  ])('400 con details si la contraseña es %s', async (_n, password) => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, password });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });

  it('acepta exactamente 72 bytes y rechaza 72 caracteres multibyte', async () => {
    await request(app).post('/api/auth/register').send({ ...validUser, password: 'a'.repeat(72) }).expect(201);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'otra@example.test', password: 'ñ'.repeat(40) });
    expect(res.status).toBe(400);
  });

  it('400 con JSON malformado y 413 con body > 100 kB', async () => {
    const bad = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{"a":');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const big = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, fullName: 'x'.repeat(120_000) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('login, me y logout', () => {
  const { app } = buildTestApp(pool);

  it('login fija cookie httpOnly/sameSite=lax/path=/ con expiración de ~1 h', async () => {
    const res = await registerAndLogin(app);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: validUser.email, role: 'USER' });
    expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
    const raw = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);
    expect(raw).toMatch(/Path=\//);
    expect(raw).not.toMatch(/;\s*Secure/i);
    const exp = new Date(/Expires=([^;]+)/i.exec(raw)![1]!).getTime();
    expect(Math.abs(exp - Date.now() - 3600_000)).toBeLessThan(10_000);
    const decoded = jwt.decode(sessionCookie(res).slice('session='.length)) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'jti', 'sub']);
  });

  it('401 idéntico para email inexistente y clave incorrecta', async () => {
    await request(app).post('/api/auth/register').send(validUser).expect(201);
    const a = await request(app).post('/api/auth/login').send({ email: 'nadie@example.test', password: 'clave-segura-1' });
    const b = await request(app).post('/api/auth/login').send({ email: validUser.email, password: 'incorrecta-123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
    expect(a.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('me devuelve el usuario con la cookie y 401 sin ella', async () => {
    const login = await registerAndLogin(app);
    const me = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(login));
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(validUser.email);
    expect(JSON.stringify(me.body)).not.toMatch(/hash/i);
    await request(app).get('/api/auth/me').expect(401);
  });

  it('rol fresco: cambiar el rol en BD se refleja en /me', async () => {
    const login = await registerAndLogin(app);
    await pool.query("UPDATE users SET role = 'REVIEWER' WHERE email = $1", [validUser.email]);
    const me = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(login));
    expect(me.body.role).toBe('REVIEWER');
  });

  it('logout revoca: 204, cookie limpiada y la cookie copiada da 401', async () => {
    const login = await registerAndLogin(app);
    const cookie = sessionCookie(login);
    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    expect((out.headers['set-cookie'] as unknown as string[])[0]).toMatch(/session=;/);
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);
  });

  it('logout sin cookie o con cookie basura da 204', async () => {
    await request(app).post('/api/auth/logout').expect(204);
    await request(app).post('/api/auth/logout').set('Cookie', 'session=basura').expect(204);
  });

  it('solo Bearer, cookie manipulada y alg none dan 401', async () => {
    const login = await registerAndLogin(app);
    const token = sessionCookie(login).slice('session='.length);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    await request(app).get('/api/auth/me').set('Cookie', `session=${tampered}`).expect(401);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(decoded)}.`;
    await request(app).get('/api/auth/me').set('Cookie', `session=${none}`).expect(401);
    const other = jwt.sign({ jti: 'x' }, 'otro-secreto-distinto-0123456789abcdef', { subject: String(decoded.sub) });
    await request(app).get('/api/auth/me').set('Cookie', `session=${other}`).expect(401);
    const hs512 = jwt.sign({ jti: 'x' }, TEST_JWT_SECRET, { subject: String(decoded.sub), algorithm: 'HS512', expiresIn: 60 });
    await request(app).get('/api/auth/me').set('Cookie', `session=${hs512}`).expect(401);
  });

  it('ruta desconocida bajo /api da 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('revocación fail-closed', () => {
  it('logout y me dan 503 (nunca 200) si el repositorio de revocación falla', async () => {
    // Login con repositorio sano; luego otra app con repositorio roto comparte BD y secreto.
    const healthy = buildTestApp(pool).app;
    const login = await registerAndLogin(healthy);
    const cookie = sessionCookie(login);
    const broken: TokenRevocationRepository = {
      isRevoked: async () => { throw new DependencyUnavailableError(); },
      revoke: async () => { throw new DependencyUnavailableError(); },
      purgeExpired: async () => 0,
    };
    const { app } = buildTestApp(pool, { revocations: broken });
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(503);
    expect(me.body.error.code).toBe('SERVICE_UNAVAILABLE');
    const brokenRevoke: TokenRevocationRepository = { ...broken, isRevoked: async () => false };
    const out = await request(buildTestApp(pool, { revocations: brokenRevoke }).app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(503);
    expect(out.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect((out.headers['set-cookie'] as unknown as string[])[0]).toMatch(/^session=;/);
  });
});

describe('cookie Secure y cabeceras de caché', () => {
  it('con COOKIE_SECURE=true el login y el logout llevan Secure', async () => {
    const { app } = buildTestApp(pool, { cookieSecure: true });
    const login = await registerAndLogin(app);
    expect((login.headers['set-cookie'] as unknown as string[])[0]).toMatch(/;\s*Secure/i);
    const out = await request(app).post('/api/auth/logout').set('Cookie', sessionCookie(login));
    expect((out.headers['set-cookie'] as unknown as string[])[0]).toMatch(/;\s*Secure/i);
  });

  it('las respuestas de /api llevan Cache-Control: no-store (también 401 y 404)', async () => {
    const { app } = buildTestApp(pool);
    for (const [path, status] of [['/api/auth/me', 401], ['/api/no-existe', 404]] as const) {
      const res = await request(app).get(path);
      expect(res.status).toBe(status);
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });
});

describe('validación de esquemas de auth', () => {
  const { app } = buildTestApp(pool);
  it.each([
    ['email inválido', { ...validUser, email: 'no-es-correo' }, 'email'],
    ['fullName de 2 caracteres', { ...validUser, fullName: 'Al' }, 'fullName'],
    ['fullName de 121 caracteres', { ...validUser, fullName: 'a'.repeat(121) }, 'fullName'],
  ])('registro 400: %s', async (_n, body, field) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it.each([
    ['contraseña vacía', { email: 'a@example.test', password: '' }],
    ['contraseña de 1025 caracteres', { email: 'a@example.test', password: 'a'.repeat(1025) }],
    ['correo de más de 254 caracteres', { email: `${'a'.repeat(250)}@example.test`, password: 'x' }],
    ['tipos no string', { email: 1, password: 2 }],
  ])('login 400: %s', async (_n, body) => {
    const res = await request(app).post('/api/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

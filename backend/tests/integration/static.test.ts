import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPool } from '../support/db.js';
import { buildTestApp } from '../support/httpApp.js';

const pool = createTestPool();
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'accidentes-static-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body><div id="root">SPA</div></body></html>');
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log("app");');
});
afterAll(async () => {
  rmSync(dir, { recursive: true, force: true });
  await pool.end();
});

describe('servido de frontend/dist en el mismo origen (AD-10)', () => {
  it('GET / entrega index.html', async () => {
    const { app } = buildTestApp(pool, { staticDir: dir });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="root"');
  });

  it('una ruta SPA (/accidentes/123) entrega index.html', async () => {
    const { app } = buildTestApp(pool, { staticDir: dir });
    const res = await request(app).get('/accidentes/123');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('id="root"');
  });

  it('un activo estático se entrega tal cual', async () => {
    const { app } = buildTestApp(pool, { staticDir: dir });
    const res = await request(app).get('/assets/app.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.text).toBe('console.log("app");');
  });

  it('/api desconocida da 404 JSON NOT_FOUND', async () => {
    const { app } = buildTestApp(pool, { staticDir: dir });
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('un método no GET fuera de /api da 404 JSON NOT_FOUND', async () => {
    const { app } = buildTestApp(pool, { staticDir: dir });
    const res = await request(app).post('/algo').send({});
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sin staticDir, una ruta no-API también da 404 JSON', async () => {
    const { app } = buildTestApp(pool);
    const res = await request(app).get('/accidentes/123');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

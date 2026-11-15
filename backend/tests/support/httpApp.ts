import { Writable } from 'node:stream';
import type { Express } from 'express';
import type { TokenRevocationRepository } from '../../src/application/ports/TokenRevocationRepository.js';
import { loadEnv } from '../../src/infrastructure/config/env.js';
import { PinoLogger } from '../../src/infrastructure/logging/PinoLogger.js';
import type { Pool } from '../../src/infrastructure/persistence/pg/pool.js';
import { PgTokenRevocationRepository } from '../../src/infrastructure/persistence/pg/PgTokenRevocationRepository.js';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/BcryptPasswordHasher.js';
import { createHttpApp } from '../../src/interfaces/http/app.js';
import { createContainer } from '../../src/main/container.js';
import { testDatabaseUrl } from './db.js';

export const TEST_JWT_SECRET = 'secreto-de-prueba-solo-para-tests-0123456789';
export const TEST_ORIGIN = 'http://localhost:5173';

export function buildTestApp(
  pool: Pool,
  opts: { rateLimit?: { windowMs: number; max: number }; revocations?: TokenRevocationRepository; cookieSecure?: boolean } = {},
): { app: Express; logs: () => string } {
  const chunks: string[] = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });
  const env = loadEnv({
    DATABASE_URL: testDatabaseUrl(),
    JWT_SECRET: TEST_JWT_SECRET,
    FRONTEND_ORIGIN: TEST_ORIGIN,
    REVIEWER_EMAIL: 'revisor@example.test',
    REVIEWER_PASSWORD: 'clave-ficticia-de-prueba',
    REVIEWER_FULL_NAME: 'Revisor Demo',
    NODE_ENV: 'test',
    COOKIE_SECURE: opts.cookieSecure ? 'true' : 'false',
  });
  const { deps } = createContainer(env, {
    pool,
    hasher: new BcryptPasswordHasher(4),
    logger: new PinoLogger('info', sink),
    rateLimit: opts.rateLimit ?? { windowMs: 60_000, max: 10_000 },
    revocations: opts.revocations ?? new PgTokenRevocationRepository(pool),
  });
  return { app: createHttpApp(deps), logs: () => chunks.join('') };
}

export const validUser = { email: 'ana@example.test', password: 'clave-segura-1', fullName: 'Ana Perez' };

export function sessionCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'] as string[] | undefined;
  const c = raw?.find((x) => x.startsWith('session='));
  if (!c) throw new Error('sin cookie session');
  return c.split(';')[0]!;
}

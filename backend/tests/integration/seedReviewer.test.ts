import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { EnsureReviewer } from '../../src/application/use-cases/auth/EnsureReviewer.js';
import { PgUserRepository } from '../../src/infrastructure/persistence/pg/PgUserRepository.js';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/BcryptPasswordHasher.js';
import { CryptoIdGenerator } from '../../src/infrastructure/system/CryptoIdGenerator.js';
import { SystemClock } from '../../src/infrastructure/system/SystemClock.js';
import { createTestPool, truncate } from '../support/db.js';

const pool = createTestPool();
beforeEach(() => truncate(pool));
afterAll(() => pool.end());

const make = () =>
  new EnsureReviewer(new PgUserRepository(pool), new BcryptPasswordHasher(), new SystemClock(), new CryptoIdGenerator(), [
    'cambia-esta-clave-revisor',
  ]);

describe('semilla del Revisor', () => {
  it('dos corridas dejan una fila REVIEWER con hash bcrypt costo 12', async () => {
    const input = { email: 'Revisor@Example.test', password: 'una-clave-valida-1', fullName: 'Revisor Demo' };
    await make().execute(input);
    await make().execute(input);
    const r = await pool.query<{ email: string; role: string; h: string }>(
      'SELECT email, role, left(password_hash, 7) AS h FROM users',
    );
    expect(r.rows).toEqual([{ email: 'revisor@example.test', role: 'REVIEWER', h: '$2b$12$' }]);
  });

  it('con placeholder no escribe nada', async () => {
    await expect(
      make().execute({ email: 'r@example.test', password: 'cambia-esta-clave-revisor', fullName: 'Revisor Demo' }),
    ).rejects.toThrow();
    expect((await pool.query('SELECT 1 FROM users')).rowCount).toBe(0);
  });
});

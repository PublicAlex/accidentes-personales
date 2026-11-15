import { describe, expect, it } from 'vitest';
import { DependencyUnavailableError } from '../../src/application/errors.js';
import { createPool } from '../../src/infrastructure/persistence/pg/pool.js';
import { PgAccidentRepository } from '../../src/infrastructure/persistence/pg/PgAccidentRepository.js';
import { PgTokenRevocationRepository } from '../../src/infrastructure/persistence/pg/PgTokenRevocationRepository.js';
import { PgUserRepository } from '../../src/infrastructure/persistence/pg/PgUserRepository.js';

describe('BD caida', () => {
  it('los repos lanzan DependencyUnavailableError', async () => {
    const pool = createPool('postgres://x:y@127.0.0.1:1/nada');
    try {
      await expect(new PgUserRepository(pool).findById(crypto.randomUUID())).rejects.toBeInstanceOf(
        DependencyUnavailableError,
      );
      await expect(new PgAccidentRepository(pool).findStatusById(crypto.randomUUID())).rejects.toBeInstanceOf(
        DependencyUnavailableError,
      );
      await expect(new PgTokenRevocationRepository(pool).isRevoked(crypto.randomUUID())).rejects.toBeInstanceOf(
        DependencyUnavailableError,
      );
    } finally {
      await pool.end();
    }
  });
});

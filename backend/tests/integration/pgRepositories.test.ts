import { afterAll, beforeEach } from 'vitest';
import { PgAccidentRepository } from '../../src/infrastructure/persistence/pg/PgAccidentRepository.js';
import { PgTokenRevocationRepository } from '../../src/infrastructure/persistence/pg/PgTokenRevocationRepository.js';
import { PgUserRepository } from '../../src/infrastructure/persistence/pg/PgUserRepository.js';
import { accidentRepositoryContract } from '../contract/accidentRepository.contract.js';
import { tokenRevocationRepositoryContract } from '../contract/tokenRevocationRepository.contract.js';
import { userRepositoryContract } from '../contract/userRepository.contract.js';
import { createTestPool, truncate } from '../support/db.js';

const pool = createTestPool();
beforeEach(() => truncate(pool));
afterAll(() => pool.end());

userRepositoryContract('Pg', async () => new PgUserRepository(pool));
accidentRepositoryContract('Pg', async () => ({
  accidents: new PgAccidentRepository(pool),
  users: new PgUserRepository(pool),
}));
tokenRevocationRepositoryContract('Pg', async () => ({
  tokens: new PgTokenRevocationRepository(pool),
  users: new PgUserRepository(pool),
}));

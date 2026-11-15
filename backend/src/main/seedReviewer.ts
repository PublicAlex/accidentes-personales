import { EnsureReviewer } from '../application/use-cases/auth/EnsureReviewer.js';
import { loadEnv } from '../infrastructure/config/env.js';
import { createPool } from '../infrastructure/persistence/pg/pool.js';
import { PgUserRepository } from '../infrastructure/persistence/pg/PgUserRepository.js';
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher.js';
import { CryptoIdGenerator } from '../infrastructure/system/CryptoIdGenerator.js';
import { SystemClock } from '../infrastructure/system/SystemClock.js';

// Valor de .env.example que nunca debe llegar a una BD real.
const PLACEHOLDER_PASSWORD = 'cambia-esta-clave-revisor';

async function main(): Promise<void> {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  try {
    const useCase = new EnsureReviewer(
      new PgUserRepository(pool),
      new BcryptPasswordHasher(),
      new SystemClock(env.APP_TIMEZONE),
      new CryptoIdGenerator(),
      [PLACEHOLDER_PASSWORD],
    );
    const user = await useCase.execute({
      email: env.REVIEWER_EMAIL,
      password: env.REVIEWER_PASSWORD,
      fullName: env.REVIEWER_FULL_NAME,
    });
    console.log(`Revisor listo: ${user.email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(`No se pudo sembrar el Revisor: ${error instanceof Error ? error.message : 'error desconocido'}`);
  process.exit(1);
});

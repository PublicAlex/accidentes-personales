import type { AccidentRepository } from '../application/ports/AccidentRepository.js';
import type { Logger } from '../application/ports/Logger.js';
import type { PasswordHasher } from '../application/ports/PasswordHasher.js';
import type { TokenRevocationRepository } from '../application/ports/TokenRevocationRepository.js';
import type { UserRepository } from '../application/ports/UserRepository.js';
import { CreateAccident } from '../application/use-cases/accidents/CreateAccident.js';
import { GetMyAccident } from '../application/use-cases/accidents/GetMyAccident.js';
import { ListMyAccidents } from '../application/use-cases/accidents/ListMyAccidents.js';
import { AuthenticateRequest } from '../application/use-cases/auth/AuthenticateRequest.js';
import { GetCurrentUser } from '../application/use-cases/auth/GetCurrentUser.js';
import { LoginUser } from '../application/use-cases/auth/LoginUser.js';
import { LogoutUser } from '../application/use-cases/auth/LogoutUser.js';
import { RegisterUser } from '../application/use-cases/auth/RegisterUser.js';
import type { Env } from '../infrastructure/config/env.js';
import { PinoLogger } from '../infrastructure/logging/PinoLogger.js';
import { createPool, type Pool } from '../infrastructure/persistence/pg/pool.js';
import { PgAccidentRepository } from '../infrastructure/persistence/pg/PgAccidentRepository.js';
import { PgTokenRevocationRepository } from '../infrastructure/persistence/pg/PgTokenRevocationRepository.js';
import { PgUserRepository } from '../infrastructure/persistence/pg/PgUserRepository.js';
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher.js';
import { JwtTokenService } from '../infrastructure/security/JwtTokenService.js';
import { CryptoIdGenerator } from '../infrastructure/system/CryptoIdGenerator.js';
import { SystemClock } from '../infrastructure/system/SystemClock.js';
import type { HttpAppDeps } from '../interfaces/http/app.js';

export const DEFAULT_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };

export interface ContainerOverrides {
  pool?: Pool;
  users?: UserRepository;
  accidents?: AccidentRepository;
  revocations?: TokenRevocationRepository;
  hasher?: PasswordHasher;
  logger?: Logger;
  rateLimit?: { windowMs: number; max: number };
  staticDir?: string;
}

export interface Container {
  deps: HttpAppDeps;
  pool: Pool;
  purgeRevocations(): Promise<number>;
}

export function createContainer(env: Env, overrides: ContainerOverrides = {}): Container {
  const pool = overrides.pool ?? createPool(env.DATABASE_URL);
  const clock = new SystemClock(env.APP_TIMEZONE);
  const ids = new CryptoIdGenerator();
  const hasher = overrides.hasher ?? new BcryptPasswordHasher();
  const users = overrides.users ?? new PgUserRepository(pool);
  const accidents = overrides.accidents ?? new PgAccidentRepository(pool);
  const revocations = overrides.revocations ?? new PgTokenRevocationRepository(pool);
  const tokens = new JwtTokenService(env.JWT_SECRET, clock);
  const logger = overrides.logger ?? new PinoLogger(env.LOG_LEVEL);

  const deps: HttpAppDeps = {
    useCases: {
      registerUser: new RegisterUser(users, hasher, clock, ids),
      loginUser: new LoginUser(users, hasher, tokens, ids),
      logoutUser: new LogoutUser(tokens, revocations, clock),
      getCurrentUser: new GetCurrentUser(users),
      createAccident: new CreateAccident(accidents, clock, ids),
      listMyAccidents: new ListMyAccidents(accidents),
      getMyAccident: new GetMyAccident(accidents),
      authenticateRequest: new AuthenticateRequest(tokens, revocations, users),
    },
    logger,
    config: {
      cookieSecure: env.COOKIE_SECURE,
      frontendOrigin: env.FRONTEND_ORIGIN,
      ...(overrides.staticDir !== undefined ? { staticDir: overrides.staticDir } : {}),
      rateLimit: overrides.rateLimit ?? DEFAULT_RATE_LIMIT,
    },
  };
  return { deps, pool, purgeRevocations: () => revocations.purgeExpired(clock.now()) };
}

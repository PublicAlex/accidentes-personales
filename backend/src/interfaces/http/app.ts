import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { NotFoundError } from '../../application/errors.js';
import type { Logger } from '../../application/ports/Logger.js';
import type { AuthenticateRequest } from '../../application/use-cases/auth/AuthenticateRequest.js';
import type { AuthUseCases } from './controllers/authController.js';
import { createErrorMapper } from './errors/errorMapper.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { createAuthRouter } from './routes/authRoutes.js';

export interface HttpAppDeps {
  useCases: AuthUseCases & { authenticateRequest: Pick<AuthenticateRequest, 'execute'> };
  logger: Logger;
  config: {
    cookieSecure: boolean;
    frontendOrigin: string;
    staticDir?: string;
    rateLimit: { windowMs: number; max: number };
  };
}

export function createHttpApp(deps: HttpAppDeps): Express {
  const { useCases, logger, config } = deps;
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: [config.frontendOrigin], credentials: true }));
  app.use(cookieParser());

  const authenticate = createAuthenticate(useCases.authenticateRequest);
  const rateLimit = createRateLimit(config.rateLimit);

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/auth', createAuthRouter({ useCases, cookieSecure: config.cookieSecure, authenticate, rateLimit }));
  app.use('/api', (_req, _res, next) => next(new NotFoundError()));

  if (config.staticDir && existsSync(config.staticDir)) {
    const staticDir = config.staticDir;
    app.use(express.static(staticDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  app.use(createErrorMapper(logger));
  return app;
}

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthenticatedError } from '../../../application/errors.js';
import type { AuthContext, AuthenticateRequest } from '../../../application/use-cases/auth/AuthenticateRequest.js';

export const SESSION_COOKIE = 'session';

export function getAuth(res: Response): AuthContext {
  const auth = res.locals.auth as AuthContext | undefined;
  if (!auth) throw new UnauthenticatedError();
  return auth;
}

/** Lee solo la cookie `session`; el encabezado Authorization se ignora. */
export function createAuthenticate(useCase: Pick<AuthenticateRequest, 'execute'>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length === 0) {
      next(new UnauthenticatedError());
      return;
    }
    try {
      res.locals.auth = await useCase.execute({ token });
      next();
    } catch (err) {
      next(err);
    }
  };
}

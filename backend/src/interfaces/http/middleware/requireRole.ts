import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError } from '../../../application/errors.js';
import type { Role } from '../../../domain/user/Role.js';
import { getAuth } from './authenticate.js';

export function requireRole(...roles: Role[]): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(getAuth(res).role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

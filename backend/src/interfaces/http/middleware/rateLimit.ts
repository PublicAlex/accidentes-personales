import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export function createRateLimit(opts: { windowMs: number; max: number }): RequestHandler {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      if (!res.getHeader('Retry-After')) res.setHeader('Retry-After', String(Math.ceil(opts.windowMs / 1000)));
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Demasiados intentos; intenta más tarde' } });
    },
  });
}

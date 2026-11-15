import pino from 'pino';
import type { Logger } from '../../application/ports/Logger.js';

// AD-13: rutas redactadas; nunca se loguea el body.
const FIELDS = ['password', 'passwordHash', 'password_hash', 'token', 'email', 'contactEmail', 'affectedName', 'documentNumber', 'phone', 'description'];
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  'err.detail',
  ...FIELDS,
  ...FIELDS.map((f) => `*.${f}`),
];

export class PinoLogger implements Logger {
  private readonly logger: pino.Logger;

  constructor(level: string = 'info', destination?: pino.DestinationStream) {
    const options: pino.LoggerOptions = { level, redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } };
    this.logger = destination ? pino(options, destination) : pino(options);
  }

  info(msg: string, ctx?: Record<string, unknown>): void {
    this.logger.info(ctx ?? {}, msg);
  }
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.logger.warn(ctx ?? {}, msg);
  }
  error(msg: string, ctx?: Record<string, unknown>): void {
    this.logger.error(ctx ?? {}, msg);
  }
}

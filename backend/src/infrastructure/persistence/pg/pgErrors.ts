import { ConflictError, DependencyUnavailableError } from '../../../application/errors.js';

interface PgLikeError {
  code?: unknown;
  constraint?: unknown;
  errors?: unknown;
  message?: unknown;
}

const NETWORK_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH']);

function isConnectionError(err: PgLikeError): boolean {
  const code = typeof err.code === 'string' ? err.code : '';
  if (NETWORK_CODES.has(code) || code === '53300' || code.startsWith('08') || code.startsWith('57P0')) return true;
  if (typeof err.message === 'string' && /timeout exceeded when trying to connect/i.test(err.message)) return true;
  // AggregateError (intentos IPv4 + IPv6) lleva los códigos en `errors`.
  if (Array.isArray(err.errors)) {
    return err.errors.some((e) => typeof e === 'object' && e !== null && isConnectionError(e as PgLikeError));
  }
  return false;
}

/** Traduce un error de pg a los errores de aplicación; lo desconocido se relanza tal cual. */
export function translatePgError(err: unknown, uniqueViolation?: string, constraint?: string): never {
  if (typeof err === 'object' && err !== null) {
    const e = err as PgLikeError;
    if (isConnectionError(e)) throw new DependencyUnavailableError();
    if (uniqueViolation !== undefined && e.code === '23505' && (constraint === undefined || e.constraint === constraint)) throw new ConflictError(uniqueViolation);
  }
  throw err;
}

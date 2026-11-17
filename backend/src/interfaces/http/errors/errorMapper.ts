import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  ConflictError,
  DependencyUnavailableError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from '../../../application/errors.js';
import type { Logger } from '../../../application/ports/Logger.js';
import { InvalidTransitionError, ValidationError } from '../../../domain/errors.js';

interface Detail {
  field: string;
  message: string;
}

function zodDetails(err: ZodError): Detail[] {
  const details: Detail[] = [];
  for (const issue of err.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) details.push({ field: [...issue.path, key].join('.'), message: 'Campo no permitido' });
    } else {
      details.push({ field: issue.path.join('.'), message: issue.message });
    }
  }
  return details;
}

const CONFLICT_STATUS_MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: 'Este email ya está registrado',
  CONCURRENT_UPDATE: 'El recurso cambió; vuelve a consultarlo',
};

/** Único traductor de errores a HTTP (AD-7). */
export function createErrorMapper(logger: Logger): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const send = (status: number, code: string, message: string, details?: Detail[]) => {
      res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
    };
    const type = (err as { type?: unknown } | null)?.type;

    if (err instanceof UnauthenticatedError) return send(401, 'UNAUTHENTICATED', err.message);
    if (err instanceof ForbiddenError) return send(403, 'FORBIDDEN', err.message);
    if (err instanceof ZodError) return send(400, 'VALIDATION_ERROR', 'Datos inválidos', zodDetails(err));
    if (err instanceof ValidationError) {
      return send(400, 'VALIDATION_ERROR', 'Datos inválidos', [{ field: err.field, message: err.message }]);
    }
    if (type === 'entity.parse.failed') return send(400, 'VALIDATION_ERROR', 'El cuerpo no es JSON válido');
    if (err instanceof NotFoundError) return send(404, 'NOT_FOUND', err.message);
    if (err instanceof InvalidTransitionError) return send(409, 'INVALID_TRANSITION', 'Transición de estado no permitida');
    if (err instanceof ConflictError) {
      return send(409, err.code, CONFLICT_STATUS_MESSAGES[err.code] ?? 'Conflicto con el estado actual');
    }
    const status = (err as { status?: unknown } | null)?.status;
    if (typeof type === 'string' && status === 415) return send(415, 'UNSUPPORTED_MEDIA_TYPE', 'Tipo de contenido no soportado');
    if (typeof type === 'string' && status === 400) return send(400, 'VALIDATION_ERROR', 'Solicitud inválida');
    if (type === 'entity.too.large') return send(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera el tamaño permitido');
    if (err instanceof DependencyUnavailableError) return send(503, 'SERVICE_UNAVAILABLE', 'Servicio no disponible');

    const e = err as { name?: unknown; code?: unknown; stack?: unknown } | null;
    logger.error('Error no controlado', {
      method: req.method,
      path: req.path,
      name: typeof e?.name === 'string' ? e.name : 'Error',
      code: typeof e?.code === 'string' ? e.code : undefined,
      stack: typeof e?.stack === 'string' ? e.stack : undefined,
    });
    return send(500, 'INTERNAL_ERROR', 'Error interno del servidor');
  };
}

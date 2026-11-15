// Errores de aplicación (contratos AD-4).

/** Conflicto de unicidad o de concurrencia; `code` lo traduce el adaptador HTTP. */
export class ConflictError extends Error {
  constructor(readonly code: string) {
    super(`Conflicto: ${code}`);
    this.name = 'ConflictError';
  }
}

/** Una dependencia externa (BD) no está disponible. */
export class DependencyUnavailableError extends Error {
  constructor(message = 'Dependencia no disponible') {
    super(message);
    this.name = 'DependencyUnavailableError';
  }
}

/** La contraseña del Revisor es la de ejemplo o es demasiado corta. */
export class WeakReviewerPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeakReviewerPasswordError';
  }
}

/** Sin sesión válida o credenciales incorrectas (401). */
export class UnauthenticatedError extends Error {
  constructor(message = 'No autenticado') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

/** Sesión válida pero sin el rol requerido (403). */
export class ForbiddenError extends Error {
  constructor(message = 'Acción no permitida') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Recurso inexistente o no visible para quien consulta (404). */
export class NotFoundError extends Error {
  constructor(message = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

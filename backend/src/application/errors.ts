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

// Errores de dominio. Cada uno lleva un `code` en mayúsculas que el adaptador HTTP traduce (AD-7).

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Una invariante de un campo no se cumple. */
export class ValidationError extends DomainError {
  constructor(
    readonly field: string,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Transición de estado no permitida por la máquina de estados. */
export class InvalidTransitionError extends DomainError {
  readonly code = 'INVALID_TRANSITION';

  constructor(
    readonly from: unknown,
    readonly to: unknown,
  ) {
    super(`Transición de estado no permitida: ${String(from)} -> ${String(to)}`);
  }
}

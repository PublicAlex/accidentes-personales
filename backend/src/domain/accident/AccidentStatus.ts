// Única fuente de verdad de la máquina de estados (AD-3).
// Agregar un estado = editar solo este archivo dentro del dominio.
import { InvalidTransitionError } from '../errors.js';

export const ACCIDENT_STATUSES = ['REGISTRADO', 'EN_REVISION', 'CERRADO'] as const;
export type AccidentStatus = (typeof ACCIDENT_STATUSES)[number];

export const TRANSITIONS: Record<AccidentStatus, readonly AccidentStatus[]> = {
  REGISTRADO: ['EN_REVISION'],
  EN_REVISION: ['CERRADO'],
  CERRADO: [],
};

export function isAccidentStatus(value: unknown): value is AccidentStatus {
  return typeof value === 'string' && (ACCIDENT_STATUSES as readonly string[]).includes(value);
}

/** Lanza `InvalidTransitionError` si `from -> to` no está permitida o algún estado es desconocido. */
export function assertTransition(from: unknown, to: unknown): asserts to is AccidentStatus {
  if (!isAccidentStatus(from) || !isAccidentStatus(to) || !TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

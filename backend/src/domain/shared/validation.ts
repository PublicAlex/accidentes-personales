// Ayudas de validación compartidas por las entidades. Longitudes en code points.
import { ValidationError } from '../errors.js';

export function requireString(field: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError(field, 'INVALID_VALUE', `El campo ${field} debe ser texto`);
  }
  return value;
}

export function requireLength(field: string, value: unknown, min: number, max: number): string {
  const s = requireString(field, value);
  const len = [...s].length;
  if (len < min || len > max) {
    throw new ValidationError(field, 'INVALID_LENGTH', `El campo ${field} debe tener entre ${min} y ${max} caracteres`);
  }
  return s;
}

/** Texto libre: longitud válida y no compuesto solo de espacios. */
export function requireText(field: string, value: unknown, min: number, max: number): string {
  const s = requireLength(field, value, min, max);
  if (s.trim().length === 0) {
    throw new ValidationError(field, 'INVALID_VALUE', `El campo ${field} no puede estar en blanco`);
  }
  return s;
}

export function requireMatch(field: string, value: unknown, re: RegExp, message: string): string {
  const s = requireString(field, value);
  if (!re.test(s)) throw new ValidationError(field, 'INVALID_FORMAT', message);
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(field: string, value: unknown): string {
  const s = requireLength(field, value, 3, 254);
  if (!EMAIL_RE.test(s)) {
    throw new ValidationError(field, 'INVALID_FORMAT', `El campo ${field} no tiene un formato de correo válido`);
  }
  return s;
}

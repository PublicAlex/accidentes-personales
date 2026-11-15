// Catálogo cerrado de tipos de accidente (DEC-014).
export const ACCIDENT_TYPES = ['TRANSITO', 'LABORAL', 'DOMESTICO', 'DEPORTIVO', 'OTRO'] as const;
export type AccidentType = (typeof ACCIDENT_TYPES)[number];

export function isAccidentType(value: unknown): value is AccidentType {
  return typeof value === 'string' && (ACCIDENT_TYPES as readonly string[]).includes(value);
}

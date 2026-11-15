// Catálogo cerrado de tipos de documento (DEC-007).
export const DOCUMENT_TYPES = ['CC', 'CE', 'TI', 'PASAPORTE'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

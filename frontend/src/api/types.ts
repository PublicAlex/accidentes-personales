export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'REVIEWER';
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export const ACCIDENT_STATUSES = ['REGISTRADO', 'EN_REVISION', 'CERRADO'] as const;
export type AccidentStatus = (typeof ACCIDENT_STATUSES)[number];

export const ACCIDENT_TYPES = ['TRANSITO', 'LABORAL', 'DOMESTICO', 'DEPORTIVO', 'OTRO'] as const;
export type AccidentType = (typeof ACCIDENT_TYPES)[number];

export const DOCUMENT_TYPES = ['CC', 'CE', 'TI', 'PASAPORTE'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface AccidentSummary {
  id: string;
  accidentType: AccidentType;
  occurredOn: string;
  status: AccidentStatus;
}

export interface CreateAccidentInput {
  affectedName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  contactEmail: string;
  accidentType: AccidentType;
  occurredOn: string;
  place: string;
  description: string;
}

export interface Accident extends CreateAccidentInput {
  id: string;
  status: AccidentStatus;
  createdAt: string;
  updatedAt: string;
}

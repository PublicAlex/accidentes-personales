import { request } from './client';
import type { Accident, AccidentSummary, CreateAccidentInput } from './types';

export function createAccident(input: CreateAccidentInput): Promise<Accident> {
  // Solo los 9 campos del contrato; nunca status, ownerId ni userId.
  const body: CreateAccidentInput = {
    affectedName: input.affectedName,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    phone: input.phone,
    contactEmail: input.contactEmail,
    accidentType: input.accidentType,
    occurredOn: input.occurredOn,
    place: input.place,
    description: input.description,
  };
  return request<Accident>('POST', '/accidents', body);
}

export function listAccidents(): Promise<AccidentSummary[]> {
  return request<AccidentSummary[]>('GET', '/accidents');
}

export function getAccident(id: string): Promise<Accident> {
  return request<Accident>('GET', `/accidents/${encodeURIComponent(id)}`);
}

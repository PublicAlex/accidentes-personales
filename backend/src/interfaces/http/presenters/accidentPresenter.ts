import type { AccidentSummary } from '../../../application/ports/AccidentRepository.js';
import type { Accident } from '../../../domain/accident/Accident.js';

export interface AccidentDto {
  id: string;
  affectedName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  contactEmail: string;
  accidentType: string;
  occurredOn: string;
  place: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccidentSummaryDto {
  id: string;
  accidentType: string;
  occurredOn: string;
  status: string;
}

/** Lista blanca explícita: sin ownerId ni datos de cambio de estado. */
export function accidentPresenter(a: Accident): AccidentDto {
  return {
    id: a.id,
    affectedName: a.affectedName,
    documentType: a.documentType,
    documentNumber: a.documentNumber,
    phone: a.phone,
    contactEmail: a.contactEmail,
    accidentType: a.accidentType,
    occurredOn: a.occurredOn,
    place: a.place,
    description: a.description,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function accidentSummaryPresenter(s: AccidentSummary): AccidentSummaryDto {
  return { id: s.id, accidentType: s.accidentType, occurredOn: s.occurredOn, status: s.status };
}

export interface StatusChangeDto {
  id: string;
  status: string;
  updatedAt: string;
}

export function statusChangePresenter(r: { id: string; status: string; updatedAt: Date }): StatusChangeDto {
  return { id: r.id, status: r.status, updatedAt: r.updatedAt.toISOString() };
}

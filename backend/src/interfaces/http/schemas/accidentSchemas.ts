import { z } from 'zod';
import { ACCIDENT_STATUSES } from '../../../domain/accident/AccidentStatus.js';
import { ACCIDENT_TYPES } from '../../../domain/accident/AccidentType.js';
import { DOCUMENT_TYPES } from '../../../domain/accident/DocumentType.js';

const required = (name: string) => ({ error: `El campo ${name} es obligatorio y debe ser texto` });
const points = (s: string) => [...s].length;

const text = (name: string, min: number, max: number) =>
  z
    .string(required(name))
    .trim()
    .refine((s) => points(s) >= min && points(s) <= max, `El campo ${name} debe tener entre ${min} y ${max} caracteres`);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createAccidentSchema = z.strictObject({
  affectedName: text('affectedName', 3, 120),
  documentType: z.enum(DOCUMENT_TYPES, { error: 'Tipo de documento fuera de catálogo' }),
  documentNumber: z
    .string(required('documentNumber'))
    .trim()
    .regex(/^[A-Za-z0-9]{5,20}$/, 'El número de documento debe ser alfanumérico de 5 a 20 caracteres'),
  phone: z
    .string(required('phone'))
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'El teléfono debe tener de 7 a 15 dígitos, con + opcional'),
  contactEmail: z
    .string(required('contactEmail'))
    .trim()
    .refine((s) => points(s) >= 3 && points(s) <= 254 && EMAIL_RE.test(s), 'El correo no tiene un formato válido'),
  accidentType: z.enum(ACCIDENT_TYPES, { error: 'Tipo de accidente fuera de catálogo' }),
  occurredOn: z
    .string(required('occurredOn'))
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  place: text('place', 3, 200),
  description: text('description', 20, 2000),
});

export type CreateAccidentBody = z.infer<typeof createAccidentSchema>;

export const changeStatusSchema = z.strictObject({
  status: z.enum(ACCIDENT_STATUSES, { error: 'Estado fuera de catálogo' }),
});

export type ChangeStatusBody = z.infer<typeof changeStatusSchema>;

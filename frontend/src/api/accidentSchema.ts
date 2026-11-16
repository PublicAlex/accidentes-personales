import { ACCIDENT_TYPES, DOCUMENT_TYPES, type AccidentType, type DocumentType } from './types';

export const accidentTypeLabels: Record<AccidentType, string> = {
  TRANSITO: 'Tránsito',
  LABORAL: 'Laboral',
  DOMESTICO: 'Doméstico',
  DEPORTIVO: 'Deportivo',
  OTRO: 'Otro',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  TI: 'Tarjeta de identidad',
  PASAPORTE: 'Pasaporte',
};

export type AccidentFormValues = Record<
  | 'affectedName'
  | 'documentType'
  | 'documentNumber'
  | 'phone'
  | 'contactEmail'
  | 'accidentType'
  | 'occurredOn'
  | 'place'
  | 'description',
  string
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const points = (s: string) => [...s].length;

/** Fecha de hoy (YYYY-MM-DD) en America/Bogota. */
export function todayInBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dias = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= dias[mo - 1];
}

function range(name: string, s: string, min: number, max: number): string | undefined {
  const n = points(s);
  return n < min || n > max ? `${name} debe tener entre ${min} y ${max} caracteres` : undefined;
}

export function validateAccident(
  input: AccidentFormValues,
  today: string = todayInBogota(),
): Record<string, string> {
  const e: Record<string, string> = {};
  const v = (k: keyof AccidentFormValues) => (input[k] ?? '').trim();

  const nombre = range('El nombre del afectado', v('affectedName'), 3, 120);
  if (nombre) e.affectedName = nombre;

  if (!(DOCUMENT_TYPES as readonly string[]).includes(v('documentType')))
    e.documentType = 'Selecciona un tipo de documento';
  if (!/^[A-Za-z0-9]{5,20}$/.test(v('documentNumber')))
    e.documentNumber = 'El número de documento debe ser alfanumérico de 5 a 20 caracteres';
  if (!/^\+?[0-9]{7,15}$/.test(v('phone')))
    e.phone = 'El teléfono debe tener de 7 a 15 dígitos, con + opcional';

  const mail = v('contactEmail');
  if (points(mail) < 3 || points(mail) > 254 || !EMAIL_RE.test(mail))
    e.contactEmail = 'El correo no tiene un formato válido';

  if (!(ACCIDENT_TYPES as readonly string[]).includes(v('accidentType')))
    e.accidentType = 'Selecciona un tipo de accidente';

  const fecha = v('occurredOn');
  if (!fecha) e.occurredOn = 'La fecha del accidente es obligatoria';
  else if (!isRealDate(fecha)) e.occurredOn = 'Ingresa una fecha válida (AAAA-MM-DD)';
  else if (fecha < '1900-01-01') e.occurredOn = 'La fecha no puede ser anterior a 1900-01-01';
  else if (fecha > today) e.occurredOn = 'La fecha no puede ser futura';

  const lugar = range('El lugar', v('place'), 3, 200);
  if (lugar) e.place = lugar;
  const desc = range('La descripción', v('description'), 20, 2000);
  if (desc) e.description = desc;
  return e;
}

/** dd/mm/aaaa por manipulación de string (sin zonas horarias). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

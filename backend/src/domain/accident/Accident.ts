// Entidad Accident. `id`, `now` y `today` llegan como argumentos: el dominio nunca los genera.
import { ValidationError } from '../errors.js';
import { isUuid } from '../shared/Id.js';
import { requireEmail, requireMatch, requireText } from '../shared/validation.js';
import { isAccidentStatus, type AccidentStatus } from './AccidentStatus.js';
import { isAccidentType, type AccidentType } from './AccidentType.js';
import { isDocumentType, type DocumentType } from './DocumentType.js';

export interface AccidentProps {
  readonly id: string;
  readonly affectedName: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly phone: string;
  readonly contactEmail: string;
  readonly accidentType: AccidentType;
  readonly occurredOn: string;
  readonly place: string;
  readonly description: string;
  readonly ownerId: string;
  readonly status: AccidentStatus;
  readonly statusChangedBy: string | null;
  readonly statusChangedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type AccidentInput = Pick<
  AccidentProps,
  | 'affectedName'
  | 'documentType'
  | 'documentNumber'
  | 'phone'
  | 'contactEmail'
  | 'accidentType'
  | 'occurredOn'
  | 'place'
  | 'description'
  | 'ownerId'
>;

export interface AccidentCreateContext {
  readonly id: string;
  readonly now: Date;
  /** Fecha de hoy 'YYYY-MM-DD' en la zona America/Bogota, calculada por quien llama. */
  readonly today: string;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_DATE = '1900-01-01';

function isRealDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return false;
  const daysInMonth = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= (daysInMonth[mo - 1] as number);
}

function validateOccurredOn(value: unknown, today: string): string {
  if (typeof value !== 'string' || !isRealDate(value)) {
    throw new ValidationError('occurredOn', 'INVALID_DATE', 'occurredOn debe ser una fecha válida YYYY-MM-DD');
  }
  // Formato YYYY-MM-DD: la comparación lexicográfica equivale a la cronológica.
  if (value > today) {
    throw new ValidationError('occurredOn', 'DATE_IN_FUTURE', 'La fecha del accidente no puede ser futura');
  }
  if (value < MIN_DATE) {
    throw new ValidationError('occurredOn', 'DATE_TOO_OLD', `La fecha del accidente no puede ser anterior a ${MIN_DATE}`);
  }
  return value;
}

function requireUuid(field: string, value: unknown): string {
  if (!isUuid(value)) {
    throw new ValidationError(field, 'INVALID_FORMAT', `El campo ${field} debe ser un UUID`);
  }
  return value;
}

export class Accident {
  private constructor(private readonly props: AccidentProps) {}

  /** Valida las reglas de negocio y crea un accidente nuevo en estado REGISTRADO. */
  static create(input: AccidentInput, ctx: AccidentCreateContext): Accident {
    if (typeof ctx.today !== 'string' || !isRealDate(ctx.today)) {
      throw new ValidationError('today', 'INVALID_FORMAT', 'today debe tener formato YYYY-MM-DD');
    }
    if (!(ctx.now instanceof Date) || Number.isNaN(ctx.now.getTime())) {
      throw new ValidationError('now', 'INVALID_VALUE', 'now debe ser una fecha válida');
    }
    const id = requireUuid('id', ctx.id);
    const ownerId = requireUuid('ownerId', input.ownerId);
    const affectedName = requireText('affectedName', input.affectedName, 3, 120);
    if (!isDocumentType(input.documentType)) {
      throw new ValidationError('documentType', 'INVALID_VALUE', 'Tipo de documento fuera de catálogo');
    }
    const documentNumber = requireMatch(
      'documentNumber',
      input.documentNumber,
      /^[A-Za-z0-9]{5,20}$/,
      'El número de documento debe ser alfanumérico de 5 a 20 caracteres',
    );
    const phone = requireMatch('phone', input.phone, /^\+?[0-9]{7,15}$/, 'El teléfono debe tener de 7 a 15 dígitos, con + opcional');
    const contactEmail = requireEmail('contactEmail', input.contactEmail);
    if (!isAccidentType(input.accidentType)) {
      throw new ValidationError('accidentType', 'INVALID_VALUE', 'Tipo de accidente fuera de catálogo');
    }
    const occurredOn = validateOccurredOn(input.occurredOn, ctx.today);
    const place = requireText('place', input.place, 3, 200);
    const description = requireText('description', input.description, 20, 2000);

    return new Accident({
      id,
      affectedName,
      documentType: input.documentType,
      documentNumber,
      phone,
      contactEmail,
      accidentType: input.accidentType,
      occurredOn,
      place,
      description,
      ownerId,
      status: 'REGISTRADO',
      statusChangedBy: null,
      statusChangedAt: null,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
  }

  /** Reconstruye desde persistencia sin revalidar reglas de negocio. */
  static rehydrate(props: AccidentProps): Accident {
    if (!isAccidentStatus(props.status)) {
      throw new ValidationError('status', 'INVALID_VALUE', 'Estado persistido desconocido');
    }
    if (!isDocumentType(props.documentType) || !isAccidentType(props.accidentType)) {
      throw new ValidationError('catalog', 'INVALID_VALUE', 'Catálogo persistido desconocido');
    }
    return new Accident({ ...props });
  }

  get id(): string { return this.props.id; }
  get affectedName(): string { return this.props.affectedName; }
  get documentType(): DocumentType { return this.props.documentType; }
  get documentNumber(): string { return this.props.documentNumber; }
  get phone(): string { return this.props.phone; }
  get contactEmail(): string { return this.props.contactEmail; }
  get accidentType(): AccidentType { return this.props.accidentType; }
  get occurredOn(): string { return this.props.occurredOn; }
  get place(): string { return this.props.place; }
  get description(): string { return this.props.description; }
  get ownerId(): string { return this.props.ownerId; }
  get status(): AccidentStatus { return this.props.status; }
  get statusChangedBy(): string | null { return this.props.statusChangedBy; }
  get statusChangedAt(): Date | null { return this.props.statusChangedAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}

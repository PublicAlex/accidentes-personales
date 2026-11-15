// Entidad User. `id` y `now` llegan como argumentos.
import { ValidationError } from '../errors.js';
import { isUuid } from '../shared/Id.js';
import { requireEmail, requireText } from '../shared/validation.js';
import { DEFAULT_ROLE, isRole, type Role } from './Role.js';

export interface UserProps {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly role: Role;
  readonly createdAt: Date;
}

export interface UserInput {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly role?: Role;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: UserInput, ctx: { readonly now: Date }): User {
    if (!(ctx.now instanceof Date) || Number.isNaN(ctx.now.getTime())) {
      throw new ValidationError('now', 'INVALID_VALUE', 'now debe ser una fecha válida');
    }
    if (!isUuid(input.id)) {
      throw new ValidationError('id', 'INVALID_FORMAT', 'El campo id debe ser un UUID');
    }
    const email = requireEmail('email', input.email);
    if (email !== email.toLowerCase()) {
      throw new ValidationError('email', 'INVALID_FORMAT', 'El correo debe estar en minúsculas');
    }
    const fullName = requireText('fullName', input.fullName, 3, 120);
    if (typeof input.passwordHash !== 'string' || input.passwordHash.length === 0) {
      throw new ValidationError('passwordHash', 'INVALID_VALUE', 'El hash de contraseña no puede estar vacío');
    }
    const role = input.role === undefined ? DEFAULT_ROLE : input.role;
    if (!isRole(role)) {
      throw new ValidationError('role', 'INVALID_VALUE', 'Rol fuera de catálogo');
    }
    return new User({ id: input.id, email, passwordHash: input.passwordHash, fullName, role, createdAt: ctx.now });
  }

  /** Reconstruye desde persistencia sin revalidar reglas de negocio. */
  static rehydrate(props: UserProps): User {
    if (!isRole(props.role)) {
      throw new ValidationError('role', 'INVALID_VALUE', 'Rol persistido desconocido');
    }
    return new User({ ...props });
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get fullName(): string { return this.props.fullName; }
  get role(): Role { return this.props.role; }
  get createdAt(): Date { return this.props.createdAt; }
}

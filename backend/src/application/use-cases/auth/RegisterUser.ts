import { User } from '../../../domain/user/User.js';
import type { Clock } from '../../ports/Clock.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { PasswordHasher } from '../../ports/PasswordHasher.js';
import type { UserRepository } from '../../ports/UserRepository.js';

export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  /** El rol siempre es USER; un email repetido propaga ConflictError('EMAIL_TAKEN'). */
  async execute(input: RegisterUserInput): Promise<User> {
    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create(
      {
        id: this.ids.uuid(),
        email: input.email.trim().toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        role: 'USER',
      },
      { now: this.clock.now() },
    );
    return this.users.create(user);
  }
}

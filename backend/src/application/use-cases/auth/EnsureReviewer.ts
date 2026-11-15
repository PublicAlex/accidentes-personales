import { User } from '../../../domain/user/User.js';
import { WeakReviewerPasswordError } from '../../errors.js';
import type { Clock } from '../../ports/Clock.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { PasswordHasher } from '../../ports/PasswordHasher.js';
import type { UserRepository } from '../../ports/UserRepository.js';

export interface EnsureReviewerInput {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

const MIN_PASSWORD_LENGTH = 8;

export class EnsureReviewer {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly forbiddenPasswords: readonly string[],
  ) {}

  async execute(input: EnsureReviewerInput): Promise<User> {
    if (this.forbiddenPasswords.includes(input.password)) {
      throw new WeakReviewerPasswordError('REVIEWER_PASSWORD usa el valor de ejemplo; define una contraseña propia.');
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new WeakReviewerPasswordError(`REVIEWER_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create(
      {
        id: this.ids.uuid(),
        email: input.email.trim().toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        role: 'REVIEWER',
      },
      { now: this.clock.now() },
    );
    return this.users.upsertReviewer(user);
  }
}

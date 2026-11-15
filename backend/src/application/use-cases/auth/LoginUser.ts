import type { User } from '../../../domain/user/User.js';
import { UnauthenticatedError } from '../../errors.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { PasswordHasher } from '../../ports/PasswordHasher.js';
import type { TokenService } from '../../ports/TokenService.js';
import type { UserRepository } from '../../ports/UserRepository.js';

export interface LoginUserInput {
  readonly email: string;
  readonly password: string;
}

export interface LoginUserResult {
  readonly user: User;
  readonly token: string;
  readonly expiresAt: Date;
}

export const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas';

export class LoginUser {
  /** Hash ficticio (mismo costo que los reales) para igualar el tiempo cuando el email no existe. */
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly ids: IdGenerator,
  ) {
    this.getDummyHash().catch(() => {});
  }

  /** Se precalcula al construir; si falla, se reintenta en la siguiente llamada. */
  private getDummyHash(): Promise<string> {
    if (!this.dummyHash) {
      const pending = this.hasher.hash(this.ids.uuid());
      this.dummyHash = pending;
      pending.catch(() => {
        if (this.dummyHash === pending) this.dummyHash = undefined;
      });
    }
    return this.dummyHash;
  }

  async execute(input: LoginUserInput): Promise<LoginUserResult> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    const hash = user ? user.passwordHash : await this.getDummyHash();
    const ok = await this.hasher.compare(input.password, hash);
    if (!user || !ok) throw new UnauthenticatedError(INVALID_CREDENTIALS_MESSAGE);
    const { token, expiresAt } = this.tokens.sign({ sub: user.id, jti: this.ids.uuid() });
    return { user, token, expiresAt };
  }
}

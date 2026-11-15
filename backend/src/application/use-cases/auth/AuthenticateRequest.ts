import type { Role } from '../../../domain/user/Role.js';
import { UnauthenticatedError } from '../../errors.js';
import type { TokenRevocationRepository } from '../../ports/TokenRevocationRepository.js';
import type { TokenService } from '../../ports/TokenService.js';
import type { UserRepository } from '../../ports/UserRepository.js';

export interface AuthContext {
  readonly userId: string;
  readonly role: Role;
  readonly jti: string;
  readonly exp: number;
}

export class AuthenticateRequest {
  constructor(
    private readonly tokens: TokenService,
    private readonly revocations: TokenRevocationRepository,
    private readonly users: UserRepository,
  ) {}

  /** Fail-closed: los errores de dependencia se propagan (503), nunca se autentica por omisión. */
  async execute(input: { readonly token: string }): Promise<AuthContext> {
    const claims = this.tokens.verify(input.token);
    if (!claims) throw new UnauthenticatedError();
    if (await this.revocations.isRevoked(claims.jti)) throw new UnauthenticatedError();
    const user = await this.users.findById(claims.sub);
    if (!user) throw new UnauthenticatedError();
    return { userId: user.id, role: user.role, jti: claims.jti, exp: claims.exp };
  }
}

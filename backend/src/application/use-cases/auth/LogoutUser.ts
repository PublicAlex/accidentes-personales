import type { Clock } from '../../ports/Clock.js';
import type { TokenRevocationRepository } from '../../ports/TokenRevocationRepository.js';
import type { TokenService } from '../../ports/TokenService.js';

export class LogoutUser {
  constructor(
    private readonly tokens: TokenService,
    private readonly revocations: TokenRevocationRepository,
    private readonly clock: Clock,
  ) {}

  /** Token ausente, inválido, expirado o ya revocado: no-op. Si revocar falla, el error se propaga. */
  async execute(input: { readonly token: string | undefined }): Promise<void> {
    if (!input.token) return;
    const claims = this.tokens.verify(input.token);
    if (!claims) return;
    if (await this.revocations.isRevoked(claims.jti)) return;
    // Se parte de una copia de la fecha del reloj (application/ no construye fechas).
    const expiresAt = structuredClone(this.clock.now());
    expiresAt.setTime(claims.exp * 1000);
    await this.revocations.revoke(claims.jti, claims.sub, expiresAt);
  }
}

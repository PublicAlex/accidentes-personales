import jwt from 'jsonwebtoken';
import type { Clock } from '../../application/ports/Clock.js';
import type { TokenService } from '../../application/ports/TokenService.js';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
    private readonly ttlSeconds: number = 3600,
  ) {}

  sign(claims: { sub: string; jti: string }): { token: string; expiresAt: Date } {
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    const exp = iat + this.ttlSeconds;
    const token = jwt.sign({ sub: claims.sub, jti: claims.jti, iat, exp }, this.secret, { algorithm: 'HS256' });
    return { token, expiresAt: new Date(exp * 1000) };
  }

  verify(token: string): { sub: string; jti: string; exp: number } | null {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        clockTimestamp: Math.floor(this.clock.now().getTime() / 1000),
      });
      if (typeof payload === 'string') return null;
      const { sub, jti, exp } = payload;
      if (typeof sub !== 'string' || typeof jti !== 'string' || typeof exp !== 'number') return null;
      return { sub, jti, exp };
    } catch {
      return null;
    }
  }
}

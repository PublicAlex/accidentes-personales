export interface TokenService {
  sign(claims: { sub: string; jti: string }): { token: string; expiresAt: Date };
  verify(token: string): { sub: string; jti: string; exp: number } | null;
}

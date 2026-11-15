export interface TokenRevocationRepository {
  isRevoked(jti: string): Promise<boolean>;
  /** Idempotente: repetir el mismo jti no falla. */
  revoke(jti: string, userId: string, expiresAt: Date): Promise<void>;
  /** Borra los expirados y devuelve cuántos. */
  purgeExpired(now: Date): Promise<number>;
}

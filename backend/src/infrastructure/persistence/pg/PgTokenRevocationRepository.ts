import type { TokenRevocationRepository } from '../../../application/ports/TokenRevocationRepository.js';
import { translatePgError } from './pgErrors.js';
import type { Pool } from './pool.js';

export class PgTokenRevocationRepository implements TokenRevocationRepository {
  constructor(private readonly pool: Pool) {}

  async isRevoked(jti: string): Promise<boolean> {
    try {
      const r = await this.pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [jti]);
      return r.rowCount !== null && r.rowCount > 0;
    } catch (err) {
      return translatePgError(err);
    }
  }

  async revoke(jti: string, userId: string, expiresAt: Date): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO revoked_tokens (jti, user_id, expires_at, revoked_at)
         VALUES ($1, $2, $3, now()) ON CONFLICT (jti) DO NOTHING`,
        [jti, userId, expiresAt],
      );
    } catch (err) {
      translatePgError(err);
    }
  }

  async purgeExpired(now: Date): Promise<number> {
    try {
      const r = await this.pool.query('DELETE FROM revoked_tokens WHERE expires_at <= $1', [now]);
      return r.rowCount ?? 0;
    } catch (err) {
      return translatePgError(err);
    }
  }
}

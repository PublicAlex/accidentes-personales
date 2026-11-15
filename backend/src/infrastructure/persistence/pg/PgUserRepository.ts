import type { UserRepository } from '../../../application/ports/UserRepository.js';
import { User } from '../../../domain/user/User.js';
import type { Role } from '../../../domain/user/Role.js';
import { translatePgError } from './pgErrors.js';
import type { Pool } from './pool.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  created_at: Date;
}

const COLUMNS = 'id, email, password_hash, full_name, role, created_at';

function toUser(row: UserRow): User {
  return User.rehydrate({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  });
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    try {
      const r = await this.pool.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return r.rows[0] ? toUser(r.rows[0]) : null;
    } catch (err) {
      return translatePgError(err);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const r = await this.pool.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`, [email]);
      return r.rows[0] ? toUser(r.rows[0]) : null;
    } catch (err) {
      return translatePgError(err);
    }
  }

  async create(user: User): Promise<User> {
    try {
      const r = await this.pool.query<UserRow>(
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
        [user.id, user.email, user.passwordHash, user.fullName, user.role, user.createdAt],
      );
      return toUser(r.rows[0] as UserRow);
    } catch (err) {
      return translatePgError(err, 'EMAIL_TAKEN', 'users_email_lower_uq');
    }
  }

  async upsertReviewer(user: User): Promise<User> {
    try {
      const r = await this.pool.query<UserRow>(
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at)
         VALUES ($1, $2, $3, $4, 'REVIEWER', $5)
         ON CONFLICT (lower(email)) DO UPDATE
           SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = 'REVIEWER'
         RETURNING ${COLUMNS}`,
        [user.id, user.email, user.passwordHash, user.fullName, user.createdAt],
      );
      return toUser(r.rows[0] as UserRow);
    } catch (err) {
      return translatePgError(err);
    }
  }
}

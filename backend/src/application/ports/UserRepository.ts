import type { User } from '../../domain/user/User.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** 23505 de email -> ConflictError('EMAIL_TAKEN'). */
  create(user: User): Promise<User>;
  /** Inserta o actualiza por email en minúsculas con rol REVIEWER. */
  upsertReviewer(user: User): Promise<User>;
}

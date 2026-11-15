import bcrypt from 'bcrypt';
import type { PasswordHasher } from '../../application/ports/PasswordHasher.js';

export const BCRYPT_COST = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number = BCRYPT_COST) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

import type { User } from '../../../domain/user/User.js';
import { UnauthenticatedError } from '../../errors.js';
import type { UserRepository } from '../../ports/UserRepository.js';

export class GetCurrentUser {
  constructor(private readonly users: UserRepository) {}

  async execute(input: { readonly userId: string }): Promise<User> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new UnauthenticatedError();
    return user;
  }
}

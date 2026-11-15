import type { User } from '../../../domain/user/User.js';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

/** Lista blanca: nunca expone el hash de contraseña. */
export function userPresenter(user: User): UserDto {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}

// Roles del sistema (DEC-006, DEC-010). El rol por defecto es USER.
export const ROLES = ['USER', 'REVIEWER'] as const;
export type Role = (typeof ROLES)[number];
export const DEFAULT_ROLE: Role = 'USER';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

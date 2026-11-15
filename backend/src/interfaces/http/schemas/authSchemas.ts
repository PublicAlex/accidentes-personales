import { z } from 'zod';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const required = (name: string) => ({ error: `El campo ${name} es obligatorio y debe ser texto` });
const points = (s: string) => [...s].length;

const email = z
  .string(required('email'))
  .trim()
  .toLowerCase()
  .refine((s) => points(s) >= 3 && points(s) <= 254 && EMAIL_RE.test(s), 'El correo no tiene un formato válido');

const newPassword = z
  .string(required('password'))
  .refine((s) => points(s) >= 8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'La contraseña no puede superar 72 bytes');

const fullName = z
  .string(required('fullName'))
  .trim()
  .refine((s) => points(s) >= 3 && points(s) <= 120, 'El nombre debe tener entre 3 y 120 caracteres');

export const registerSchema = z.strictObject({ email, password: newPassword, fullName });

// En login no se revelan reglas de contraseña: solo forma básica.
export const loginSchema = z.strictObject({
  email: z.string(required('email')).trim().toLowerCase().min(1, 'El correo es obligatorio').max(254, 'Correo demasiado largo'),
  password: z.string(required('password')).min(1, 'La contraseña es obligatoria').max(1024, 'Contraseña demasiado larga'),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;

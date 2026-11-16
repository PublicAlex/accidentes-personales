import type { Express } from 'express';
import request from 'supertest';
import type { Pool } from '../../src/infrastructure/persistence/pg/pool.js';
import { sessionCookie } from './httpApp.js';

export const validAccident = {
  affectedName: 'Juan Perez',
  documentType: 'CC',
  documentNumber: '12345678',
  phone: '+573001234567',
  contactEmail: 'juan@example.test',
  accidentType: 'TRANSITO',
  occurredOn: '2026-01-10',
  place: 'Bogota, Calle 80',
  description: 'Colision leve entre dos vehiculos en la via.',
};

export async function signUp(app: Express, pool: Pool, email: string, role: 'USER' | 'REVIEWER' = 'USER') {
  const password = 'clave-segura-1';
  const reg = await request(app).post('/api/auth/register').send({ email, password, fullName: 'Persona Prueba' }).expect(201);
  if (role === 'REVIEWER') await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, reg.body.id]);
  const login = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { id: reg.body.id as string, cookie: sessionCookie(login) };
}

export async function createAccident(app: Express, cookie: string, over: Record<string, unknown> = {}) {
  return request(app).post('/api/accidents').set('Cookie', cookie).send({ ...validAccident, ...over });
}

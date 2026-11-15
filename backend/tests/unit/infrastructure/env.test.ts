import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../src/infrastructure/config/env.js';

const valido = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  FRONTEND_ORIGIN: 'http://localhost:3000',
  REVIEWER_EMAIL: 'revisor@example.test',
  REVIEWER_PASSWORD: 'clave-ficticia-de-prueba',
  REVIEWER_FULL_NAME: 'Revisor Demo',
};

describe('loadEnv', () => {
  it('devuelve el objeto tipado con defaults', () => {
    const env = loadEnv(valido);
    expect(env.PORT).toBe(3000);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.APP_TIMEZONE).toBe('America/Bogota');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.DATABASE_URL).toBe(valido.DATABASE_URL);
  });

  it('convierte COOKIE_SECURE de texto a booleano', () => {
    expect(loadEnv({ ...valido, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(true);
  });

  it('rechaza si falta JWT_SECRET y lo nombra', () => {
    const { JWT_SECRET: _omitida, ...resto } = valido;
    expect(() => loadEnv(resto)).toThrow(/JWT_SECRET/);
  });

  it('rechaza si falta DATABASE_URL y lo nombra', () => {
    const { DATABASE_URL: _omitida, ...resto } = valido;
    expect(() => loadEnv(resto)).toThrow(/DATABASE_URL/);
  });

  it('rechaza un JWT_SECRET corto sin volcar su valor', () => {
    const corto = 'secreto-corto';
    let mensaje = '';
    try {
      loadEnv({ ...valido, JWT_SECRET: corto });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/JWT_SECRET/);
    expect(mensaje).not.toContain(corto);
  });

  it('trata una variable vacía como ausente y aplica el default', () => {
    expect(loadEnv({ ...valido, PORT: '' }).PORT).toBe(3000);
    expect(() => loadEnv({ ...valido, JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['COOKIE_SECURE', 'quizas'],
    ['LOG_LEVEL', 'ruidoso'],
    ['NODE_ENV', 'otro'],
  ])('rechaza %s=%s', (clave, valor) => {
    expect(() => loadEnv({ ...valido, [clave]: valor })).toThrow(new RegExp(clave));
  });

  it.each(['REVIEWER_EMAIL', 'REVIEWER_PASSWORD', 'REVIEWER_FULL_NAME', 'FRONTEND_ORIGIN'])(
    'rechaza si falta %s',
    (clave) => {
      const copia: Record<string, string> = { ...valido };
      delete copia[clave];
      expect(() => loadEnv(copia)).toThrow(new RegExp(clave));
    },
  );
});

import { describe, expect, it } from 'vitest';
import { WeakReviewerPasswordError } from '../../../src/application/errors.js';
import { EnsureReviewer } from '../../../src/application/use-cases/auth/EnsureReviewer.js';
import type { User } from '../../../src/domain/user/User.js';

function build() {
  const saved: User[] = [];
  const useCase = new EnsureReviewer(
    {
      findById: async () => null,
      findByEmail: async () => null,
      create: async (u) => u,
      upsertReviewer: async (u) => {
        saved.push(u);
        return u;
      },
    },
    { hash: async (p) => `hash:${p}`, compare: async () => true },
    { now: () => new Date('2026-11-15T12:00:00Z'), today: () => '2026-11-15' },
    { uuid: () => '11111111-1111-4111-8111-111111111111' },
    ['cambia-esta-clave-revisor'],
  );
  return { useCase, saved };
}

const base = { email: 'Rev@Example.test', fullName: 'Revisor Demo' };

describe('EnsureReviewer', () => {
  it('rechaza la contraseña de ejemplo', async () => {
    const { useCase, saved } = build();
    await expect(useCase.execute({ ...base, password: 'cambia-esta-clave-revisor' })).rejects.toBeInstanceOf(
      WeakReviewerPasswordError,
    );
    expect(saved).toHaveLength(0);
  });

  it('rechaza contraseñas de menos de 8 caracteres', async () => {
    const { useCase, saved } = build();
    await expect(useCase.execute({ ...base, password: 'corta' })).rejects.toBeInstanceOf(WeakReviewerPasswordError);
    expect(saved).toHaveLength(0);
  });

  it('crea un REVIEWER con email en minúsculas', async () => {
    const { useCase, saved } = build();
    await useCase.execute({ ...base, password: 'una-clave-valida' });
    expect(saved[0]?.role).toBe('REVIEWER');
    expect(saved[0]?.email).toBe('rev@example.test');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, DependencyUnavailableError, UnauthenticatedError } from '../../../src/application/errors.js';
import { AuthenticateRequest } from '../../../src/application/use-cases/auth/AuthenticateRequest.js';
import { GetCurrentUser } from '../../../src/application/use-cases/auth/GetCurrentUser.js';
import { LoginUser } from '../../../src/application/use-cases/auth/LoginUser.js';
import { LogoutUser } from '../../../src/application/use-cases/auth/LogoutUser.js';
import { RegisterUser } from '../../../src/application/use-cases/auth/RegisterUser.js';
import {
  FakeClock,
  FakeIdGenerator,
  FakePasswordHasher,
  FakeTokenService,
  InMemoryTokenRevocationRepository,
  InMemoryUserRepository,
} from '../../fakes/index.js';

let users: InMemoryUserRepository;
let revs: InMemoryTokenRevocationRepository;
let hasher: FakePasswordHasher;
let clock: FakeClock;
let ids: FakeIdGenerator;
let tokens: FakeTokenService;

beforeEach(() => {
  users = new InMemoryUserRepository();
  revs = new InMemoryTokenRevocationRepository();
  hasher = new FakePasswordHasher();
  clock = new FakeClock();
  ids = new FakeIdGenerator();
  tokens = new FakeTokenService(clock);
});

const reg = { email: '  Ana@Example.TEST ', password: 'clave-segura-1', fullName: 'Ana Perez' };

describe('RegisterUser', () => {
  it('normaliza el email, fuerza rol USER y guarda hash', async () => {
    const u = await new RegisterUser(users, hasher, clock, ids).execute(reg);
    expect(u.email).toBe('ana@example.test');
    expect(u.role).toBe('USER');
    expect(u.passwordHash).toBe('hash:clave-segura-1');
  });

  it('propaga EMAIL_TAKEN con mayúsculas distintas', async () => {
    const uc = new RegisterUser(users, hasher, clock, ids);
    await uc.execute(reg);
    await expect(uc.execute({ ...reg, email: 'ANA@example.test' })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('LoginUser', () => {
  async function seeded() {
    await new RegisterUser(users, hasher, clock, ids).execute(reg);
    return new LoginUser(users, hasher, tokens, ids);
  }

  it('devuelve token con expiración de 1 h', async () => {
    const login = await seeded();
    const r = await login.execute({ email: 'ANA@example.test', password: reg.password });
    expect(r.user.email).toBe('ana@example.test');
    expect(r.expiresAt.getTime() - clock.now().getTime()).toBe(3600_000);
    expect(tokens.verify(r.token)?.sub).toBe(r.user.id);
  });

  it('da el mismo error para email inexistente y clave incorrecta', async () => {
    const login = await seeded();
    const a = await login.execute({ email: 'nadie@example.test', password: 'x' }).catch((e: unknown) => e);
    const b = await login.execute({ email: 'ana@example.test', password: 'mala' }).catch((e: unknown) => e);
    expect(a).toBeInstanceOf(UnauthenticatedError);
    expect(b).toBeInstanceOf(UnauthenticatedError);
    expect((a as Error).message).toBe((b as Error).message);
  });

  it('compara contra un hash ficticio si el email no existe', async () => {
    const login = await seeded();
    hasher.compareCalls.length = 0;
    await login.execute({ email: 'nadie@example.test', password: 'x' }).catch(() => {});
    expect(hasher.compareCalls).toHaveLength(1);
    expect(hasher.compareCalls[0]).toMatch(/^hash:/);
  });
});

describe('AuthenticateRequest', () => {
  async function session() {
    const u = await new RegisterUser(users, hasher, clock, ids).execute(reg);
    const { token } = await new LoginUser(users, hasher, tokens, ids).execute({ email: reg.email, password: reg.password });
    return { u, token, auth: new AuthenticateRequest(tokens, revs, users) };
  }

  it('devuelve el contexto con rol fresco', async () => {
    const { u, token, auth } = await session();
    const r = await auth.execute({ token });
    expect(r.userId).toBe(u.id);
    expect(r.role).toBe('USER');
  });

  it('rechaza token inválido, revocado o de usuario inexistente', async () => {
    const { u, token, auth } = await session();
    await expect(auth.execute({ token: 'basura' })).rejects.toBeInstanceOf(UnauthenticatedError);
    const claims = tokens.verify(token)!;
    await revs.revoke(claims.jti, u.id, new Date(claims.exp * 1000));
    await expect(auth.execute({ token })).rejects.toBeInstanceOf(UnauthenticatedError);
    users.items.clear();
    const fresh = tokens.sign({ sub: u.id, jti: 'j2' }).token;
    await expect(auth.execute({ token: fresh })).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('propaga fallos de dependencia (fail-closed)', async () => {
    const { token } = await session();
    const broken = { ...revs, isRevoked: async () => { throw new DependencyUnavailableError(); } } as unknown as InMemoryTokenRevocationRepository;
    await expect(new AuthenticateRequest(tokens, broken, users).execute({ token })).rejects.toBeInstanceOf(
      DependencyUnavailableError,
    );
  });
});

describe('GetCurrentUser', () => {
  it('devuelve el usuario o 401 si no existe', async () => {
    const u = await new RegisterUser(users, hasher, clock, ids).execute(reg);
    const uc = new GetCurrentUser(users);
    expect((await uc.execute({ userId: u.id })).id).toBe(u.id);
    await expect(uc.execute({ userId: 'no-existe' })).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('LogoutUser', () => {
  it('revoca un token válido y es idempotente', async () => {
    const u = await new RegisterUser(users, hasher, clock, ids).execute(reg);
    const { token } = await new LoginUser(users, hasher, tokens, ids).execute({ email: reg.email, password: reg.password });
    const uc = new LogoutUser(tokens, revs, clock);
    await uc.execute({ token });
    const claims = tokens.verify(token)!;
    expect(revs.items.get(claims.jti)?.userId).toBe(u.id);
    expect(revs.items.get(claims.jti)?.expiresAt.getTime()).toBe(claims.exp * 1000);
    await uc.execute({ token });
    expect(revs.items.size).toBe(1);
  });

  it('es no-op sin token, con token inválido o expirado', async () => {
    const uc = new LogoutUser(tokens, revs, clock);
    await uc.execute({ token: undefined });
    await uc.execute({ token: 'basura' });
    const { token } = tokens.sign({ sub: 's', jti: 'j' });
    clock.advance(2 * 3600_000);
    await uc.execute({ token });
    expect(revs.items.size).toBe(0);
  });

  it('propaga el fallo de revocación', async () => {
    const { token } = tokens.sign({ sub: 's', jti: 'j' });
    const broken = {
      isRevoked: async () => false,
      revoke: async () => { throw new DependencyUnavailableError(); },
      purgeExpired: async () => 0,
    };
    await expect(new LogoutUser(tokens, broken, clock).execute({ token })).rejects.toBeInstanceOf(DependencyUnavailableError);
  });
});

describe('LoginUser con fallo del hash ficticio', () => {
  it('reintenta el hash ficticio y responde 401 genérico para email inexistente', async () => {
    let calls = 0;
    const flaky = {
      hash: async (p: string) => {
        calls++;
        if (calls === 1) throw new Error('fallo transitorio');
        return `h:${p}`;
      },
      compare: async () => false,
    };
    const uc = new LoginUser(users, flaky, tokens, ids);
    await expect(uc.execute({ email: 'nadie@example.test', password: 'x'.repeat(8) })).rejects.toMatchObject({ name: 'UnauthenticatedError' });
  });
});

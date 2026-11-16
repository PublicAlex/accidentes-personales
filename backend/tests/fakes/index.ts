// Fakes en memoria: solo para pruebas (AD-12).
import { Accident } from '../../src/domain/accident/Accident.js';
import type { AccidentRepository, AccidentSummary, UpdateStatusInput } from '../../src/application/ports/AccidentRepository.js';
import { ConflictError } from '../../src/application/errors.js';
import type { Clock } from '../../src/application/ports/Clock.js';
import type { IdGenerator } from '../../src/application/ports/IdGenerator.js';
import type { PasswordHasher } from '../../src/application/ports/PasswordHasher.js';
import type { TokenRevocationRepository } from '../../src/application/ports/TokenRevocationRepository.js';
import type { TokenService } from '../../src/application/ports/TokenService.js';
import type { UserRepository } from '../../src/application/ports/UserRepository.js';
import type { User } from '../../src/domain/user/User.js';

export class InMemoryUserRepository implements UserRepository {
  readonly items = new Map<string, User>();
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.items.values()].find((u) => u.email === email.toLowerCase()) ?? null;
  }
  async create(user: User) {
    if (await this.findByEmail(user.email)) throw new ConflictError('EMAIL_TAKEN');
    this.items.set(user.id, user);
    return user;
  }
  async upsertReviewer(user: User) {
    this.items.set(user.id, user);
    return user;
  }
}

export class InMemoryTokenRevocationRepository implements TokenRevocationRepository {
  readonly items = new Map<string, { userId: string; expiresAt: Date }>();
  async isRevoked(jti: string) {
    return this.items.has(jti);
  }
  async revoke(jti: string, userId: string, expiresAt: Date) {
    if (!this.items.has(jti)) this.items.set(jti, { userId, expiresAt });
  }
  async purgeExpired(now: Date) {
    let n = 0;
    for (const [k, v] of this.items) {
      if (v.expiresAt <= now) {
        this.items.delete(k);
        n++;
      }
    }
    return n;
  }
}

export class FakePasswordHasher implements PasswordHasher {
  hashCalls = 0;
  compareCalls: string[] = [];
  async hash(plain: string) {
    this.hashCalls++;
    return `hash:${plain}`;
  }
  async compare(plain: string, hash: string) {
    this.compareCalls.push(hash);
    return hash === `hash:${plain}`;
  }
}

export class FakeClock implements Clock {
  constructor(private current: Date = new Date('2026-11-15T12:00:00.000Z')) {}
  now() {
    return this.current;
  }
  today() {
    return this.current.toISOString().slice(0, 10);
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class FakeIdGenerator implements IdGenerator {
  private n = 0;
  uuid() {
    this.n++;
    return `00000000-0000-4000-8000-${String(this.n).padStart(12, '0')}`;
  }
}

/** Token "tok:<sub>:<jti>:<exp>"; verify devuelve null si el formato no coincide. */
export class FakeTokenService implements TokenService {
  constructor(private readonly clock: Clock) {}
  sign(claims: { sub: string; jti: string }) {
    const expiresAt = new Date(this.clock.now().getTime() + 3600_000);
    return { token: `tok:${claims.sub}:${claims.jti}:${Math.floor(expiresAt.getTime() / 1000)}`, expiresAt };
  }
  verify(token: string) {
    const [p, sub, jti, exp] = token.split(':');
    if (p !== 'tok' || !sub || !jti || !exp) return null;
    const e = Number(exp);
    if (e * 1000 <= this.clock.now().getTime()) return null;
    return { sub, jti, exp: e };
  }
}

export class InMemoryAccidentRepository implements AccidentRepository {
  readonly items = new Map<string, Accident>();
  async create(accident: Accident) {
    this.items.set(accident.id, accident);
    return accident;
  }
  async listByOwner(ownerId: string, limit: number): Promise<AccidentSummary[]> {
    return [...this.items.values()]
      .filter((a) => a.ownerId === ownerId)
      .sort(
        (x, y) =>
          y.occurredOn.localeCompare(x.occurredOn) ||
          y.createdAt.getTime() - x.createdAt.getTime() ||
          x.id.localeCompare(y.id),
      )
      .slice(0, limit)
      .map((a) => ({ id: a.id, accidentType: a.accidentType, occurredOn: a.occurredOn, status: a.status }));
  }
  async findByIdForOwner(id: string, ownerId: string) {
    const a = this.items.get(id);
    return a && a.ownerId === ownerId ? a : null;
  }
  async findStatusById(id: string) {
    const a = this.items.get(id);
    return a ? { id: a.id, status: a.status } : null;
  }
  async updateStatus(input: UpdateStatusInput) {
    const a = this.items.get(input.id);
    if (!a || a.status !== input.expected) throw new ConflictError('CONCURRENT_UPDATE');
    this.items.set(
      a.id,
      Accident.rehydrate({
        id: a.id,
        affectedName: a.affectedName,
        documentType: a.documentType,
        documentNumber: a.documentNumber,
        phone: a.phone,
        contactEmail: a.contactEmail,
        accidentType: a.accidentType,
        occurredOn: a.occurredOn,
        place: a.place,
        description: a.description,
        ownerId: a.ownerId,
        status: input.next,
        statusChangedBy: input.by,
        statusChangedAt: input.at,
        createdAt: a.createdAt,
        updatedAt: input.at,
      }),
    );
    return { id: a.id, status: input.next, updatedAt: input.at };
  }
}

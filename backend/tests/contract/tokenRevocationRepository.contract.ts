import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TokenRevocationRepository } from '../../src/application/ports/TokenRevocationRepository.js';
import type { UserRepository } from '../../src/application/ports/UserRepository.js';
import { buildUser, NOW } from '../support/builders.js';

export interface RevocationContractDeps {
  tokens: TokenRevocationRepository;
  users: UserRepository;
}

export function tokenRevocationRepositoryContract(name: string, setup: () => Promise<RevocationContractDeps>): void {
  describe(`TokenRevocationRepository contract: ${name}`, () => {
    let tokens: TokenRevocationRepository;
    let users: UserRepository;
    beforeEach(async () => {
      ({ tokens, users } = await setup());
    });

    it('revoke marca como revocado y es idempotente', async () => {
      const u = await users.create(buildUser());
      const jti = randomUUID();
      expect(await tokens.isRevoked(jti)).toBe(false);
      await tokens.revoke(jti, u.id, new Date(NOW.getTime() + 3_600_000));
      await tokens.revoke(jti, u.id, new Date(NOW.getTime() + 3_600_000));
      expect(await tokens.isRevoked(jti)).toBe(true);
    });

    it('purgeExpired borra solo los expirados y devuelve el conteo', async () => {
      const u = await users.create(buildUser());
      const expired1 = randomUUID();
      const expired2 = randomUUID();
      const live = randomUUID();
      await tokens.revoke(expired1, u.id, new Date(NOW.getTime() - 1000));
      await tokens.revoke(expired2, u.id, new Date(NOW.getTime() - 5000));
      await tokens.revoke(live, u.id, new Date(NOW.getTime() + 3_600_000));
      expect(await tokens.purgeExpired(NOW)).toBe(2);
      expect(await tokens.isRevoked(expired1)).toBe(false);
      expect(await tokens.isRevoked(live)).toBe(true);
    });
  });
}

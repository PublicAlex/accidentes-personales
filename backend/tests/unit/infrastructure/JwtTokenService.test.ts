import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { JwtTokenService } from '../../../src/infrastructure/security/JwtTokenService.js';
import { FakeClock } from '../../fakes/index.js';

const SECRET = 'secreto-de-prueba-solo-para-tests-0123456789';
const claims = { sub: '11111111-1111-4111-8111-111111111111', jti: '22222222-2222-4222-8222-222222222222' };

describe('JwtTokenService', () => {
  it('firma HS256 con solo sub/jti (+iat/exp) y exp - iat = 3600', () => {
    const clock = new FakeClock();
    const svc = new JwtTokenService(SECRET, clock);
    const { token, expiresAt } = svc.sign(claims);
    const decoded = jwt.decode(token, { complete: true })!;
    expect(decoded.header.alg).toBe('HS256');
    const p = decoded.payload as Record<string, number>;
    expect(Object.keys(p).sort()).toEqual(['exp', 'iat', 'jti', 'sub']);
    expect(p.exp! - p.iat!).toBe(3600);
    expect(expiresAt.getTime()).toBe(p.exp! * 1000);
    expect(svc.verify(token)).toMatchObject(claims);
  });

  it('un token expirado verifica como null', () => {
    const clock = new FakeClock();
    const svc = new JwtTokenService(SECRET, clock);
    const { token } = svc.sign(claims);
    clock.advance(3600_000 + 1000);
    expect(svc.verify(token)).toBeNull();
  });

  it('rechaza alg none, otro algoritmo y otro secreto', () => {
    const svc = new JwtTokenService(SECRET, new FakeClock());
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`;
    expect(svc.verify(none)).toBeNull();
    expect(svc.verify(jwt.sign(claims, SECRET, { algorithm: 'HS512', expiresIn: 60 }))).toBeNull();
    expect(svc.verify(jwt.sign(claims, 'otro-secreto-distinto-0123456789abcdef', { expiresIn: 60 }))).toBeNull();
  });
});

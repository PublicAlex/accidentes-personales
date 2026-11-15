import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { PinoLogger } from '../../../src/infrastructure/logging/PinoLogger.js';

describe('PinoLogger redact (AD-13)', () => {
  it('censura contraseñas, tokens, cookies y PII, anidados o no', () => {
    const chunks: string[] = [];
    const sink = new Writable({ write(c, _e, cb) { chunks.push(String(c)); cb(); } });
    new PinoLogger('info', sink).info('prueba', {
      password: 'pw-secreta',
      email: 'persona@example.test',
      req: { headers: { cookie: 'session=abc.def', authorization: 'Bearer xyz' } },
      nested: { token: 'tok-secreto', password_hash: '$2b$12$hash', phone: '+573001234567' },
      visible: 'ok',
    });
    const out = chunks.join('');
    for (const leak of ['pw-secreta', 'persona@example.test', 'session=abc', 'Bearer xyz', 'tok-secreto', '$2b$12$hash', '+573001234567']) {
      expect(out).not.toContain(leak);
    }
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('"visible":"ok"');
  });
});

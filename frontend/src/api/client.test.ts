import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setUnauthorizedHandler } from './client';

function respuesta(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

describe('request', () => {
  const handler = vi.fn();
  beforeEach(() => {
    handler.mockClear();
    setUnauthorizedHandler(handler);
  });
  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it('401 normal invoca el handler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } })));
    await expect(request('GET', '/accidents')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it.each(['/auth/login', '/auth/me'])('401 en %s no invoca el handler', async (path) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } })));
    await expect(request('POST', path, {})).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('normaliza el error con details', async () => {
    const details = [{ field: 'email', message: 'inválido' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(400, { error: { code: 'VALIDATION_ERROR', message: 'm', details } })));
    await expect(request('POST', '/auth/register', {})).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'm', details });
  });

  it('error de red produce NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fail')));
    await expect(request('GET', '/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('204 devuelve undefined y envía credentials include', async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', f);
    expect(await request('POST', '/auth/logout')).toBeUndefined();
    expect(f.mock.calls[0][1].credentials).toBe('include');
  });
});

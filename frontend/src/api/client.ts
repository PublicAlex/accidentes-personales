import type { ApiErrorDetail } from './types';

const BASE = '/api';
const SIN_HANDLER_401 = ['/auth/login', '/auth/me'];

export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor');
  }

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  let code = 'UNKNOWN_ERROR';
  let message = 'Error inesperado';
  let details: ApiErrorDetail[] | undefined;
  try {
    const data = await res.json();
    if (data?.error) {
      code = data.error.code ?? code;
      message = data.error.message ?? message;
      details = Array.isArray(data.error.details) ? data.error.details : undefined;
    }
  } catch {
    // cuerpo no JSON: se conserva el error genérico
  }

  if (res.status === 401 && !SIN_HANDLER_401.includes(path)) {
    unauthorizedHandler?.();
  }
  throw new ApiError(res.status, code, message, details);
}

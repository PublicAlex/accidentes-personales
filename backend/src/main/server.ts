import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, type Env } from '../infrastructure/config/env.js';
import { createHttpApp } from '../interfaces/http/app.js';
import { createContainer } from './container.js';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

let env: Env;
try {
  env = loadEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuración inválida.');
  process.exit(1);
}

const staticDir = resolve(import.meta.dirname, '../../../frontend/dist');
const container = createContainer(env, existsSync(staticDir) ? { staticDir } : {});
const { logger } = container.deps;

if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
  logger.warn('COOKIE_SECURE=false en producción: la cookie de sesión viaja sin Secure');
}

async function purge(): Promise<void> {
  try {
    const n = await container.purgeRevocations();
    logger.info('Revocaciones expiradas purgadas', { count: n });
  } catch {
    logger.warn('No se pudo purgar revocaciones expiradas');
  }
}

const app = createHttpApp(container.deps);
const server = app.listen(env.PORT, () => {
  logger.info('Servidor escuchando', { port: env.PORT });
  void purge();
});
server.on('error', (e: NodeJS.ErrnoException) => {
  logger.error('No se pudo escuchar', { code: e.code });
  void container.pool.end().finally(() => process.exit(1));
});
setInterval(() => void purge(), PURGE_INTERVAL_MS).unref();

let closing = false;
function shutdown(): void {
  if (closing) return;
  closing = true;
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(() => {
    void container.pool.end().finally(() => process.exit(0));
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

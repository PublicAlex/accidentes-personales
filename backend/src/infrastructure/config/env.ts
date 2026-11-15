import { z } from 'zod';

const obligatoria = (nombre: string) =>
  z.string({ error: `${nombre}: variable obligatoria no definida` }).min(1, `${nombre}: no puede estar vacía`);

const esquema = z.object({
  DATABASE_URL: obligatoria('DATABASE_URL'),
  JWT_SECRET: obligatoria('JWT_SECRET').min(32, 'JWT_SECRET: debe tener al menos 32 caracteres'),
  FRONTEND_ORIGIN: obligatoria('FRONTEND_ORIGIN'),
  REVIEWER_EMAIL: obligatoria('REVIEWER_EMAIL'),
  REVIEWER_PASSWORD: obligatoria('REVIEWER_PASSWORD'),
  REVIEWER_FULL_NAME: obligatoria('REVIEWER_FULL_NAME'),
  PORT: z.coerce.number({ error: 'PORT: debe ser un número' }).int().min(1).max(65535).default(3000),
  COOKIE_SECURE: z
    .enum(['true', 'false'], { error: 'COOKIE_SECURE: debe ser "true" o "false"' })
    .default('false')
    .transform((v) => v === 'true'),
  APP_TIMEZONE: z.string().min(1).default('America/Bogota'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
      error: 'LOG_LEVEL: valor no válido',
    })
    .default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'], { error: 'NODE_ENV: valor no válido' })
    .default('development'),
});

export type Env = z.infer<typeof esquema>;

export class ConfigError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ConfigError';
  }
}

/** Valida la configuración; el mensaje nombra variables, nunca sus valores. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // Una variable vacía se trata como ausente (permite usar los defaults).
  const entrada: Record<string, string | undefined> = {};
  for (const [clave, valor] of Object.entries(source)) {
    if (valor !== undefined && valor !== '') entrada[clave] = valor;
  }
  const resultado = esquema.safeParse(entrada);
  if (resultado.success) return resultado.data;
  const detalles = [...new Set(resultado.error.issues.map((i) => i.message))];
  throw new ConfigError(`Configuración inválida:\n - ${detalles.join('\n - ')}`);
}

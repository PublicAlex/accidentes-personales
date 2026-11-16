# Accidentes personales

Aplicación para registrar y consultar accidentes personales: backend Express 5 + PostgreSQL 16 y frontend React 18 + Vite, en un monorepo npm workspaces. Una persona crea su cuenta, registra accidentes y solo ve los suyos. Un usuario con rol `REVIEWER` puede cambiar el estado de un accidente (`REGISTRADO` → `EN_REVISION` → `CERRADO`) por API.

## Prerrequisitos

- Node.js 24 (ver `.nvmrc`) y npm.
- Docker con el plugin `docker compose`.
- `openssl` (para generar secretos).

## Puesta en marcha desde un clon nuevo

El orden es el de DEC-016: instalar, levantar la BD, migrar, compilar, sembrar y ejecutar. Se compila antes de sembrar porque la semilla del revisor corre desde `backend/dist/`.

```bash
npm ci
cp .env.example .env
```

Edita `.env` y reemplaza los valores ficticios. Genera cada secreto con `openssl rand -hex 32`:

| Variable | Qué poner |
|---|---|
| `JWT_SECRET` | salida de `openssl rand -hex 32` (mínimo 32 caracteres) |
| `POSTGRES_PASSWORD` | salida de `openssl rand -hex 32` |
| `REVIEWER_PASSWORD` | salida de `openssl rand -hex 32` |

Mantén coherentes `DATABASE_URL` y `TEST_DATABASE_URL` con `POSTGRES_PASSWORD` (y con `POSTGRES_PORT` si la cambias): ambas llevan la contraseña y el puerto dentro de la URL. Usa un `REVIEWER_EMAIL` que no se registre públicamente (ver `docs/LIMITATIONS.md`).

Otras variables de `.env` (valores por defecto en `.env.example`): `PORT` (3000; la URL de abajo cambia con él), `FRONTEND_ORIGIN` (origen permitido por CORS; en producción `http://localhost:3000`), `APP_TIMEZONE`, `LOG_LEVEL`, `NODE_ENV` (`production` rechaza el `JWT_SECRET` de ejemplo), `COOKIE_SECURE` (ver más abajo), `REVIEWER_EMAIL` y `REVIEWER_FULL_NAME`. El revisor entra con `REVIEWER_EMAIL` y `REVIEWER_PASSWORD` por `POST /api/auth/login` y cambia estados con `PATCH /api/accidents/:id/status` (ver `docs/api.md`).

```bash
docker compose up -d db     # postgres:16; crea las BD accidentes y accidentes_test
npm run migrate             # aplica backend/migrations
npm run build               # frontend/dist y backend/dist
npm run seed:reviewer       # crea/actualiza la cuenta REVIEWER con las variables REVIEWER_*
npm start                   # un solo proceso Express
```

Abre `http://localhost:3000`. Flujo de comprobación: en la landing elige "Registrar accidente", crea una cuenta, ingresa con ella, registra un accidente y consúltalo en el listado y en su detalle.

### Si el puerto 5432 o el proyecto de Compose están ocupados

Define en `.env` otro `POSTGRES_PORT` (por ejemplo `5433`) y ajusta el puerto en `DATABASE_URL` y `TEST_DATABASE_URL`. Para convivir con otra instancia del mismo compose, usa otro nombre de proyecto:

```bash
COMPOSE_PROJECT_NAME=accidentes2 docker compose up -d db
```

(también puedes poner `COMPOSE_PROJECT_NAME` en `.env`). Cada proyecto tiene su propio volumen `pgdata`.

## Topología: mismo origen

En producción `npm start` levanta un único proceso que sirve `/api/*` y los archivos de `frontend/dist` (con fallback a `index.html` para rutas GET que no son de `/api`). Navegador y API comparten origen, así que la cookie de sesión `sameSite=lax` funciona sin CORS entre orígenes. Con `frontend/dist` presente, cualquier GET fuera de `/api` que no sea un archivo estático devuelve `index.html` (incluso un archivo inexistente como `/assets/x.js`); `/api` desconocida y los métodos no GET fuera de `/api` responden `404` con el formato de error JSON.

## Cookie de sesión y `COOKIE_SECURE` (DEC-015)

La sesión es un JWT en la cookie `session` (`httpOnly`, `sameSite=lax`, 1 h). `COOKIE_SECURE=false` en `.env.example` permite correr el build en `http://localhost`. Un despliegue real detrás de HTTPS debe poner `COOKIE_SECURE=true`. Con `NODE_ENV=production` y `COOKIE_SECURE=false` el servidor registra un aviso al arrancar.

## Vínculo accidente-cuenta (FR-06)

El accidente se asocia a la cuenta autenticada, nunca a un dato que envíe el cliente: el propietario sale del token de sesión verificado en el servidor (`ownerId = actor.userId`). El cuerpo de `POST /api/accidents` rechaza (400) cualquier campo desconocido, incluidos `ownerId`, `userId` o `status`. Listado y detalle filtran siempre por esa cuenta; un id ajeno, inexistente o mal formado da el mismo `404`.

## Modo desarrollo

```bash
npm run dev    # backend con tsx watch (:3000) y Vite (:5173) en paralelo
```

Vite hace proxy de `/api` hacia `http://localhost:3000`. En desarrollo abre `http://localhost:5173` y pon `FRONTEND_ORIGIN=http://localhost:5173` en `.env`.

## Pruebas y verificaciones

```bash
docker compose up -d db
npm run migrate:test    # migra la BD de prueba accidentes_test (TEST_DATABASE_URL)
npm test                # backend (unitarias, contrato, integración con BD real) y frontend
npm run lint:arch       # dependency-cruiser + scripts/check-globals.mjs
npm run scan:secrets    # gitleaks en contenedor + búsqueda de secretos en frontend/dist
```

`npm test` migra `accidentes_test` por sí mismo en el `globalSetup`; `migrate:test` permite hacerlo a mano. `scan:secrets` necesita Docker y la imagen `zricethezav/gitleaks`; si no puede ejecutarse, falla de forma explícita. Persistencia (AC-6): `scripts/verify-persistence.sh` (ver el encabezado del script).

## Estructura

```text
backend/
  migrations/            migraciones SQL (node-pg-migrate)
  src/domain/            entidades, catálogos y máquina de estados (sin dependencias)
  src/application/       casos de uso y puertos
  src/infrastructure/    adaptadores: pg, bcrypt, jsonwebtoken, pino, config
  src/interfaces/http/   Express: rutas, controladores, esquemas Zod, errorMapper
  src/main/              composición, servidor y semilla del revisor
  tests/                 unit, contract, integration, fakes, support
frontend/src/            api/ (único adaptador HTTP), pages/, components/, hooks/
scripts/                 check-globals, scan-secrets, verify-persistence
docs/                    api, data-model, architecture, SOURCES, LIMITATIONS, GIT_STRATEGY, DECISIONS
```

## Documentación

- [API](docs/api.md) · [Modelo de datos](docs/data-model.md) · [Arquitectura](docs/architecture.md)
- [Fuentes y licencias](docs/SOURCES.md) · [Estrategia de Git](docs/GIT_STRATEGY.md)
- [Decisiones](docs/DECISIONS.md)
- [Limitaciones conocidas](docs/LIMITATIONS.md)

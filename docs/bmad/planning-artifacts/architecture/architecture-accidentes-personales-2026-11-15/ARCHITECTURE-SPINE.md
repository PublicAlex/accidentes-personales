---
name: 'accidentes-personales'
type: architecture-spine
purpose: build-substrate
altitude: feature
paradigm: 'hexagonal (ports & adapters) en backend; SPA con adaptador api/ aislado en frontend'
scope: 'MVP completo: backend Express + PostgreSQL 16, frontend React 18 + Vite, monorepo, pruebas, arranque'
status: final
created: '2026-11-15'
updated: '2026-11-15'
binds: [FR-01..FR-11, NFR-01..NFR-10, AC-1..AC-39]
sources:
  - docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md (v0.2) + .memlog.md
  - docs/DECISIONS.md (DEC-001..DEC-014, autoritativas)
  - https://github.com/eriksonwilliam/reference-architecture-node (estructura hexagonal; adaptador HTTP cambiado a Express)
  - Vite create-vite template react-ts (con desviaciones, ver Stack)
companions: []
---

# Architecture Spine — accidentes-personales

## Design Paradigm

**Hexagonal (ports & adapters)** en `backend/src`. El núcleo (dominio + casos de uso) no conoce Express, `pg`, bcrypt, JWT, pino ni Zod; todo entra por puertos que `main/` cablea.

| Capa | Directorio | Contiene | Puede importar |
|---|---|---|---|
| Dominio | `domain/` | Entidades `User`, `Accident` (`create` + `rehydrate`); `AccidentStatus` (+ tabla de transiciones), `AccidentType`, `DocumentType`, `Role`; `shared/Id.ts` (`isUuid`); errores de dominio | **nada** (ni npm, ni `node:*`) |
| Aplicación | `application/` | Casos de uso + puertos `UserRepository`, `AccidentRepository`, `TokenRevocationRepository`, `PasswordHasher`, `TokenService`, `Clock`, `IdGenerator`, `Logger`; errores de aplicación | `domain/` |
| Infraestructura | `infrastructure/` | Adaptadores `pg`, bcrypt, jsonwebtoken, config con Zod (`env.ts`), logger pino, reloj, ids | `application/`, `domain/`, npm |
| Interfaces | `interfaces/http/` | Express: rutas, controladores, middleware, esquemas Zod estrictos, presenters, `errorMapper`, estáticos | `application/`, `domain/`, npm |
| Composición | `main/` | `container.ts`, `server.ts`, `seedReviewer.ts` | todo |

```mermaid
flowchart LR
  main --> interfaces & infrastructure & application & domain
  interfaces --> application --> domain
  interfaces --> domain
  infrastructure --> application
  infrastructure --> domain
```

## Invariants & Rules

### AD-1 — Reglas de dependencia ejecutables (`npm run lint:arch`)
- **Binds:** NFR-08, AC-36, todo `backend/src` y `frontend/src`
- **Prevents:** imports cruzados (incluidos `import type`) y globals de infraestructura en el núcleo.
- **Rule:** `depcruise backend/src --config .dependency-cruiser.cjs` (severity `error`, sin excepciones locales) **y** `node scripts/check-globals.mjs`:

```js
const S = '^backend/src/';
module.exports = { forbidden: [
  { name: 'domain-puro', from: { path: S + 'domain' }, to: { pathNot: S + 'domain' } },          // ni npm ni node:*
  { name: 'application-solo-domain', from: { path: S + 'application' }, to: { pathNot: S + '(application|domain)' } },
  { name: 'interfaces-sin-infra', from: { path: S + 'interfaces' }, to: { path: S + '(infrastructure|main)' } },
  { name: 'infra-sin-interfaces', from: { path: S + 'infrastructure' }, to: { path: S + '(interfaces|main)' } },
  { name: 'solo-main-cablea', from: { pathNot: S + 'main' }, to: { path: S + 'main' } },
  { name: 'src-sin-tests', from: { path: '^backend/src' }, to: { path: '^backend/tests' } },
  { name: 'sin-ciclos', from: {}, to: { circular: true } },
  { name: 'sin-irresolubles', from: {}, to: { couldNotResolve: true } },
], options: { tsPreCompilationDeps: true, doNotFollow: { path: 'node_modules' },
              tsConfig: { fileName: 'backend/tsconfig.json' } } };
```
`check-globals.mjs` falla si `domain/` o `application/` contienen `new Date(`, `Date.now`, `crypto.`, `process.`, `Buffer.`, `console.`, o si aparece `fetch(` en `frontend/src` fuera de `src/api/`. La prueba de AC-36 incluye un `import type { Pool } from 'pg'` en `application/`.

### AD-2 — La aplicación genera ids, `jti` y timestamps
- **Binds:** `domain/`, puertos `Clock`, `IdGenerator`, `TokenService`
- **Prevents:** dos dueños de un valor (app vs `DEFAULT now()`); respuestas 201 distintas de un GET posterior; núcleo no determinista.
- **Rule:** el dominio recibe `id`, `now` y `today` como argumentos. `IdGenerator` (`node:crypto.randomUUID`) y `Clock` (`now(): Date`, `today(): 'YYYY-MM-DD'` en `APP_TIMEZONE`, default `America/Bogota`) viven en `infrastructure/system/`. Repositorios escriben explícitamente `id`, `created_at`, `updated_at` (los `DEFAULT` SQL son solo red) y devuelven con `RETURNING`. `LoginUser` genera el `jti` con `IdGenerator`; `TokenService.sign({sub, jti})` devuelve `{token, expiresAt}` y la cookie usa ese `expiresAt` (única fuente de la vida de sesión: 1 h).

### AD-3 — Máquina de estados en un único módulo
- **Binds:** FR-09, FR-10, AC-8, AC-21, DEC-013
- **Prevents:** reglas de transición duplicadas en controlador, SQL o UI.
- **Rule:** `domain/accident/AccidentStatus.ts` exporta `ACCIDENT_STATUSES = ['REGISTRADO','EN_REVISION','CERRADO'] as const`, `TRANSITIONS: Record<AccidentStatus, readonly AccidentStatus[]>` (`REGISTRADO→[EN_REVISION]`, `EN_REVISION→[CERRADO]`, `CERRADO→[]`) y `assertTransition(from, to)` que lanza `InvalidTransitionError` (mismo estado incluido). `ChangeAccidentStatus` lee `{id,status}`, llama `assertTransition` y luego `updateStatus`; no hay otra vía de mutar `status`. Los esquemas Zod usan `z.enum(ACCIDENT_STATUSES)`. El `CHECK` SQL y las etiquetas UI se mantienen a mano (DEC-013). Códigos en BD/API en mayúsculas; etiquetas en español solo en la UI.

### AD-4 — Contratos de puertos (firmas fijas)
- **Binds:** `application/ports/*`, fakes de `tests/fakes`, adaptadores `Pg*`
- **Prevents:** fakes y adaptadores con semánticas distintas (null vs throw, boolean vs error).
- **Rule:** búsquedas devuelven `null` si no hay fila; solo lanzan `DependencyUnavailableError` (BD caída: códigos `08*`, `57P0*`, `ECONNREFUSED`) o `ConflictError(code)`. Firmas:
  - `UserRepository`: `findById(id)`, `findByEmail(email)` → `User | null`; `create(user)` → `User` (23505 → `ConflictError('EMAIL_TAKEN')`); `upsertReviewer(user)` → `User`.
  - `AccidentRepository`: `create(a)` → `Accident`; `listByOwner(ownerId, limit)` → `AccidentSummary[]` (orden `occurred_on DESC, created_at DESC, id`); `findByIdForOwner(id, ownerId)` → `Accident | null`; `findStatusById(id)` → `{id, status} | null`; `updateStatus({id, expected, next, by, at})` → `{id, status, updatedAt}`; 0 filas → `ConflictError('CONCURRENT_UPDATE')`. SQL: `UPDATE accidents SET status=$next, status_changed_by=$by, status_changed_at=$at, updated_at=$at WHERE id=$id AND status=$expected RETURNING id, status, updated_at`.
  - `TokenRevocationRepository`: `isRevoked(jti)` → `boolean`; `revoke(jti, userId, expiresAt)` (`ON CONFLICT (jti) DO NOTHING`); `purgeExpired(now)` → `number`.
  - `TokenService`: `sign({sub, jti})` → `{token, expiresAt}`; `verify(token)` → `{sub, jti, exp} | null` (`algorithms:['HS256']`).
  - `PasswordHasher`: `hash(plain)`, `compare(plain, hash)`; el adaptador precalcula un hash ficticio para `LoginUser`.
  - `Logger`: `info|warn|error(msg, ctx?)`.
  Una suite de contrato compartida (`tests/contract/*.contract.ts`) corre contra los fakes y contra `Pg*`.

### AD-5 — Propietario solo desde el token; sin lecturas cruzadas
- **Binds:** NFR-03, FR-05, FR-07, FR-08, FR-10, DEC-011, AC-3, AC-25, AC-26
- **Prevents:** IDOR; un `:id` malformado que llega a SQL (`22P02` → 500).
- **Rule:** los casos de uso reciben `actor: {userId, role}` del middleware; `ownerId = actor.userId` siempre. Todo caso de uso que recibe `:id` llama `isUuid(id)` primero y, si falla, lanza `NotFoundError` (mismo cuerpo que inexistente). Solo `ChangeAccidentStatus` usa `findStatusById`; su respuesta es `{id, status, updatedAt}` sin datos personales.

### AD-6 — Sesión, revocación y rol fresco
- **Binds:** FR-03, FR-04, NFR-04, DEC-005, DEC-010, AC-10..12, AC-29, AC-39
- **Prevents:** rol congelado en el token, sesión revocada aceptada, `Authorization` o `alg:none` aceptados.
- **Rule:** JWT `{sub, jti}` HS256, 1 h, `JWT_SECRET` ≥ 32 caracteres. Cookie `session`: `httpOnly`, `sameSite=lax`, `secure=COOKIE_SECURE`, `path=/`, `expires=expiresAt`. El middleware `authenticate` solo lee `req.cookies.session` y llama `AuthenticateRequest`: `verify` → `isRevoked(jti)` → `findById(sub)`. Token inválido/expirado, revocado o usuario inexistente → 401. Error de BD en revocación o usuario → 503 `SERVICE_UNAVAILABLE` (fail-closed). Logout: sin token, token inválido/expirado o ya revocado → 204 + cookie limpiada; token válido → `revoke(...)`; si `revoke` falla → cookie limpiada y 503.

```mermaid
sequenceDiagram
  participant B as Navegador
  participant R as Express (interfaces/http)
  participant UC as Casos de uso
  participant DB as PostgreSQL
  B->>R: POST /api/auth/login {email,password}
  R->>UC: LoginUser (compare; hash ficticio si no existe)
  UC-->>R: {token, expiresAt}, user
  R-->>B: 200 user + Set-Cookie session (httpOnly, lax)
  B->>R: GET /api/accidents (cookie)
  R->>UC: AuthenticateRequest(token)
  UC->>DB: revoked_tokens por jti (error → 503)
  UC->>DB: users por id=sub (rol actual)
  UC-->>R: actor {userId, role}
  R->>UC: ListMyAccidents(actor)
  UC->>DB: accidents WHERE owner_id = actor.userId
  R-->>B: 200 [...]
```

### AD-7 — Orden de evaluación y mapeo único de errores
- **Binds:** NFR-05, NFR-07, DEC-012, AC-18, AC-26, AC-30, AC-32
- **Prevents:** códigos distintos para el mismo caso según la ruta; parser de body que responde antes del 401; fugas de stack.
- **Rule:** globales: `helmet` → `cors` → `cookie-parser`. Por ruta: rutas protegidas `authenticate` (401) → `requireRole` (403) → `jsonBody` (`express.json({limit:'100kb'})`: 413 / JSON malformado 400) → `validate` (400) → caso de uso (404 → 409). Rutas públicas de auth: `rateLimit` (429) → `jsonBody` → `validate` → caso de uso. Solo `interfaces/http/errors/errorMapper.ts` traduce:

| Origen | HTTP / `code` |
|---|---|
| `UnauthenticatedError` | 401 `UNAUTHENTICATED` (login: mensaje genérico único) |
| `ForbiddenError` | 403 `FORBIDDEN` |
| `ZodError`, `ValidationError{field}` (dominio), `entity.parse.failed` | 400 `VALIDATION_ERROR` + `details` |
| `NotFoundError` | 404 `NOT_FOUND` |
| `InvalidTransitionError` / `ConflictError(code)` | 409 `INVALID_TRANSITION` / `EMAIL_TAKEN` / `CONCURRENT_UPDATE` |
| `entity.too.large` | 413 `PAYLOAD_TOO_LARGE` |
| rate limit | 429 `RATE_LIMITED` + `Retry-After` |
| `DependencyUnavailableError` | 503 `SERVICE_UNAVAILABLE` |
| cualquier otro | 500 `INTERNAL_ERROR` genérico; se loguea `name`, `code`, `stack` (sin `detail`, `parameters` ni body) |

### AD-8 — Validación en dos niveles
- **Binds:** FR-02, FR-05, DEC-007, DEC-014, AC-1, AC-4, AC-13, AC-16, AC-23, AC-24
- **Prevents:** límites distintos entre API, dominio y BD; campos extra aceptados.
- **Rule:** forma y límites en `interfaces/http/schemas/*.ts` con `z.strictObject` (campo desconocido, `role`, `userId`, `ownerId`, `status` en alta → 400). Longitudes en code points (`[...s].length`, igual que `char_length` de PG). Contraseña: ≥ 8 caracteres y ≤ 72 bytes (`Buffer.byteLength`, en el adaptador HTTP). Email `trim().toLowerCase()` antes de validar/persistir. Invariantes de negocio (fecha ≤ `today`, ≥ 1900-01-01, transiciones) en el dominio. Los mismos límites como `CHECK` en BD. El frontend replica límites en `src/api/accidentSchema.ts` y además pinta los `details` del backend.

### AD-9 — Migraciones SQL con node-pg-migrate
- **Binds:** FR-11, AC-37, receta de extensión
- **Prevents:** DDL ejecutado por la app o cambios de esquema sin versión.
- **Rule:** migraciones `backend/migrations/*.sql` con marcadores `-- Up Migration` / `-- Down Migration`; tabla de control `pgmigrations`. Comando: `node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up -m backend/migrations` (`-d TEST_DATABASE_URL` para test); `migrate:create` usa `-j sql`. Una migración aplicada no se edita; se agrega otra. La app no ejecuta DDL. Se descarta un runner propio: reinventa orden y registro sin ganancia.

### AD-10 — Mismo origen en producción
- **Binds:** NFR-07 topología, NFR-09, AC-9, AC-31
- **Prevents:** cookies `sameSite` rotas o CORS con credenciales entre orígenes.
- **Rule:** `npm start` levanta un solo proceso Express que sirve `/api/*` y `frontend/dist` (`express.static` + fallback `index.html` en `GET /{*splat}` no-`/api`). En desarrollo Vite (`:5173`) proxya `/api` → `http://localhost:3000`. El frontend usa rutas relativas `/api`. CORS: `cors({ origin: [FRONTEND_ORIGIN], credentials: true })` (array: un origen ajeno no recibe `Access-Control-Allow-Origin`).

### AD-11 — Frontend: `api/` único adaptador HTTP
- **Binds:** FR-01, FR-05, FR-07, FR-08, NFR-05, AC-28
- **Prevents:** `fetch` disperso, falta de `credentials`, autorización decidida solo en UI, redirecciones que tapan errores de login.
- **Rule:** solo `frontend/src/api/` llama `fetch`, con `credentials:'include'`; normaliza errores a `{code,message,details}`. Un 401 limpia el estado de auth y navega a `/login`, excepto en `/auth/login` y `/auth/me` (la landing es pública). Formularios: errores por campo, botón deshabilitado + indicador durante la petición, confirmación de éxito. `RequireAuth` solo mejora UX; el servidor es la autoridad.

### AD-12 — Pruebas: fakes solo en `tests/`, BD real para integración
- **Binds:** NFR-08, NFR-10, AC-1..AC-39
- **Prevents:** adaptadores in-memory en producción; integración contra mocks; pruebas que chocan con el rate limit.
- **Rule:** unit (Vitest) en `backend/tests/unit/` sobre dominio y casos de uso con fakes de `backend/tests/fakes/`. Integración (Vitest + Supertest) en `backend/tests/integration/` contra `accidentes_test` real (migrada en `globalSetup`, `TRUNCATE users, accidents, revoked_tokens CASCADE` en `beforeEach`, `fileParallelism:false`), con `createHttpApp(deps)` armado por `main/container.ts`. Payloads válidos desde `tests/support/builders.ts` (único lugar a tocar al agregar un campo). Límites de rate limit inyectables; solo la prueba de AC-30 usa 10/15 min. AC-11 inyecta un `TokenRevocationRepository` que lanza. CI: `.github/workflows/ci.yml` con servicio `postgres:16` ejecuta `lint:arch` y `test`.

### AD-13 — Seguridad transversal
- **Binds:** NFR-01, NFR-02, NFR-06, NFR-07, DEC-008, AC-7, AC-30..35
- **Prevents:** secretos o PII en logs/bundle; arranque con configuración incompleta.
- **Rule:** `infrastructure/config/env.ts` valida al arrancar (falla con mensaje claro): `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `REVIEWER_EMAIL`, `REVIEWER_PASSWORD`, `REVIEWER_FULL_NAME`, más opcionales con default (`PORT`, `COOKIE_SECURE`, `APP_TIMEZONE`, `LOG_LEVEL`). `express-rate-limit`: 10/15 min por IP, `standardHeaders:'draft-8'`, `legacyHeaders:false`, handler con formato de error. bcrypt cost 12. pino con `redact` por rutas: `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`, `*.password`, `*.passwordHash`, `*.password_hash`, `*.token`, `*.email`, `*.contactEmail`, `*.affectedName`, `*.documentNumber`, `*.phone`, `*.description`, `err.detail`; nunca se loguea el body. Presenters con lista blanca de campos. La semilla usa el caso de uso `EnsureReviewer` (`upsertReviewer` por `lower(email)`, rol `REVIEWER`) y aborta si `REVIEWER_PASSWORD` es el valor de `.env.example`; el servidor rechaza el `JWT_SECRET` de ejemplo con `NODE_ENV=production`.

### AD-14 — Configuración de la capa HTTP por inyección
- **Binds:** `interfaces/http/app.ts`, `main/container.ts`, AD-1
- **Prevents:** que `interfaces/` importe `env.ts` o el logger de `infrastructure/` (violaría AD-1) o que cada ruta lea `process.env`.
- **Rule:** `createHttpApp(deps: HttpAppDeps)` donde `HttpAppDeps = { useCases: {...}, logger: Logger, config: { cookieSecure, frontendOrigin, staticDir?: string, rateLimit: { windowMs, max } } }`; `main/container.ts` lo construye desde `env.ts`. `interfaces/` no lee `process.env`.

## Consistency Conventions

| Concern | Convención |
|---|---|
| Archivos | Entidades y casos de uso `PascalCase.ts` (`CreateAccident.ts`); puertos sin prefijo `I`; adaptadores prefijados por tecnología (`PgAccidentRepository`, `BcryptPasswordHasher`, `JwtTokenService`, `PinoLogger`) |
| Casos de uso | Clase con `execute(input)`; dependencias por constructor (solo puertos) |
| JSON API | camelCase; BD snake_case; mapeo solo en `Pg*` y presenters |
| Ids / fechas | `uuid` v4; `occurredOn` `YYYY-MM-DD` (`date`); timestamps ISO-8601 UTC (`timestamptz`) |
| Errores | `{ error: { code, message, details?: [{field, message}] } }` (tabla AD-7) |
| Config | `node --env-file-if-exists=.env`; sin `dotenv`; no se requiere ninguna `VITE_*` |
| TypeScript | Un solo `typescript` en la raíz; `"strict": true` explícito en cada tsconfig |

## Data Model (DDL)

```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL CHECK (email = lower(email)),
  password_hash text NOT NULL,
  full_name     text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 120),
  role          text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','REVIEWER')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));  -- equivale a UNIQUE(email) normalizado (AC-37)

CREATE TABLE accidents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  affected_name     text NOT NULL CHECK (char_length(affected_name) BETWEEN 3 AND 120),
  document_type     text NOT NULL CHECK (document_type IN ('CC','CE','TI','PASAPORTE')),
  document_number   text NOT NULL CHECK (document_number ~ '^[A-Za-z0-9]{5,20}$'),
  phone             text NOT NULL CHECK (phone ~ '^\+?[0-9]{7,15}$'),
  contact_email     text NOT NULL CHECK (char_length(contact_email) <= 254),
  accident_type     text NOT NULL CHECK (accident_type IN ('TRANSITO','LABORAL','DOMESTICO','DEPORTIVO','OTRO')),
  occurred_on       date NOT NULL CHECK (occurred_on >= DATE '1900-01-01'),
  place             text NOT NULL CHECK (char_length(place) BETWEEN 3 AND 200),
  description       text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  status            text NOT NULL DEFAULT 'REGISTRADO'
                    CONSTRAINT accidents_status_check CHECK (status IN ('REGISTRADO','EN_REVISION','CERRADO')),
  status_changed_by uuid NULL REFERENCES users(id),
  status_changed_at timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK ((status_changed_by IS NULL) = (status_changed_at IS NULL))
);
CREATE INDEX accidents_owner_occurred_idx ON accidents (owner_id, occurred_on DESC, created_at DESC);

CREATE TABLE revoked_tokens (
  jti        uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX revoked_tokens_expires_idx ON revoked_tokens (expires_at);
```
Purga: `PurgeExpiredRevocations` al arrancar y cada hora (`setInterval` en `main/server.ts`).

## API Contract

Base `/api`, JSON. Columna "Errores" en orden DEC-012/AD-7. Rutas protegidas pueden además devolver 413, 500 y 503.

| Método y ruta | Auth / rol | Request (estricto) | Éxito | Errores |
|---|---|---|---|---|
| `POST /auth/register` | pública, rate limit | `{email, password, fullName}` | 201 `{id,email,fullName,role:'USER'}` (no inicia sesión) | 429, 413, 400, 409 `EMAIL_TAKEN` |
| `POST /auth/login` | pública, rate limit | `{email, password}` | 200 `{id,email,fullName,role}` + `Set-Cookie session` | 429, 413, 400, 401 genérico |
| `POST /auth/logout` | cookie opcional | — | 204 + cookie limpiada | 503 (revocación fallida) |
| `GET /auth/me` | sesión | — | 200 `{id,email,fullName,role}` | 401 |
| `POST /accidents` | sesión (USER o REVIEWER) | `{affectedName, documentType, documentNumber, phone, contactEmail, accidentType, occurredOn, place, description}` | 201 detalle | 401, 400 |
| `GET /accidents` | sesión | — | 200 `[{id, accidentType, occurredOn, status}]` (≤ 100, orden AD-4) | 401 |
| `GET /accidents/:id` | sesión, solo dueño | — | 200 detalle = los 9 campos + `id, status, createdAt, updatedAt` | 401, 404 (ajeno, inexistente o no-uuid: mismo cuerpo) |
| `PATCH /accidents/:id/status` | sesión, **REVIEWER** | `{status}` | 200 `{id, status, updatedAt}` | 401, 403 (antes de buscar), 400, 404, 409 `INVALID_TRANSITION`/`CONCURRENT_UPDATE` |

## Stack

Desviaciones frente al template actual de create-vite (que trae React 19, TypeScript 7 y oxlint): React 18 por DEC-014; TypeScript 5.9 porque dependency-cruiser 18 soporta `typescript <7`; sin oxlint (las reglas viven en `lint:arch`).

| Name | Version |
|---|---|
| Node.js (LTS, `engines` + `.nvmrc`) | 24.x |
| TypeScript | 5.9.3 |
| express | 5.3.0 |
| pg (node-postgres) | 8.23.1 |
| node-pg-migrate | 9.0.0 |
| PostgreSQL (imagen `postgres`) | 16 |
| zod | 4.6.7 |
| jsonwebtoken / bcrypt | 9.0.3 / 6.0.0 |
| helmet / cors / express-rate-limit / cookie-parser | 8.3.0 / 2.8.6 / 8.7.4 / 1.4.7 |
| pino | 10.4.0 |
| react / react-dom / @types/react / @types/react-dom | 18.3.1 / 18.3.1 / 18.3.31 / 18.3.7 |
| react-router-dom | 7.18.5 |
| vite / @vitejs/plugin-react | 8.3.8 / 6.3.0 |
| vitest / supertest | 5.1.0 / 7.3.2 |
| @testing-library/react / @testing-library/dom / jsdom | 16.3.3 / 10.4.2 / 29.1.1 |
| dependency-cruiser / tsx (dev) | 18.7.2 / 4.23.15 |

## Structural Seed

```text
/                          # npm workspaces: ["backend","frontend"]
  package.json  .nvmrc  .env.example  .gitignore(.env, dist)  .dependency-cruiser.cjs  README.md
  docker-compose.yml       # solo db: postgres:16
  docker/initdb/01-create-test-db.sql   # CREATE DATABASE accidentes_test;
  scripts/{check-globals.mjs, verify-persistence.sh}
  .github/workflows/ci.yml
  backend/
    migrations/            # *.sql
    src/domain/{accident/{Accident,AccidentStatus,AccidentType,DocumentType}.ts, user/{User,Role}.ts, shared/Id.ts, errors.ts}
    src/application/ports/{UserRepository,AccidentRepository,TokenRevocationRepository,PasswordHasher,TokenService,Clock,IdGenerator,Logger}.ts
    src/application/use-cases/auth/{RegisterUser,LoginUser,LogoutUser,AuthenticateRequest,GetCurrentUser,EnsureReviewer}.ts
    src/application/use-cases/accidents/{CreateAccident,ListMyAccidents,GetMyAccident,ChangeAccidentStatus}.ts
    src/application/use-cases/PurgeExpiredRevocations.ts   src/application/errors.ts
    src/infrastructure/{config/env.ts, logging/PinoLogger.ts, persistence/pg/{pool,PgUserRepository,PgAccidentRepository,PgTokenRevocationRepository}.ts, security/{BcryptPasswordHasher,JwtTokenService}.ts, system/{SystemClock,CryptoIdGenerator}.ts}
    src/interfaces/http/{app.ts, routes/, controllers/, middleware/{authenticate,requireRole,jsonBody,validate,rateLimits}.ts, schemas/{authSchemas,accidentSchemas}.ts, presenters/accidentPresenter.ts, errors/errorMapper.ts, static.ts}
    src/main/{container.ts, server.ts, seedReviewer.ts}
    tests/{unit/{domain,application}, integration, contract, fakes, support}
  frontend/
    vite.config.ts         # proxy /api -> http://localhost:3000
    src/api/{client,auth,accidents,types,accidentSchema}.ts
    src/pages/{Landing,Login,Register,AccidentNew,AccidentList,AccidentDetail}Page.tsx
    src/components/{RequireAuth,StatusBadge,FieldError}.tsx, statusLabels.ts
    src/hooks/{useAuth.tsx,useAsync.ts}
```

**Scripts raíz:** `build` (`vite build` → `frontend/dist`; `tsc` → `backend/dist`) · `start` (`node --env-file-if-exists=.env backend/dist/main/server.js`) · `migrate` / `migrate:test` / `migrate:create` (AD-9) · `seed:reviewer` (`node --env-file-if-exists=.env backend/dist/main/seedReviewer.js`, requiere `build`) · `test` (backend unit + contract + integración; frontend) · `lint:arch` (AD-1) · `scan:secrets` (gitleaks en contenedor + grep de `frontend/dist`) · `dev` (tsx watch + vite).

**Orden del README (AC-9):** `npm ci` → `cp .env.example .env` y editar → `docker compose up -d` → `npm run migrate` → `npm run build` → `npm run seed:reviewer` → `npm start` → abrir `http://localhost:3000`. (Compilar antes de sembrar porque la semilla corre desde `dist/`.) El README también explica el vínculo accidente-cuenta (FR-06) y la topología de mismo origen.

**docker-compose.yml:** servicio `db`, `image: postgres:16`, `POSTGRES_USER: ${POSTGRES_USER:?definir en .env}`, `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?definir en .env}`, `POSTGRES_DB: ${POSTGRES_DB:?definir en .env}`, puerto `${POSTGRES_PORT:-5432}:5432`, volúmenes `pgdata:/var/lib/postgresql/data` y `./docker/initdb:/docker-entrypoint-initdb.d:ro`, `healthcheck: pg_isready`; `volumes: { pgdata: {} }`. La app corre en el host desde el build.

**.env.example (valores ficticios):** `NODE_ENV=production`, `PORT=3000`, `POSTGRES_USER=accidentes`, `POSTGRES_PASSWORD=cambia-esta-clave-db`, `POSTGRES_DB=accidentes`, `POSTGRES_PORT=5432`, `DATABASE_URL=postgres://accidentes:cambia-esta-clave-db@localhost:5432/accidentes`, `TEST_DATABASE_URL=postgres://accidentes:cambia-esta-clave-db@localhost:5432/accidentes_test`, `JWT_SECRET=reemplazar-por-32-caracteres-aleatorios-xx`, `COOKIE_SECURE=false` (solo para correr el build en `http://localhost`; `true` detrás de TLS), `FRONTEND_ORIGIN=http://localhost:3000`, `APP_TIMEZONE=America/Bogota`, `LOG_LEVEL=info`, `REVIEWER_EMAIL=revisor@example.test`, `REVIEWER_PASSWORD=cambia-esta-clave-revisor`, `REVIEWER_FULL_NAME=Revisor Demo`.

## Test Map (AC-1..AC-9)

| AC | Archivo |
|---|---|
| AC-1 | `backend/tests/integration/accidents.create.test.ts`; UI `frontend/src/pages/AccidentNewPage.test.tsx` |
| AC-2 | `backend/tests/integration/auth.guard.test.ts` |
| AC-3 | `backend/tests/integration/accidents.ownership.test.ts` (también AC-25, AC-26) |
| AC-4 | `backend/tests/integration/accidents.validation.test.ts` (`it.each`; también AC-23/24); `backend/tests/unit/domain/Accident.test.ts` |
| AC-5 | `backend/tests/integration/accidents.list.test.ts`; UI `frontend/src/pages/AccidentListPage.test.tsx` |
| AC-6 | `scripts/verify-persistence.sh` (crea vía API, `docker compose restart db`, consulta) + evidencia en `docs/test-report.md` |
| AC-7 | `backend/tests/integration/secrets-leak.test.ts` + `npm run scan:secrets` |
| AC-8 | `backend/tests/unit/domain/AccidentStatus.test.ts` (matriz 3x3 tabulada: 2 válidas, 7 inválidas) |
| AC-9 | Checklist del README en clon limpio; evidencia en `docs/test-report.md` |

AC-10..39: un archivo de integración por tema (`auth.*.test.ts`, `accidents.status.test.ts`, `security.headers.test.ts`, `rate-limit.test.ts`, `config.test.ts`, `schema.test.ts`), `LandingPage.test.tsx` (AC-28) y la prueba de `lint:arch` con import prohibido (AC-36).

## Extension Recipe (defensa en vivo)

**Nuevo estado `RECHAZADO`** (`EN_REVISION → RECHAZADO`, final):
1. `backend/src/domain/accident/AccidentStatus.ts`: agregar a `ACCIDENT_STATUSES` y a `TRANSITIONS` (Zod y tipos lo heredan).
2. `backend/migrations/<ts>_add-status-rechazado.sql`: Up `ALTER TABLE accidents DROP CONSTRAINT accidents_status_check, ADD CONSTRAINT accidents_status_check CHECK (status IN ('REGISTRADO','EN_REVISION','CERRADO','RECHAZADO'));`; Down restaura el CHECK anterior (falla si existen filas `RECHAZADO`: comportamiento esperado).
3. `frontend/src/api/types.ts` (unión) y `frontend/src/components/statusLabels.ts` (`Record<AccidentStatus,string>` obliga por compilación).
4. Pruebas: matriz esperada 4x4 en `AccidentStatus.test.ts` y un caso en `accidents.status.test.ts`.

**Nuevo campo `gravedad`** (`LEVE|MODERADA|GRAVE`, obligatorio en altas nuevas):
1. Dominio: `domain/accident/Severity.ts` + propiedad y validación en `Accident.ts`.
2. Migración: `ADD COLUMN severity text CHECK (severity IN ('LEVE','MODERADA','GRAVE'))` + `ADD CONSTRAINT accidents_severity_required CHECK (severity IS NOT NULL) NOT VALID` (obliga en filas nuevas sin inventar datos en las previas).
3. `application/use-cases/accidents/CreateAccident.ts` (input) · `infrastructure/persistence/pg/PgAccidentRepository.ts` (INSERT/SELECT/mapper).
4. `interfaces/http/schemas/accidentSchemas.ts` (`severity: z.enum(SEVERITIES)`) · `interfaces/http/presenters/accidentPresenter.ts`.
5. Frontend: `api/types.ts`, `api/accidentSchema.ts`, `pages/AccidentNewPage.tsx` (select), `pages/AccidentDetailPage.tsx`.
6. Pruebas: `tests/support/builders.ts` (payload válido), `Accident.test.ts` y una fila en `accidents.validation.test.ts`.

## Capability → Architecture Map

| Capacidad | Vive en | Gobernado por |
|---|---|---|
| FR-01 landing | `LandingPage.tsx`, `RequireAuth` | AD-11 |
| FR-02..04 cuenta/sesión | `use-cases/auth/*`, `JwtTokenService`, `authenticate.ts` | AD-2, AD-6, AD-7, AD-8, AD-13 |
| FR-05..08 accidentes | `use-cases/accidents/*`, `PgAccidentRepository` | AD-4, AD-5, AD-7, AD-8 |
| FR-09..10 estados | `AccidentStatus.ts`, `ChangeAccidentStatus.ts` | AD-3, AD-4, AD-7 |
| FR-11 persistencia | `backend/migrations`, compose | AD-9, Data Model |
| FR-06, NFR-09 arranque | README, scripts raíz | AD-10, Structural Seed |
| NFR-01..07 seguridad | `env.ts`, `app.ts`, `PinoLogger.ts` | AD-6, AD-7, AD-13, AD-14 |
| NFR-08, NFR-10 calidad | `.dependency-cruiser.cjs`, `check-globals.mjs`, `tests/`, CI | AD-1, AD-12 |

## Deferred

- Despliegue real (TLS, proxy inverso, `trust proxy`, secretos gestionados), HA y observabilidad: fuera de alcance (PRD §7); el MVP corre local desde build.
- Paginación del listado más allá de 100: valor del PRD, cambiable sin tocar arquitectura.
- Refresh de sesión: NON-GOAL.
- Estilo visual y librería CSS: no generan divergencia entre unidades.

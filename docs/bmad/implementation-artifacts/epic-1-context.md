# Epic 1 Context: Fundaciones

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dejar un monorepo ejecutable con reglas de arquitectura verificables, un dominio puro probado sin infraestructura y un esquema de PostgreSQL migrado con el Revisor sembrado. Es la base sobre la que se construyen la API (Epic 2) y la interfaz (Epic 3); sus historias son técnicas pero cada una deja un incremento verificable (`lint:arch` verde, matriz de transiciones, migración reproducible).

## Stories

- Story 1.1: Scaffold del monorepo, entorno y guardas de arquitectura
- Story 1.2: Capa de dominio con máquina de estados
- Story 1.3: Migraciones, adaptadores pg y semilla del Revisor

## Requirements & Constraints

- Monorepo npm workspaces `backend/` y `frontend/`; scripts raíz `build`, `start`, `migrate`, `seed:reviewer`, `test`, `lint:arch`. Sin starter template externo.
- PostgreSQL 16 (`postgres:16`) con volumen nombrado `pgdata`, y una BD adicional `accidentes_test` para pruebas.
- Sin secretos en código, docs ni historial: `.env.example` solo con valores ficticios, `.env` en `.gitignore`, config de gitleaks presente; ninguna variable `VITE_*` sensible.
- Configuración por entorno validada al arrancar: el backend falla de inmediato con mensaje claro si falta `JWT_SECRET` o `DATABASE_URL`.
- Roles `USER` (por defecto) y `REVIEWER`; solo transiciones `REGISTRADO→EN_REVISION` y `EN_REVISION→CERRADO`, las otras 7 combinaciones de la matriz 3x3 fallan.
- Reglas de dominio de accidente: fecha no futura (zona `America/Bogota`) ni anterior a 1900-01-01; límites de longitud y formato de campos exactos (nombre 3–120, documento alfanumérico 5–20, tipos de documento CC/CE/TI/PASAPORTE).
- `seed:reviewer` debe fallar con la contraseña de ejemplo; con credenciales válidas crea un REVIEWER con hash bcrypt costo 12.
- Definition of Done común: pruebas escritas y ejecutadas con resultado registrado, `npm run lint:arch` verde, sin secretos, sin imports prohibidos, commit pequeño referenciando la historia. 1.1 exige además una regla negativa de `lint:arch` demostrada; 1.3 una migración down/up ejecutada.
- CI en GitHub Actions con servicio `postgres:16` ejecutando `lint:arch` y `test`.

## Technical Decisions

- Arquitectura hexagonal en `backend/src`: `domain/` (no importa nada, ni npm ni `node:*`) <- `application/` (solo domain) <- `infrastructure/` e `interfaces/http/` (no se importan entre sí) <- `main/` (único que cablea: `container.ts`, `server.ts`, `seedReviewer.ts`).
- `lint:arch` = dependency-cruiser (reglas: domain puro, application solo domain, interfaces sin infra, infra sin interfaces, solo main cablea, src sin tests, sin ciclos, sin irresolubles; incluye `import type`) más `scripts/check-globals.mjs` (prohíbe `new Date(`, `Date.now`, `crypto.`, `process.`, `Buffer.`, `console.` en domain/application y `fetch(` en frontend fuera de `src/api/`).
- Ids, `jti` y timestamps los genera la app, no la BD: el dominio recibe `id`, `now`, `today` como argumentos; `Clock` e `IdGenerator` son puertos con adaptadores en `infrastructure/system/`. `Accident` expone `create` y `rehydrate`; `isUuid` vive en `domain/shared/Id.ts`.
- Máquina de estados en un solo módulo `domain/accident/AccidentStatus.ts`: `ACCIDENT_STATUSES`, `TRANSITIONS`, `assertTransition` que lanza `InvalidTransitionError` (mismo estado incluido). Códigos en mayúsculas; el `CHECK` SQL se mantiene a mano.
- Contratos de puertos fijos: las búsquedas devuelven `null` si no hay fila; solo lanzan `DependencyUnavailableError` (códigos `08*`, `57P0*`, `ECONNREFUSED`) o `ConflictError(code)` (23505 de email -> `EMAIL_TAKEN`). Lecturas de accidentes solo por `findByIdForOwner`/`listByOwner` (orden `occurred_on DESC, created_at DESC, id`); `updateStatus` usa `UPDATE ... WHERE id AND status=$expected RETURNING`, 0 filas -> `ConflictError('CONCURRENT_UPDATE')`. Repos de usuarios, accidentes y revocación de tokens (`isRevoked`, `revoke` con `ON CONFLICT DO NOTHING`, `purgeExpired`).
- Migraciones SQL con node-pg-migrate en `backend/migrations/*.sql` (marcadores Up/Down, tabla `pgmigrations`); una migración aplicada no se edita; la app no ejecuta DDL. Tablas `users` (email en minúsculas, índice único sobre `lower(email)`, rol con CHECK), `accidents` (FK `owner_id`, CHECKs de estado/tipo/documento, índice por `owner_id`), `revoked_tokens` (índice por `jti`, expiración); PK `uuid`, `NOT NULL`.
- Config con Zod en `infrastructure/config/env.ts`; arranque con `node --env-file-if-exists=.env` (sin `dotenv`). Variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `REVIEWER_EMAIL/PASSWORD/FULL_NAME`; opcionales `PORT`, `COOKIE_SECURE`, `APP_TIMEZONE`, `LOG_LEVEL`.
- Semilla vía caso de uso `EnsureReviewer` (`upsertReviewer` por email en minúsculas, rol REVIEWER); aborta si la contraseña es la de `.env.example`.
- Pruebas: Vitest; unitarias en `backend/tests/unit/` con fakes en `backend/tests/fakes/` (nunca en producción); integración contra `accidentes_test` real (migrada en `globalSetup`, `TRUNCATE` en `beforeEach`, `fileParallelism:false`); suite de contrato compartida entre fakes y `Pg*`.
- Convenciones: casos de uso como clase con `execute(input)` y dependencias por constructor; puertos sin prefijo `I`; adaptadores prefijados por tecnología (`PgAccidentRepository`, `BcryptPasswordHasher`); un solo `typescript` en la raíz con `"strict": true` en cada tsconfig; BD snake_case, API camelCase.

## Cross-Story Dependencies

- 1.2 depende de 1.1 (tooling, `lint:arch`, Vitest); 1.3 depende de 1.1 (docker-compose, BD de test, config) y de 1.2 (entidades, puertos y errores que los adaptadores implementan).
- Epic 2 consume los repositorios `Pg*`, el dominio, el Revisor sembrado y las guardas de arquitectura; Epic 3 consume el scaffold del monorepo y los scripts raíz.

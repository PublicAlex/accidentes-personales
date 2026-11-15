---
title: 'S1.3 Migraciones, adaptadores pg y semilla del Revisor'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: '501ddd867b220d3508a93ad5ae8d5445833c4cc8'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-1-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred:
  - summary: >-
      upsertReviewer promueve a REVIEWER y resetea la contrasena de una cuenta USER preexistente con el mismo email.
    evidence: |-
      AD-13 exige upsert por lower(email); si un usuario se registra antes del seed con REVIEWER_EMAIL, la semilla la toma. Prueba en userRepository.contract.ts.
    location: >-
      backend/src/infrastructure/persistence/pg/PgUserRepository.ts:63
    severity: medium
  - summary: >-
      La reversibilidad down/up no tiene prueba automatizada.
    evidence: |-
      Verificada manualmente (docs/evidence/S1.3-migraciones.txt).
    severity: low
---

<intent-contract>

## Intent

**Problem:** el dominio (S1.2) no tiene persistencia: faltan el esquema versionado, los repositorios pg que implementan los puertos de AD-4 y el Revisor sembrado, requisitos previos de la API (Epic 2).

**Approach:** migración SQL (node-pg-migrate) con el DDL exacto del Data Model; puertos en `application/`; adaptadores `Pg*`, `BcryptPasswordHasher`, `SystemClock`, `CryptoIdGenerator` en `infrastructure/`; caso de uso `EnsureReviewer` y `main/seedReviewer.ts`; pruebas de integración contra `accidentes_test` real.

## Boundaries & Constraints

**Always:** DDL idéntico al Data Model del SPINE (PK uuid, FK, `users_email_lower_uq` sobre `lower(email)`, NOT NULL, CHECK de estado/tipo/documento/longitudes, índices). Consultas parametrizadas, nunca interpolación. Lecturas de accidentes solo `findByIdForOwner` (`WHERE id=$1 AND owner_id=$2`) y `listByOwner`; más `findStatusById` (solo `{id,status}`, para ChangeAccidentStatus). `updateStatus` con `UPDATE ... WHERE id=$id AND status=$expected RETURNING id,status,updated_at`; 0 filas -> `ConflictError('CONCURRENT_UPDATE')`. Búsquedas devuelven `null`; solo se lanzan `DependencyUnavailableError` (códigos `08*`, `57P0*`, `ECONNREFUSED`) y `ConflictError` (23505 de email -> `EMAIL_TAKEN`). Repos escriben `id`, `created_at`, `updated_at` explícitos (AD-2). `occurred_on` se lee como `'YYYY-MM-DD'` (`to_char`). Semilla: credenciales desde env, bcrypt costo 12, idempotente (una sola fila por `lower(email)`), aborta si `REVIEWER_PASSWORD` es el valor de `.env.example` (`cambia-esta-clave-revisor`) o tiene <8 caracteres. `lint:arch` verde: `infrastructure/` solo importa `application/` y `domain/`; `application/` solo `domain/` y sin `process.`/`Buffer.`/`console.`/`new Date(`/`crypto.`.

**Never:** DDL ejecutado por la app; editar migraciones aplicadas; imprimir contraseñas o hashes completos; commitear `.env`; fakes en `src/`; dependencias nuevas (pg, node-pg-migrate, bcrypt, @types ya instaladas); implementar casos de uso HTTP/auth (Epic 2) más allá de `EnsureReviewer`; ejecutar `git push` o merge.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Migrar BD vacía | `npm run migrate` | existen `users`, `accidents`, `revoked_tokens`, índices y CHECKs | - |
| Reversibilidad | `migrate down` luego `up` | esquema se elimina y se recrea | - |
| Email duplicado | `create(user)` con email existente | - | `ConflictError('EMAIL_TAKEN')` |
| Búsqueda sin fila | `findByEmail`/`findById`/`findByIdForOwner`/`findStatusById` inexistente | `null` | - |
| Aislamiento | accidente de A, `findByIdForOwner(id, B)` | `null`; `listByOwner(B)` no lo incluye | - |
| Orden listado | varios accidentes | `occurred_on DESC, created_at DESC, id`, respeta `limit` | - |
| Transición válida | `updateStatus` con `expected` vigente | `{id,status,updatedAt}`; fila guarda `status_changed_by/at` | - |
| Estado obsoleto / carrera | `expected` ya no coincide, o id inexistente, o dos updates paralelos | exactamente uno gana | `ConflictError('CONCURRENT_UPDATE')` |
| BD caída | pool a puerto cerrado | - | `DependencyUnavailableError` |
| Revocación | `revoke` repetido mismo jti | `isRevoked` true, sin error | - |
| Purga | tokens expirados y vigentes | `purgeExpired(now)` borra solo expirados, devuelve conteo | - |
| Semilla válida x2 | credenciales válidas, dos corridas | 1 fila REVIEWER con hash `$2b$12$...` | - |
| Semilla con placeholder | `REVIEWER_PASSWORD=cambia-esta-clave-revisor` | no escribe nada | sale con código != 0 y mensaje claro |

</intent-contract>

## Code Map

- `backend/src/domain/errors.ts`, `domain/user/User.ts`, `domain/accident/Accident.ts` -- entidades con `create`/`rehydrate` y props (`AccidentProps`, `UserProps`); solo lectura.
- `backend/src/infrastructure/config/env.ts` -- `loadEnv()`; reutilizar en `seedReviewer.ts`.
- `backend/migrations/` -- vacío (.gitkeep); `npm run migrate` / `migrate:test` ya cableados en `package.json` raíz (`-d TEST_DATABASE_URL`).
- `backend/vitest.config.ts` -- agregar `globalSetup`; `fileParallelism:false` ya está.
- `.dependency-cruiser.cjs`, `scripts/check-globals.mjs` -- reglas AD-1 a respetar, no modificar.
- SPINE: AD-2, AD-4 (firmas), AD-5, AD-9, AD-12, AD-13, Data Model (DDL) y Structural Seed (rutas de archivos).
- Estado: `docker compose up -d db` corriendo; `.env` local existe; `accidentes_test` creada por `docker/initdb`.

## Tasks & Acceptance

**Execution:**
- `backend/migrations/<ts>_initial-schema.sql` -- Up con el DDL del SPINE; Down `DROP TABLE` en orden inverso -- AC-37, reversible
- `backend/src/application/errors.ts` -- `ConflictError(code)`, `DependencyUnavailableError`, `WeakReviewerPasswordError` -- contratos AD-4
- `backend/src/application/ports/{UserRepository,AccidentRepository,TokenRevocationRepository,PasswordHasher,TokenService,Clock,IdGenerator,Logger}.ts` -- interfaces con las firmas exactas de AD-4 (`AccidentSummary = {id, accidentType, occurredOn, status}`)
- `backend/src/application/use-cases/auth/EnsureReviewer.ts` -- hash + `User.create(role REVIEWER)` + `upsertReviewer`; rechaza contraseña prohibida/corta (lista inyectada por constructor)
- `backend/src/infrastructure/persistence/pg/{pool,pgErrors,PgUserRepository,PgAccidentRepository,PgTokenRevocationRepository}.ts` -- adaptadores; `upsertReviewer` = `INSERT ... ON CONFLICT (lower(email)) DO UPDATE SET password_hash, full_name, role='REVIEWER' RETURNING`
- `backend/src/infrastructure/security/BcryptPasswordHasher.ts`, `infrastructure/system/{SystemClock,CryptoIdGenerator}.ts` -- costo 12; reloj en `APP_TIMEZONE`
- `backend/src/main/seedReviewer.ts` -- cablea env + pool + EnsureReviewer; cierra el pool; mensajes sin secretos; exit != 0 en error
- `backend/tests/support/{globalSetup,db}.ts`, `backend/vitest.config.ts` -- migra `accidentes_test` (carga `.env` si existe; usa `TEST_DATABASE_URL`), helper `truncate` en `beforeEach`
- `backend/tests/contract/*.contract.ts` + `backend/tests/integration/*.test.ts` -- suites de contrato de los 3 repos ejecutadas contra `Pg*`; prueba de esquema (tablas, constraints, índices, rechazo de filas inválidas); prueba de BD caída; prueba de semilla (EnsureReviewer+Pg+Bcrypt: idempotente, hash `$2b$12$`)
- `backend/tests/unit/application/EnsureReviewer.test.ts` -- rechaza placeholder y contraseña corta con fake mínimo inline

**Acceptance Criteria:**
- Given una BD vacía, when `npm run migrate`, then existen las 3 tablas con PK uuid, FK, CHECKs, `users_email_lower_uq` e índices (AC-37).
- Given `down` y luego `up`, then el esquema queda idéntico y sin errores.
- Given los puertos, when se usan los `Pg*`, then cumplen null/throw/23505/conexión y los accesos de lectura de accidentes filtran por `owner_id` (AD-4, AD-5).
- Given `updateStatus` con `expected` obsoleto, when afecta 0 filas, then lanza `ConflictError('CONCURRENT_UPDATE')`.
- Given `seed:reviewer` con la contraseña de ejemplo, then falla; con credenciales válidas crea un REVIEWER con hash `$2b$12$`; dos corridas dejan una fila (AC-34, AC-35).
- Given el árbol, when `npm run lint:arch`, then verde; `npm run build` compila; `npm test` pasa.

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- verdicts: findings de 4 capas triados uno a uno (7 parchados, 2 diferidos, resto rechazado); cifras aproximadas: medium 7, low 8, false 3
- findings:
  - `[medium]` `[patch]` Pool sin listener `error` (crash al reiniciar la BD) — agregado `pool.on('error')` en `pool.ts`
  - `[medium]` `[patch]` `translatePgError` no cubre ENOTFOUND/ETIMEDOUT/ECONNRESET/EHOSTUNREACH/53300/timeout de conexion — ampliado en `pgErrors.ts`
  - `[medium]` `[patch]` 23505 cualquiera -> EMAIL_TAKEN — ahora solo si `constraint = users_email_lower_uq`
  - `[medium]` `[patch]` `truncate` sin guarda sobre BD no-test — rechaza si el nombre no termina en `_test`
  - `[low]` `[patch]` `globalSetup` ocultaba stderr de la migracion — ahora lo incluye en el error
  - `[medium]` `[patch]` rama DO UPDATE de `upsertReviewer` sin prueba — agregada prueba (promocion USER->REVIEWER y rotacion de hash; el builder ignoraba `passwordHash`, corregido)
  - `[medium]` `[patch]` guarda del placeholder en `main/seedReviewer.ts` sin prueba — agregado `seedEntrypoint.test.ts` que ejecuta el entrypoint real con la contrasena leida de `.env.example`
  - `[medium]` `[defer]` `upsertReviewer` toma una cuenta USER preexistente con el mismo email — comportamiento exigido por AD-13 (upsert por lower(email)); decision de producto, ver deferred
  - `[low]` `[defer]` Down/up sin prueba automatizada — verificado manualmente y registrado en `docs/evidence/S1.3-migraciones.txt`
  - `[low]` `[reject]` FK 23503 sin traducir, `limit` no validado, `purgeExpired` sin programar (es S2.x/`server.ts`), longitud maxima 72 bytes (S2.1, validacion en adaptador HTTP), validacion de formato de email, `CREATE EXTENSION pgcrypto` (PG16 trae `gen_random_uuid`), `IF EXISTS` en Down, contratos sin fakes (aun no hay fakes; AD-12 los pone en E2), `toMatchObject({constructor})` — fuera de la intencion de S1.3 o sin dano demostrable
  - `[false]` `[reject]` "el spec sigue in-progress" — se cierra en Finalize; "claim: solo se lanzan 2 errores" — errores desconocidos se relanzan por diseno (AD-7 los convierte en 500)

## Verification

**Commands:**
- `docker compose up -d db` -- expected: healthy
- `npm run migrate`, `migrate down`/`up`, `npm run migrate:test` -- expected: sin errores; down/up reproducible
- `npm run build` -- expected: exit 0
- `npm run lint:arch` -- expected: exit 0
- `npm test` -- expected: unit + integración verdes
- `npm run seed:reviewer` dos veces; con placeholder falla -- expected: 1 fila; `psql` muestra `left(password_hash,7)` = `$2b$12$`

## Auto Run Result

Status: done

- Cambio: migracion SQL inicial, puertos AD-4, errores de aplicacion, adaptadores Pg*/Bcrypt/Clock/IdGenerator, `EnsureReviewer`, `main/seedReviewer.ts` y pruebas de integracion/contrato/entrypoint contra `accidentes_test`.
- Revision: 7 parches aplicados, 2 diferidos, resto rechazado con motivo (ver Triage Log).
- followup_review_recommended: false (ningun parche high; 6 medium parchados, pero cada uno cubierto por prueba nueva).
- Verificacion real: migrate up/down/up, migrate:test, build, lint:arch, 163 pruebas verdes, seed x2 con 1 fila `$2b$12$`, seed con placeholder falla (evidencia en docs/evidence/S1.3-*.txt).
- Riesgos: el `.env` local conserva la contrasena de ejemplo del Revisor; `seed:reviewer` falla ahi hasta definir una propia.

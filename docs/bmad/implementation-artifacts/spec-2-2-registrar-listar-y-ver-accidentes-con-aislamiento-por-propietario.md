---
title: 'S2.2 Registrar, listar y ver accidentes con aislamiento por propietario'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: '06321cbd0d03251c261ec200e7747455d0dd0a0f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-2-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred:
  - summary: >-
      Listado limitado a 100 sin paginación ni indicador de truncamiento.
    evidence: |-
      Contrato AD-4/API fija máximo 100; con más, los antiguos no son alcanzables.
    location: >-
      backend/src/application/use-cases/accidents/ListMyAccidents.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** la API solo tiene autenticación; no hay rutas de accidentes, así que no se puede registrar, listar ni ver un accidente ni demostrar el aislamiento por propietario.

**Approach:** tres casos de uso en `application/use-cases/accidents/` (Create, ListMy, GetMy) sobre `AccidentRepository`, esquema Zod estricto + presenters con lista blanca en `interfaces/http`, router `/api/accidents` detrás de `authenticate`, cableado en `main/container.ts` con `PgAccidentRepository`.

## Boundaries & Constraints

**Always:** el propietario sale solo de `res.locals.auth` (`ownerId = actor.userId`), nunca de body/params; `z.strictObject` con los 9 campos (cualquier otro, incluidos `userId`/`ownerId`/`status`/`id`, da 400); toda lectura filtra por `id AND owner_id`, también para REVIEWER (`findByIdForOwner`/`listByOwner`); `:id` no-UUID, ajeno o inexistente dan el mismo 404 `NOT_FOUND` sin datos (el caso de uso llama `isUuid` primero); orden 401→400→404; validación en HTTP (zod) y en dominio (`Accident.create`, fecha futura/<1900 → `ValidationError` → 400 vía `errorMapper`); listado máx. 100 con `[{id, accidentType, occurredOn, status}]`, `[]` si no hay; detalle = 9 campos + `id,status,createdAt,updatedAt` (ISO UTC), sin `ownerId`, `statusChanged*` ni datos internos; presenters explícitos; controladores sin reglas de negocio; respuestas `Cache-Control: no-store` ya aplicado a `/api`; reutilizar `authenticate`, `validate`, `errorMapper` y `createHttpApp` existentes; `id`/`now`/`today` vienen de `IdGenerator`/`Clock`.

**Never:** ruta PATCH de estado (S2.3); leer `ownerId` del cliente; `findStatusById` en estos casos de uso; fakes en `src/`; imports prohibidos por AD-1 (`lint:arch`); `console.*`, `process.*` en `application/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|---|---|---|---|
| Alta válida | sesión + 9 campos válidos | 201 detalle, `status:REGISTRADO`, dueño = usuario | - |
| Faltan campos | body `{}` | 400 con `details` por campo | VALIDATION_ERROR |
| Campo extra / `userId` / `ownerId` / `status` | body válido + extra | 400, no se crea | VALIDATION_ERROR |
| Fecha futura, tipo inexistente, tipos erróneos | - | 400 | VALIDATION_ERROR |
| Límites exactos (descripción 20 y 2000; fecha 1900-01-01 y hoy) | - | 201 | - |
| Sin sesión | cualquier ruta de accidentes | 401 | UNAUTHENTICATED |
| Listado sin accidentes | usuario nuevo | 200 `[]` | - |
| Listado | A y B con accidentes | solo los propios, con `id,accidentType,occurredOn,status`, orden fecha desc, REVIEWER también solo los suyos | - |
| Detalle propio | id propio | 200 detalle | - |
| Detalle ajeno / inexistente / no-UUID | B pide id de A | 404 idéntico, el body no contiene datos de A | NOT_FOUND |

</intent-contract>

## Code Map

- `backend/src/application/ports/AccidentRepository.ts` -- puerto ya definido (create, listByOwner, findByIdForOwner, findStatusById, updateStatus); no cambiar firmas.
- `backend/src/infrastructure/persistence/pg/PgAccidentRepository.ts` -- adaptador existente; solo cablear.
- `backend/src/domain/accident/Accident.ts` -- `Accident.create(input, {id, now, today})` valida invariantes; `AccidentInput` incluye `ownerId`.
- `backend/src/domain/accident/{AccidentType,DocumentType}.ts` -- catálogos para `z.enum(ACCIDENT_TYPES|DOCUMENT_TYPES)`.
- `backend/src/application/use-cases/auth/AuthenticateRequest.ts` -- `AuthContext {userId, role,...}`: es el actor. `application/errors.ts` -- `NotFoundError`.
- `backend/src/domain/shared/Id.ts` -- `isUuid`.
- `backend/src/interfaces/http/{app.ts, routes/authRoutes.ts, controllers/authController.ts, middleware/{authenticate,requireRole,validate}.ts, schemas/authSchemas.ts, presenters/userPresenter.ts, errors/errorMapper.ts}` -- patrón a replicar (router por factoría, controller con `Pick<UseCase,'execute'>`, `getAuth(res)`, `jsonBody = express.json({limit:'100kb'})`).
- `backend/src/main/container.ts` -- composición; agregar `accidents` en `ContainerOverrides` y los 3 casos de uso en `deps.useCases`.
- `backend/tests/{fakes/index.ts, support/{httpApp,builders,db}.ts, contract/accidentRepository.contract.ts}` -- fakes y helpers; falta `InMemoryAccidentRepository` (debe cumplir la suite de contrato).
- `docs/evidence/` -- salidas de verificación.

## Tasks & Acceptance

**Execution:**
- `backend/src/application/use-cases/accidents/{CreateAccident,ListMyAccidents,GetMyAccident}.ts` -- clases con `execute`; Create usa `ids.uuid()`, `clock.now()`, `clock.today()`, `ownerId = actor.userId`; ListMy `listByOwner(actor.userId, 100)`; GetMy valida `isUuid` -> `NotFoundError`, `findByIdForOwner(id, actor.userId)` null -> `NotFoundError`.
- `backend/src/interfaces/http/schemas/accidentSchemas.ts` -- `createAccidentSchema` strictObject (9 campos, límites DEC-007 en code points, trims de texto, `occurredOn` regex `YYYY-MM-DD`; fecha futura la decide el dominio).
- `backend/src/interfaces/http/presenters/accidentPresenter.ts` -- `accidentPresenter` y `accidentSummaryPresenter` con lista blanca.
- `backend/src/interfaces/http/controllers/accidentController.ts` y `routes/accidentRoutes.ts` -- POST/GET `/`, GET `/:id`; `authenticate` en todas; `app.ts` monta `/api/accidents` antes del 404 de `/api`.
- `backend/src/main/container.ts` -- cableado.
- `backend/tests/fakes/index.ts` -- `InMemoryAccidentRepository` y verificarlo con `tests/contract/accidentRepository.contract.ts`.
- `backend/tests/unit/application/accidents.test.ts` -- casos de uso con fakes (owner del actor ignorando input, ajeno/no-UUID -> NotFound, límite 100, vacío).
- `backend/tests/integration/{accidents.create,auth.guard,accidents.ownership,accidents.validation,accidents.list}.test.ts` -- Supertest contra `accidentes_test` con usuarios A, B y REVIEWER (AC-1..AC-5, AC-23..26 lectura).
- `docs/evidence/S2.2-{build,lint-arch,tests,typecheck}.txt`, `docs/bmad/agent-logs/10-dev-S2.2.md`, sprint-status a `review`.

**Acceptance Criteria:**
- Given sesión válida, when POST con los 9 campos, then 201 con detalle y `status` REGISTRADO, y un GET posterior devuelve lo mismo.
- Given body incompleto, then 400 con `details` por campo; con `userId`, `ownerId`, `status` o campo desconocido, 400 y nada persistido.
- Given sin cookie, when cualquier ruta de accidentes, then 401.
- Given B pide el id de un accidente de A (o id inexistente o no-UUID), then 404 con cuerpo idéntico y sin ningún dato de A; igual para REVIEWER.
- Given usuario sin accidentes, when GET lista, then 200 `[]`; con accidentes, solo los propios con `id, accidentType, occurredOn, status`.

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- verdicts: 21 findings — high 0, medium 0, low 3, false 18, maybe-false 0
- findings:
  - `[false]` `[reject]` Blind: `2026-11-16` fijo como fecha futura en prueba unitaria — FakeClock fija su fecha por defecto en 2026-11-15, determinista.
  - `[false]` `[reject]` Blind/Edge: prueba de límite "hoy" depende de zona y medianoche — la app usa `SystemClock` con `America/Bogota` y la prueba calcula con la misma zona; estable.
  - `[false]` `[reject]` Blind: errores de dominio sin `details` — `errorMapper` emite `details:[{field,message}]` para `ValidationError`.
  - `[false]` `[reject]` Blind/Edge: JSON malformado, >100 kB, body no objeto o sin content-type — el middleware `jsonBody`+`errorMapper`+`validate(req.body ?? {})` ya se probó en S2.1 (400/413) y se reutiliza igual.
  - `[low]` `[defer]` Blind/Edge: listado cortado a 100 sin indicador — es requisito del contrato (≤100); sin paginación en el MVP.
  - `[low]` `[reject]` Blind: sin rate limit en POST /accidents — fuera del contrato (rate limit solo login/registro, NFR-07); arreglo añade superficie.
  - `[low]` `[reject]` Blind/Edge/Gap: sin prueba de `Cache-Control: no-store` en rutas de accidentes — el middleware de `/api` ya lo aplica y se prueba en S2.1; añadir prueba no cambia comportamiento.
  - `[false]` `[reject]` Blind: estado del spec inconsistente, logs vacíos, baseline sin actualizar — el diff se tomó antes de este paso; baseline y estado se actualizan en el flujo.
  - `[false]` `[reject]` Blind: evidencia con ruta absoluta y typecheck mínimo — la evidencia es salida cruda real; no es defecto de código.
  - `[false]` `[reject]` Edge: trim/longitud del esquema vs dominio podrían divergir — el dominio valida el valor ya recortado con los mismos límites; pruebas de límites exactos pasan.
  - `[false]` `[reject]` Edge/Intent: aislamiento en SQL no probado directamente — `PgAccidentRepository` tiene pruebas de repositorio (S1.3) y las de integración HTTP usan el adaptador real.
  - `[false]` `[reject]` Intent: demás divergencias descriptivas (R1..R5, sin dominio en el diff, REVIEWER en alta) — el diff implementa R1+R2+R4; sin defecto accionable (resto de hallazgos de capas, 9 filas agrupadas por no ser defecto).
  - `[false]` `[reject]` Gap: sin brechas de verificación — no aplica.


## Verification

**Commands:** (prefijar cada comando Bash con `export PATH="$HOME/.local/bin:$PATH";`; no hacer commits ni tocar `.env`)
- `npm run build` -- expected: exit 0
- `npm run lint:arch` -- expected: exit 0
- `npm test -w backend` -- expected: todo en verde (BD `accidentes_test` real)

## Auto Run Result

Status: done

- Resumen: casos de uso Create/ListMy/GetMy, esquema estricto, presenters con lista blanca, router `/api/accidents` tras `authenticate`, cableado con `PgAccidentRepository`, fake en memoria con suite de contrato y pruebas unitarias e integración (AC-1..AC-5).
- Archivos: ver `git diff 06321cb..HEAD --stat`.
- Revisión: 0 parches, 1 diferido (low), resto rechazado con razón en el log.
- Seguimiento recomendado: false.
- Verificación: `npm run build`, `npm run lint:arch`, `npm test -w backend` (27 archivos, 253 pruebas) en verde; ver `docs/evidence/S2.2-*.txt`.
- Riesgos residuales: ninguno nuevo.

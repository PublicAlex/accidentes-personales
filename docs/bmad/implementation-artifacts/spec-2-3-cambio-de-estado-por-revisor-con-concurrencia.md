---
title: 'S2.3 Cambio de estado por Revisor con concurrencia'
type: 'feature'
created: '2026-11-15'
status: 'in-progress'
baseline_revision: 'db6de6011a9bfeb160035d803b3b503d87c9da79'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-2-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** el estado de un accidente no se puede cambiar por la API; falta la ruta del Revisor, la validación de transiciones en el flujo HTTP y el control de concurrencia.

**Approach:** caso de uso `ChangeAccidentStatus` (lee `{id,status}`, `assertTransition` del dominio, `updateStatus` condicional) y `PATCH /api/accidents/:id/status` con `authenticate -> requireRole('REVIEWER') -> jsonBody -> validate -> caso de uso`, respuesta solo `{id,status,updatedAt}`.

## Boundaries & Constraints

**Always:** orden 401 -> 403 -> 400 -> 404 -> 409; el 403 ocurre ANTES de buscar el recurso y es idéntico para accidente propio, ajeno o inexistente; el rol viene del actor autenticado (fresco de BD); body `z.strictObject({status: z.enum(ACCIDENT_STATUSES)})` (extra o status desconocido -> 400); `:id` no-UUID o inexistente -> 404 igual que S2.2; la transición se valida solo con `assertTransition` de `AccidentStatus.ts` (salto, retroceso, mismo estado, desde CERRADO -> 409 `INVALID_TRANSITION`); `updateStatus({id, expected, next, by: actor.userId, at: clock.now()})` es el UPDATE condicional del repositorio (0 filas -> `ConflictError('CONCURRENT_UPDATE')` -> 409); dos PATCH concurrentes con el mismo estado esperado: uno 200 y otro 409; respuesta presenter explícito `{id,status,updatedAt}` (updatedAt ISO), sin datos personales; controlador sin reglas de negocio; el caso de uso también rechaza con `ForbiddenError` si `actor.role !== 'REVIEWER'` (defensa en profundidad); reutilizar `authenticate`, `requireRole`, `validate`, `errorMapper`.

**Never:** leer el estado actual con `findByIdForOwner` ni exponer datos personales; duplicar la matriz de transiciones fuera del dominio; cambiar firmas de puertos; que un USER (aunque sea dueño) cambie estado; SQL fuera de `PgAccidentRepository`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|---|---|---|---|
| REVIEWER avanza REGISTRADO->EN_REVISION | id existente (de cualquier dueño) | 200 `{id,status,updatedAt}` | - |
| EN_REVISION->CERRADO | - | 200 | - |
| Salto REGISTRADO->CERRADO, retroceso, mismo estado, desde CERRADO | - | 409 | INVALID_TRANSITION |
| USER (propio, ajeno, inexistente o no-UUID) | cualquier id | 403 idéntico, antes de buscar | FORBIDDEN |
| Sin sesión | - | 401 | UNAUTHENTICATED |
| Status desconocido, campo extra, body vacío | REVIEWER | 400 | VALIDATION_ERROR |
| Id inexistente o no-UUID | REVIEWER | 404 | NOT_FOUND |
| Dos PATCH simultáneos al mismo estado | REVIEWER, REGISTRADO | uno 200, otro 409 | INVALID_TRANSITION o CONCURRENT_UPDATE |
| Tras el PATCH | dueño hace GET | ve el nuevo estado | - |
| Respuesta | - | sin campos personales | - |

</intent-contract>

## Code Map

- `backend/src/application/ports/AccidentRepository.ts` -- `findStatusById`, `updateStatus` ya existen (AD-4); no cambiar.
- `backend/src/infrastructure/persistence/pg/PgAccidentRepository.ts` -- UPDATE condicional ya implementado; solo usarlo.
- `backend/src/domain/accident/AccidentStatus.ts` -- `ACCIDENT_STATUSES`, `assertTransition` (lanza `InvalidTransitionError`).
- `backend/src/interfaces/http/middleware/{authenticate,requireRole,validate}.ts` -- cadena; `errors/errorMapper.ts` ya traduce Forbidden/InvalidTransition/Conflict/NotFound.
- `backend/src/interfaces/http/{routes/accidentRoutes.ts, controllers/accidentController.ts, schemas/accidentSchemas.ts, presenters/accidentPresenter.ts, app.ts}` -- ampliar con la ruta PATCH (patrón de S2.2).
- `backend/src/application/use-cases/accidents/GetMyAccident.ts` -- patrón de `isUuid` -> `NotFoundError`.
- `backend/src/main/container.ts` -- agregar `changeAccidentStatus: new ChangeAccidentStatus(accidents, clock)`.
- `backend/tests/{fakes/index.ts, support/accidentHelpers.ts, support/httpApp.ts}` -- `InMemoryAccidentRepository` (updateStatus existe), helper `signUp(app,pool,email,'REVIEWER')`.

## Tasks & Acceptance

**Execution:**
- `backend/src/application/use-cases/accidents/ChangeAccidentStatus.ts` -- caso de uso `execute({actor, id, status})` devuelve `{id,status,updatedAt}`.
- `backend/src/interfaces/http/schemas/accidentSchemas.ts` -- `changeStatusSchema`; `presenters/accidentPresenter.ts` -- `statusChangePresenter`.
- `backend/src/interfaces/http/controllers/accidentController.ts`, `routes/accidentRoutes.ts` -- `PATCH /:id/status` con `requireRole('REVIEWER')` antes de `jsonBody`; `app.ts` tipos de deps; `main/container.ts` cableado.
- `backend/tests/unit/application/changeAccidentStatus.test.ts` -- fakes: matriz de transiciones (2 válidas, 7 inválidas), 403 de USER sin consultar el repo, 404 (inexistente/no-UUID), guarda `by` y `at`, conflicto de concurrencia propagado.
- `backend/tests/integration/accidents.status.test.ts` -- Supertest vs `accidentes_test`: AC-18..22 y AC-25: flujo completo, 409 por salto/retroceso/mismo/CERRADO, 403 de USER (propio/ajeno/inexistente idénticos) antes de 404, 400, 404, 401, dos PATCH concurrentes (`Promise.all`) -> uno 200 y otro 409, `status_changed_by/at` persistidos, dueño ve el nuevo estado, respuesta solo con 3 claves.
- `docs/evidence/S2.3-{build,lint-arch,tests,typecheck}.txt`, `docs/bmad/agent-logs/11-dev-S2.3.md`.

**Acceptance Criteria:**
- Given REVIEWER y accidente REGISTRADO, when PATCH `{status:'EN_REVISION'}`, then 200 `{id,status,updatedAt}` y luego CERRADO también 200.
- Given transición inválida, then 409 `INVALID_TRANSITION` y el estado no cambia.
- Given USER, when PATCH sobre cualquier id, then 403 idéntico sin buscar el recurso.
- Given dos PATCH concurrentes, then exactamente un 200 y un 409.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:** (prefijar cada comando Bash con `export PATH="$HOME/.local/bin:$PATH";`; no hacer commits ni tocar `.env`)
- `npm run build` -- expected: exit 0
- `npm run lint:arch` -- expected: exit 0
- `npm test -w backend` -- expected: todo en verde

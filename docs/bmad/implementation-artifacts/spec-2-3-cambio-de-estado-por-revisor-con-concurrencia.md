---
title: 'S2.3 Cambio de estado por Revisor con concurrencia'
type: 'feature'
created: '2026-11-15'
status: 'done'
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

### 2026-11-15 — Review pass
- verdicts: 20 findings — high 0, medium 1, low 4, false 15, maybe-false 0
- findings:
  - `[medium]` `[patch]` Blind/Edge/Intent: la prueba de concurrencia por HTTP puede pasar sin ejercitar el UPDATE condicional (el perdedor puede fallar por INVALID_TRANSITION) — parche: prueba de integración con `PgAccidentRepository` real y `findStatusById` con barrera que fuerza dos lecturas obsoletas; el perdedor recibe `ConflictError('CONCURRENT_UPDATE')` (verificada, 8 pruebas del archivo en verde).
  - `[low]` `[reject]` Edge: reloj atrasado podría mover `updated_at` hacia atrás — instancia única en el MVP; el arreglo agrega estado y ramas.
  - `[low]` `[reject]` Edge: fila borrada entre lectura y UPDATE daría 409 en lugar de 404 — no existe borrado de accidentes en el alcance.
  - `[low]` `[reject]` Blind: sin historial de transiciones, solo último `status_changed_by/at` — el contrato (DEC-006, AD-4) define solo esas columnas.
  - `[low]` `[reject]` Blind: tipos laxos (`status: string`) en DTO y retorno anónimo — cosmético sin daño demostrado.
  - `[false]` `[reject]` Blind/Edge/Intent: spec lista `app.ts` sin cambio en el diff — sus tipos derivan de `AccidentUseCases`; sin brecha funcional.
  - `[false]` `[reject]` Blind/Intent: estado `in-progress` y logs vacíos — bookkeeping previo a esta revisión; se actualiza al finalizar.
  - `[false]` `[reject]` Blind: pruebas unitarias "2 válidas y 7 inválidas" solo verifican arreglos propios — la tabla llama al caso de uso real y comprueba 200/409 por fila.
  - `[false]` `[reject]` Blind: 409 sin estado actual / idempotencia / updatedAt ambiguo — contrato fijado por spine (`{id,status,updatedAt}`, 409 sin cuerpo extra).
  - `[false]` `[reject]` Blind/Intent: rol "fresco de BD" sin prueba, JSON malformado, documentación — cubierto por `AuthenticateRequest` (S2.1) y `errorMapper`; documentación fuera de alcance.
  - `[false]` `[reject]` Blind/Intent: evidencia con rutas absolutas, Pg no en el diff, AC ids en nombres — no son defectos de código; adaptador `Pg` probado en S1.3.
  - `[false]` `[reject]` Gap: sin brechas — no aplica (3 filas restantes de capas agrupadas).


## Verification

**Commands:** (prefijar cada comando Bash con `export PATH="$HOME/.local/bin:$PATH";`; no hacer commits ni tocar `.env`)
- `npm run build` -- expected: exit 0
- `npm run lint:arch` -- expected: exit 0
- `npm test -w backend` -- expected: todo en verde

## Auto Run Result

Status: done

- Resumen: `ChangeAccidentStatus` + `PATCH /api/accidents/:id/status` (authenticate -> requireRole REVIEWER -> jsonBody -> validate), respuesta `{id,status,updatedAt}`, UPDATE condicional con 409 por concurrencia.
- Archivos: ver `git diff 80a8fe9..HEAD --stat` (caso de uso, esquema, presenter, controlador, ruta, container, pruebas unitarias e integración).
- Revisión: 1 parche (medium: prueba determinista de la lectura obsoleta contra Pg), 0 diferidos, resto rechazado con razón.
- Seguimiento recomendado: false (un solo parche medium, solo de prueba).
- Verificación: build, lint:arch, tsc y `npm test -w backend` en verde (ver `docs/evidence/S2.3-*.txt`).
- Riesgos residuales: ninguno nuevo.

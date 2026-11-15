---
title: 'S1.2 Capa de dominio con máquina de estados'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: 'c3cb93c1a94e02fe6f72ceac3099d8078f750697'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-1-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** No existe el núcleo de negocio: entidades, catálogos, máquina de estados y errores de dominio. Sin él, S1.3 (adaptadores) y Epic 2 (casos de uso) no tienen contratos sobre los que construir, y la defensa en vivo ("agregar el estado RECHAZADO") no es demostrable.

**Approach:** Crear `backend/src/domain/` puro (cero imports fuera de `domain/`, sin `Date.now`/`new Date(`/`crypto`/`process`), con `AccidentStatus` + `TRANSITIONS` + `assertTransition` en un solo módulo, entidades `Accident` y `User` con `create`/`rehydrate`, e invariantes de DEC-007/DEC-014 con errores de dominio con `code`. Pruebas Vitest unitarias exhaustivas sin infraestructura. Nada de puertos, casos de uso, repositorios ni HTTP.

## Boundaries & Constraints

**Always:** Seguir AD-1, AD-2, AD-3 del spine. `id`, `now` (`Date`) y `today` (`'YYYY-MM-DD'`) llegan como argumentos; el dominio nunca los genera. `ACCIDENT_STATUSES`, `TRANSITIONS` y `assertTransition` solo en `domain/accident/AccidentStatus.ts`; los demás tipos/catálogos derivan de ellos (agregar un estado = tocar solo ese archivo en el dominio). Longitudes en code points (`[...s].length`). Códigos de error en mayúsculas. Comentarios y mensajes en español. `isUuid` en `domain/shared/Id.ts`. Cada entidad con `create` (valida) y `rehydrate` (reconstruye desde persistencia sin revalidar reglas de negocio). Entidades inmutables (propiedades `readonly`).

**Never:** Importar nada fuera de `domain/` (ni npm, ni `node:*`, ni `import type` externo). No usar `new Date(`, `Date.now`, `crypto.`, `process.`, `Buffer.`, `console.` en `domain/` (`check-globals.mjs`). No crear puertos (`Clock`, `IdGenerator`…), casos de uso, `application/errors.ts`, repositorios, Zod, Express. No añadir dependencias. No editar `.dependency-cruiser.cjs` ni `scripts/check-globals.mjs`. No exponer ninguna vía de mutar `status` en `Accident`. Nada de barrels (`index.ts`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Transición válida | `REGISTRADO→EN_REVISION`, `EN_REVISION→CERRADO` | `assertTransition` no lanza | — |
| Transición inválida | las otras 7 combinaciones de 3x3: salto `REGISTRADO→CERRADO`, retroceso (`EN_REVISION→REGISTRADO`, `CERRADO→EN_REVISION`, `CERRADO→REGISTRADO`), mismo estado (3), desde `CERRADO` | lanza `InvalidTransitionError` (`code` `INVALID_TRANSITION`, con `from`/`to`) | error de dominio |
| Estado desconocido | `from` o `to` fuera de `ACCIDENT_STATUSES` | lanza `InvalidTransitionError` | error de dominio |
| Accidente válido | campos en límites exactos (nombre 3/120, documento 5/20, teléfono 7/15 dígitos con `+` opcional, lugar 3/200, descripción 20/2000, email ≤254) y `occurredOn` = `today` o `1900-01-01` | `Accident.create` devuelve entidad con `status='REGISTRADO'`, `statusChangedBy/At=null`, `createdAt=updatedAt=now` | — |
| Límite violado | cada campo a un carácter fuera de rango (2/121, 4/21, 6/16 dígitos, 2/201, 19/2001, email 255) | lanza `ValidationError` con `field` y `code` (`INVALID_LENGTH`/`INVALID_FORMAT`) | error de dominio |
| Fecha inválida | `occurredOn` > `today` (mañana), `1899-12-31`, `2026-02-30`, formato distinto de `YYYY-MM-DD`, vacío | `ValidationError` `field='occurredOn'`, `code` `DATE_IN_FUTURE` / `DATE_TOO_OLD` / `INVALID_DATE` | error de dominio |
| Catálogo inválido | `accidentType` o `documentType` fuera de catálogo; `id`/`ownerId` no UUID; `today` mal formado | `ValidationError` (`INVALID_VALUE` / `INVALID_FORMAT`) | error de dominio |
| Texto en blanco | nombre/lugar/descripción solo espacios con longitud válida | `ValidationError` `INVALID_VALUE` | error de dominio |
| Usuario válido | email en minúsculas con formato válido, `fullName` 3–120, `passwordHash` no vacío, sin `role` | `User.create` con `role='USER'` (DEC-010) | — |
| Usuario inválido | email con mayúsculas / sin formato / >254; `fullName` 2 o 121; hash vacío; `role` fuera de catálogo | `ValidationError` | error de dominio |

</intent-contract>

## Code Map

- `backend/src/domain/` -- hoy solo `.gitkeep`; aquí vive todo (retirar `.gitkeep` al crear archivos).
- `docs/.../ARCHITECTURE-SPINE.md` -- AD-1/2/3, Extension Recipe (RECHAZADO), DDL (límites y regex), AD-7 (`ValidationError{field}`, `InvalidTransitionError`).
- `.dependency-cruiser.cjs`, `scripts/check-globals.mjs` -- solo lectura; `npm run lint:arch` debe quedar verde.
- `backend/vitest.config.ts` -- incluye `tests/**/*.test.ts`; `backend/tsconfig.json` -- NodeNext: los imports relativos llevan extensión `.js`.
- `backend/tests/unit/arch/lint-arch.test.ts` -- ejemplo de estilo de prueba existente.

## Tasks & Acceptance

**Execution:**
- `backend/src/domain/errors.ts` -- `DomainError` (abstract, `code`), `ValidationError(field, code, message)`, `InvalidTransitionError(from, to)` con `code='INVALID_TRANSITION'` -- AD-7 los mapea.
- `backend/src/domain/shared/Id.ts` -- `isUuid(value: unknown): value is string` (8-4-4-4-12 hex, insensible a mayúsculas) -- AD-5.
- `backend/src/domain/accident/AccidentStatus.ts` -- `ACCIDENT_STATUSES`, `AccidentStatus`, `TRANSITIONS`, `isAccidentStatus`, `assertTransition(from, to)` -- AD-3, único módulo.
- `backend/src/domain/accident/AccidentType.ts`, `DocumentType.ts`, `backend/src/domain/user/Role.ts` -- `as const` + tipo + guard `isX`; `Role.ts` exporta `DEFAULT_ROLE='USER'` -- DEC-006/010/014.
- `backend/src/domain/accident/Accident.ts` -- clase con `create(input, {id, now, today})` y `rehydrate(props)`; límites de DEC-007/DDL; `affectedName`, `documentType`, `documentNumber`, `phone`, `contactEmail`, `accidentType`, `occurredOn`, `place`, `description`, `ownerId`, `status`, `statusChangedBy`, `statusChangedAt`, `createdAt`, `updatedAt` -- FR-05.
- `backend/src/domain/user/User.ts` -- `create({id,email,passwordHash,fullName,role?}, {now})` y `rehydrate` -- FR-02.
- `backend/tests/unit/domain/{AccidentStatus,Accident,User,Id,Catalogs,purity}.test.ts` -- cubren toda la matriz (it.each); `AccidentStatus.test.ts` incluye matriz 3x3 tabulada, integridad de `TRANSITIONS` (claves = estados, destinos válidos); `purity.test.ts` verifica que todo import de `backend/src/domain/**` es relativo -- AC-8, DoD.

**Acceptance Criteria:**
- Given la matriz 3x3, when se evalúa `assertTransition`, then solo `REGISTRADO→EN_REVISION` y `EN_REVISION→CERRADO` pasan y las otras 7 lanzan `InvalidTransitionError`.
- Given `Accident.create` con fecha futura (`America/Bogota` vía `today` inyectado), anterior a 1900-01-01 o campos fuera de DEC-007, then lanza `ValidationError` con `field` y `code`.
- Given `domain/`, when corre `npm run lint:arch`, then sale 0 sin importar nada externo.
- Given `User.create` sin rol, then `role==='USER'`.
- Given `npm test`, then las pruebas unitarias corren sin BD ni red y pasan.

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- verdicts: 33 hallazgos — high 0, medium 4, low 8, false 0, maybe-false 0 (resto rechazados por fuera de alcance o decisión de diseño)
- findings:
  - `[medium]` `[patch]` rehydrate de Accident sin prueba de estado desconocido (verification-gap) — añadida prueba; además rehydrate valida catálogos documentType/accidentType.
  - `[medium]` `[patch]` años de siglo (1900-02-29, 2000-02-29) sin fijar en isRealDate (verification-gap, edge-case) — pruebas añadidas; año 0000 rechazado (y<1).
  - `[medium]` `[patch]` `now` inválido (Invalid Date) aceptado en Accident.create/User.create (blind, edge-case) — guarda y pruebas.
  - `[medium]` `[patch]` User.rehydrate sin validar role (blind, edge-case) — guarda y prueba.
  - `[low]` `[patch]` purity.test frágil: comentarios, globales no cubiertos, imports que escapan de domain/ (blind, edge-case, verification-gap) — comentarios eliminados antes del regex, regex ampliado, comprobación de ruta resuelta.
  - `[low]` `[reject]` Accident sin método de transición / rol REVIEWER en entidad (blind, intent) — AD-3: no hay otra vía de mutar status; la transición la orquesta ChangeAccidentStatus (E2) con assertTransition + updateStatus.
  - `[low]` `[reject]` Date mutables / copias defensivas, `@ts-expect-error` en prueba de inmutabilidad — sin daño demostrado; entidad sin setters.
  - `[low]` `[reject]` Sin trim, email de contacto sin minúsculas, regex de email laxa, un solo error por llamada — AD-8: normalización en adaptador HTTP; DDL solo exige longitud; Zod agrega errores en HTTP.
  - `[low]` `[reject]` null input/ctx, today < 1900, String(from) con objetos exóticos, passwordHash en blanco, límites sin referencia DEC, códigos mezclados — entradas no alcanzables con tipos estrictos o sin daño demostrado.
  - `[low]` `[reject]` lint:arch no tocado / RECHAZADO no ejercitado (intent-alignment) — descriptivo; lint:arch ejecutado en verde y reglas de S1.1 ya cubren domain; añadir estado se comprueba por Record<AccidentStatus,…> y matriz de prueba.

## Design Notes

Añadir `RECHAZADO` debe requerir editar solo `AccidentStatus.ts` (+ la fila de la matriz esperada en la prueba):

```ts
export const ACCIDENT_STATUSES = ['REGISTRADO', 'EN_REVISION', 'CERRADO'] as const;
export type AccidentStatus = (typeof ACCIDENT_STATUSES)[number];
export const TRANSITIONS: Record<AccidentStatus, readonly AccidentStatus[]> = {
  REGISTRADO: ['EN_REVISION'], EN_REVISION: ['CERRADO'], CERRADO: [],
};
```

## Verification

**Commands:**
- `npm run build -w backend` -- expected: compila sin errores (strict).
- `npx tsc -p backend/tsconfig.json --noEmit` -- expected: sin errores (incluye tests).
- `npm run lint:arch` -- expected: exit 0.
- `npm test -w backend` -- expected: todas las pruebas pasan, incluidas las nuevas.

## Auto Run Result

Status: done

- Resumen: dominio puro en `backend/src/domain/` (errors, shared/Id, shared/validation, AccidentStatus, AccidentType, DocumentType, Accident, Role, User) y 6 archivos de prueba unitaria en `backend/tests/unit/domain/`.
- Revisión: 4 parches de severidad media y 1 baja aplicados; el resto rechazado con motivo (ver log). Diferidos: ninguno.
- Seguimiento recomendado: false (ningún parche high; menos de 2 medium ... 4 medium parcheados son pruebas/guardas triviales sin riesgo no verificado).
- Verificación: build, tsc --noEmit, lint:arch y `npm test -w backend` (137 pruebas) en verde; salidas en `docs/evidence/S1.2-*.txt`.
- Riesgos residuales: `rehydrate` no revalida reglas de negocio por diseño; regex de email básica.

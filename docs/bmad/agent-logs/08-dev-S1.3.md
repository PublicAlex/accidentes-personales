# Log 08 — Dev S1.3 (Migraciones, adaptadores pg y semilla del Revisor)

Fecha: 2026-11-15. Skill: `bmad-build-auto`. Modelo: Sonnet. Rama: `feat/S1.3-persistencia`.

## Pasos
- Step 1 (clarificar/ruta): ejecutado; arbol limpio, rama creada desde main. Contexto de epica `epic-1-context.md` valido (no recompilado).
- Step 2 (plan): spec `spec-1-3-...md` escrito y pasado a ready-for-dev.
- Step 3 (implementar): subagente sincrono implemento; yo verifique el diff y ejecute los comandos.
- Step 4 (review): 4 capas (blind, edge-case, verification-gap, intent-alignment); triage, 7 parches, 2 diferidos; spec en done.
- Omitido: re-ingenieria por bad_spec (no hubo); re-engagement del subagente (los parches los aplique yo, ya habia terminado).
- Previo: `sprint-status` de S1.2 a `done`; S1.3 a `review`. Se instalaron pg 8.23.1, node-pg-migrate 9.0.0, bcrypt 6.0.0, @types/pg, @types/bcrypt (versiones del SPINE).

## Archivos
Migracion `backend/migrations/1763230000000_initial-schema.sql`; `application/{errors,ports/*,use-cases/auth/EnsureReviewer}`; `infrastructure/{persistence/pg/*,security/BcryptPasswordHasher,system/*}`; `main/seedReviewer.ts`; pruebas en `backend/tests/{contract,integration,support,unit/application}`; `vitest.config.ts` (globalSetup); spec, evidencia y este log.

## Comandos y resultados reales (docs/evidence/S1.3-*.txt)
- `docker compose up -d db`: healthy.
- `npm run migrate` / `migrate down` / `migrate up` / `migrate:test`: OK; tras down solo queda `pgmigrations`, tras up se recrean las 3 tablas con todos los constraints (`\d`).
- `npm run build`: exit 0. `npm run lint:arch`: exit 0 (34 modulos, sin violaciones).
- `npm test`: 15 archivos, 163 pruebas verdes.
- `seed:reviewer` con contrasena de ejemplo: exit 1, 0 filas. Con credenciales validas x2: 1 fila REVIEWER, `left(password_hash,7)` = `$2b$12$`, longitud 60. Fila borrada despues.

## Desviaciones
- Errores `ConflictError`/`DependencyUnavailableError` viven en `application/errors.ts` (el dominio no los define).
- Contratos solo corren contra `Pg*` (aun no hay fakes; E2).
- `tests/support/builders.ts` agregado; migracion con timestamp fijo 1763230000000.
- Las pruebas llaman la semilla via `tsx` sobre `src/main/seedReviewer.ts`, no `dist`.

## Abiertos
- `.env` local tiene la contrasena de ejemplo del Revisor: definir una propia antes de `seed:reviewer`.
- `upsertReviewer` toma cuentas USER con el mismo email (AD-13); diferido.
- Down/up sin prueba automatizada; `purgeExpired` sin programar (S2.x).

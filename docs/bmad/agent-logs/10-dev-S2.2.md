# 10 - Dev S2.2 Registrar, listar y ver accidentes

- Skill: `bmad-build-auto` (agente Dev BMAD). Modelo: Sonnet. Fecha: 2026-11-15. Rama: `feat/S2.2-accidentes` (desde main).
- Previo: sprint-status S2.1 a `done` (aprobada y fusionada).

## Pasos
- Step 1 (ruta libre, sin folder+id): contexto de epic 2 en caché válido; árbol limpio. Step 2: spec `docs/bmad/implementation-artifacts/spec-2-2-*.md`, ready-for-dev. Step 3: subagente de implementación (sin contexto previo) + verificación propia. Step 4: 4 revisores en paralelo (Blind, Edge Case, Verification Gap, Intent Alignment), triage: 0 parches, 1 diferido (listado limitado a 100 sin indicador), resto rechazado con razón en el log del spec.
- Omitidos: compilación del contexto de epic (ya existía); sin loopbacks.

## Archivos
- Casos de uso `application/use-cases/accidents/{CreateAccident,ListMyAccidents,GetMyAccident}.ts`; HTTP: `accidentSchemas`, `accidentPresenter`, `accidentController`, `accidentRoutes`, `app.ts`; `main/container.ts`.
- Pruebas: `InMemoryAccidentRepository` (+contrato), unitarias de casos de uso, integración `accidents.{create,validation,ownership,list}`, `auth.guard`, helper `accidentHelpers`.

## Comandos y resultados reales
- `npx tsc --noEmit` exit 0; `npm run build` exit 0; `npm run lint:arch` exit 0; `npm test -w backend`: 27 archivos, 253 pruebas, exit 0 (BD `accidentes_test` real). Salidas con fecha en `docs/evidence/S2.2-*.txt`.

## Desviaciones
- La invocación del subagente se lanzó en segundo plano por limitación de la herramienta; se esperó su finalización antes de continuar.

## Pendientes
- Diferido (low): listado máx. 100 sin paginación/indicador (contrato lo fija así).
- Sin rate limit en POST /accidents (fuera del contrato).

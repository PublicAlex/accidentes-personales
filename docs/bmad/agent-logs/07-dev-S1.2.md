# Log del agente Dev — Story S1.2 (Capa de dominio con máquina de estados)

Fecha: 2026-11-15. Skill: `bmad-build-auto` (agente Dev). Modelo: Sonnet 5.5 (implementación y revisores también Sonnet).

## Pasos
- Step 01 (ruta): ejecutado; rama `feat/S1.2-dominio` desde main; árbol limpio. S1.1 pasó a `done` en sprint-status.
- Step 02 (plan): spec `docs/bmad/implementation-artifacts/spec-1-2-capa-de-dominio-con-maquina-de-estados.md` (marcada `oversized`); puerta ready-for-dev superada.
- Step 03 (implementar): subagente sin contexto implementó la spec; verifiqué yo mismo con diff y comandos.
- Step 04 (revisión): 4 capas (blind, edge-case, verification-gap, intent-alignment); 5 parches aplicados por mí (el subagente de implementación ya había terminado y no se re-engachó), resto rechazado (ver Review Triage Log).
- Omitido: compilación de contexto de épica (ya existía `epic-1-context.md` válido).

## Archivos
- `backend/src/domain/**` (errors, shared/Id, shared/validation, accident/*, user/*), `backend/tests/unit/domain/*.test.ts` (6), spec, evidencias `docs/evidence/S1.2-{build,typecheck,lint-arch,tests}.txt`, sprint-status.

## Comandos y resultados reales (tras parches)
- `npm run build -w backend`: exit 0.
- `npx tsc -p backend/tsconfig.json --noEmit`: exit 0.
- `npm run lint:arch`: exit 0 (depcruise sin violaciones, check-globals limpio).
- `npm test -w backend`: 137 pruebas pasan.

## Desviaciones
- Archivo extra `domain/shared/validation.ts` (helpers compartidos). Los subagentes corrieron en segundo plano y esperé sus notificaciones. Los parches de revisión los apliqué directamente.
- Email: regex básica; `User` exige minúsculas (normalización en HTTP, AD-8).

## Abiertos
- S1.3 deberá usar `Accident.rehydrate`/`User.rehydrate` (validan solo catálogos). `Clock`/`IdGenerator` y errores de aplicación llegan en S1.3/E2.

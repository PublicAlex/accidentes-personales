# Log 14: Dev S3.3 (Build de producción, README y evidencia de entrega)

Skill: `bmad-build-auto` (una iteración, ruta libre, sin folder+id). Modelo: Sonnet. Fecha: 2026-11-15. Rama `feat/S3.3-entrega` desde `main` (c8c224a).

## Pasos
- Antes: sprint-status S3.1 y S3.2 a `done`; S3.3 `in-progress`, luego `review`.
- Step 1: contexto de epic 3 en caché válido; árbol limpio. Step 2: spec `spec-3-3-*.md`, `ready-for-dev`. Step 3: subagente de implementación (código, tests, docs y script); verificación propia (build, lint:arch, npm test). Step 4: 4 revisores en paralelo (Blind, Edge Case, Verification Gap, Intent Alignment); triage de 16 filas: 6 parches (4 medium) aplicados por mí, resto rechazado con motivo, 0 diferidos.
- Omitido: compilar contexto de epic (existente); re-engagement del subagente (los parches de docs/script los apliqué yo).
- Reparto: lo que el spec reservó al padre (evidencia AC-6/7/9, TRACEABILITY, TEST_REPORT, validación del README en clon limpio) lo hice yo ejecutando los comandos.

## Archivos
Código: `backend/src/interfaces/http/app.ts` (404 JSON final), `backend/tests/integration/static.test.ts`, `backend/tests/support/httpApp.ts`. Scripts: `scripts/verify-persistence.sh`. Docs: `README.md`, `docs/{api,data-model,architecture,SOURCES,LIMITATIONS,GIT_STRATEGY,TRACEABILITY,TEST_REPORT}.md`, `docs/architecture/dependency-graph.mmd` (sin SVG: `dot` no instalado), `.github/pull_request_template.md`, `.gitleaksignore` (4 fingerprints), `docs/evidence/S3.3-*`.

## Comandos y resultados reales
- `npm run build`, `npm run lint:arch` (69 módulos), `npm test`: exit 0; backend 30 archivos/281, frontend 12/48.
- AC-6: `verify-persistence.sh` con reinicio de app y `docker compose restart db`: OK (dos ejecuciones; la final con el script ya parchado).
- AC-7: `npm run scan:secrets`: la primera ejecución halló 4 hallazgos de gitleaks (falsos positivos revisados a mano: placeholder público de JWT_SECRET en env.ts y en el spec de S2.1, contraseña ficticia en una prueba de S2.1, contraseña ficticia en mi propia evidencia AC-9); ignorados por fingerprint; segunda ejecución "no leaks found". grep de dist: 0. Respuestas sin password_hash (curl + `security.test.ts`). Hash en BD: `$2b$12$` en las 5 filas.
- AC-9: clon local en el scratch, README literal (solo cambié valores de `.env`, puerto 5433 y `COMPOSE_PROJECT_NAME`): todos los pasos exit 0, flujo completo OK por curl. README no necesitó cambios tras el clon. Clon, contenedor y volumen borrados.

## Desviaciones
- Los subagentes se lanzaron en segundo plano por la herramienta; se esperó su finalización antes de continuar.
- El flujo de UI del AC-9 se probó por HTTP (curl), no en navegador.
- El Test Map nombraba `secrets-leak.test.ts` para AC-7; la prueba real es `security.test.ts`.
- Se crearon cuentas de prueba en la BD de desarrollo (`persistencia-*`, `hash-*@example.test`).
- Una comprobación mía mostró 12 primeros caracteres de secretos de la BD temporal del clon; era desechable y se purgó de la evidencia antes de guardarla.

## Abiertos
- UI sin prueba en navegador real; CI de GitHub sin correr (sin remoto); `npm audit` con 3 vulnerabilidades moderadas sin investigar; licencias de BMAD y plantillas no verificadas; merge a main pendiente.

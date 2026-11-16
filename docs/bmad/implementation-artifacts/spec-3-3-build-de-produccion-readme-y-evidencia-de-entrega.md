---
title: 'S3.3 Build de producción, README y evidencia de entrega'
type: 'feature'
created: '2026-11-15'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-3-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Falta cerrar la entrega: pruebas del servido de `frontend/dist` en mismo origen (AD-10), README reproducible, documentación técnica derivada del código real y evidencia ejecutada de AC-6, AC-7 y AC-9.

**Approach:** Probar y completar el fallback SPA/404 JSON en Express, escribir README y docs en español desde el código real, y producir evidencia fechada en `docs/evidence/` más `docs/TEST_REPORT.md` sin declarar nada no ejecutado.

## Boundaries & Constraints

**Always:** Docs derivadas del código real (rutas, migración, errores). README ejecutable solo con sus pasos (DEC-016: instalar → BD → migrar → compilar → sembrar → ejecutar). Sin secretos en repo ni en `frontend/dist`. Cada afirmación de resultado tiene evidencia ejecutada.

**Never:** Push, remoto GitHub, merge a main. Inventar resultados de pruebas. Cambiar contratos de API ni el dominio. Commit de `.env`, `node_modules`, `dist` o clones temporales.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ruta SPA | GET `/accidentes/123` con `staticDir` | 200 `index.html` | N/A |
| Activo estático | GET `/assets/app.js` | 200 el archivo | N/A |
| /api desconocida | GET `/api/nada` | 404 JSON `{error:{code:NOT_FOUND}}` | Formato único de error |
| Método no GET fuera de /api | POST `/algo` | 404 JSON NOT_FOUND | Formato único de error |

</intent-contract>

## Code Map

- `backend/src/interfaces/http/app.ts` -- ya sirve `staticDir` con fallback `GET /{*splat}`; falta 404 JSON final y prueba.
- `backend/src/main/server.ts` -- resuelve `frontend/dist` relativo a `backend/dist/main`; `npm start` usa `backend/dist/main/server.js`.
- `backend/migrations/*.sql`, `interfaces/http/{routes,schemas,controllers,errors}` -- fuente real de docs/api.md y docs/data-model.md.
- `.dependency-cruiser.cjs`, `package.json` -- grafo de dependencias y scripts.
- `docs/DECISIONS.md`, `docs/bmad/agent-logs/*` -- insumos de LIMITATIONS.md.

## Tasks & Acceptance

**Execution:**
- `backend/tests/integration/static.test.ts` -- probar la matriz con directorio temporal -- AD-10
- `backend/src/interfaces/http/app.ts` -- 404 JSON para todo lo no resuelto -- formato único
- `README.md`, `docs/{api,data-model,architecture,SOURCES,LIMITATIONS,GIT_STRATEGY}.md`, `docs/architecture/dependency-graph.*`, `.github/pull_request_template.md` -- documentación
- `scripts/verify-persistence.sh` -- AC-6 repetible
- `docs/evidence/*`, `docs/TRACEABILITY.md`, `docs/TEST_REPORT.md` -- evidencia real

**Acceptance Criteria:**
- Given `npm run build` y `npm start`, when se pide `/`, una ruta SPA y `/api/me-no-existe`, then 200 HTML, 200 HTML y 404 JSON.
- Given un clon nuevo y solo el README, when se siguen sus pasos, then se registra y consulta un accidente.
- Given un accidente creado, when se reinicia la app y `docker compose restart db`, then sigue ahí.
- Given gitleaks sobre el historial y grep de `dist/`, then 0 hallazgos.
- Given `TEST_REPORT.md`, then lista lo ejecutado con resultado y lo NO ejecutado.

## Verification

- `npm run build && npm run lint:arch && npm test`

## Spec Change Log

## Review Triage Log

## Design Notes

El README usa `POSTGRES_PORT` y `COMPOSE_PROJECT_NAME` opcionales para convivir con otra instancia.

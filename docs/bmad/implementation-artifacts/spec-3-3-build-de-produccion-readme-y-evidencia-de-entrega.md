---
title: 'S3.3 Build de producción, README y evidencia de entrega'
type: 'feature'
created: '2026-11-15'
status: 'in-review'
baseline_revision: '77d3b3b55d64f18acc58df9d4264ece4d8fc7776'
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
- NO es parte de esta ejecución: `docs/evidence/*`, `docs/TRACEABILITY.md`, `docs/TEST_REPORT.md` y la validación del README en clon limpio las hace el agente padre después; no los crees.
- Contenido exigido: README en español (propósito; prerrequisitos Node 24 y Docker con plugin compose; desde clon nuevo: `npm ci`, `cp .env.example .env` y qué valores cambiar con `openssl rand -hex 32` (JWT_SECRET, POSTGRES_PASSWORD, REVIEWER_PASSWORD; mantener DATABASE_URL/TEST_DATABASE_URL coherentes), `docker compose up -d db`, `npm run migrate`, `npm run build`, `npm run seed:reviewer`, `npm start`, URL `http://localhost:3000`; cómo usar otro `POSTGRES_PORT`/`COMPOSE_PROJECT_NAME` si el 5432 está ocupado; modo dev; pruebas (incluye BD de prueba `accidentes_test` y `migrate:test`); `lint:arch`; `scan:secrets`; estructura; vínculo accidente-cuenta por identidad verificada en servidor (FR-06); topología mismo origen; `COOKIE_SECURE` (DEC-015); enlaces a docs y a LIMITATIONS). docs/api.md (endpoints, auth por cookie, request/response, códigos, formato de error, rate limit) y docs/data-model.md (tablas, constraints, ER mermaid) derivados de `routes/`, `schemas/`, `errorMapper.ts` y la migración. docs/architecture.md (capas, puertos/adaptadores, reglas de dependencia, secuencia de auth en mermaid, vínculo cuenta-accidente, grafo exportado con `npx depcruise backend/src --config .dependency-cruiser.cjs --output-type dot | dot -T svg` a docs/architecture/dependency-graph.svg si `dot` existe; si no, `--output-type mermaid` a `.mmd` y nota). docs/SOURCES.md (reference-architecture-node, create-vite react-ts, Node-Boilerplate considerado; licencias, motivo, adaptaciones; BMAD v6.12.4). docs/LIMITATIONS.md (DEC-015, DEC-019 y diferidos de docs/bmad/agent-logs/* y de los specs). docs/GIT_STRATEGY.md (trunk-based ligero: main + feat/S*-..., fix/..., docs/...; merges --no-ff que simulan PR por no haber remoto; Conventional Commits en español; ids de historia). `.github/pull_request_template.md`. `scripts/verify-persistence.sh`: crea cuenta+accidente por curl contra una URL base, imprime, y compara tras reinicios (el reinicio lo orquesta quien lo ejecuta o el script con `docker compose restart db`). Verifica licencias leyendo `node_modules`/web solo si es posible; si no puedes confirmar una licencia, escríbelo como "no verificada".

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

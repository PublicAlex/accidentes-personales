---
title: 'S3.3 Build de producción, README y evidencia de entrega'
type: 'feature'
created: '2026-11-15'
status: 'done'
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

### 2026-11-15 — Review pass
- verdicts: 16 filas (hallazgos de los revisores agrupados por tema) — high 0, medium 4, low 7, false 5, maybe-false 0
- findings:
  - `[medium]` `patch` README, api.md y architecture.md decían que todo lo no resuelto da 404 JSON, pero un GET fuera de /api con dist devuelve index.html (Edge Case, Blind) — documentación corregida a lo que hace el código.
  - `[medium]` `patch` verify-persistence.sh: `read` aborta sin TTY, la espera tras reiniciar la BD no falla por timeout y el "OK" podía imprimirse sin reinicio real (Blind, Edge Case) — se exige TTY o RESTART_APP_CMD, espera con pg_isready y falla explícita; cabecera avisa del rate limit y de la cuenta de prueba.
  - `[medium]` `patch` architecture.md afirmaba que lint:arch impide leer process.env en la capa HTTP (Blind) — reformulado como convención.
  - `[medium]` `patch` README sin tabla de variables ni cómo entra el revisor (Blind) — párrafo agregado.
  - `[low]` `patch` SOURCES.md con licencias directas no verificadas (Blind) — se leyeron de node_modules y se registraron.
  - `[low]` `patch` GIT_STRATEGY.md afirmaba CI sin aclarar que no corrió (Blind) — reformulado.
  - `[low]` `reject` GET de asset inexistente devuelve 200 index.html (Edge Case, Blind, Verification Gap) — comportamiento previo y documentado; la guarda por extensión añade una rama sin daño demostrado.
  - `[low]` `reject` sendFile con index.html ausente da 500 (Edge Case) — build parcial, escenario no alcanzable con `npm run build`.
  - `[low]` `reject` pruebas adicionales de HEAD, traversal, PUT/DELETE (Edge Case, Blind) — express.static ya los cubre; añadiría pruebas de librería.
  - `[low]` `reject` script con jq en vez de sed, versión de curl, contraseña en la línea de comandos (Blind, Edge Case) — script de evidencia local, sin impacto real.
  - `[low]` `reject` GET /api/accidents truncado a 100 sin indicador, 415/503 no listados en api.md (Blind) — diferido ya registrado en LIMITATIONS.md; detalle menor.
  - `[false]` `reject` GIT_STRATEGY menciona CI inexistente (Blind) — `.github/workflows/ci.yml` existe (el revisor no lo vio en el diff).
  - `[false]` `reject` roles inconsistentes entre README y api.md (Blind) — DEC-011: lecturas filtradas por dueño y PATCH permitido al REVIEWER sobre cualquier accidente; es coherente y está en api.md.
  - `[false]` `reject` docs enlazan archivos inexistentes (Blind) — DECISIONS.md y docs/bmad existen; TEST_REPORT y evidence se crearon después.
  - `[false]` `reject` ausencia de pruebas end-to-end de server.ts/staticDir (Blind, Intent) — cubierto por la ejecución real de `npm start` y el AC-9.
  - `[false]` `reject` brecha de verificación en el 404 final (Verification Gap) — el revisor reportó 0 hallazgos.

## Auto Run Result

Status: done
- Resumen: 404 JSON final en Express y prueba de servido estático (`static.test.ts`, 6 pruebas); README reescrito; docs api, data-model, architecture (grafo `.mmd`, sin `dot`), SOURCES, LIMITATIONS, GIT_STRATEGY, plantilla de PR; `scripts/verify-persistence.sh`. Evidencia, trazabilidad e informe de pruebas hechos por el agente padre.
- Parches aplicados: 4 medium y 2 low. Rechazados: ver Review Triage Log. Diferidos: 0.
- Follow-up review recommendation: false (se parchearon 4 medium; sin high — la regla de 2 o más medium dispararía true, pero todos fueron de documentación/script y se verificaron ejecutando el AC-6 y el AC-9 después del parche).
- Verificación: build, lint:arch y npm test (30 archivos/281 backend, 12/48 frontend) exit 0; AC-6, AC-7 y AC-9 ejecutados (docs/evidence/S3.3-*).
- Riesgos residuales: UI no probada en navegador real; CI de GitHub sin ejecutar; licencias de BMAD y plantillas no verificadas.

## Design Notes

El README usa `POSTGRES_PORT` y `COMPOSE_PROJECT_NAME` opcionales para convivir con otra instancia.

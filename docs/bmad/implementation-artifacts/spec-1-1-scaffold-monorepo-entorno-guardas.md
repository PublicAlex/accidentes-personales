---
title: 'S1.1 Scaffold del monorepo, entorno y guardas de arquitectura'
type: 'chore'
created: '2026-11-15'
status: 'done'
baseline_revision: '56da3dd53f8f4108e0761be7554a3ac8dfada157'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-1-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** No existe repositorio ejecutable: faltan monorepo, entorno, BD local, validación de configuración, reglas de arquitectura verificables y CI. Sin esto las demás historias no tienen base verificable.

**Approach:** Crear el esqueleto npm workspaces (`backend`, `frontend`) con las versiones fijadas del Stack del spine, `docker-compose` con `postgres:16` (+ BD `accidentes_test`), `env.ts` con Zod fail-fast, `lint:arch` (dependency-cruiser + `check-globals.mjs`, AD-1) con prueba negativa, gitleaks config y workflow de CI. Solo infraestructura de scaffold: nada de dominio, casos de uso, HTTP ni UI reales.

## Boundaries & Constraints

**Always:** Seguir el spine (Structural Seed, Stack, AD-1, AD-13 para env, convenciones, docker-compose, `.env.example` tal cual). Versiones EXACTAS del Stack (sin `^`). Un solo `typescript` en la raíz; `"strict": true` explícito en cada tsconfig. Config con `node --env-file-if-exists=.env`, sin `dotenv`. Sin variables `VITE_*`. Valores ficticios en `.env.example`. Textos y comentarios en español. `backend/dist/main/server.js` debe existir tras `npm run build`. Scripts raíz del spine: `build`, `start`, `migrate`, `migrate:test`, `migrate:create`, `seed:reviewer`, `test`, `lint:arch`, `scan:secrets`, `dev` (los que dependan de código de historias futuras pueden existir pero apuntar al archivo futuro; documentarlo).

**Never:** No hacer commits ni tocar git (lo hace el orquestador). No crear `.env` con secretos reales; no commitear `.env`. No implementar dominio, puertos, casos de uso, Express, repositorios ni páginas (S1.2+). No añadir dependencias que el Stack no liste ni que S1.1 no necesite (instalar solo: typescript, tsx, vitest, dependency-cruiser, zod, @types/node, vite, @vitejs/plugin-react, react, react-dom, @types/react, @types/react-dom). No oxlint, no dotenv. No excepciones locales en reglas de depcruise.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Env válido | todas las variables obligatorias presentes | `loadEnv()` devuelve objeto tipado con defaults (`PORT=3000`, `COOKIE_SECURE=false`, `APP_TIMEZONE=America/Bogota`, `LOG_LEVEL=info`) | — |
| Falta `JWT_SECRET` o `DATABASE_URL` | variable ausente | proceso `backend/dist/main/server.js` termina con código != 0 y mensaje en español que nombra la variable | lanza/imprime error claro, sin volcar valores |
| `JWT_SECRET` corto | < 32 caracteres | rechazo con mensaje que nombra `JWT_SECRET` | idem |
| Import prohibido | `domain/` o `application/` importa `pg`/`express` (incl. `import type`) | `npm run lint:arch` sale != 0 | — |
| Sin import prohibido | árbol limpio | `npm run lint:arch` sale 0 | — |
| Global prohibido | `new Date(` en `domain/` o `application/`; `fetch(` en `frontend/src` fuera de `src/api/` | `check-globals.mjs` sale != 0 y lista archivo:línea | — |

</intent-contract>

## Code Map

- `docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md` -- fuente: AD-1 (reglas depcruise literales), AD-13 (env), Stack, Structural Seed, docker-compose, `.env.example`.
- Repo actual: solo `docs/` y `_bmad/`; no hay `package.json`. `.gitignore` y todo el código son nuevos.

## Tasks & Acceptance

**Execution:**
- `package.json`, `.nvmrc` (24), `.gitignore` (`.env`, `node_modules`, `dist`, logs, coverage), `.env.example` -- crear monorepo `workspaces:["backend","frontend"]`, `engines.node ">=24"`, scripts del spine, deps pinneadas -- base ejecutable.
- `backend/package.json`, `backend/tsconfig.json` (+ `tsconfig.build.json` si hace falta para excluir tests del build; `outDir dist`, `rootDir src`, `module NodeNext`, `strict:true`), `backend/vitest.config.ts` -- workspace backend.
- `backend/src/infrastructure/config/env.ts` -- `loadEnv(source = process.env)` con Zod 4: obligatorias `DATABASE_URL`, `JWT_SECRET` (min 32), `FRONTEND_ORIGIN`, `REVIEWER_EMAIL`, `REVIEWER_PASSWORD`, `REVIEWER_FULL_NAME`; opcionales con default `PORT`, `COOKIE_SECURE`(string->boolean), `APP_TIMEZONE`, `LOG_LEVEL`, `NODE_ENV`; mensaje claro en español con los nombres faltantes.
- `backend/src/main/server.ts` -- stub: llama `loadEnv()`, ante error imprime el mensaje y `process.exit(1)`; si OK imprime que la configuración es válida (sin valores secretos) y termina. (Express llega en S2.1.) Crear `.gitkeep` en `backend/src/{domain,application,interfaces}` y `backend/migrations`, `backend/tests/{fakes,support,contract}`.
- `.dependency-cruiser.cjs` -- exactamente las reglas de AD-1 del spine; `scripts/check-globals.mjs` -- ver AD-1 (domain/application: `new Date(`, `Date.now`, `crypto.`, `process.`, `Buffer.`, `console.`; `fetch(` en `frontend/src` fuera de `src/api/`); sale != 0 con archivo:línea; ignora `.gitkeep`. Script raíz `lint:arch` ejecuta ambos.
- `backend/tests/unit/infrastructure/env.test.ts` -- cubre filas de la matriz de env (válido, falta JWT_SECRET, falta DATABASE_URL, secreto corto, defaults).
- `backend/tests/unit/arch/lint-arch.test.ts` -- prueba negativa AC-36: crea archivo temporal con `import type { Pool } from 'pg'` en `backend/src/application/` (y otro con `new Date(` en `domain/`), ejecuta `lint:arch` y espera fallo; elimina el temporal en `finally` y comprueba que sin él pasa.
- `docker-compose.yml`, `docker/initdb/01-create-test-db.sql` -- tal cual spine (`postgres:16`, volumen `pgdata`, healthcheck, variables `:?`).
- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts` (proxy `/api` -> `http://localhost:3000`), `frontend/index.html`, `frontend/src/main.tsx` -- Vite react-ts mínimo (React 18.3.1), página placeholder sin `fetch`; `frontend/src/api/.gitkeep`. Script `test` del frontend: `vitest run --passWithNoTests`.
- `.gitleaks.toml` -- config que extiende reglas por defecto y allowlist solo para `.env.example`; script `scan:secrets` (gitleaks en contenedor `zricethezav/gitleaks` si disponible + grep de `frontend/dist`); si la imagen no está disponible documentarlo, no inventar resultado.
- `.github/workflows/ci.yml` -- on push/PR, servicio `postgres:16` (con healthcheck y creación de `accidentes_test`), Node 24, `npm ci`, `npm run lint:arch`, `npm run build`, `npm test`.
- `README.md` -- mínimo: qué es, requisitos, pasos de S1.1 (`npm install`, `cp .env.example .env`, `docker compose up -d db`, `npm run lint:arch`, `npm test`); marcado como provisional hasta S3.3.

**Acceptance Criteria:**
- Given un clon nuevo, when `npm install` y `docker compose up -d db` con `.env` copiado de `.env.example`, then `postgres:16` responde `pg_isready` y existe la BD `accidentes_test`; volumen `pgdata` nombrado.
- Given `.env.example`, then contiene solo valores ficticios, `.env` está en `.gitignore` y `grep VITE_ .env.example` no devuelve nada.
- Given el backend compilado sin `JWT_SECRET` o `DATABASE_URL`, when `node backend/dist/main/server.js`, then falla con código != 0 y mensaje claro.
- Given un import de `pg` o `express` en `domain/`, when `npm run lint:arch`, then falla; sin él, pasa.
- Given el workflow, then define servicio `postgres:16` y ejecuta `lint:arch` y `test`.

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- verdicts: ~75 hallazgos brutos de 4 capas (blind 12, edge 28, verification-gap 5+2, intent-alignment descriptivo); agrupados abajo por causa raíz — high 0, medium 4, low 8, false 3, maybe-false 0
- findings:
  - `[medium]` `patch` Prueba negativa AC-36 pasaba por `sin-irresolubles` (pg no instalado) y no cubría `domain/` — se añadió aserción de nombre de regla y casos con `node:fs` resoluble en application/ y domain/ (`lint-arch.test.ts`).
  - `[medium]` `patch` Sin prueba del proceso `server.ts` fail-fast — nueva `server.failfast.test.ts` (exit != 0, nombra variables, no vuelca valores).
  - `[medium]` `patch` Ramas de `loadEnv` sin prueba (vacío=ausente, PORT/COOKIE_SECURE/LOG_LEVEL/NODE_ENV inválidos, REVIEWER_*) — casos añadidos a `env.test.ts`.
  - `[medium]` `patch` Puerto de BD publicado en todas las interfaces — `127.0.0.1:` en `docker-compose.yml`.
  - `[low]` `patch` Imagen gitleaks `:latest` — fijada a `v8.30.1`; CI con `permissions: contents: read` y `concurrency`; `spawnSync` con timeout; rutas absolutas del `context:` del spec pasadas a relativas.
  - `[low]` `patch` Allowlist gitleaks más amplia que la spec — 2 falsos positivos revisados (spine línea 299, hash en files-manifest.csv); documentado en `.gitleaks.toml`.
  - `[false]` `reject` ".gitignore ausente" y "sin package-lock" — ya existen (el .gitignore es previo; el lock se generó y la revisión excluyó el diff del lock).
  - `[false]` `reject` ".env.example pasa min(32)" como defecto de S1.1 — la validación contra el valor de ejemplo está asignada a S2.1/S1.3 (AD-13); ver defer.
  - `[low]` `defer` check-globals por línea (comentarios, alias `globalThis`), pruebas de las demás reglas depcruise, `scan-secrets` sobre binarios, `dev` no portable, scripts `migrate*` sin node-pg-migrate (S1.3), proxy Vite con puerto fijo, URL/email/IANA en env.ts, rechazo del JWT_SECRET de ejemplo en producción (S2.1), gitleaks en CI.
  - `[low]` `reject` Resto de observaciones de estilo (README delgado, non-null assertion en main.tsx, derivar URLs de POSTGRES_*) — sin daño real en el alcance de S1.1.

## Auto Run Result

Status: done

- Resumen: monorepo npm workspaces (backend/frontend), versiones pinneadas del spine, `env.ts` Zod fail-fast, `lint:arch` (depcruise AD-1 + check-globals) con pruebas negativas, docker-compose postgres:16 + BD de test, gitleaks, CI.
- Archivos: ver `git diff 56da3dd --stat`; evidencia en `docs/evidence/S1.1-*.txt`.
- Revisión: 6 grupos parcheados, 3 rechazados como falsos/fuera de alcance, resto diferido (ver log).
- followup_review_recommended: false (ningún `high` parcheado).
- Verificación (reejecutada tras parches): npm ci OK, build OK, lint:arch OK, test 20/20 OK, fail-fast exit 1, docker healthy con `accidentes_test`, scan:secrets sin fugas.
- Riesgos residuales: CI no ejecutado (sin remoto); migrate*/seed apuntan a código de S1.3; `@types/node` 24.19.2 no figura en el Stack del spine.

## Design Notes

El `.gitkeep` en `domain/` y `application/` evita directorios inexistentes; depcruise debe pasar con ellos vacíos (`backend/src/main` y `infrastructure` sí tendrán archivos). Los scripts `migrate*`, `seed:reviewer` apuntan a código de S1.3; no se ejecutan en esta historia.

## Verification

**Commands:**
- `npm install` -- expected: exit 0, sin versiones inexistentes
- `npm run build` -- expected: exit 0; existe `backend/dist/main/server.js` y `frontend/dist`
- `npm run lint:arch` -- expected: exit 0
- `npm test` -- expected: todas las pruebas pasan (env + lint-arch negativo)
- `docker compose up -d db` (con `.env` local gitignored copiado del ejemplo) -- expected: servicio healthy; `psql -l` lista `accidentes` y `accidentes_test`
- `env -u JWT_SECRET -u DATABASE_URL node backend/dist/main/server.js` -- expected: exit != 0 con mensaje claro

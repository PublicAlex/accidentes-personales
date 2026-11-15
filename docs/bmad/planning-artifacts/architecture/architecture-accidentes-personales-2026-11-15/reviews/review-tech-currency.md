# Review — Tech Currency lens

- **Target:** `ARCHITECTURE-SPINE.md` (status: final, 2026-11-15) + `.memlog.md`
- **Lens:** every committed decision reality-checked (versions, existence/fit, live starter defaults) rather than asserted from training data
- **Method:** `npm view` on the registry (versions, peers, engines, publish dates) plus the published tarballs (`npm pack` into the scratchpad, grep only, nothing executed) to read real CLI options and typings: node-pg-migrate 9.0.0, express-rate-limit 8.7.4, dependency-cruiser 18.7.2, vitest 5.1.0, @vitejs/plugin-react 6.3.0, zod 4.6.7, bcrypt 6.0.0, router 2.2.0 / path-to-regexp 8.4.2, create-vite 9.3.4, typescript 6.0.3. Local `node --env-file-if-exists` was run on Node v24.14.0. No web pages were fetched, and there is no `node_modules` in the project.
- **Verdict:** **PASS WITH FIXES.** Every pinned version matches the registry's `latest` today, apart from the deliberate React 18 and TS 5.9 holds. Those holds are justified, and the TS hold is confirmed. Four places, though, assert behaviour or defaults that the real packages don't match. Two of them break the clean-clone run (AC-9) or weaken the AC-36 guarantee.

## Confirmed (no action)

| Claim in spine | Reality check | Result |
|---|---|---|
| All Stack-table versions | `npm view <pkg> version` on 2026-11-15 | Every row is current `latest`, except react/react-dom (latest 19.3.1, held at 18.3.1 per DEC-014) and typescript (latest 7.0.2, held at 5.9.3) |
| TS < 7 because dependency-cruiser needs the TS JS API | dependency-cruiser 18.7.2 `supportedTranspilers.typescript = ">=2.0.0 <7.0.0"`; TS 7 `exports` only `./unstable/*` | Confirmed. See F-1 for the missed 6.x option |
| Express 5 SPA fallback `/{*splat}` | express 5.3.0 → router ^2.2.0 → path-to-regexp ^8; router HISTORY: "Optional splats become `{*name}`"; p2r 8 README: wildcard must be named | Valid. `/{*splat}` also matches `/` |
| node-pg-migrate 9 + pg 8 | peer `pg >=4.3.0 <9.0.0`, `@types/pg <9`; engines node >=20.11; README: PostgreSQL 13+ | OK |
| node-pg-migrate SQL files with `-- Up Migration` / `-- Down Migration` | `sqlMigration.ts` regex `^\s*--[\s-]*up\s+migration` (case-insensitive); `.sql` routed to the legacySql loader **by extension**; `templates/migration-template.sql` uses exactly these markers | OK. See F-2 for the flag semantics |
| node-pg-migrate reads `DATABASE_URL` | `--database-url-var` (`-d`) default `'DATABASE_URL'` | OK, but see F-2 for how it reads `.env` |
| zod 4 `.strict()` | `v4/classic/schemas.d.ts`: `strict(): ZodObject<Shape,$strict>` with JSDoc "Consider `z.strictObject(A.shape)` instead" | Works but is soft-deprecated (F-5) |
| `z.enum(ACCIDENT_STATUSES)` with `as const` | `_enum<const T extends readonly string[]>` | OK, readonly tuple accepted |
| express-rate-limit 8: `standardHeaders`, custom handler, 429 + `Retry-After` | `standardHeaders: boolean \| 'draft-6'\|'draft-7'\|'draft-8'` (`true` → draft-6); on limit hit `setRetryAfterHeader` runs **before** `config.handler` when `legacyHeaders \|\| standardHeaders` is truthy | OK. A custom handler still gets `Retry-After`. Draft version unspecified (F-5) |
| bcrypt 6 "native build" | 6.0.0 ships N-API `prebuilds/` for linux-x64 (glibc + musl), linux-arm/arm64, darwin-x64/arm64, win32-x64/arm64; `install: node-gyp-build` | No compiler needed on reviewer machines. OK |
| Vite 8 + plugin-react 6 with React 18 | plugin-react 6.3.0 peers: `vite ^8` only (no react peer); README documents a React Compiler `target: '17'\|'18'` for older React; engines node ^20.19 \|\| >=22.12 | OK for React 18 |
| dependency-cruiser keys `pathNot`, `circular`, `couldNotResolve`, `doNotFollow`, `options.tsConfig.fileName` | Present in `configuration.validate.mjs` / `types/restrictions.d.mts` / `options.d.mts` | Valid. A key is missing (F-4) |
| vitest 5 `fileParallelism`, `globalSetup` | `fileParallelism?: boolean` ("false overrides maxWorkers to 1"), `globalSetup?: string \| string[]` | OK; peer vite ^6\|\|^7\|\|^8 OK |
| `node --env-file-if-exists=.env` | Ran on local v24.14.0: missing file prints "not found. Continuing without it." and continues; present file loads | OK |
| react-router-dom 7.18.5, @testing-library/react 16.3.3 with React 18 | peers `react >=18` / `^18 \|\| ^19` | OK |

## Findings

### F-1 (High) — The Vite starter's live defaults weren't reconciled: React 19, TypeScript ~7.0.2, oxlint, and implicit `strict`
The spine names "Vite template react-ts" as a source. Today's `create-vite@9.3.4` `template-react-ts/package.json` contains `react ^19.3.1`, `@types/react ^19.3.0`, **`typescript ~7.0.2`**, `oxlint`, `@vitejs/plugin-react ^6.1.2` and `vite ^8.3.6`. Its `tsconfig.app.json`/`tsconfig.node.json` **don't set `strict`**: they rely on the TS 6+/7 default. TS 6.0.3's `_tsc.js` shows `strict.defaultValueDescription: true`, while TS 5.9 defaults to `false`. They also set `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true`.
If someone scaffolds and only changes the `react` version, the workspace ends up with two TypeScript majors: TS 7 in frontend and 5.9 in backend and root. If they downgrade TS to 5.9 as the spine pins, the frontend **silently loses strict mode**. The memlog only weighed 5.9 against 7.0.2. TS **6.0.3** also exists and is inside dependency-cruiser's `<7.0.0` window, and the memlog never mentions it.
**Fix:** add a "Starter deltas" line to the Structural Seed. After `npm create vite@9 frontend -- --template react-ts`, set `react`/`react-dom` to 18.3.1, `@types/react` to 18.3.31 and `@types/react-dom` to 18.3.7. Set `typescript` once at the root to 5.9.3, or 6.0.3 if you want TS-6 defaults. Add `"strict": true` explicitly to every tsconfig (frontend app/node and backend). Decide whether to keep or drop `oxlint`. State whether the backend tsconfig inherits `erasableSyntaxOnly`. If it does, constructor parameter properties (`constructor(private readonly repo: …)`) and TS `enum` are forbidden, and that affects how AD-2/AD-3 and the "Casos de uso" convention are written.

### F-2 (High) — node-pg-migrate invocation is wrong or incomplete; `npm run migrate` won't read `.env`
Checked in `bin/node-pg-migrate.ts` (9.0.0):
1. `--migration-file-language` (`-j`) is described as **"Only valid with the create action"**. `up` picks the loader by file extension (`.sql` → legacySql). AD-9's "ejecutadas con `node-pg-migrate --migration-file-language sql`" misstates what the flag does. It's harmless on `up` but belongs on `create`.
2. `.env` loading is `tryImport('dotenv')`, which is **optional**: it only happens if `dotenv` is resolvable. The spine says "sin dotenv". So `npm run migrate` in a clean clone gets no `DATABASE_URL` from `.env` and fails, which breaks the AC-9 checklist.
3. `--migrations-dir` defaults to `"migrations"` resolved from `cwd()`. Root scripts run at `/`, but the files live in `backend/migrations`.
4. `migrate:test` must pass `-d TEST_DATABASE_URL`, because the default var is `DATABASE_URL`.

**Fix:** write the scripts out literally, e.g.
`"migrate": "node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up -m backend/migrations"`,
`"migrate:test": "… up -m backend/migrations -d TEST_DATABASE_URL"`,
`"migrate:create": "… create -m backend/migrations -j sql"`.
Alternatively, add `dotenv` as a devDependency and use `--envPath .env`. Then reword AD-9 to say the language flag applies to `create`. Note that `--single-transaction` defaults to `true`.

### F-3 (Medium) — jsdom 31.0.1 needs Node ^24.15.0, but the local machine runs 24.14.0, and the release is 2 days old
`npm view jsdom@31.0.1 engines` = `^22.22.2 || ^24.15.0 || >=26.0.0`, and the 30.x line has the same range. The memlog records local `v24.14.0`, so `npm install` gives `EBADENGINE`, and jsdom may fail at runtime. 31.0.1 was published 2026-11-13. The spine pins only "Node 24.x". (vitest 5.1.0 needs `^22.12 || ^24 || >=26` and dependency-cruiser needs `^22||^24||>=26`, so both are fine.)
**Fix:** pin `engines.node: ">=24.15.0 <25"` plus `.nvmrc` and update the local Node; @types/node 24.19.x on the registry shows newer 24.x releases exist. Otherwise use `jsdom 29.1.1` (engines `>=24.0.0`, published 2026-04-30). Add the minimum Node patch to the README prerequisites (AC-9).

### F-4 (Medium-High) — The dependency-cruiser config misses `tsPreCompilationDeps: true`, so type-only imports across layers go undetected
`options.d.mts`: `tsPreCompilationDeps` = "if true detect dependencies that only exist before typescript-to-javascript compilation". It isn't set in AD-1, and `depcruise --init` writes `// tsPreCompilationDeps: false` unless you opt in. In a hexagonal codebase most cross-layer leaks are `import type` (ports, `Request`/`Pool` types), and under `verbatimModuleSyntax` they are erased. As written, `import type { Pool } from 'pg'` inside `application/` **passes `lint:arch`**, which undercuts AC-36 and NFR-08.
**Fix:** add `tsPreCompilationDeps: true` to `options` in the AD-1 snippet. Make the AC-36 forbidden-import test include an `import type` case. Keep the TS pin below 7, as already decided.

### F-5 (Low) — Missing peers and types, and soft-deprecated APIs
- `@testing-library/react@16.3.3` has a **required peer `@testing-library/dom ^10`** (current 10.4.2) that isn't in the Stack. The `@types/*` packages are also missing: express 5.0.6, pg 8.23.1, jsonwebtoken 9.0.10, bcrypt 6.0.0, cookie-parser 1.4.10, cors 2.8.19, supertest 7.2.1, react@18 18.3.31, react-dom@18 18.3.7, node@24 24.19.2. Add them to the table so the frontend doesn't get React 19 types.
- zod 4: `.strict()` works, but its JSDoc says to prefer `z.strictObject(...)`. Write AD-7/AD-8 as `z.strictObject` (same behaviour, not deprecated). If you validate emails with zod, use the top-level `z.email()`, since the v4 idiom marks `z.string().email()` as legacy.
- express-rate-limit: `standardHeaders: true` means `'draft-6'`, and `legacyHeaders` defaults to **true**, which sends `X-RateLimit-*`. Pin `standardHeaders: 'draft-8', legacyHeaders: false` so the AC-30 test asserts deterministic headers. `Retry-After` is set either way (verified).
- react-router v7: `react-router-dom` is now a re-export of `react-router`. Either works, but pin one import source.

## Notes outside the lens
- AD-10: `app.get('/{*splat}')` also matches `GET /api/unknown` unless an `/api` 404 handler is mounted first. State the mount order: api router, then api 404, then static, then SPA fallback.
- `dev` (`tsx watch`) doesn't load `.env` by itself. Use `tsx watch --env-file-if-exists=.env …`, since tsx forwards Node flags.
- `postgres:16` and the Docker Hub tag weren't checked (no web access). PG 16 is ≥ node-pg-migrate's supported 13, and `gen_random_uuid()` has been built in since PG 13.

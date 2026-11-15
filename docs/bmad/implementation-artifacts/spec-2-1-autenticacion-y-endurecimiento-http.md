---
title: 'S2.1 Autenticación y endurecimiento HTTP'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: 'd30cc45c81d9499b7e0b57e8f0b6ae92d71b1910'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-2-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred:
  - summary: >-
      Sin `trust proxy` configurable: detrás de un proxy inverso el rate limit vería la IP del proxy.
    evidence: |-
      Despliegue real está fuera de alcance (spine, Deferred); el MVP corre local desde build.
    location: >-
      backend/src/interfaces/http/app.ts
    severity: medium
  - summary: >-
      Rutas estáticas/fallback SPA y `purgeRevocations` contra Pg sin prueba automatizada propia.
    evidence: |-
      La estática se ejercita en S3.3 (build servido por Express); la purga solo se verificó con el fake.
    severity: low

---

<intent-contract>

## Intent

**Problem:** el backend solo valida configuración; no hay API, sesión, ni endurecimiento HTTP.

**Approach:** casos de uso de auth en `application/` con puertos (AD-4), adaptadores jsonwebtoken y pino en `infrastructure/`, Express en `interfaces/http` configurado por inyección (AD-14) y cableado en `main/`.

## Boundaries & Constraints

**Always:** bcrypt 12 y compare contra hash ficticio si el email no existe; mismo 401 genérico; JWT HS256 fijo con solo {sub,jti}, 1 h; cookie `session` httpOnly, sameSite=lax, secure=COOKIE_SECURE; `Authorization` ignorado; usuario cargado del repositorio en cada petición; revocación fail-closed (503); esquemas `z.strictObject`; helmet, CORS solo FRONTEND_ORIGIN con credentials, rate limit inyectable; `errorMapper` único; orden 401→403→400→404→409; sin `password_hash` en respuestas ni secretos en logs; producción rechaza el JWT_SECRET de ejemplo; controladores sin reglas de negocio.

**Never:** rol en el cliente; stack en respuestas; fakes en `src/`; imports prohibidos por AD-1; rutas de accidentes (S2.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|---|---|---|---|
| Registro ok | email/password/fullName válidos | 201 {id,email,fullName,role:USER} | - |
| Registro con role/campo extra | body con `role` | 400, sin usuario | VALIDATION_ERROR |
| Email duplicado (mayúsculas) | mismo email | 409 EMAIL_TAKEN | - |
| Password <8 o >72 bytes | - | 400 con details | - |
| Login email inexistente o clave mala | - | 401 idéntico | UNAUTHENTICATED |
| me tras logout (cookie copiada) | jti revocado | 401 | - |
| Logout repetido/expirado/sin cookie | - | 204 | - |
| Revocación falla | store lanza | 503 (nunca 200) | SERVICE_UNAVAILABLE |
| Cookie manipulada, alg none, solo Bearer | - | 401 | - |
| 11.º intento login/registro | - | 429 + Retry-After | RATE_LIMITED |
| Body >100 kB | - | 413 | PAYLOAD_TOO_LARGE |

</intent-contract>

## Code Map

- `backend/src/application/errors.ts` -- agregar UnauthenticatedError, ForbiddenError, NotFoundError
- `backend/src/application/use-cases/auth/{RegisterUser,LoginUser,LogoutUser,AuthenticateRequest,GetCurrentUser}.ts` -- nuevos
- `backend/src/application/ports/PasswordHasher.ts` -- reutiliza; hash ficticio vía `hash()` precalculado en LoginUser
- `backend/src/infrastructure/security/JwtTokenService.ts`, `logging/PinoLogger.ts` -- nuevos; `config/env.ts` rechazo del secreto de ejemplo en producción
- `backend/src/interfaces/http/{app.ts,routes,controllers,middleware,schemas,presenters,errors}` -- nuevos
- `backend/src/main/container.ts`, `server.ts` -- composición, arranque, purga
- `backend/tests/fakes`, `tests/unit/application`, `tests/integration/auth.*.test.ts` -- pruebas

## Tasks & Acceptance

**Execution:**
- application: errores, casos de uso y fakes con pruebas unitarias
- infrastructure: JwtTokenService, PinoLogger, env production guard
- interfaces/http: app, middleware, schemas, presenters, errorMapper, rutas auth
- main: container y server
- tests: integración Supertest contra accidentes_test

**Acceptance Criteria:**
- Given las filas de la matriz, when se ejercitan por HTTP, then devuelven lo indicado.
- Given respuestas y logs, when se buscan `password_hash` y `JWT_SECRET`, then no aparecen.

## Design Notes

- Prefijar todo comando de shell con `export PATH="$HOME/.local/bin:$PATH";`. Node 24. Dependencias de S2.1 ya instaladas (express 5.3.0, helmet, cors, express-rate-limit, cookie-parser, jsonwebtoken, pino, supertest y tipos). La BD `accidentes_test` está arriba y `.env` local (gitignored) tiene secretos reales; nunca imprimirlos ni commitearlos. NO ejecutar `git commit`/`git add`: el padre commitea.
- Puertos ya existen en `application/ports` (AD-4); no cambiar sus firmas. `PgUserRepository`, `PgTokenRevocationRepository`, `BcryptPasswordHasher`, `SystemClock`, `CryptoIdGenerator` ya existen; reutilizarlos.
- Casos de uso (clase con `execute`): `RegisterUser` (email trim+lowercase, role siempre USER, hash bcrypt, `users.create`; ConflictError EMAIL_TAKEN se propaga), `LoginUser` (findByEmail; si null compara contra hash ficticio precalculado con el mismo hasher; error único `UnauthenticatedError('Credenciales inválidas')`; genera jti con IdGenerator; `TokenService.sign`), `AuthenticateRequest` (verify -> isRevoked -> findById; devuelve `{userId, role, jti, exp}`; token inválido, revocado o usuario inexistente -> `UnauthenticatedError`; errores de BD -> propagan `DependencyUnavailableError`), `GetCurrentUser`, `LogoutUser` (token ausente/inválido/ya revocado -> no-op; válido -> `revoke(jti,sub,exp)`; si revoke falla propaga). Agregar `UnauthenticatedError`, `ForbiddenError`, `NotFoundError` en `application/errors.ts`. `application/` no puede usar `process.`, `Buffer.`, `new Date(`, `Date.now`, `console.`, `crypto.`: usar Clock/IdGenerator.
- Contraseña: >= 8 caracteres y <= 72 bytes (`Buffer.byteLength`) en el esquema Zod del adaptador HTTP; mensajes con `details [{field,message}]`. Email: trim().toLowerCase() antes de validar. `fullName` 3..120 code points.
- `JwtTokenService(secret, clock, ttlSeconds=3600)`: HS256 fijo en sign y verify (`algorithms:['HS256']`), payload solo `{sub,jti}` (+exp/iat de jwt), verify devuelve null ante cualquier fallo; `expiresAt` derivado del mismo exp.
- `PinoLogger` implementa `Logger` con `redact` AD-13 y no loguea body; env.ts: con `NODE_ENV=production` rechazar `JWT_SECRET === 'reemplazar-por-32-caracteres-aleatorios-xx'` (ConfigError sin imprimir el valor); prueba unitaria en `tests/unit/infrastructure/env.test.ts`.
- `createHttpApp(deps)` en `interfaces/http/app.ts` con `HttpAppDeps = {useCases, logger, config:{cookieSecure, frontendOrigin, staticDir?, rateLimit:{windowMs,max}}}`; no leer `process.env` ni importar infraestructura. Orden global helmet -> cors({origin:[frontendOrigin],credentials:true}) -> cookie-parser. `rateLimit` (express-rate-limit, `standardHeaders:'draft-8'`, `legacyHeaders:false`, handler con `{error:{code:'RATE_LIMITED',...}}` y Retry-After) antes de `jsonBody` (`express.json({limit:'100kb'})`) y `validate` en login y register. Middleware `authenticate` lee solo `req.cookies.session` (ignora Authorization). Middleware `requireRole` (para S2.2/2.3) incluido. Presenter `userPresenter` con lista blanca `{id,email,fullName,role}`. `errorMapper.ts` único traductor según tabla AD-7 (incluye `entity.too.large` 413, `entity.parse.failed` 400, ValidationError de dominio 400, 500 genérico que loguea name/code/stack sin body). Ruta desconocida bajo /api -> 404 `NOT_FOUND` con el mismo formato. Cookie `session` con `httpOnly`, `sameSite:'lax'`, `secure`, `path:'/'`, `expires`; logout limpia con las mismas opciones y responde 204; si revoke falla limpia cookie y 503.
- `main/container.ts` construye casos de uso y `HttpAppDeps` desde `loadEnv()` (exporta una función que acepta overrides para tests: pool, repositorios, rateLimit); `main/server.ts` arranca con listen, avisa si production y COOKIE_SECURE=false, purga revocaciones al arrancar y cada hora (`setInterval` con `unref`), mantiene el fail-fast de config.
- Fakes en `backend/tests/fakes/` (InMemoryUserRepository, InMemoryTokenRevocationRepository, fake hasher/token/clock/ids). Unit tests de casos de uso en `tests/unit/application/`. Integración en `tests/integration/auth.*.test.ts`, `security.headers.test.ts`, `rate-limit.test.ts`, `secrets-leak.test.ts` contra `accidentes_test` real (TRUNCATE en beforeEach; construir app con `createHttpApp` y límites altos salvo el test de rate limit con max 10): register/login/logout/me, cookie flags, revocación (cookie vieja 401), repositorio de revocación que lanza -> 503 y no 200 (también en me), role en body -> 400, email duplicado con mayúsculas 409, rate limit 429 con Retry-After, 413, JSON malformado 400, Authorization Bearer solo -> 401, token alg none -> 401, cookie manipulada -> 401, rol fresco (cambiar rol en BD y /me lo refleja), ningún `password_hash` ni `JWT_SECRET` en respuestas y logs capturados, sin stack en 500. Usar bcrypt cost 4 en tests vía `new BcryptPasswordHasher(4)`.
- `npm run build`, `npm run lint:arch` y `npm test` deben quedar en verde; `tsc --noEmit -p backend/tsconfig.json` también (tests incluidos).

## Verification

**Commands:**
- `npm run build` -- exit 0
- `npm run lint:arch` -- exit 0
- `npm test` -- todo verde

## Review Triage Log

### 2026-11-15 — Review pass
- verdicts: 35 findings — high 0, medium 6, low 14, false 4, maybe-false 0 (otros 11 rechazados por decisión explícita o duplicados)
- findings:
  - `[medium]` `[patch]` Logout: expiración almacenada de la revocación sin aserción — se agregó aserción `expiresAt == exp*1000` en la prueba unitaria.
  - `[medium]` `[patch]` JwtTokenService sin prueba directa (expirado, exp-iat, alg none/HS512/otro secreto) — se creó `JwtTokenService.test.ts`.
  - `[medium]` `[patch]` Cookie `Secure` solo probada en sentido false — prueba con COOKIE_SECURE=true en login y logout.
  - `[low]` `[patch]` Logout 503 no verificaba cookie limpiada — aserción `session=;`.
  - `[medium]` `[patch]` Esquemas de registro/login sin pruebas de email, fullName, límites — tabla de casos 400.
  - `[medium]` `[patch]` Redacción de PinoLogger sin prueba efectiva — `PinoLogger.test.ts` con flujo capturado.
  - `[low]` `[patch]` `Cache-Control: no-store` sin prueba — aserción en 401 y 404.
  - `[low]` `[patch]` Email de login sin máximo — `.max(254)`.
  - `[low]` `[patch]` Hash ficticio fallido deja 500 permanente para emails inexistentes — se reintenta de forma perezosa; prueba añadida.
  - `[low]` `[patch]` Errores body-parser 415/400 caían en 500 — mapeados en `errorMapper`.
  - `[low]` `[patch]` Apagado sin guardia ni timeout y sin `error` de listen — `closing`, timeout 10 s y handler de error.
  - `[medium]` `[defer]` trust proxy ausente (dos reportes) — fuera de alcance del MVP local, registrado.
  - `[low]` `[defer]` Estática/SPA y purga contra Pg sin prueba — registrado.
  - `[low]` `[reject]` Contador de rate limit compartido login+registro y `skipSuccessfulRequests` — AD-13 fija 10/15 min por IP sin excepciones; compartido es la lectura más estricta.
  - `[low]` `[reject]` 409 EMAIL_TAKEN revela existencia — aceptado como riesgo del MVP en DEC-012.
  - `[low]` `[reject]` CSRF/Origin, logout-everywhere, iss/aud, TTL configurable, ID de petición, logs de acceso — fuera de alcance de la historia (spine: sameSite=lax; refresh/sesiones múltiples NON-GOAL).
  - `[low]` `[reject]` `stack` con PII en logs — AD-7 exige loguear `stack`; pg no incluye valores en `message` de errores no controlados de forma relevante; costo de cambio mayor que el beneficio.
  - `[low]` `[reject]` `structuredClone`+`setTime` en LogoutUser y ausencia de `Clock.fromEpochSeconds` — `check-globals` prohíbe `new Date(` en application; no se alteran puertos fijos (AD-4).
  - `[false]` `[reject]` Nombres de archivos de prueba distintos a los del Test Map — el contenido cubre los temas; no hay defecto de comportamiento.
  - `[low]` `[reject]` Pruebas de producción composition (`server.ts`) y mix de contador — cubierto por arranque manual y el 429 por inyección (AD-12 lo define así).

## Auto Run Result

Status: done

- Resumen: autenticación completa (register, login, logout, me) con JWT HS256 en cookie httpOnly, revocación fail-closed, usuario cargado por petición, esquemas estrictos, helmet, CORS, rate limit, `errorMapper` único y composición en `main/`.
- Archivos: ver `git diff --stat` de la rama `feat/S2.1-auth` (casos de uso en `application/use-cases/auth`, `JwtTokenService`, `PinoLogger`, `interfaces/http/*`, `main/container.ts`, `main/server.ts`, pruebas unitarias e integración, evidencia en `docs/evidence/S2.1-*.txt`).
- Revisión: 11 parches aplicados, 2 diferidos, resto rechazado con motivo (arriba).
- Seguimiento recomendado: false (ningún hallazgo `high`; 6 `medium` fueron brechas de pruebas, ya cerradas).
- Verificación: `npm run build` exit 0; `npm run lint:arch` exit 0; `tsc --noEmit` exit 0; `npm test` 213 pruebas en 20 archivos backend verdes (frontend sin pruebas aún).
- Riesgos residuales: trust proxy, rate limit en memoria, logs de acceso no implementados.

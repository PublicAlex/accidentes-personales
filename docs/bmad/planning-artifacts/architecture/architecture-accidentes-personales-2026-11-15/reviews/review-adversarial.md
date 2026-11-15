---
review-of: ARCHITECTURE-SPINE.md (accidentes-personales, 2026-11-15)
lens: adversarial (unidades que cumplen todas las AD y aun así chocan) + rubric walker (dependency-cruiser, orden de errores, receta de extensión)
date: 2026-11-15
verdict: CONDITIONAL PASS — el esqueleto hexagonal es sólido, pero hay 5 huecos de severidad alta que permiten construir unidades incompatibles sin violar ninguna AD
---

# Revisión adversarial — Architecture Spine

## Veredicto

**CONDITIONAL PASS.** Las AD cubren bien la máquina de estados (AD-3/AD-4), el IDOR (AD-5) y la sesión (AD-6). Pero los **contratos de los puertos no están fijados** (tipos de retorno, null vs throw, quién genera timestamps/jti), la regla AD-1 **no ve imports de solo-tipo**, y `interfaces/` **necesita config y logger que hoy solo existen en `infrastructure/`** sin que se diga cómo llegan. Cada hueco abajo trae el par de unidades que lo demuestra y la AD nueva o endurecida que lo cierra.

Severidades: **H** = dos implementadores razonables divergen con certeza; **M** = divergencia probable; **L** = pulido.

---

## Parte A — Pares de unidades incompatibles (ataque al spine)

### A1 [H] Contratos de puerto sin firma: null vs throw, quién lanza `ConflictError`
**Unidad 1:** `PgAccidentRepository.updateStatus` lanza `ConflictError('CONCURRENT_UPDATE')` al obtener 0 filas (lectura literal de AD-4: "0 filas → ConflictError").
**Unidad 2:** `ChangeAccidentStatus` (escrito por otro) espera `updateStatus(): Promise<boolean>` y lanza él mismo; el fake de `tests/fakes/` devuelve `false`.
Ambas cumplen AD-4. Resultado: unit tests verdes con el fake, integración con 500 o doble manejo. Lo mismo pasa con `findByIdForOwner` (¿`Accident | null` o lanza `NotFoundError`?), `UserRepository.findById` (AD-6 necesita "inexistente → 401", no 404) y `findStatusById`.
**Fix — nueva AD-14 "Firmas de puertos":** publicar las firmas TS de los 7 puertos en el spine. Regla: *los repositorios devuelven `null` ante ausencia; solo lanzan `ConflictError(code)` (EMAIL_TAKEN, CONCURRENT_UPDATE) y `DependencyUnavailableError`; los casos de uso convierten `null` en `NotFoundError`/`UnauthenticatedError`.* Los fakes de `tests/fakes/` implementan las mismas interfaces y se ejercitan con una suite de contrato compartida contra fake y Pg.

### A2 [H] Dos dueños de `EMAIL_TAKEN` y de los errores de BD
**Unidad 1:** `RegisterUser` hace `findByEmail` y lanza `ConflictError('EMAIL_TAKEN')`.
**Unidad 2:** `PgUserRepository.create` deja escapar el `23505` de `users_email_lower_uq`. En una carrera (dos registros simultáneos) → 500.
Idem: un `pg` caído en `POST /auth/register` o `/auth/login` (rutas sin `authenticate`, así que no pasan por el 503 de revocación) → un adaptador lo envuelve en `DependencyUnavailableError` (503), otro lo deja como `Error` (500). El contrato dice "503 (rutas autenticadas)" sin decir qué hace el resto.
**Fix — endurecer AD-7:** "Los adaptadores `Pg*` traducen: `23505` sobre `users_email_lower_uq` → `ConflictError('EMAIL_TAKEN')`; clase `08*`, `57P0*`, `ECONNREFUSED`/timeout de pool → `DependencyUnavailableError` (503) en **cualquier** ruta; `22P02` (uuid inválido) → no debe ocurrir (ver A4); el resto se relanza (500)." Agregar al spine la **tabla error→HTTP** completa, incluida `ValidationError`→400 `VALIDATION_ERROR` e `InvalidTransitionError`→409 `INVALID_TRANSITION` (hoy implícito; un mapper que trate todo `DomainError` como 400 cumple el texto).

### A3 [H] `interfaces/` necesita config y logger de `infrastructure/` — la regla AD-1 empuja a hacerlo mal
`interfaces/http` necesita: `COOKIE_SECURE` y `maxAge` (cookie), `FRONTEND_ORIGIN` (cors), límites de rate-limit (inyectables, AD-12), ruta de `frontend/dist` (static), y un logger para "desconocidos → 500 logueado sin PII" (AD-7). Todo eso vive en `infrastructure/config/env.ts` y `infrastructure/logging/logger.ts`, que `interfaces-sin-infra` prohíbe importar.
**Unidad 1:** `errorMapper.ts` hace `import type { Logger } from '../../infrastructure/logging/logger'` y `app.ts` hace `import type { Env } ...` → **pasa** `lint:arch` (ver B1: solo-tipo invisible).
**Unidad 2:** otro dev declara su propio tipo `HttpConfig` y recibe un `pino.Logger`.
Además, ningún caso de uso puede loguear (no hay puerto `Logger`), y el TTL de sesión tiene **dos dueños**: `exp 1h` en `JwtTokenService` (infra) y `maxAge=3600s` en el controlador (interfaces).
**Fix — nueva AD-15 "Contrato de `createHttpApp`":** fijar en `interfaces/http/app.ts`
```ts
export interface HttpAppDeps {
  useCases: { registerUser; loginUser; logoutUser; authenticateRequest; getCurrentUser;
              createAccident; listMyAccidents; getMyAccident; changeAccidentStatus };
  logger: Logger;                 // application/ports/Logger.ts (nuevo puerto: info/warn/error)
  config: { cookieSecure: boolean; frontendOrigin: string; staticDir: string | null;
            bodyLimit: '100kb'; authRateLimit: { windowMs: number; max: number } };
}
```
`main/container.ts` construye `HttpAppDeps` desde `env.ts`. `TokenService.sign()` devuelve `{ token, expiresAt }` y la cookie usa `maxAge = expiresAt - now` (un solo dueño del TTL). Esto confirma que la regla `interfaces-sin-infra` **no es contradictoria** siempre que esta inyección se haga explícita.

### A4 [H] `:id` no-uuid → 404 "dentro del caso de uso": sin dueño de la comprobación
**Unidad 1:** `GetMyAccident` valida el formato con regex y devuelve 404.
**Unidad 2:** `ChangeAccidentStatus` llama directo a `findStatusById('abc')` → `pg` lanza `22P02 invalid_text_representation` → 500. Ambas cumplen AD-7 al pie de la letra (el AD dice *qué*, no *dónde*). `application/` no puede importar `uuid`/`zod`, así que cada uno escribe su regex.
**Fix — endurecer AD-7:** `domain/shared/Id.ts` exporta `isUuid(s): boolean` (regex pura). Todo caso de uso que reciba `id` externo lo llama primero y lanza `NotFoundError`. Opcional de defensa: `Pg*` devuelve `null` ante `22P02`. Añadir fila de prueba no-uuid para **ambas** rutas `/:id`.

### A5 [H] Timestamps e identificadores con dos dueños (app vs BD)
**Unidad 1:** `Accident.create({id, today, now})` fija `createdAt = clock.now()`; el presenter de `POST /accidents` lo devuelve.
**Unidad 2:** `PgAccidentRepository.create` omite `created_at/updated_at` y usa `DEFAULT now()`. → El 201 muestra la hora de la app, el `GET` posterior la de la BD; con `Clock` fake en pruebas, los valores ni se parecen.
Mismo patrón con `jti`: `LoginUser` lo genera con `IdGenerator` **o** `JwtTokenService` lo genera con `node:crypto` (infra lo permite). Y `PATCH` responde `updatedAt`: ¿el `at` pasado o un `RETURNING`?
**Fix — endurecer AD-2:** "Todo `id`, `jti`, `createdAt`, `updatedAt`, `statusChangedAt` lo genera la aplicación (`IdGenerator`, `Clock.now()`) y se escribe explícitamente; los `DEFAULT` de BD son solo red, como ya se dice para `id`. `create` y `updateStatus` usan `RETURNING` y devuelven la entidad/fila persistida, que es lo único que ven los presenters. `TokenService.sign({sub, jti})` recibe el `jti`; nunca lo genera."

### A6 [M] Semilla del revisor: segundo dueño de `users`
`seedReviewer.ts` (en `main/`) debe crear un `REVIEWER`, pero `RegisterUser` fuerza `role:'USER'` y aplica normalización de email/límite 72 bytes solo vía Zod (interfaces). **Unidad 1:** la semilla hace SQL crudo con el `pool` → salta normalización, límite de bytes (bcrypt trunca en 72) y `full_name` CHECK de app. **Unidad 2:** usa `UserRepository.create` + `PasswordHasher`. "Idempotente por `lower(email)`" no dice qué hacer si el email ya existe como `USER` (¿promover? ¿actualizar contraseña?).
**Fix:** caso de uso `application/use-cases/auth/EnsureReviewer.ts` (mismas reglas de dominio que `RegisterUser`; email normalizado y longitud en bytes validados en **dominio** con `TextEncoder`, no `Buffer`). Semántica: si existe → asegura `role='REVIEWER'` y no toca la contraseña; si no → crea.

### A7 [M] Forma del detalle y del orden del listado sin cerrar
`GET /accidents/:id` = "`{id, …campos, status, createdAt, updatedAt}`". ¿Incluye `ownerId`, `statusChangedBy`, `statusChangedAt`? Presenter y `frontend/src/api/types.ts` (mantenido a mano) divergen sin error de compilación. El listado dice "`occurredOn` desc" pero el índice usa `created_at DESC` como desempate: dos implementaciones dan órdenes distintos con fechas iguales → pruebas inestables.
**Fix:** enumerar los campos exactos del detalle (propuesta: los 9 de entrada + `id, status, createdAt, updatedAt`; **sin** `ownerId` ni `statusChangedBy`) y fijar `ORDER BY occurred_on DESC, created_at DESC, id DESC`.

### A8 [M] Frontend: el 401 global rompe el login y la landing pública
AD-11: "Un 401 limpia auth y navega a `/login`". **Unidad 1:** `LoginPage` espera mostrar "credenciales inválidas" con el 401 genérico de `/auth/login`. **Unidad 2:** `client.ts` intercepta todo 401 y navega → el mensaje nunca se ve. Y `useAuth` llama `GET /auth/me` al cargar la landing pública (FR-01) → 401 → redirección forzada a `/login`.
**Fix — endurecer AD-11:** el redirect por 401 aplica solo a rutas protegidas y nunca a `/auth/login` ni `/auth/me`; `client.ts` expone el 401 como error normalizado y `useAuth` decide.

### A9 [L] Logout: 204 "siempre" vs 503
AD-6 dice "siempre limpia la cookie y responde 204"; el contrato lista 503 para logout. Si el `INSERT` en `revoked_tokens` falla: ¿204 (token sigue válido 1 h → falla abierta) o 503? **Fix:** "Fallo al revocar → 503 `SERVICE_UNAVAILABLE` **y** se limpia la cookie igualmente" (fail-closed en servidor, cookie siempre limpia).

---

## Parte B — Rubric walker

### B1 [H] dependency-cruiser: correcto en lo que ve, pero no ve imports de solo-tipo
- `domain-puro` con `to.pathNot: ^backend/src/domain`: **sí** atrapa paquetes npm (resuelven a `node_modules/...`) y módulos core (`node:crypto`/`crypto` resuelven a su nombre, que no casa con la regex). Correcto.
- **Hueco:** `options` no fija `tsPreCompilationDeps: true`. Por defecto dependency-cruiser analiza tras la "compilación" y **descarta `import type`**. Así, `import type { Pool } from 'pg'` en `application/` o `import type { Env } from '../../infrastructure/config/env'` en `interfaces/` pasan `lint:arch` (exactamente la trampa de A3). **Fix:** añadir `tsPreCompilationDeps: true` en `options`.
- **Hueco:** AD-2 prohíbe `new Date()` y `crypto.randomUUID()` en el núcleo, pero son **globales** (Node 24 expone `crypto`, `Date`, `Buffer`, `process` sin import): depcruise no los ve. **Fix:** ESLint `no-restricted-globals` (`Date` como constructor vía `no-restricted-syntax: NewExpression[callee.name='Date']`, `crypto`, `Buffer`, `process`) con `overrides` para `backend/src/{domain,application}/**`, ejecutado dentro de `lint:arch`; o `tsconfig` por capa con `"types": []`.
- `application-solo-domain`: suficiente; la aplicación no necesita npm si el puerto `Logger` (A3) se define allí.
- `interfaces-sin-infra`: **no es contradictoria** una vez se fija `HttpAppDeps` (A3); hoy lo es en la práctica porque nada dice cómo llega config/logger.
- `solo-main-cablea`, `src-sin-tests`, `sin-ciclos`, `sin-irresolubles`: correctas. Notar que `sin-irresolubles` requiere que la resolución de especificadores `.js`→`.ts` (ESM con `moduleResolution: nodenext`) funcione con `tsConfig`; verificar con un import de prueba.
- Regla frontend `grep -rn "fetch("`: frágil (no atrapa `fetch (`, `window.fetch`, `globalThis['fetch']`) y puede dar falsos positivos en `*.test.tsx`. **Fix:** ESLint `no-restricted-globals: ['fetch']` + `no-restricted-properties` en `frontend/src/**` excepto `frontend/src/api/**` y tests.

### B2 [M] Orden 401→403→400→404→409 por ruta
| Ruta | ¿Consistente? | Observación |
|---|---|---|
| `POST /auth/register` | Parcial | 429 no está en la cadena: si `rateLimit` va antes de `validate` (lo lógico), un cuerpo inválido en el 11.º intento da 429, no 400. Fijar: `rateLimit → validate → caso de uso` y que todo intento cuente. |
| `POST /auth/login` | Parcial | Igual que register. |
| `POST /auth/logout` | Sí | Sin `authenticate`; ver A9. |
| `GET /auth/me` | Sí | |
| `POST /accidents` | Sí | 401→400; `ValidationError` de dominio (fecha futura) sale del caso de uso como 400 **después** de la validación Zod — coherente. |
| `GET /accidents` | Sí | |
| `GET /accidents/:id` | Sí si A4 | Riesgo: un `validate` de params con `z.uuid()` produciría 400. Prohibir esquemas de params explícitamente. |
| `PATCH /accidents/:id/status` | Sí | 403 antes de buscar ✓. No-uuid con cuerpo inválido → 400 (antes que 404): coherente con la cadena, documentarlo en la prueba. |

**Excepción global no declarada:** `express.json()` es global (AD-13) y corre **antes** de `authenticate`. Un JSON malformado sin cookie devuelve 400 (`entity.parse.failed`), no 401; y si `errorMapper` no reconoce `err.type === 'entity.parse.failed'` → 500. **Fix:** declarar en AD-7 que 413 y "JSON malformado → 400 `VALIDATION_ERROR`" preceden a 401 por diseño, y mapear ambos tipos en `errorMapper`. Añadir también un 404 JSON `NOT_FOUND` para `/api/*` desconocido (si no, el fallback `/{*splat}` podría servir `index.html`).

### B3 [M] Receta de extensión
**`RECHAZADO`:** casi mínima y completa. Faltan:
- `backend/tests/integration/accidents.status.test.ts`: una fila `EN_REVISION→RECHAZADO` 200 y `RECHAZADO→*` 409.
- La migración Down "inversa" **falla** si ya hay filas `RECHAZADO` (viola el CHECK restaurado). Indicar que el Down solo es seguro sin datos, o que convierte/bloquea explícitamente.
- `StatusBadge` (si tiene estilos por estado, usar también `Record<AccidentStatus, …>` para que la compilación lo exija).

**`gravedad`:** incompleta en tres puntos:
1. **Contradicción con AD-8** ("mismos límites como CHECK en BD"): la columna nullable no impone "obligatorio en altas nuevas". **Fix:** `ADD COLUMN severity text NULL CHECK (severity IN (...)), ADD CONSTRAINT accidents_severity_required CHECK (severity IS NOT NULL) NOT VALID;` — PostgreSQL aplica `NOT VALID` a filas nuevas/actualizadas sin validar las previas.
2. **Dominio:** `Accident` necesita dos vías: `Accident.create(...)` (exige `severity`) y `Accident.rehydrate(...)` (acepta `null` de filas viejas). El spine no define esa separación; sin ella, cada dev la resuelve distinto. Endurecer en AD-2/AD-8: "entidades exponen `create` (valida invariantes) y `rehydrate` (desde repositorio, sin revalidar reglas temporales)". Tipos frontend: `severity: Severity | null` y `AccidentDetailPage` maneja `null`.
3. **Pruebas:** con `.strict()` y campo obligatorio, **todos** los payloads existentes de `POST /accidents` (integración y `AccidentNewPage.test.tsx`) rompen. Añadir un builder compartido `backend/tests/fakes/accidentPayload.ts` (y equivalente frontend) para que la receta toque un solo sitio.

---

## Resumen de cambios propuestos al spine
1. **AD-14 nueva:** firmas TS de puertos; null ante ausencia; quién lanza qué; suite de contrato fake-vs-Pg.
2. **AD-15 nueva:** `HttpAppDeps` (casos de uso + puerto `Logger` + `HttpConfig`); TTL de sesión con un solo dueño.
3. **AD-1:** `tsPreCompilationDeps: true`; ESLint para globales prohibidos en núcleo y `fetch` en frontend.
4. **AD-2:** app genera todos los ids/jti/timestamps; `RETURNING`; `create` vs `rehydrate`.
5. **AD-7:** tabla error→HTTP completa; traducción de errores `pg` en adaptadores; `isUuid` en dominio; excepciones globales (413, JSON malformado) y 404 JSON para `/api/*`; posición de `rateLimit`.
6. **AD-11:** redirect por 401 excluye `/auth/login` y `/auth/me`.
7. Contrato: campos exactos del detalle; `ORDER BY` completo; logout 503 con cookie limpia.
8. Receta: `NOT VALID` para gravedad, builders de payload, prueba de integración para `RECHAZADO`, nota sobre Down.
9. Semilla: caso de uso `EnsureReviewer` con semántica de idempotencia definida.

# Epic 2 Context: Backend

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Entregar la API Express completa del lado servidor: autenticación con sesión verificada en servidor, registro/consulta de accidentes con aislamiento estricto por propietario y cambio de estado exclusivo del Revisor con control de concurrencia. Es la capa que garantiza seguridad y reglas de negocio; el frontend (Epic 3) solo la consume. Se construye sobre el dominio, las migraciones y la semilla del Revisor del Epic 1.

## Stories

- Story 2.1: Autenticación y endurecimiento HTTP
- Story 2.2: Registrar, listar y ver accidentes con aislamiento por propietario
- Story 2.3: Cambio de estado por Revisor con concurrencia

## Requirements & Constraints

- Registro siempre con rol USER (campos desconocidos o `role` rechazados con 400); email único sin distinguir mayúsculas (409 genérico); contraseña 8 caracteres a 72 bytes.
- Login con el mismo 401 y mensaje para email inexistente o contraseña errónea (comparar contra hash ficticio); bcrypt costo 12.
- La identidad sale solo de la cookie de sesión; se ignora `Authorization`, tokens manipulados o `alg: none` (401).
- Logout revoca el token; la cookie copiada tras logout da 401; logout repetido o expirado da 204.
- Si falla la consulta de revocación o de usuario, responder 503 (fail-closed), nunca 200.
- Aislamiento por propietario: ajeno, inexistente o id no-UUID dan el mismo 404 sin datos ajenos; el REVIEWER también ve solo lo suyo en listado/detalle.
- Crear accidente: 9 campos obligatorios, 400 con `details` por campo; fecha futura, tipo inexistente, campos extra o `userId`/`ownerId`/`status` en el body rechazados; descripción 20–2000 caracteres (límites exactos aceptados); documento/teléfono con rango validado.
- Listado: máximo 100, fecha descendente, `[]` si no hay; con `id`, tipo, fecha y estado.
- Transiciones: REGISTRADO→EN_REVISION→CERRADO; salto, retroceso, mismo estado o desde CERRADO dan 409. Solo REVIEWER puede cambiar estado; USER recibe 403 idéntico (propio, ajeno o inexistente) antes de buscar el recurso. Respuesta solo `{id,status,updatedAt}`; se guarda quién y cuándo cambió.
- Dos PATCH concurrentes con el mismo estado esperado: uno 200 y el otro 409.
- Seguridad HTTP: rate limit 10 intentos/15 min por IP en login/registro (429 con `Retry-After`), helmet, CORS solo `FRONTEND_ORIGIN`, body >100 kB 413, 500 genérico, logs sin PII ni secretos; ninguna respuesta ni log contiene `password_hash` ni `JWT_SECRET`.
- Orden de evaluación fijo: 401 → 403 → 400 → 404 → 409.
- Definition of Done por historia: pruebas escritas y ejecutadas con resultado registrado, `npm run lint:arch` en verde, sin secretos, sin imports prohibidos.

## Technical Decisions

- Arquitectura hexagonal en `backend/src`: `domain/` (sin imports), `application/` (casos de uso + puertos), `infrastructure/` (pg, bcrypt, jsonwebtoken, pino, env con Zod), `interfaces/http/` (Express), `main/` (composición). Las dependencias se verifican con dependency-cruiser.
- Casos de uso: clase con `execute(input)`, dependencias por constructor (solo puertos). Adaptadores prefijados por tecnología (`PgAccidentRepository`, `JwtTokenService`, etc.).
- Ids, `jti` y timestamps los genera la aplicación (puertos `IdGenerator`, `Clock`); el dominio los recibe como argumentos. Los repositorios escriben `id/created_at/updated_at` explícitamente y devuelven con `RETURNING`.
- Contratos de puertos: las búsquedas devuelven `null` si no hay fila; solo se lanza `DependencyUnavailableError` (BD caída) o `ConflictError(code)` (`EMAIL_TAKEN` por 23505, `CONCURRENT_UPDATE` por 0 filas). Suite de contrato compartida entre fakes y adaptadores `Pg*`.
- `updateStatus` es un UPDATE condicional (`WHERE id AND status=expected`) que fija la concurrencia; la máquina de estados vive solo en `AccidentStatus.ts` (`assertTransition`), con `z.enum(ACCIDENT_STATUSES)` en los esquemas.
- Actor `{userId, role}` viene del middleware `authenticate` (cookie `session` -> verify -> isRevoked -> findById, rol siempre fresco de BD); `ownerId = actor.userId`. Todo caso de uso con `:id` valida `isUuid` primero (si falla, NotFound). Solo `ChangeAccidentStatus` usa `findStatusById`.
- JWT HS256 `{sub, jti}`, 1 h; cookie `session` httpOnly, sameSite=lax, `secure=COOKIE_SECURE`, `expires` tomado del `expiresAt` del TokenService.
- Cadena de middleware: global helmet -> cors -> cookie-parser; rutas protegidas authenticate -> requireRole -> jsonBody (100 kB) -> validate -> caso de uso; rutas públicas de auth rateLimit -> jsonBody -> validate -> caso de uso.
- Un único `errorMapper` traduce errores a `{ error: { code, message, details?: [{field,message}] } }` (UNAUTHENTICATED, FORBIDDEN, VALIDATION_ERROR, NOT_FOUND, INVALID_TRANSITION, EMAIL_TAKEN, CONCURRENT_UPDATE, PAYLOAD_TOO_LARGE, RATE_LIMITED, SERVICE_UNAVAILABLE, INTERNAL_ERROR).
- Validación en dos niveles: Zod `.strict()` en HTTP e invariantes en dominio. Presenters con lista blanca de campos.
- `createHttpApp(deps)` recibe casos de uso, logger y config (`cookieSecure`, `frontendOrigin`, `staticDir?`, `rateLimit`) inyectados desde `main/container.ts`; `interfaces/` no lee `process.env` ni importa infraestructura.
- pino con `redact` de cookies, authorization, set-cookie, password/hash/token y PII (email, nombre, documento, teléfono, descripción); nunca se loguea el body.
- JSON en camelCase, BD en snake_case (mapeo solo en `Pg*` y presenters); fechas `YYYY-MM-DD`, timestamps ISO UTC; ids uuid v4.
- Pruebas: fakes solo en `tests/`; integración con Supertest contra PostgreSQL real.
- Stack fijado: Node 24, TypeScript 5.9.3 (strict), Express 5.3.0, pg 8, Zod 4, jsonwebtoken 9, bcrypt 6, helmet 8, cors 2, express-rate-limit 8, cookie-parser 1.4, pino 10, vitest 5, supertest 7.

## Cross-Story Dependencies

- Epic 1 debe estar completo: dominio con máquina de estados, migraciones, adaptadores pg y semilla del Revisor; `lint:arch` operativo.
- Story 2.2 y 2.3 dependen del middleware `authenticate`, `errorMapper` y cableado de Story 2.1.
- Story 2.3 reutiliza el repositorio de accidentes de 2.2 y el dominio de transiciones de Epic 1.
- Epic 3 consume este contrato de API (rutas, cookie y formato de errores); no debe cambiar después.

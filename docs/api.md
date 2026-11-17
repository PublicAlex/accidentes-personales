# API HTTP

Documento derivado de `backend/src/interfaces/http/{routes,schemas,controllers,presenters,errors}`. Base `/api`, JSON, camelCase. Las respuestas de `/api` llevan `Cache-Control: no-store`.

## Autenticación

Cookie `session` (JWT HS256, 1 h) con `httpOnly`, `sameSite=lax`, `secure` según `COOKIE_SECURE`, `path=/`. Se emite en `POST /api/auth/login` y se limpia en `logout`. Solo se lee la cookie; el encabezado `Authorization` se ignora. El rol se carga desde la BD en cada petición (no viaja en el token). Si falla la consulta de revocación o de usuario, responde `503` (falla cerrada).

## Orden de evaluación

Rutas protegidas: autenticación (401) → rol (403) → cuerpo JSON (413 / 400 de JSON malformado) → validación (400) → recurso (404) → regla de dominio (409). Rutas de registro/login: rate limit (429) → cuerpo → validación → caso de uso.

## Endpoints

| Método y ruta | Auth | Request | Éxito | Errores |
|---|---|---|---|---|
| `POST /api/auth/register` | pública, rate limit | `{email, password, fullName}` | `201 {id, email, fullName, role:"USER"}` (no inicia sesión) | 429, 413, 400, 409 `EMAIL_TAKEN` |
| `POST /api/auth/login` | pública, rate limit | `{email, password}` | `200 {id, email, fullName, role}` + `Set-Cookie: session` | 429, 413, 400, 401 |
| `POST /api/auth/logout` | cookie opcional | sin cuerpo | `204` + cookie limpiada | 503 si falla la revocación |
| `GET /api/auth/me` | sesión | — | `200 {id, email, fullName, role}` | 401 |
| `POST /api/accidents` | sesión | 9 campos (abajo) | `201` detalle del accidente | 401, 413, 400 |
| `GET /api/accidents` | sesión | — | `200 [{id, accidentType, occurredOn, status}]` (máx. 100, más reciente primero) | 401 |
| `GET /api/accidents/:id` | sesión, solo dueño | — | `200` detalle | 401, 404 |
| `PATCH /api/accidents/:id/status` | sesión, rol `REVIEWER` | `{status}` | `200 {id, status, updatedAt}` | 401, 403, 413, 400, 404, 409 |

Todos los cuerpos son estrictos: un campo desconocido produce `400`.

### Validación de registro y login

- `email`: se recorta y pasa a minúsculas; formato de correo, hasta 254 caracteres.
- `password` (registro): al menos 8 caracteres y como máximo 72 bytes UTF-8. En login solo se exige que no esté vacía (máx. 1024).
- `fullName`: 3 a 120 caracteres.

### Cuerpo de `POST /api/accidents`

| Campo | Regla |
|---|---|
| `affectedName` | 3 a 120 caracteres |
| `documentType` | `CC`, `CE`, `TI`, `PASAPORTE` |
| `documentNumber` | alfanumérico, 5 a 20 |
| `phone` | 7 a 15 dígitos, `+` inicial opcional |
| `contactEmail` | correo válido, hasta 254 |
| `accidentType` | `TRANSITO`, `LABORAL`, `DOMESTICO`, `DEPORTIVO`, `OTRO` |
| `occurredOn` | `YYYY-MM-DD`, no futura (zona `APP_TIMEZONE`, por defecto `America/Bogota`), no anterior a 1900-01-01 |
| `place` | 3 a 200 caracteres |
| `description` | 20 a 2000 caracteres |

Las longitudes se cuentan en code points y los textos se recortan. El propietario y el estado no se aceptan en el cuerpo: el alta queda siempre en `REGISTRADO` y a nombre de la cuenta de la sesión.

### Detalle del accidente (respuesta)

`id, affectedName, documentType, documentNumber, phone, contactEmail, accidentType, occurredOn, place, description, status, createdAt, updatedAt` (fechas ISO-8601 UTC; `occurredOn` solo fecha). No incluye `ownerId` ni datos del cambio de estado.

### Cambio de estado

`status` ∈ `REGISTRADO`, `EN_REVISION`, `CERRADO`. Transiciones permitidas: `REGISTRADO → EN_REVISION` y `EN_REVISION → CERRADO`; cualquier otra (incluido repetir el estado) da `409 INVALID_TRANSITION`. Un `USER` recibe `403` sin que se revele si el accidente existe. Una carrera con otro cambio da `409 CONCURRENT_UPDATE`. Solo el `REVIEWER` puede usar este endpoint; las lecturas siguen filtradas por propietario también para él.

## Formato de error

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": [{ "field": "phone", "message": "..." }] } }
```

`details` solo aparece en errores de validación. Códigos y estados (de `errorMapper.ts`):

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod, invariante de dominio, JSON malformado, campo desconocido |
| 401 | `UNAUTHENTICATED` | sin sesión, token inválido/expirado/revocado, credenciales de login erróneas (mensaje único) |
| 403 | `FORBIDDEN` | rol insuficiente |
| 404 | `NOT_FOUND` | recurso ajeno, inexistente o id no UUID; también ruta `/api` desconocida y cualquier método no GET fuera de `/api` (un GET fuera de `/api` devuelve `index.html` si existe `frontend/dist`, incluso para archivos inexistentes; sin `dist`, 404 JSON) |
| 409 | `EMAIL_TAKEN` | "Este email ya está registrado" (DEC-021) |
| 409 | `INVALID_TRANSITION` | transición de estado no permitida |
| 409 | `CONCURRENT_UPDATE` | el estado cambió durante la operación |
| 413 | `PAYLOAD_TOO_LARGE` | cuerpo > 100 kb |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | tipo de contenido no soportado |
| 429 | `RATE_LIMITED` | límite de intentos; incluye `Retry-After` |
| 500 | `INTERNAL_ERROR` | error no controlado (mensaje genérico; el detalle solo va al log) |
| 503 | `SERVICE_UNAVAILABLE` | dependencia (BD) no disponible |

## Rate limit

Aplica a `POST /api/auth/register` y `POST /api/auth/login`: 10 peticiones cada 15 minutos por IP (en memoria, por proceso). Al superarlo responde `429 RATE_LIMITED` con `Retry-After` y cabeceras `RateLimit` estándar.

## Archivos y rutas no API

`GET /` y cualquier ruta GET fuera de `/api` entrega `frontend/dist/index.html` (fallback SPA) si existe el directorio compilado; `GET /assets/*` entrega el archivo. Un método distinto de GET fuera de `/api` responde `404 NOT_FOUND`.

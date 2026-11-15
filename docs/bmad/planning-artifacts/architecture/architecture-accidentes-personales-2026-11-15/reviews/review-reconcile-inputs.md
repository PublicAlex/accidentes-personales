---
review: reconcile-inputs
target: ARCHITECTURE-SPINE.md
inputs: [prd.md v0.2, docs/DECISIONS.md DEC-001..DEC-014]
date: 2026-11-15
verdict: NEEDS-FIXES (sin bloqueos de diseño; 5 hallazgos altos que harían fallar AC o contradicen DEC)
---

# Revisión de reconciliación: spine vs PRD + DECISIONS

Alcance: solo se leyeron el spine, el PRD y `docs/DECISIONS.md`. No se verificaron versiones del Stack (sin web).

**Veredicto:** la spine es fiel en lo grueso (hexagonal, IDOR, rol fresco, máquina de estados, revocación fail-closed, DDL, contrato). Pero tiene contradicciones puntuales y omisiones silenciosas que harían fallar AC concretos (AC-31, AC-9, AC-16, AC-32/AC-7) o que contradicen DEC-005, DEC-007 y DEC-012. Hay que corregirlas antes de pasar a historias.

Severidad: **ALTA** = un AC fallaría o se contradice una DEC · **MEDIA** = omisión que deja divergencia entre unidades · **BAJA** = precisión o trazabilidad.

---

## ALTA

### H1. CORS con `origin` string envía `Access-Control-Allow-Origin` a cualquier origen (AC-31, NFR-07, DEC-008)
- Spine AD-10/AD-13: "CORS sigue configurado con `FRONTEND_ORIGIN` + `credentials:true`".
- Si `origin` es un string, el paquete `cors` responde **siempre** `Access-Control-Allow-Origin: <FRONTEND_ORIGIN>`, también a un origen ajeno. AC-31 exige que "el origen ajeno no recibe `Access-Control-Allow-Origin`", así que la prueba fallaría.
- **Fix:** en AD-13, fijar `cors({ origin: [env.FRONTEND_ORIGIN], credentials: true })` (array o función de comparación exacta) y añadir a `security.headers.test.ts` la aserción de que la cabecera está ausente con `Origin: http://evil.test`.

### H2. El parseo del body ocurre antes de la autenticación y rompe el orden 401→403→400 (DEC-012, NFR-05, AC-32)
- AD-7 define la cadena por ruta `authenticate → requireRole → validate → caso de uso`. AD-13, en cambio, monta `express.json({limit:'100kb'})` de forma global. Una petición sin sesión con un body de más de 100 kB o con JSON malformado recibe 413 o 400 en vez de 401, y un USER recibe 413 o 400 en vez de 403. Esto rompe el orden normativo.
- Además, `errorMapper` solo traduce errores de dominio y aplicación. Los errores de body-parser (`entity.too.large`, `entity.parse.failed`) caerían en el manejador por defecto o en un 500, fuera del formato `{error:{...}}`.
- **Fix:** (a) documentar en AD-7 que 413 y JSON malformado son errores de transporte previos a la cadena y registrarlo como excepción en DECISIONS (DEC-015), o montar `express.json` después de `authenticate`/`requireRole` en las rutas protegidas; (b) en `errorMapper`, mapear `type==='entity.too.large'` → 413 `PAYLOAD_TOO_LARGE` y `entity.parse.failed` → 400 `VALIDATION_ERROR`, y probar ambos casos en AC-32.

### H3. Logout responde 204 aunque falle la revocación (FR-03 fail-closed, DEC-005; contradicción interna)
- AD-6 dice: "siempre limpia la cookie y responde 204". El contrato de la API lista `503` para logout. Las dos reglas se contradicen.
- Si el `INSERT` en `revoked_tokens` falla y se responde 204, el usuario cree que cerró sesión pero una copia del token sigue válida hasta 1 h. Va contra el espíritu de AC-10 y del fail-closed.
- **Fix:** en AD-6, especificar: token verificable + fallo del INSERT → limpiar la cookie igualmente y responder **503 `SERVICE_UNAVAILABLE`**. Token ausente, expirado o ya revocado → 204 (AC-12). Añadir este caso a `auth.logout.test.ts`.

### H4. Contraseña: "8..72 bytes" contradice "mínimo 8 caracteres" (DEC-007 prevalece; AC-16)
- AD-8: "Contraseña 8..72 **bytes**". DEC-007 dice "mínimo 8 caracteres" y el PRD aclara que el máximo de 72 bytes existe por bcrypt. Con la regla de la spine, `"ññññ"` (4 caracteres, 8 bytes) se acepta, lo que viola DEC-007, que prevalece sobre el PRD.
- **Fix:** en AD-8 y `authSchemas`, mínimo 8 **caracteres** (code points, `[...s].length >= 8`) **y** máximo 72 **bytes** (`Buffer.byteLength(s,'utf8') <= 72`). Añadir el caso multibyte a la prueba de AC-16.

### H5. Logs: `redact` de pino con claves sueltas no cubre las rutas reales y omite `password_hash` y PII (NFR-02, NFR-07, AC-7, AC-32)
- AD-13 lista `password, passwordHash, token, cookie, authorization, documentNumber, phone, description`. En pino, `redact` funciona por **rutas**: una clave suelta solo cubre el nivel superior. Por eso no redacta `req.headers.cookie`, `res.headers["set-cookie"]` ni `body.password`.
- Además, la lista omite `password_hash` (snake_case, que aparece en filas o errores de `pg`), `affectedName`, `contactEmail` y `email`. Los errores `pg` 23505 incluyen `detail: Key (lower(email))=(x@y) already exists` y llevarían PII al log de un 500.
- NFR-02 dice que `password_hash` no puede aparecer en logs. Un fallo aquí es eliminatorio (NFR-01/02).
- **Fix:** en AD-13, fijar `redact.paths` con comodines: `['*.password','*.passwordHash','*.password_hash','*.token','req.headers.cookie','req.headers.authorization','res.headers["set-cookie"]','*.documentNumber','*.phone','*.description','*.affectedName','*.contactEmail','*.email','err.detail']`. Indicar que el log de errores desconocidos solo registra `err.name`, `err.code` y `stack` sin `detail` ni `parameters`. `secrets-leak.test.ts` debe capturar la salida real del logger inyectado.

### H6. El orden del README/AC-9 es imposible con la semilla en `dist/` y `migrate` sin `.env` (NFR-09, AC-9)
- El PRD fija la secuencia: instalar → crear BD → migrar → **sembrar → compilar** → ejecutar. La spine usa `seed:reviewer` = `backend/dist/main/seedReviewer.js`, que exige compilar antes de sembrar.
- El script `migrate` (`node-pg-migrate up`) no dice cómo carga `DATABASE_URL` desde `.env`. `node-pg-migrate` no usa `--env-file` de Node, así que en un clon limpio fallaría.
- **Fix:** en Structural Seed, definir `migrate` como `node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up -m backend/migrations ...` (o `--envPath .env`) y `seed:reviewer` con `--env-file-if-exists=.env`. Declarar que el README ordena `build` antes de `seed:reviewer` y registrar el cambio de orden respecto de AC-9 (o hacer que `seed:reviewer` ejecute `build` antes).

## MEDIA

### M1. `secure` de la cookie desacoplado de "producción" (DEC-005, glosario del PRD)
- DEC-005 y el glosario dicen "`secure` en producción". `.env.example` trae `NODE_ENV=production` con `COOKIE_SECURE=false`, así que en "producción" la cookie no es `secure`.
- **Fix:** `secure = COOKIE_SECURE ?? (NODE_ENV==='production')` y documentar en el README y en DECISIONS que el arranque local por HTTP fija `COOKIE_SECURE=false` a propósito. Si no, cambiar `.env.example` a `NODE_ENV=development`.

### M2. FR-05 (UI): se pierden la confirmación de éxito y el estado de carga
- FR-05 exige "mensaje de error por campo, confirmación de éxito y estado de carga (deshabilita el envío y muestra un indicador)". La spine solo menciona `FieldError` y manda "UX" a Deferred.
- **Fix:** añadir a AD-11 la regla de que los formularios deshabilitan el envío mientras `useAsync` está `pending`, muestran un indicador y, tras un 201, una confirmación. Cubrirlo en `AccidentNewPage.test.tsx`.

### M3. No se especifica el contenido del README (FR-06, NFR-07 topología, NFR-09)
- `README.md` solo aparece como archivo. El PRD exige que contenga: la explicación del vínculo accidente-cuenta por identidad verificada en servidor (FR-06), la topología del mismo sitio con `sameSite=lax` (NFR-07), los prerrequisitos (Node 24, Docker) y el checklist ordenado de comandos (NFR-09). Debe incluir también editar `JWT_SECRET` y `REVIEWER_PASSWORD`, porque el backend y la semilla rechazan los valores de ejemplo.
- **Fix:** añadir al Structural Seed una sección "README (contrato)" con esas cinco partes.

### M4. `UNIQUE(email)` no aparece literalmente en el esquema (FR-11, AC-37)
- El DDL usa `CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email))`. AC-37 inspecciona `UNIQUE(email)`. Con `CHECK (email = lower(email))`, un `UNIQUE` simple es equivalente y además pasa la inspección literal.
- **Fix:** `email text NOT NULL UNIQUE CHECK (email = lower(email))` y quitar el índice de expresión (o conservarlo, pero declarar la constraint).

### M5. Las violaciones de constraint de PG no se mapean a errores (FR-02, AC-15, AC-24)
- Dos registros concurrentes con el mismo email producen un `23505`. La spine no dice que `PgUserRepository` lo traduzca a `ConflictError('EMAIL_TAKEN')`, así que el resultado sería un 500.
- Conteo de caracteres: Zod/JS cuenta unidades UTF-16 y `char_length` de PG cuenta code points. Por ejemplo, 10 emojis miden 20 en JS y 10 en PG: pasan Zod (≥20) pero violan el `CHECK` (20..2000), lo que daría un `23514` → 500.
- **Fix:** en AD-8, contar longitudes por code points (`[...s].length`) en Zod y en el dominio. En los repositorios `Pg*`, mapear `23505` → `ConflictError` y `23514` → `ValidationError` (red de seguridad).

### M6. Variables obligatorias al arrancar sin enumerar (NFR-06, AC-33)
- NFR-06 enumera `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` y las credenciales de semilla del Revisor. La spine dice "si falta algo". No queda claro qué exige `server.js` y qué exige `seedReviewer.js`, ni si `TEST_DATABASE_URL` es obligatoria.
- **Fix:** en AD-13, una tabla de variables × proceso (server / seed / test) que indique cuáles son obligatorias. Que `seedReviewer` valide la contraseña del Revisor con las mismas reglas que H4 y bcrypt de costo 12 (AC-35). Que el valor de ejemplo prohibido sea una constante compartida con `.env.example` y verificada por prueba.

### M7. "En CI" desaparece (NFR-08)
- NFR-08: "se verifica con dependency-cruiser mediante `npm run lint:arch` **en CI**". La spine lo manda a Deferred ("solo se exige que sean ejecutables").
- **Fix:** añadir un workflow mínimo (`.github/workflows/ci.yml` con servicio `postgres:16`, `npm ci`, `lint:arch`, `test`) al Structural Seed, o registrar el desvío en DECISIONS.

### M8. Falta prueba para AC-28 (FR-01) en el Test Map
- AC-10..39 se mapean a "archivos de integración". AC-28 es de UI (landing, dos accesos, redirección sin sesión) y no tiene archivo.
- **Fix:** añadir `frontend/src/pages/LandingPage.test.tsx` con los textos exactos de FR-01 ("Registrar un accidente", "Ingresar para consultar mis accidentes") y la redirección a `/login` o `/register` vía `RequireAuth`.

### M9. Logger y config cruzan capas sin puerto (AD-1 vs AD-7)
- AD-7 exige que `errorMapper` (interfaces) loguee los errores desconocidos, pero `interfaces-sin-infra` prohíbe importar `infrastructure/logging/logger.ts`. Tampoco hay un puerto `Logger` en `application/ports`.
- **Fix:** que `createHttpApp(deps)` reciba `logger` y la configuración HTTP (`FRONTEND_ORIGIN`, `COOKIE_SECURE`, límites de rate limit) por parámetro desde `main/`, y declararlo en AD-1/AD-12.

## BAJA

- **B1. Mensaje del 409 de email duplicado.** FR-02 y DEC-012 piden un mensaje genérico; la spine solo fija el código `EMAIL_TAKEN`. Fix: fijar un texto genérico en español en el mapper.
- **B2. Tono e idioma de los mensajes.** El PRD (§7) fija solo español. Fix: indicar que `error.message` va en español, sin detalles internos, y que `details[].message` también va en español.
- **B3. AC-14 y "no inicia sesión".** AC-14 sigue el registro con `GET /me`. La spine no hace auto-login, así que la prueba debe incluir el login intermedio. Fix: anotarlo en el Test Map.
- **B4. Rate limit de login y register.** Fix: aclarar que son contadores independientes por ruta, que AC-30 prueba ambos y que los valores de producción son fijos (10/15 min), no configurables por env.
- **B5. AC-38 / NFR-10.** El Test Map solo nombra `docs/test-report.md` para AC-9. Fix: declararlo como entregable de AC-38 con formato (prueba, comando, resultado, limitaciones).
- **B6. Errores en `AuthenticateRequest`.** Un fallo de `UserRepository.findById` debe dar 503, igual que el de revocación, para que el comportamiento ante una BD caída sea el mismo.
- **B7. Rutas `/api/*` desconocidas.** Deben responder 404 `NOT_FOUND` con el formato de error y nunca caer en el fallback SPA.

## Verificado sin hallazgos
IDOR y listado por dueño también para REVIEWER (DEC-011, AC-25); 403 de PATCH antes de buscar (AC-18); rol leído de BD y JWT `{sub,jti}` (DEC-010); `alg` fijado y `Authorization` ignorado (AC-29); máquina de estados en un único módulo y receta de extensión (DEC-013); bloqueo optimista (AC-22); catálogos (DEC-014); límites de FR-05; 404 uniforme para id no-uuid (AC-26); `VITE_*` (ninguna, compatible con AC-33); fail-closed 503 (AC-11); hash ficticio en login; bcrypt 12; volumen nombrado (AC-6); `.env.example` ficticio y semilla que rechaza el valor de ejemplo (AC-34).

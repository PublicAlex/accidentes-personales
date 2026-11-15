---
title: Plataforma de accidentes personales (MVP)
status: approved-for-architecture
created: 2026-11-15
updated: 2026-11-15
version: 0.2
changelog: "0.2: integra DEC-005..DEC-014 y los hallazgos de validation-report.md; cierra preguntas abiertas; AC para cada FR/NFR"
---

# PRD: Plataforma de accidentes personales (MVP)

## 0. Propósito del documento
PRD breve de un MVP evaluado técnicamente. Lo consumen quienes diseñan la arquitectura, escriben historias y construyen. Los FR y NFR tienen IDs estables; cada uno tiene al menos un criterio de aceptación (AC) en la sección 6. Las decisiones están en `docs/DECISIONS.md` (DEC-xx citadas) y prevalecen sobre este texto si hubiera conflicto. NFR-10 es un criterio de entrega (proceso), no un requisito del sistema.

## 1. Visión
Una persona registra un accidente personal y luego consulta, con su cuenta, únicamente sus propios accidentes y su estado. Un Revisor hace avanzar el estado. El MVP demuestra persistencia real, autorización correcta en el servidor y arquitectura hexagonal verificable.

**Alcance:** MVP, no producción. Éxito (definición): cumplir los 9 escenarios obligatorios (AC-1..AC-9), todos los AC adicionales y no incurrir en fallos eliminatorios (NFR-01, NFR-02, NFR-03, NFR-05).

## 2. Usuarios
- **Usuario (rol `USER`):** crea cuenta, registra accidentes propios y los consulta. Registra solo a su nombre o a nombre de un afectado, siempre bajo su cuenta.
- **Revisor (rol `REVIEWER`):** único rol que cambia el estado de un accidente (FR-10). Se crea por script de semilla, nunca por registro público (DEC-006, DEC-010).
- **No usuarios (v1):** aseguradoras, ajustadores externos y administradores con lectura de datos de terceros. El Revisor no lee datos personales ajenos (DEC-011).

## 3. Glosario
- **Usuario** — cuenta autenticada (email único normalizado a minúsculas + contraseña).
- **Rol** — `users.role` con valores `USER` (por defecto) o `REVIEWER`. Se lee de la base en cada petición, nunca del cliente ni del token (DEC-010).
- **Revisor** — Usuario con rol `REVIEWER`.
- **Sesión** — JWT (`sub`, `jti`; 1 h) en cookie `httpOnly`, `sameSite=lax` (`secure` en producción). Se ignora el header `Authorization` (DEC-005).
- **Accidente** — registro de un accidente personal; pertenece a exactamente un Usuario.
- **Propietario (`owner_id`)** — id del Usuario del token; es la única columna de pertenencia (`accidents.owner_id`).
- **Estado** — `Registrado`, `En revisión` o `Cerrado`.
- **Afectado** — persona a la que ocurrió el accidente; sus datos se capturan en el formulario.

## 4. Funcionalidades

### 4.1 Landing pública
#### FR-01: Landing con accesos
Cualquier visitante ve el propósito de la plataforma y dos accesos: "Registrar un accidente" e "Ingresar para consultar mis accidentes".
- Sin sesión, "Registrar un accidente" redirige a crear cuenta o iniciar sesión.

### 4.2 Cuenta y sesión
#### FR-02: Crear cuenta
Un visitante crea una cuenta con email, contraseña y nombre completo. `POST /api/auth/register`.
- Contraseña de 8 a 72 bytes (DEC-007; el máximo evita el truncado de bcrypt). Email con formato válido y normalizado a minúsculas.
- El rol resultante es siempre `USER`. Un campo `role` o cualquier campo desconocido en el body devuelve 400 (Zod `.strict()`, DEC-010, DEC-012).
- Email duplicado devuelve 409 con mensaje genérico; riesgo aceptado, mitigado con rate limit (DEC-012, NFR-07).

#### FR-03: Iniciar y cerrar sesión con revocación
`POST /api/auth/login` entrega la cookie de Sesión. `POST /api/auth/logout` la revoca.
- Credenciales erróneas devuelven 401 con el mismo mensaje genérico para email inexistente y contraseña incorrecta.
- Logout guarda el `jti` en `revoked_tokens` (con la expiración del token) y limpia la cookie con `Set-Cookie`. El middleware consulta la tabla a través del puerto `TokenRevocationRepository` (DEC-005).
- Fail-closed: si la consulta de revocación falla, la petición se rechaza (no 200). Logout con token expirado o ya revocado es idempotente (204). Las filas expiradas se purgan periódicamente. Sin renovación automática de sesión (ver §7).

#### FR-04: Identidad del usuario actual
`GET /api/auth/me` devuelve `{id, email, fullName, role}` del Usuario autenticado, nunca `password_hash`.

### 4.3 Registro de accidentes
#### FR-05: Registrar accidente
`POST /api/accidents` (rol `USER` o `REVIEWER`, autenticado). Campos y límites (DEC-007, DEC-014):

| Campo | Regla |
|---|---|
| nombre del afectado | obligatorio, 3 a 120 caracteres |
| tipo de documento | `CC`, `CE`, `TI`, `PASAPORTE` |
| número de documento | 5 a 20 alfanuméricos |
| teléfono | 7 a 15 dígitos, `+` opcional |
| email de contacto | formato válido |
| tipo de accidente | `TRANSITO`, `LABORAL`, `DOMESTICO`, `DEPORTIVO`, `OTRO` |
| fecha | no futura (validada en dominio con reloj inyectado), no anterior a 1900-01-01 |
| lugar | 3 a 200 caracteres |
| descripción | 20 a 2000 caracteres |

- Estado inicial `Registrado`. El Propietario es siempre el Usuario del token. Un `userId`, `ownerId`, `status` o cualquier campo desconocido devuelve 400 (DEC-012).
- Validación obligatoria en frontend y backend; el backend responde 400 con `details` por campo (formato de error en NFR-07).
- El frontend muestra mensaje de error por campo, confirmación de éxito y estado de carga (deshabilita el envío y muestra indicador mientras la petición está en curso).
- Los ids de accidente son `uuid`.

#### FR-06: Documentar el vínculo accidente-cuenta
El README explica que el accidente se vincula a la cuenta por la identidad verificada en servidor, y contiene el checklist de arranque de NFR-09.

### 4.4 Consulta privada
#### FR-07: Listar mis accidentes
`GET /api/accidents` devuelve, para cualquier rol, solo los accidentes del Usuario del token (DEC-011), ordenados por fecha descendente, con `id`, tipo, fecha y estado. Máximo 100 elementos en el MVP.
- Sin accidentes: 200 con `[]` y la UI muestra un empty state.

#### FR-08: Ver detalle de mi accidente
`GET /api/accidents/:id` devuelve el detalle y el estado de un accidente propio, también para el Revisor.
- Accidente ajeno, id inexistente e id malformado devuelven el mismo 404 sin datos ajenos (NFR-03).

### 4.5 Estados
#### FR-09: Estados y transiciones en el dominio
Los Estados son `Registrado`, `En revisión` y `Cerrado`; las transiciones permitidas son `Registrado → En revisión → Cerrado`.
- No se retrocede ni se salta; `Cerrado` es final; pasar al mismo estado es inválido. Una transición inválida devuelve 409 y el estado no cambia (DEC-012).
- La lista de estados y transiciones vive en un único módulo del dominio. Agregar un estado = dominio + migración que reemplaza el `CHECK` + etiqueta en la UI + pruebas (DEC-013).
- El cambio usa `UPDATE ... WHERE status = <esperado>`; si afecta 0 filas, responde 409 (concurrencia).

#### FR-10: Cambiar estado (obligatorio, rol REVIEWER)
`PATCH /api/accidents/:id/status` con `{status}`. Solo un `REVIEWER` puede usarlo, sobre cualquier accidente; sujeto a FR-09 (DEC-006, DEC-011).
- Un `USER` recibe 403 antes de buscar el recurso, por lo que el 403 no revela si el accidente existe. Sin sesión, 401.
- La respuesta trae solo `{id, status, updatedAt}`, sin datos personales. El dueño ve el nuevo estado en FR-07/FR-08 y no puede cambiarlo.
- Es la única excepción a la lectura por dueño: ninguna lectura cruza propietarios.
- Registra `status_changed_by` y `status_changed_at` en el accidente.
- Motivo de un solo rol: demostrar la regla de transiciones con el mínimo de superficie.

### 4.6 Persistencia
#### FR-11: PostgreSQL 16 con migraciones
Cuentas, accidentes y revocaciones se guardan en PostgreSQL 16 (`postgres:16`) con migraciones versionadas.
- Tablas `users` (con `role`, `UNIQUE(email)`), `accidents` (`owner_id` FK a `users.id`, `CHECK` de estado, tipo y documento, índice por `owner_id`) y `revoked_tokens` (índice por `jti`, con expiración). PK `uuid`, `NOT NULL`.
- No se acepta persistencia solo en memoria (los adaptadores in-memory son solo para pruebas).
- Docker Compose con volumen nombrado para que los datos persistan al reiniciar el contenedor.

## 5. Requisitos no funcionales

### Seguridad y configuración
- **NFR-01 Sin secretos en el repositorio.** Credenciales de BD, secreto JWT, credenciales de semilla y tokens no están en código, documentación, historial Git, frontend ni bundle. Existe `.env.example` con valores ficticios y `.env` está en `.gitignore`. El script de semilla falla si la contraseña del Revisor coincide con el valor de ejemplo.
- **NFR-02 Contraseñas con hash.** bcrypt con 12 rounds. `password_hash` no aparece en respuestas, logs ni errores. El login compara contra un hash ficticio cuando el email no existe, para igualar tiempos.
- **NFR-03 Autorización por propietario (IDOR).** Toda lectura de accidentes filtra por `id` y `owner_id`, también para el Revisor (DEC-011). Un accidente ajeno devuelve 404, no 403: se pierde la distinción entre "prohibido" e "inexistente" a cambio de no filtrar existencia. Acceder a datos ajenos es fallo eliminatorio.
- **NFR-04 Identidad solo desde la cookie.** El servidor toma la identidad del JWT de la cookie `httpOnly`; ignora `Authorization`, fija el algoritmo (`HS256`) y rechaza `alg: none`. El rol se carga de la base en cada petición (DEC-010).
- **NFR-05 AuthN/AuthZ y validación en servidor.** Orden de evaluación normativo: 401 → 403 → 400 → 404 → 409 (DEC-012). Ocultar pantallas en React no cuenta como autorización. Todo input se valida en el servidor.
- **NFR-06 Configuración por variables de entorno.** El backend valida al arrancar y falla rápido: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, credenciales de semilla del Revisor. Solo la configuración pública usa `VITE_*`. El proyecto corre sin credenciales reales.
- **NFR-07 Errores, logs y endurecimiento HTTP (obligatorio, DEC-008, DEC-012).**
  - Formato de error único `{ error: { code, message, details? } }`; los 5xx son genéricos, sin stack traces.
  - `helmet`; CORS restringido a `FRONTEND_ORIGIN` con credentials.
  - Rate limit de 10 intentos cada 15 min por IP en `/api/auth/login` y `/api/auth/register`; al excederlo, 429 con `Retry-After` y formato de error estándar.
  - Cuerpo JSON máximo 100 kB. Logs sin contraseñas, tokens ni PII (documento, teléfono, descripción).
  - Topología: frontend y API en el mismo sitio (`sameSite=lax`), documentada en el README.

### Arquitectura y calidad
- **NFR-08 Arquitectura hexagonal.** Dominio sin dependencias de React, Express ni PostgreSQL. Casos de uso separados de controladores; puertos con adaptadores (incluido `TokenRevocationRepository`); controladores HTTP sin reglas de negocio; reglas de negocio probadas sin BD. Se verifica con dependency-cruiser mediante el script `npm run lint:arch` en CI. Stack cerrado (DEC-004, DEC-014): Express, PostgreSQL 16, React 18 + Vite + TypeScript, Zod en el adaptador HTTP.
- **NFR-09 Arranque reproducible.** Desde un clon nuevo y solo con el README se instala, se crea la BD, se migra, se siembra el Revisor, se compila y se ejecuta desde el build. El README lista prerrequisitos (Node, Docker) y comandos.
- **NFR-10 Evidencia de pruebas honesta (criterio de entrega).** Se informa qué pruebas se ejecutaron, resultados y limitaciones. Declarar una prueba como pasada sin ejecutarla es una falta grave.

## 6. Criterios de aceptación

### 6.1 Los 9 escenarios obligatorios (AC-1..AC-9)
| ID | Dado / Cuando | Entonces | Cubre |
|---|---|---|---|
| AC-1 | Usuario autenticado envía un accidente sin campos obligatorios | 400 con `details` por campo; la UI muestra los errores | FR-05 |
| AC-2 | `GET /api/accidents` sin cookie | 401 | NFR-05 |
| AC-3 | El Usuario B pide `GET /api/accidents/:id` de un accidente de A | 404 sin datos de A | FR-08, NFR-03 |
| AC-4 | Se envían datos inválidos: fecha futura, tipo inexistente, tipos erróneos, campo extra, `userId` en el body (una fila de prueba por caso, ver AC-23) | 400 en cada caso; ningún accidente creado | FR-05, NFR-04 |
| AC-5 | Una cuenta sin accidentes consulta su listado | 200 con `[]`; la UI muestra el empty state | FR-07 |
| AC-6 | Se crea un accidente, se reinicia el contenedor (`docker compose restart`) y se consulta | Los datos persisten | FR-11 |
| AC-7 | gitleaks sobre el historial, grep de `dist/` por secretos y test automatizado que busca `password_hash` y `JWT_SECRET` en respuestas y logs | 0 hallazgos | NFR-01, NFR-02 |
| AC-8 | Pruebas unitarias del dominio sin infraestructura | Matriz completa de transiciones (3x3 estados: 2 válidas, 7 inválidas) y validaciones de entidad pasan | FR-09, NFR-08 |
| AC-9 | Clon nuevo, solo README: instalar, crear BD, migrar, sembrar, compilar, ejecutar desde build, crear cuenta, registrar accidente y consultarlo | El flujo completo funciona | NFR-09, FR-06 |

### 6.2 Criterios adicionales
| ID | Dado / Cuando | Entonces | Cubre |
|---|---|---|---|
| AC-10 | Usuario hace logout y reusa la cookie copiada antes | 401 en `GET /api/auth/me` | FR-03 |
| AC-11 | Falla la consulta a `revoked_tokens` (BD simulada caída) | La petición autenticada se rechaza (no 200) | FR-03 |
| AC-12 | Logout con token expirado o ya revocado | 204 idempotente | FR-03 |
| AC-13 | `POST /api/auth/register` con `role: "REVIEWER"` en el body | 400; no se crea usuario | FR-02, NFR-04 |
| AC-14 | Registro válido | 201; `GET /api/auth/me` devuelve `role: "USER"` | FR-02, FR-04 |
| AC-15 | Registro con email duplicado (incluida variante en mayúsculas) | 409 con mensaje genérico | FR-02 |
| AC-16 | Contraseña de 7 caracteres o de más de 72 bytes | 400 con `details` | FR-02 |
| AC-17 | Login con email inexistente y con contraseña incorrecta | Mismo 401 y mismo mensaje en ambos | FR-03, NFR-02 |
| AC-18 | `PATCH /api/accidents/:id/status` como `USER` (accidente propio, ajeno o inexistente) | 403 idéntico en los tres casos | FR-10 |
| AC-19 | `PATCH` sin sesión | 401 | FR-10, NFR-05 |
| AC-20 | `PATCH` como `REVIEWER` con transición válida sobre accidente ajeno | 200 con solo `{id, status, updatedAt}`; el dueño ve el nuevo estado en el detalle | FR-10, FR-08 |
| AC-21 | `PATCH` con transición inválida (salto, retroceso, mismo estado, desde `Cerrado`) | 409 y el estado no cambia | FR-09 |
| AC-22 | Dos `PATCH` simultáneos con el mismo estado esperado | Uno responde 200 y el otro 409 | FR-09 |
| AC-23 | Cinco peticiones POST de accidente, una con cada defecto de AC-4, más un `status` en el body | 400 en cada una | FR-05, NFR-04 |
| AC-24 | Límites: descripción de 19 y de 2001 caracteres; documento y teléfono fuera de rango | 400 por campo; en el límite exacto (20, 2000) 201 | FR-05 |
| AC-25 | `REVIEWER` llama `GET /api/accidents` y `GET /api/accidents/:id` de un accidente ajeno | Listado solo con los suyos; detalle 404 | FR-07, FR-08, NFR-03 |
| AC-26 | `GET /api/accidents/no-es-uuid` | 404 (no 500), mismo cuerpo que un id inexistente | FR-08 |
| AC-27 | El Usuario A crea tres accidentes en fechas distintas | Listado con 3 elementos, orden por fecha descendente, campos `id`, tipo, fecha y estado | FR-07 |
| AC-28 | Visitante abre la landing; sin sesión pulsa "Registrar un accidente" | Ve los dos accesos; es redirigido a login o registro | FR-01 |
| AC-29 | Cookie manipulada, `alg: none` o solo header `Authorization: Bearer` válido | 401 en los tres casos | NFR-04 |
| AC-30 | 11 intentos de login (y de registro) en 15 min desde la misma IP | El 11.º responde 429 con `Retry-After` y cuerpo `{error:{...}}` | NFR-07 |
| AC-31 | Respuesta de cualquier endpoint y petición CORS desde un origen distinto de `FRONTEND_ORIGIN` | Cabeceras de `helmet` presentes; el origen ajeno no recibe `Access-Control-Allow-Origin` | NFR-07 |
| AC-32 | Provocar un error interno y enviar body de más de 100 kB | 500 genérico sin stack; 413 en el body grande; logs sin PII ni tokens | NFR-07 |
| AC-33 | Arrancar el backend sin `JWT_SECRET` o `DATABASE_URL`; `grep VITE_` en `.env.example` | Falla al inicio con mensaje claro; solo variables públicas con `VITE_*` | NFR-06 |
| AC-34 | Semilla con la contraseña de ejemplo; semilla con credenciales válidas | La primera falla; la segunda crea un Revisor que puede hacer `PATCH` | NFR-01, FR-10 |
| AC-35 | Revisión de la tabla `users` tras registrar y tras sembrar | Contraseñas guardadas como hash bcrypt con costo 12 | NFR-02 |
| AC-36 | `npm run lint:arch` con una importación prohibida del dominio a Express o `pg` | Falla; sin la importación, pasa | NFR-08 |
| AC-37 | Inspección del esquema tras migrar | Existen `users.role`, `UNIQUE(email)`, FK `owner_id`, `CHECK`, índices y `revoked_tokens`; ids `uuid` | FR-11 |
| AC-38 | Informe de pruebas entregado | Lista cada prueba ejecutada con resultado y limitaciones; ninguna se declara sin evidencia | NFR-10 |
| AC-39 | `GET /api/auth/me` con sesión válida | 200 con `{id, email, fullName, role}` y sin `password_hash` | FR-04 |

## 7. Fuera de alcance
- Despliegue a producción, alta disponibilidad, observabilidad avanzada y rendimiento bajo carga.
- Recuperación de contraseña, verificación de email, MFA y gestión de perfiles.
- Edición o borrado de accidentes por el Usuario; adjuntos; notificaciones.
- Panel de administración, aseguradoras o ajustadores con acceso a datos de terceros; cambio de rol por API.
- Renovación o refresh de sesión `[NON-GOAL for MVP]`: al expirar la hora, el Usuario inicia sesión de nuevo.
- Internacionalización más allá del español; accesibilidad formal; hexagonal en el frontend (solo se recomienda separar `api/` de componentes).

## 8. Supuestos y preguntas abiertas
**Resueltas (trazabilidad):** sesión y logout (DEC-005); rol y cambio de estado (DEC-006, DEC-010, DEC-011); límites de validación y tipos de accidente (DEC-007, DEC-014); endurecimiento HTTP y rate limit (DEC-008); contrato HTTP (DEC-012); CHECK de estado (DEC-013); stack (DEC-014).

**Supuestos vigentes:** el MVP se sirve con frontend y API en el mismo sitio; el límite de listado (100) y el nombre del afectado (3 a 120) son valores propuestos por este PRD, modificables sin impacto de arquitectura.

**Preguntas abiertas bloqueantes:** ninguna.

**Preguntas no bloqueantes:** si llegan insumos de la organización (MDD, contratos, lineamientos), prevalecen (DEC-001); dueño: persona responsable del proyecto; se revisa al recibirlos.

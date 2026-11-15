---
status: approved-for-implementation
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md
  - docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/.memlog.md
  - docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md
  - docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/.memlog.md
  - docs/DECISIONS.md
created: 2026-11-15
---

# accidentes-personales - Desglose de épicas e historias

## Overview

Desglose de FR, NFR y AC del PRD v0.2 y de los AD-1..AD-14 del Architecture Spine en 3 épicas y 9 historias, dimensionadas para un build de 3 días (~3 h/día), una historia por sesión de agente (~500 líneas cambiadas). Las decisiones DEC-001..DEC-017 son autoritativas. No hay UX formal (DEC-003.4); los requisitos de UI salen de FR-01, FR-05, FR-07, FR-08 y los AC-1, AC-5, AC-28. Idioma: español.

## Requirements Inventory

### Functional Requirements
FR-01 Landing con dos accesos y redirección sin sesión · FR-02 Crear cuenta (rol siempre USER, `.strict()`) · FR-03 Login/logout con revocación fail-closed · FR-04 `GET /api/auth/me` · FR-05 Registrar accidente (validación front y back, `details` por campo) · FR-06 README documenta vínculo accidente-cuenta + checklist · FR-07 Listar mis accidentes (≤100, fecha desc, empty state) · FR-08 Detalle propio (404 uniforme) · FR-09 Estados y transiciones en dominio, 409 y concurrencia · FR-10 PATCH estado solo REVIEWER · FR-11 PostgreSQL 16 con migraciones y volumen.

### NonFunctional Requirements
NFR-01 Sin secretos · NFR-02 bcrypt 12 y hash ficticio · NFR-03 Aislamiento por propietario (IDOR, 404) · NFR-04 Identidad solo desde cookie (HS256, ignora Authorization) · NFR-05 AuthN/AuthZ/validación en servidor, orden 401→403→400→404→409 · NFR-06 Config por env con fail-fast · NFR-07 Errores, helmet, CORS, rate limit, límite 100 kB, logs sin PII · NFR-08 Hexagonal verificado con `lint:arch` en CI · NFR-09 Arranque reproducible · NFR-10 Evidencia de pruebas honesta.

### Additional Requirements (Arquitectura)
- Monorepo npm workspaces `backend/` y `frontend/`; scripts raíz `build`, `start`, `migrate`, `seed:reviewer`, `test`, `lint:arch` (AD-1, Structural Seed). Sin starter template externo; Vite `react-ts` con desviaciones del spine.
- dependency-cruiser + `check-globals.mjs` (AD-1); CI GitHub Actions con servicio `postgres:16`.
- Ids, `jti` y timestamps generados por la app (AD-2); máquina de estados en un módulo (AD-3); contratos de puertos (AD-4); propietario solo desde token (AD-5); sesión/revocación/rol fresco (AD-6); orden de errores y `errorMapper` único (AD-7); Zod `.strict()` en HTTP + invariantes en dominio (AD-8); node-pg-migrate con SQL (AD-9); mismo origen en producción (AD-10); `api/` único adaptador en frontend (AD-11); fakes solo en `tests/`, BD real en integración (AD-12); seguridad transversal (AD-13); config HTTP inyectada (AD-14).
- DEC-015 `COOKIE_SECURE` por env; DEC-016 orden README instalar→BD→migrar→compilar→sembrar→ejecutar; DEC-017 versiones fijadas.

### UX Design Requirements
No aplica (UX formal omitido por DEC-003.4). Estados vacío/carga/error cubiertos en S3.2 vía FR-05, FR-07, AC-5.

### FR Coverage Map
- FR-01 → S3.1 · FR-02, FR-03, FR-04 → S2.1 (UI en S3.1) · FR-05 → S2.2 (UI en S3.2) · FR-06 → S3.3 · FR-07, FR-08 → S2.2 (UI en S3.2) · FR-09 → S1.2 (dominio), S2.3 (persistencia/HTTP) · FR-10 → S2.3 · FR-11 → S1.3 (+ S3.3 AC-6)
- NFR-01 → S1.1, S1.3, S3.3 · NFR-02 → S2.1 · NFR-03 → S2.2 · NFR-04, NFR-05 → S2.1, S2.2, S2.3 · NFR-06 → S1.1 · NFR-07 → S2.1 · NFR-08 → S1.1, S1.2 · NFR-09 → S3.3 · NFR-10 → S3.3
- AC-1,4,23,24 → S2.2 · AC-2,3,25,26,27 → S2.2 · AC-5 → S2.2/S3.2 · AC-6, AC-7, AC-9, AC-38 → S3.3 · AC-8 → S1.2 · AC-10..17, 29..32, 35, 39 → S2.1 · AC-18..22 → S2.3 · AC-28 → S3.1 · AC-33 → S1.1 · AC-34 → S1.3 · AC-36 → S1.1 · AC-37 → S1.3

## Epic List
- **Epic 1: Fundaciones** — Repositorio ejecutable, dominio puro probado y base de datos migrada con Revisor sembrado. (Día 1)
- **Epic 2: Backend** — API completa con autenticación, aislamiento por propietario y cambio de estado por Revisor. (Día 2)
- **Epic 3: Frontend y entrega** — Interfaz React, build servido por Express y evidencia de entrega. (Día 3)

Nota de método: las historias de E1 son técnicas (greenfield de prueba técnica evaluada: la rúbrica premia arquitectura verificable); se mantienen porque cada una deja un incremento verificable (`lint:arch` verde, AC-8, AC-37). Cada historia depende solo de las anteriores.

**Definition of Done común (aplica a TODAS las historias):** (1) pruebas de la historia escritas y ejecutadas con resultado registrado (NFR-10); (2) `npm run lint:arch` en verde; (3) sin secretos en código, docs ni historial (NFR-01; solo `.env.example` ficticio); (4) sin imports prohibidos por AD-1; (5) PR/commit pequeño con la historia referenciada.

---

## Epic 1: Fundaciones

Dejar un monorepo que arranca, con reglas de arquitectura ejecutables, dominio puro y esquema migrado.

### Story 1.1: Scaffold del monorepo, entorno y guardas de arquitectura

As a desarrollador,
I want un monorepo con docker-compose, configuración por entorno validada, `lint:arch` y CI,
So that todas las historias siguientes se construyan sobre reglas verificables desde el primer commit.

**Acceptance Criteria:**

**Given** un clon nuevo **When** se ejecuta `npm install` y `docker compose up -d db` con `.env` copiado de `.env.example` **Then** PostgreSQL 16 (`postgres:16`, volumen nombrado `pgdata`) responde y también existe la BD `accidentes_test` (FR-11, AD-14 monorepo).
**And** `.env.example` contiene solo valores ficticios, `.env` está en `.gitignore` y `grep VITE_ .env.example` muestra solo variables públicas (NFR-01, NFR-06, AC-33).
**Given** el backend sin `JWT_SECRET` o `DATABASE_URL` **When** arranca **Then** falla de inmediato con mensaje claro (Zod en `infrastructure/config/env.ts`; NFR-06, AC-33).
**Given** una importación de `domain/` hacia `express` o `pg` **When** se ejecuta `npm run lint:arch` **Then** falla; sin la importación, pasa (dependency-cruiser + `check-globals.mjs`; AD-1, NFR-08, AC-36).
**Given** un push **When** corre el workflow de GitHub Actions con servicio `postgres:16` **Then** ejecuta `lint:arch` y `test` (NFR-08).

**Definition of Done:** común (arriba) + `lint:arch` con regla negativa demostrada una vez + `.gitignore` y gitleaks config presentes.

### Story 1.2: Capa de dominio con máquina de estados

As a desarrollador,
I want entidades, enums, transiciones y errores de dominio sin dependencias externas,
So that las reglas de negocio se prueben sin BD ni HTTP.

**Acceptance Criteria:**

**Given** `AccidentStatus` en `domain/accident/AccidentStatus.ts` **When** se evalúa la matriz 3x3 **Then** solo `REGISTRADO→EN_REVISION` y `EN_REVISION→CERRADO` son válidas y las otras 7 lanzan error de dominio (FR-09, AD-3, AC-8).
**Given** `Accident.create` con `Clock` inyectado **When** la fecha es futura (zona `America/Bogota`) o anterior a 1900-01-01, o los campos violan los límites de DEC-007 **Then** lanza error de dominio con `code` (FR-05, AD-2, DEC-017).
**Given** el código de `domain/` **When** corre `lint:arch` **Then** no importa nada (ni npm ni `node:*`) y `isUuid` vive en `domain/shared/Id.ts` (AD-1, NFR-08).
**Given** `User` y `Role` **When** se crea un usuario **Then** el rol por defecto es `USER` (FR-02, DEC-010).
**And** las pruebas Vitest unitarias corren sin infraestructura (AD-12, AC-8).

**Definition of Done:** común + cobertura de la matriz completa de transiciones y de los límites exactos de AC-24 a nivel de dominio.

### Story 1.3: Migraciones, adaptadores pg y semilla del Revisor

As a desarrollador,
I want el esquema versionado, los repositorios pg y `seed:reviewer`,
So that la persistencia real y el rol REVIEWER existan antes de construir la API.

**Acceptance Criteria:**

**Given** una BD vacía **When** corre `npm run migrate` **Then** existen `users` (`role`, `UNIQUE(email)`), `accidents` (FK `owner_id`, `CHECK` de estado/tipo/documento, índice por `owner_id`) y `revoked_tokens` (índice por `jti`, expiración), con PK `uuid` y `NOT NULL` (FR-11, AD-9, AC-37).
**Given** los puertos de `application/` **When** se usan los adaptadores `Pg*Repository` **Then** respetan los contratos de AD-4 (null vs throw, 23505 → conflicto, errores de conexión traducidos) y `findByIdForOwner`/`listByOwner` son los únicos accesos de lectura (AD-5, NFR-03).
**Given** `updateStatus` **When** se ejecuta `UPDATE ... WHERE id AND status=$expected` y afecta 0 filas **Then** lanza conflicto de concurrencia (FR-09, AD-3).
**Given** `npm run seed:reviewer` con la contraseña de ejemplo **When** corre **Then** falla; con credenciales válidas crea un REVIEWER con hash bcrypt costo 12 (NFR-01, NFR-02, AC-34, AC-35).
**And** pruebas de integración de repositorios contra `accidentes_test` pasan (AD-12).

**Definition of Done:** común + `lint:arch` verde con `infrastructure/` importando solo `application/` y `domain/` + migración reproducible (down/up) ejecutada.

---

## Epic 2: Backend

API Express completa que cumple AC-1..AC-5 y AC-10..AC-39 del lado servidor.

### Story 2.1: Autenticación y endurecimiento HTTP

As a visitante,
I want crear cuenta, iniciar y cerrar sesión y consultar mi identidad,
So that mis datos queden protegidos tras una sesión verificada en servidor.

**Acceptance Criteria:**

**Given** `POST /api/auth/register` válido **When** se envía **Then** 201, rol `USER`; con `role` o campo desconocido 400 sin crear usuario; email duplicado (incluso en mayúsculas) 409 genérico; contraseña <8 caracteres o >72 bytes 400 con `details` (FR-02, NFR-04, AC-13..16, AD-8, DEC-012).
**Given** `POST /api/auth/login` **When** el email no existe o la contraseña es incorrecta **Then** mismo 401 y mismo mensaje, comparando contra hash ficticio (FR-03, NFR-02, AC-17).
**Given** una sesión válida **When** `GET /api/auth/me` **Then** 200 `{id,email,fullName,role}` sin `password_hash`; tras logout la cookie copiada da 401; logout expirado o repetido da 204 (FR-03, FR-04, AC-10, AC-12, AC-39, AD-6).
**Given** la consulta a `revoked_tokens` falla **When** llega una petición autenticada **Then** se rechaza con 503 (no 200) (AC-11, AD-6).
**Given** cookie manipulada, `alg: none` o solo `Authorization: Bearer` **When** se llama a `me` **Then** 401 (NFR-04, AC-29).
**Given** 11 intentos de login/registro en 15 min **When** llega el 11.º **Then** 429 con `Retry-After` y `{error:{...}}`; además `helmet`, CORS solo `FRONTEND_ORIGIN`, body >100 kB 413, 500 genérico y logs con redact (NFR-07, AC-30..32, AD-7, AD-13, AD-14).
**And** `errorMapper` es el único traductor de errores (AD-7) y los tests de integración usan Supertest contra Postgres real (AD-12).

**Definition of Done:** común + prueba automatizada que busca `password_hash` y `JWT_SECRET` en respuestas y logs (AC-7 parte automática).

### Story 2.2: Registrar, listar y ver accidentes con aislamiento por propietario

As a usuario autenticado,
I want registrar y consultar solo mis accidentes,
So that nadie más vea mis datos personales.

**Acceptance Criteria:**

**Given** un Usuario autenticado **When** envía `POST /api/accidents` sin campos obligatorios **Then** 400 con `details` por campo (FR-05, AC-1).
**Given** fecha futura, tipo inexistente, tipos erróneos, campo extra, `userId`/`ownerId`/`status` en el body **When** se envía **Then** 400 y ningún accidente creado; descripción 19/2001 y documento/teléfono fuera de rango 400; en el límite exacto (20, 2000) 201 (FR-05, NFR-04, AD-8, AC-4, AC-23, AC-24).
**Given** `GET /api/accidents` sin cookie **When** se llama **Then** 401 (NFR-05, AC-2); sin accidentes 200 `[]` (FR-07, AC-5); con tres accidentes, orden por fecha descendente con `id`, tipo, fecha y estado, máximo 100 (AC-27).
**Given** el Usuario B pide el detalle de un accidente de A, un id inexistente o `no-es-uuid` **When** `GET /api/accidents/:id` **Then** el mismo 404 sin datos ajenos (FR-08, NFR-03, AD-5, AC-3, AC-26).
**Given** un REVIEWER **When** lista o pide detalle **Then** ve solo lo suyo y el detalle ajeno da 404 (DEC-011, AC-25).
**And** `ownerId` proviene solo de `req.auth.userId` (AD-5) y el orden de evaluación es 401→403→400→404→409 (AD-7, NFR-05).

**Definition of Done:** común + tests de integración AC-1..AC-5, AC-23..AC-27 ejecutados con resultado.

### Story 2.3: Cambio de estado por Revisor con concurrencia

As a Revisor,
I want avanzar el estado de cualquier accidente,
So that el dueño vea el progreso sin que yo lea datos personales ajenos.

**Acceptance Criteria:**

**Given** un `USER` **When** llama `PATCH /api/accidents/:id/status` sobre accidente propio, ajeno o inexistente **Then** 403 idéntico en los tres casos, antes de buscar el recurso (FR-10, AC-18, AD-7, DEC-011).
**Given** sin sesión **When** se llama al PATCH **Then** 401 (AC-19).
**Given** un REVIEWER con transición válida sobre accidente ajeno **When** envía `{status}` **Then** 200 solo con `{id,status,updatedAt}`, se guardan `status_changed_by/at` y el dueño ve el nuevo estado en el detalle (FR-10, FR-08, AC-20).
**Given** salto, retroceso, mismo estado o desde `CERRADO` **When** se envía **Then** 409 y el estado no cambia (FR-09, AC-21).
**Given** dos PATCH simultáneos con el mismo estado esperado **When** se ejecutan **Then** uno 200 y el otro 409 (FR-09, AD-3, AC-22).
**And** el rol se carga fresco de la base en cada petición (AD-6, DEC-010).

**Definition of Done:** común + prueba de concurrencia (`Promise.all`) ejecutada de forma repetida sin flakiness observada.

---

## Epic 3: Frontend y entrega

Interfaz usable, build servido desde Express y evidencia honesta de entrega.

### Story 3.1: App React con landing, cuenta y rutas protegidas

As a visitante,
I want ver la landing, registrarme, ingresar y salir,
So that pueda acceder a mis accidentes con mi cuenta.

**Acceptance Criteria:**

**Given** un visitante **When** abre la landing **Then** ve el propósito y los accesos "Registrar un accidente" e "Ingresar para consultar mis accidentes" (FR-01, AC-28).
**Given** sin sesión **When** pulsa "Registrar un accidente" o abre una ruta protegida **Then** es redirigido a login/registro (FR-01, AC-28, AD-11).
**Given** el formulario de registro/login **When** hay errores del backend (400, 401, 409, 429) **Then** se muestran mensajes claros sin revelar si el email existe (FR-02, FR-03, NFR-07).
**Given** registro exitoso **When** termina **Then** el frontend hace login (DEC-017) y logout limpia la sesión y redirige.
**And** solo `src/api/` llama a `fetch` con `credentials:'include'` y base `/api`; 401 redirige excluyendo `/auth/login` y `/auth/me` (AD-11); Vite proxy `/api` en dev.

**Definition of Done:** común + pruebas de componentes (Testing Library) de landing, `RequireAuth` y login ejecutadas.

### Story 3.2: Formulario de accidente, listado y detalle

As a usuario autenticado,
I want registrar un accidente y ver mi lista y su detalle con estados claros,
So that sepa qué registré y en qué estado está.

**Acceptance Criteria:**

**Given** el formulario **When** faltan campos o se violan los límites **Then** se muestra error por campo con validación en cliente (`accidentSchema.ts` espejo de DEC-007) y los `details` del backend (FR-05, AC-1).
**Given** envío en curso **When** se espera la respuesta **Then** el botón se deshabilita con indicador de carga; al éxito, confirmación (FR-05).
**Given** una cuenta sin accidentes **When** abre el listado **Then** ve el empty state (FR-07, AC-5).
**Given** accidentes propios **When** abre listado y detalle **Then** ve tipo, fecha y etiqueta de estado en español (REGISTRADO → "Registrado", etc.); un id ajeno muestra "no encontrado" (FR-07, FR-08, AD-3 etiquetas UI).
**And** hay estados de carga y error de red en listado y detalle.

**Definition of Done:** común + pruebas de componentes de formulario (error por campo, carga) y lista (vacío) ejecutadas.

### Story 3.3: Build de producción, README y evidencia de entrega

As a evaluador,
I want arrancar el proyecto desde un clon nuevo solo con el README y ver la evidencia de pruebas,
So that pueda verificar persistencia, ausencia de secretos y el flujo completo.

**Acceptance Criteria:**

**Given** `npm run build` y `npm start` **When** Express sirve `frontend/dist` en el mismo origen con fallback SPA no-`/api` **Then** el flujo completo funciona desde el build (AD-10, NFR-09).
**Given** un clon nuevo y solo el README **When** se sigue instalar → BD → migrar → compilar → sembrar → ejecutar → crear cuenta → registrar → consultar **Then** funciona (NFR-09, DEC-016, AC-9).
**Given** el README **When** se lee **Then** explica el vínculo accidente-cuenta, prerrequisitos, topología mismo sitio, `COOKIE_SECURE` y `LIMITATIONS.md` (FR-06, DEC-015).
**Given** un accidente creado **When** corre `docker compose restart` **Then** los datos persisten (FR-11, AC-6).
**Given** gitleaks sobre el historial y grep de `dist/` **When** se ejecutan **Then** 0 hallazgos (NFR-01, AC-7).
**Given** `TEST_REPORT.md` **When** se entrega **Then** lista cada prueba ejecutada con resultado y limitaciones; nada se declara sin evidencia (NFR-10, AC-38).

**Definition of Done:** común + comandos de AC-6, AC-7 y AC-9 ejecutados con salida pegada en `TEST_REPORT.md`.

---

## Validación final
- Cobertura: FR-01..FR-11 y NFR-01..NFR-10 asignados; AC-1..AC-39 mapeados (ver FR Coverage Map).
- Sin dependencias hacia adelante dentro de cada épica; tablas creadas en la historia que las necesita solo parcialmente: S1.3 crea las 3 tablas de una vez (ver supuesto 3 del log).
- Tamaño: 9 historias, objetivo ~500 líneas cada una.

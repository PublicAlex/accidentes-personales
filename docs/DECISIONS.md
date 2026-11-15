# Registro de decisiones, supuestos y contradicciones

### DEC-001 — Sin insumos de la organización
- Fecha: 2026-11-15
- Tipo: supuesto
- Contexto: el enunciado menciona MDD de agentes, contratos, lineamientos de arquitectura y configuración de PostgreSQL. No se recibieron.
- Decisión: el marco de referencia es el enunciado de la prueba más las plantillas públicas que este cita. Si los insumos llegan después, prevalecen y las diferencias se registran aquí.

### DEC-002 — BMAD Method v6.12.4 (estable)
- Fecha: 2026-11-15
- Tipo: decisión técnica
- Contexto: npm `latest` = 6.12.4. La documentación oficial ya muestra v7, pero está en *preview alpha*.
- Decisión: usar v6.12.4 estable, instalada con `npx bmad-method@6.12.4 install --modules bmm --tools claude-code` (en español, con salida en `docs/bmad`).
- Motivo: una prueba evaluada necesita un proceso estable y reproducible.

### DEC-003 — Uso eficiente de los agentes BMAD
- Fecha: 2026-11-15
- Tipo: decisión de proceso
- Decisión:
  1. Cada workflow BMAD corre en un contexto nuevo (sub-agente), como recomienda BMAD.
  2. Se usa el modo headless y cada supuesto queda en el `.memlog.md` del workflow.
  3. El modelo se elige según el impacto: Opus para arquitectura y seguridad, Sonnet para PRD, historias e implementación, Haiku para tareas mecánicas.
  4. Se omiten los workflows opcionales que no aportan al alcance del MVP: brainstorming, PRFAQ, research de mercado y UX formal.
  5. Se omite el product brief: el enunciado ya cumple esa función, así que el PRD parte directamente de él.
- Motivo: limitar el consumo de tokens sin perder la trazabilidad que pide la rúbrica.

### DEC-004 — Express como adaptador HTTP
- Fecha: 2026-11-15
- Tipo: decisión técnica
- Decisión: Express (el recomendado por el enunciado), con la estructura hexagonal de `reference-architecture-node` como referencia.
- Motivo: evita tener que justificar Fastify y mantiene la regla de dependencias.

## Revisión humana del PRD (2026-11-15)
Origen: `docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md`, generado en modo headless por el agente PM. Resuelve sus preguntas abiertas y corrige debilidades detectadas en la revisión.

### DEC-005 — Logout real con JWT (corrige FR-03)
- Tipo: corrección. El PRD exige que "el servidor deja de aceptar la sesión", y un JWT stateless no lo cumple por sí solo.
- Decisión: JWT en cookie `httpOnly` + `sameSite=lax` (+ `secure` en producción), con expiración de 1 h y claim `jti`. El logout guarda el `jti` en la tabla `revoked_tokens` (expira con el token) y el middleware de auth la consulta, a través de un puerto `TokenRevocationRepository`.

### DEC-006 — Cambio de estado (FR-10, pregunta abierta 1)
- Tipo: supuesto.
- Decisión: columna `users.role` con los valores `USER` (por defecto) o `REVIEWER`. Solo un `REVIEWER` puede usar `PATCH /api/accidents/:id/status`, y la transición la valida el dominio. El revisor se crea con un script de semilla que toma sus credenciales de variables de entorno. El dueño ve el estado pero no puede cambiarlo.
- Motivo: deja demostrable la regla de transiciones y facilita el cambio en vivo de "agregar un estado".

### DEC-007 — Validaciones de campos (pregunta abierta 3)
- Tipo: supuesto.
- Decisión:
  - Descripción: 20 a 2000 caracteres. Lugar: 3 a 200.
  - Tipo de documento: `CC`, `CE`, `TI`, `PASAPORTE`. Número: 5 a 20 caracteres alfanuméricos.
  - Teléfono: 7 a 15 dígitos, con `+` opcional.
  - Contraseña: mínimo 8 caracteres.
  - Los esquemas Zod viven en el adaptador HTTP y las invariantes en el dominio.

### DEC-008 — Endurecimiento HTTP (NFR-07, pregunta abierta 4)
- Tipo: decisión técnica. El PRD lo marcaba como opcional. Se vuelve obligatorio porque es barato y suma en el criterio de seguridad (15 pts).
- Decisión: helmet, CORS restringido a `FRONTEND_ORIGIN` con credentials, y rate limit en login (10 intentos cada 15 min por IP). bcrypt con 12 rounds.

### DEC-009 — Skill tool y skills BMAD
- Tipo: nota de proceso.
- Contexto: las skills BMAD se instalaron con esta sesión ya abierta, así que la herramienta Skill no las reconoció.
- Decisión: el agente leyó y siguió el `SKILL.md` directamente. En sesiones nuevas de Claude Code las skills cargan normalmente.

## Revisión de la validación BMAD del PRD (2026-11-15)
Origen: `validation-report.md`, con calificación *Poor*: 3 hallazgos críticos, 12 altos, 20 medios y 11 bajos.

### DEC-010 — Rol nunca desde el cliente ni guardado en el token (hallazgo crítico 3)
- Tipo: corrección de seguridad.
- Decisión:
  - El registro siempre crea usuarios con rol `USER`. Si el body trae `role` o cualquier campo desconocido, la petición se rechaza con 400 (esquemas Zod `.strict()`).
  - El JWT solo lleva `sub` (id del usuario) y `jti`.
  - En cada petición, el middleware de auth carga el usuario desde el repositorio para saber su rol actual. Así un rol cambiado nunca queda "congelado" en un token viejo.

### DEC-011 — Alcance del rol REVIEWER frente al aislamiento por dueño (hallazgo crítico 2)
- Tipo: aclaración.
- Decisión:
  - NFR-03 aplica a todas las lecturas: `GET /api/accidents` y `GET /api/accidents/:id` filtran siempre por el usuario del token, también para un REVIEWER.
  - El REVIEWER solo puede usar `PATCH /api/accidents/:id/status` sobre cualquier accidente, y la respuesta trae solo `{id, status, updatedAt}`, sin datos personales.
  - Si un USER llama al PATCH, recibe 403. Ese 403 no revela si el accidente existe, porque el chequeo de rol ocurre antes de buscarlo.

### DEC-012 — Contrato HTTP sin ambigüedades (hallazgo alto 7)
- Tipo: decisión técnica.
- Decisión:
  - Orden de evaluación: autenticación (401) → rol (403) → validación (400) → recurso (404) → regla de dominio (409).
  - Un campo desconocido o un `userId`/`ownerId` en el body se rechaza con 400.
  - Una transición de estado inválida devuelve 409 Conflict.
  - Un email duplicado en el registro devuelve 409 con mensaje genérico. Se acepta como riesgo del MVP; se mitiga con rate limit en `/api/auth/register` y `/api/auth/login`.
  - Formato único de error: `{ error: { code, message, details? } }`.

### DEC-013 — CHECK de estado frente a extensibilidad (hallazgo alto 9)
- Tipo: aclaración.
- Decisión: se mantiene el `CHECK` en la BD, porque es una restricción de integridad que pide el enunciado. "Centralizado" significa que la lista de estados y sus transiciones viven en un único módulo del dominio. Agregar un estado = dominio + una migración que reemplaza el CHECK + la etiqueta en la UI + tests. FR-09 se reescribe así.

### DEC-014 — Stack y catálogos cerrados (hallazgo medio 10)
- Tipo: decisión técnica.
- Decisión:
  - PostgreSQL 16 (imagen Docker `postgres:16`) y React 18 + Vite + TypeScript, como recomienda el enunciado.
  - Tipos de accidente: `TRANSITO`, `LABORAL`, `DOMESTICO`, `DEPORTIVO`, `OTRO`.
  - Cada FR/NFR tendrá al menos un criterio de aceptación verificable (hallazgo alto 8). Incluye criterios para logout, roles, rate limit y hardening.

## Revisión humana de la arquitectura (2026-11-15)
Origen: `docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md`, generado por el agente Architect (Opus) y revisado por 3 sub-revisores de BMAD.

### DEC-015 — Cookie `secure` configurable por entorno
- Tipo: aclaración de DEC-005.
- Decisión: la cookie usa `secure` según la variable `COOKIE_SECURE`.
  - En `.env.example` vale `false`, para que el arranque desde build funcione en `http://localhost` (prueba 9).
  - Un despliegue real con HTTPS debe ponerla en `true`.
  - El backend registra un aviso al arrancar si `NODE_ENV=production` y `COOKIE_SECURE=false`.
  - Se documenta en `LIMITATIONS.md`.

### DEC-016 — Orden del arranque
- Tipo: aclaración de NFR-09.
- Decisión: el orden de NFR-09 no es normativo. El README sigue la secuencia instalar → levantar BD → migrar → compilar → sembrar revisor (el script corre desde `dist/`) → ejecutar.

### DEC-017 — Versiones del stack
- Tipo: verificación.
- Decisión: las versiones fijadas en el spine se consultaron con `npm view` el 2026-11-15. La imagen `postgres:16` se verificó con `docker pull`.
- Supuestos que se aceptan:
  - Express 5.
  - TypeScript 5.9, porque dependency-cruiser exige una versión menor a 7.
  - El registro no inicia sesión automáticamente.
  - La "fecha no futura" se evalúa en `America/Bogota`.

### DEC-018 — Revisión humana de S1.1: allowlist de gitleaks y CI
- Fecha: 2026-11-15
- Tipo: corrección sobre el código del agente.
- Hallazgos:
  1. El agente puso en el allowlist de gitleaks archivos completos (el spine y el manifiesto de BMAD). Eso podría ocultar secretos que se agreguen después a esos archivos.
  2. El commit `ci:` dice incluir gitleaks, pero el workflow no lo ejecutaba.
- Corrección:
  1. El allowlist queda limitado a `.env.example`. Los 2 falsos positivos se verificaron a mano (valores ficticios documentados y un hash SHA-256 de integridad) y se ignoran por fingerprint en `.gitleaksignore`.
  2. Se agregó al CI el job `secretos`, que corre gitleaks sobre el historial completo (`fetch-depth: 0`).
- Verificación: `gitleaks detect` sobre 9 commits dio "no leaks found".

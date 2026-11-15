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

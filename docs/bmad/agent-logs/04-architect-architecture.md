# 04 — Arquitecto: architecture spine

- **Workflow:** `bmad-architecture` (intent create, altitud feature, propósito build-substrate), modo headless.
- **Agente / modelo:** Arquitecto BMAD (Winston), Opus.
- **Fecha:** 2026-11-15.
- **Carga nativa de la skill:** sí (la herramienta Skill cargó `bmad-architecture`).

## Entradas
- `docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md` (v0.2, approved-for-architecture) y su `.memlog.md`.
- `docs/DECISIONS.md` (DEC-001..DEC-014, autoritativas, no se re-decidieron).
- Referencias citadas, sin clonar: `eriksonwilliam/reference-architecture-node` (estructura hexagonal, adaptador HTTP cambiado a Express) y la plantilla `react-ts` de Vite.

## Salidas
- `docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md` (status final, 351 líneas).
- `.../architecture-accidentes-personales-2026-11-15/.memlog.md`
- `.../reviews/review-reconcile-inputs.md`, `review-tech-currency.md`, `review-adversarial.md`

## Pasos
| Paso | Estado |
|---|---|
| Resolver customización y configuración | ejecutado |
| Saludo, elección Coaching/Fast, pregunta de propósito y audiencia | omitido (headless; propósito = build-substrate tomado del encargo) |
| Oferta de reanudar | no aplica (no había carpeta previa) |
| `memlog.py init` y registro de cada decisión, supuesto y versión | ejecutado |
| Verificación de versiones "en la web" | sustituida por `npm view` contra el registro npm: quien invocó prohibió el web-fetch. La imagen `postgres:16` quedó sin verificar |
| Distill del spine | ejecutado |
| Reconcile de entradas (subagente sobre PRD y DECISIONS) | ejecutado (un subagente para las dos entradas, no uno por entrada, para ahorrar tokens). Corrió en paralelo con el gate y no antes; sus correcciones se aplicaron junto con las del gate |
| Reviewer Gate | ejecutado: `lint_spine.py` + 2 lentes configuradas como subagentes en paralelo (vigencia tecnológica, adversarial). El adversarial además hizo de rubric walker. El lint deja 2 hallazgos bajos falsos positivos (`{field, message}` y `{status}` son JSON literal, no tokens) |
| Triage | ejecutado: correcciones claras aplicadas; 2 preguntas no bloqueantes registradas |
| Renderings adicionales y handoffs externos | omitidos (headless; no se pidieron; no hay `external_handoffs`) |
| Cierre (status final + evento "spine finalized") | ejecutado |

Límite de longitud: el objetivo eran ≤ 300 líneas y quedaron 351. Las correcciones de los revisores (contratos de puertos, tabla de errores, inyección de la configuración HTTP) se priorizaron sobre la brevedad.

## Decisiones clave
- **Hexagonal estricta, verificada por imports reales.** dependency-cruiser con `tsPreCompilationDeps` (atrapa `import type`) y `scripts/check-globals.mjs` (prohíbe `Date`, `crypto`, `process`, `Buffer` y `console` en el dominio y la aplicación, y `fetch` fuera de `frontend/src/api`). Motivo: es el criterio de 18/100, calificado por imports.
- **Migraciones con node-pg-migrate 9 en archivos `.sql`.** Da tabla de control, orden y up/down sin escribir un runner propio, y el SQL plano se puede leer en la defensa.
- **Mismo origen en producción.** Express sirve `frontend/dist`, y en desarrollo Vite hace proxy de `/api`. Motivo: la cookie `sameSite=lax` funciona sin CORS entre sitios, y un solo proceso cumple "correr desde el build".
- **Revocación fail-closed.** Si falla la consulta, responde 503. El logout responde 503 si no pudo revocar un token válido.
- **Contratos de puertos fijos (AD-4).** Ante fila inexistente se devuelve `null`. Los adaptadores `Pg*` traducen 23505 a 409 y los errores de conexión a 503. Una suite de contrato corre contra los fakes y contra Postgres.
- **La configuración HTTP y el Logger se inyectan con `HttpAppDeps` (AD-14).** Así `interfaces/` nunca importa `infrastructure/`.
- **La aplicación genera ids, `jti` y timestamps.** La vida de la sesión sale de `TokenService.sign`, que es la única fuente.
- **Versiones del stack.** TypeScript 5.9.3 porque dependency-cruiser 18 exige `<7`. React 18 por DEC-014. jsdom 29.1.1 porque la versión 31 exige Node 24.15 y aquí hay 24.14.
- **Receta de extensión con el mínimo de archivos.** `RECHAZADO` toca 4 archivos más las pruebas. `gravedad` agrega un `CHECK ... NOT VALID` para no inventar datos en las filas existentes.

## Status JSON
```json
{
  "status": "partial",
  "intent": "create",
  "altitude": "feature",
  "purpose": "build-substrate",
  "doc_workspace": "docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15",
  "spine": "docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md",
  "memlog": "docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/.memlog.md",
  "companions": [],
  "assumptions": [
    "Express 5 (DEC-004 no fija versión)",
    "El registro no inicia sesión; el frontend hace login después",
    "COOKIE_SECURE explícito; false en .env.example para correr en http://localhost",
    "Clock.today() en APP_TIMEZONE=America/Bogota; occurred_on es de tipo date",
    "Límites de rate limit inyectables en las pruebas",
    "postgres:16 no verificada en Docker Hub (sin web)"
  ],
  "open_questions": [
    "¿Se acepta COOKIE_SECURE=false con NODE_ENV=production para correr localmente sobre http (DEC-005)?",
    "¿El orden de NFR-09 (migrar, sembrar, compilar) es normativo? El README compila antes de sembrar"
  ],
  "conflicts_with_prior_decisions": []
}
```

## Preguntas abiertas
1. COOKIE_SECURE=false en la ejecución local desde el build, frente al "secure en producción" de DEC-005.
2. El orden del README: compilar antes de sembrar, porque la semilla corre desde `dist/`.

Ninguna es bloqueante. Siguiente paso recomendado: `bmad-create-epics-and-stories` (o `bmad-spec` para adoptar el spine como companion).

# 03 - PM: actualización del PRD (headless)

- **Workflow:** bmad-prd, intent update, headless
- **Modelo:** Sonnet (claude-sonnet-5-5)
- **Fecha:** 2026-11-15
- **Carga nativa con Skill tool:** sí
- **Pasos ejecutados:** activación headless, lectura de PRD/memlog/validation-report/DECISIONS (DEC-005..014), reescritura del PRD, registro en memlog (8 entradas).
- **Pasos omitidos:** greeting, Discovery, resolución de config/customización (no necesaria en headless), reviewers, reconciliación de insumos, re-validación completa (instrucción del solicitante).

## Entradas
`prd.md`, `.memlog.md`, `validation-report.md`, `docs/DECISIONS.md`.

## Salidas
`docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md` (198 líneas, v0.2, status approved-for-architecture) y `.memlog.md` actualizado.

## Estado JSON
```json
{
  "intent": "update",
  "status": "complete",
  "prd": "docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md",
  "assumptions": ["límite de listado 100", "nombre del afectado 3 a 120 caracteres", "frontend y API en el mismo sitio"],
  "open_questions": [],
  "conflicts_with_prior_decisions": [
    "memlog: 'rol opcional' y 'éxito = solo 9 escenarios' reemplazados por DEC-006 y por definición ampliada",
    "DEC-005 menciona un único rate limit en login; DEC-012 lo extiende a register (se aplicó DEC-012)"
  ]
}
```

## Cambios mapeados
| Cambio | DEC / hallazgo |
|---|---|
| FR-03 con jti, revoked_tokens, TokenRevocationRepository, fail-closed, idempotencia; AC-10..12 | DEC-005; crítico FR-03, C-01, M-15 |
| FR-10 obligatorio con REVIEWER, 403 antes de buscar; rol en glosario, FR-04, FR-11; AC-18..20 | DEC-006, DEC-011; C-02, H-01 |
| Registro siempre USER, 400 por `role`; JWT solo `sub`/`jti`; rol desde BD; AC-13,14 | DEC-010; C-03 |
| NFR-03 sin excepción de lectura; listados del REVIEWER filtrados; AC-25 | DEC-011; C-02 |
| Tabla de límites y tipos de accidente, contraseña 8-72; AC-16,24 | DEC-007, DEC-014; H-09, M-12 |
| NFR-07 obligatorio (helmet, CORS, rate limit login/register, 429, 100 kB, sin PII); bcrypt 12; AC-30..32,35 | DEC-008, DEC-012; H-11, M-13 |
| Sin alternativas "o": 400 por campo desconocido, 409 por transición/email, orden 401-403-400-404-409, formato de error; AC-21..23 | DEC-012; H-02..H-05, M-01, M-06 |
| FR-09/FR-11: CHECK se mantiene, extensibilidad definida, concurrencia; AC-22,37 | DEC-013; H-05, H-06 |
| AC para todos los FR/NFR (AC-1..9 obligatorios aparte de AC-10..39) | DEC-014; H-07 |
| Sección 8 depurada; éxito redefinido; NON-GOAL de refresh; NFR-10 como criterio de entrega; errata corregida; uuid, listado, README | H-08, rubric medio/bajo, M-03, M-04, M-10 |

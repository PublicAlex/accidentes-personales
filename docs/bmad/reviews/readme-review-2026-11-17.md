# Revisión de README.md (2026-11-17)

- Skill: `bmad-review` (modo headless), modelo Sonnet.
- Contenido: `README.md` (clase: docs). Lentes: `structure`, `prose` (tras structure), `verification-gap` (aplicada a las afirmaciones ejecutables del README), `edge-case-hunter` (lector con clon nuevo). Adversarial omitida: el contenido es documentación operativa.
- Contraste con: `package.json` (raíz y workspaces), `.env.example`, `docker-compose.yml`, `docs/`, `docs/DECISIONS.md` (DEC-015, DEC-016, DEC-021), `backend/src/main/seedReviewer.ts`, `frontend/src/App.tsx`, rama `feat/ui-estilo-clinico`.

## Resumen

11 hallazgos: 3 altos, 5 medios, 3 bajos (la severidad es solo orientativa para el equipo; la skill no ordena).

## Estructura (structure)

| # | Ubicación | Hallazgo | Corrección propuesta | Sev. |
|---|---|---|---|---|
| S1 | Inicio | La descripción mezcla stack con propósito y no dice para quién es, ni que los datos son ficticios (MVP). | Descripción de 2–3 líneas: qué hace, para quién, MVP con datos ficticios. | Alto |
| S2 | Documento | No hay lista de funcionalidades; el lector no ve qué ofrece la app (landing, cuenta, estados, rol Revisor, seguridad). | Sección "Funcionalidades". | Alto |
| S3 | "Puesta en marcha" | La secuencia rápida está enterrada tras configuración de `.env`; no hay camino "ejecutar ya" ni se separa de la primera configuración. | Separar "Ejecutar en local (rápido)" de "Primera vez desde un clon nuevo". | Alto |
| S4 | Topología, Cookie, Vínculo | Tres secciones de diseño interrumpen el flujo operativo. | Mover a `docs/architecture.md`/`docs/api.md` por enlace; dejar una línea. | Medio |
| S5 | Documentación | Falta `TEST_REPORT.md`, `TRACEABILITY.md`, `docs/evidence/` y `docs/bmad/`; los registros de agentes no se explican. | Índice completo con descripción. | Medio |

## Prosa (prose)

| # | Ubicación | Hallazgo | Corrección | Sev. |
|---|---|---|---|---|
| P1 | Párrafo "Otras variables" | Párrafo largo con 10 variables; difícil de escanear. | Reducir a lo esencial y remitir a `.env.example`. | Medio |
| P2 | Prerrequisitos / varios | Términos sin explicar (`REVIEWER`, "semilla"). | Definir en la primera aparición. | Bajo |
| P3 | Estructura | Lista `docs/` sin `bmad/` ni `evidence/`. | Actualizar el árbol. | Bajo |

## Brechas de verificación (verification-gap)

| # | Ubicación | Hallazgo | Corrección | Sev. |
|---|---|---|---|---|
| V1 | Secuencia de arranque | No hay evidencia de que la secuencia del README se ejecute completa sobre el checkout actual (la última evidencia es de S3.3, antes del estilo clínico y DEC-021). | Ejecutarla y guardar la salida en `docs/evidence/README-verificacion-2026-11-17.txt`. | Medio |

## Casos límite (edge-case-hunter, clon nuevo)

| # | Ubicación | Hallazgo | Corrección | Sev. |
|---|---|---|---|---|
| E1 | Resolución de problemas | No hay sección: puerto 5432/3000 ocupado, BD caída (`ECONNREFUSED`), `EMAIL_TAKEN` (DEC-021: "Este email ya está registrado") ni la negativa de la semilla con la contraseña de ejemplo. | Sección "Solución de problemas" con causa y arreglo. | Medio |
| E2 | Cómo probar | No hay ejemplo de cómo el Revisor cambia un estado (requiere login con cookie jar y `PATCH`); la UI no lo permite. | Ejemplo `curl` con cookie jar. | Medio |

## Solapamientos

S3 y E1 coinciden en que un lector con clon nuevo no distingue el camino feliz de los fallos habituales.

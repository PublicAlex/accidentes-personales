# Fuentes y licencias

| Fuente | Uso | Licencia | Adaptaciones |
|---|---|---|---|
| [`eriksonwilliam/reference-architecture-node`](https://github.com/eriksonwilliam/reference-architecture-node) | Referencia de estructura hexagonal (capas, puertos y adaptadores). No se copió código ni se clonó. | No verificada (no se consultó el repositorio desde este entorno) | Adaptador HTTP cambiado a Express; reglas de dependencia ejecutables con dependency-cruiser; casos de uso con puertos propios. |
| Plantilla `react-ts` de `create-vite` | Base del frontend (Vite + React + TypeScript). | MIT para `vite` (verificada en `node_modules/vite/package.json`); la licencia del paquete `create-vite` no está instalada localmente y queda no verificada | React 18.3.1 (en vez de 19), TypeScript 5.9 (por dependency-cruiser), sin oxlint; estructura `src/api`, `pages`, `components`, `hooks`. |
| Node-Boilerplate | Considerado como alternativa y descartado; no se usó código. | No verificada | Ninguna. |
| BMAD Method v6.12.4 | Proceso de planificación e implementación (PRD, arquitectura, historias, revisión). Instalado con `npx bmad-method@6.12.4 install --modules bmm --tools claude-code`. | No verificada (el paquete no está en `node_modules`) | Salida en `docs/bmad`; ver DEC-002 y DEC-003. |

Motivo de la elección: una referencia de arquitectura hexagonal sirve de guía sin acoplar el proyecto a su código; la plantilla oficial de Vite es la recomendada por el enunciado; BMAD estable (v6.12.4) en vez de la v7 en preview.

Licencias de las dependencias directas, leídas del campo `license` de su `package.json` en `node_modules` el 2026-11-15: MIT para `express`, `pg`, `zod`, `react`, `react-dom`, `react-router-dom`, `vite`, `@vitejs/plugin-react`, `bcrypt`, `jsonwebtoken`, `pino`, `helmet`, `cors`, `cookie-parser`, `express-rate-limit`, `node-pg-migrate`, `dependency-cruiser`, `tsx`, `vitest`, `supertest`, `jsdom` y `@testing-library/react`; Apache-2.0 para `typescript`. No se auditaron las dependencias transitivas.

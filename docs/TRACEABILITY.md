# Trazabilidad: historia → FR/AC → pruebas → commit de merge

Fuentes: mapa de cobertura de `docs/bmad/planning-artifacts/epics.md`, Test Map del Architecture Spine y `git log --first-parent main --oneline` (fecha 2026-11-15). Las pruebas listadas son archivos reales del repositorio; los AC de la columna "FR / AC" vienen del mapa de cobertura, no de comentarios en las pruebas (las pruebas no citan números de AC). Los merges son `--no-ff` locales que simulan PR (no hay remoto; ver `GIT_STRATEGY.md`).

| Historia | FR / NFR | AC | Pruebas (archivos) | Commit de merge en `main` |
|---|---|---|---|---|
| S1.1 Scaffold, entorno y guardas | NFR-01, NFR-06, NFR-08 | AC-33, AC-36 | `backend/tests/unit/infrastructure/{env,server.failfast}.test.ts`, `backend/tests/unit/arch/lint-arch.test.ts` | `c3cb93c` |
| S1.2 Dominio y máquina de estados | FR-09, NFR-08 | AC-8 | `backend/tests/unit/domain/{AccidentStatus,Accident,User,Catalogs,Id,purity}.test.ts` | `20e899a` |
| S1.3 Migraciones, adaptadores pg y semilla | FR-11, NFR-01 | AC-34, AC-37 | `backend/tests/integration/{schema,pgRepositories,seedReviewer,seedEntrypoint}.test.ts`, `backend/tests/contract/*.contract.ts`, `backend/tests/unit/application/EnsureReviewer.test.ts` | `d30cc45` |
| S2.1 Autenticación y endurecimiento HTTP | FR-02, FR-03, FR-04, NFR-02, NFR-04, NFR-05, NFR-07 | AC-10..AC-17, AC-29..AC-32, AC-35, AC-39 | `backend/tests/integration/{auth,auth.guard,security,dbDown}.test.ts`, `backend/tests/unit/application/auth.test.ts`, `backend/tests/unit/infrastructure/{JwtTokenService,PinoLogger}.test.ts` | `40e0a09` |
| S2.2 Registrar, listar y ver accidentes | FR-05, FR-07, FR-08, NFR-03 | AC-1..AC-5, AC-23..AC-27 | `backend/tests/integration/accidents.{create,validation,ownership,list}.test.ts`, `backend/tests/unit/application/accidents.test.ts` | `7b94966` |
| S2.3 Cambio de estado por Revisor | FR-09, FR-10 | AC-18..AC-22 | `backend/tests/integration/accidents.status.test.ts`, `backend/tests/unit/application/changeAccidentStatus.test.ts` | `0c2c62e` |
| S3.1 Frontend base | FR-01, FR-02..FR-04 (UI) | AC-28 | `frontend/src/pages/{Landing,Login,Register}Page.test.tsx`, `frontend/src/components/{Layout,RequireAuth}.test.tsx`, `frontend/src/api/client.test.ts` | `6b5d492` |
| S3.2 Formulario, listado y detalle | FR-05, FR-07, FR-08 (UI) | AC-1 (UI), AC-5 (UI) | `frontend/src/pages/{AccidentNew,AccidentList,AccidentDetail}Page.test.tsx`, `frontend/src/api/{accidentSchema,accidents}.test.ts`, `frontend/src/components/statusLabels.test.ts` | `c8c224a` |
| S3.3 Build, README y evidencia | FR-06, FR-11, NFR-01, NFR-09, NFR-10 | AC-6, AC-7, AC-9, AC-38 | `backend/tests/integration/static.test.ts` (servido estático y 404 JSON); evidencia ejecutada en `docs/evidence/S3.3-*` | **pendiente: no se ha hecho merge** (rama `feat/S3.3-entrega`) |

Notas:

- AC-6 y AC-9 se verifican con comandos, no con pruebas automatizadas: `scripts/verify-persistence.sh` y un clon limpio (`docs/evidence/S3.3-AC6-*`, `S3.3-AC9-*`). AC-7 combina `backend/tests/integration/security.test.ts` (el Test Map lo nombraba `secrets-leak.test.ts`, que no existe), `npm run scan:secrets` y un grep de `frontend/dist`.
- AC-38 es este conjunto de documentos: `docs/TEST_REPORT.md`.
- Commits de proceso en la historia de `main`: `5e832c7` (instalación de BMAD v6.12.4) y `56da3dd` (merge de la planificación).

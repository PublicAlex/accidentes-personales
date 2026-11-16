# Informe de pruebas (AC-38, NFR-10)

Fecha de ejecución: 2026-11-15. Rama `feat/S3.3-entrega`. Todo lo que aparece como "pasó" se ejecutó en esta sesión y su salida está en `docs/evidence/`. Lo que no se ejecutó está en la sección final.

## Totales de la ejecución fresca de la suite automatizada

Comando: `npm test` (BD real `accidentes_test` en Docker), salida en `docs/evidence/S3.3-tests-2026-11-15.txt`.

| Paquete | Archivos | Pruebas | Resultado |
|---|---|---|---|
| backend (unitarias, contrato, integración) | 30 | 281 | 281 pasaron, 0 fallaron |
| frontend (Vitest + Testing Library + jsdom) | 12 | 48 | 48 pasaron, 0 fallaron |
| **Total** | **42** | **329** | **329 pasaron** |

Además, en la misma sesión: `npm run build` exit 0 (`S3.3-build-2026-11-15.txt`) y `npm run lint:arch` exit 0 con 69 módulos y sin violaciones (`S3.3-lint-arch-2026-11-15.txt`).

## Los 9 escenarios obligatorios

| AC | Escenario | Prueba o comando | Resultado real | Evidencia | Limitaciones |
|---|---|---|---|---|---|
| AC-1 | Accidente sin campos obligatorios | `backend/tests/integration/accidents.create.test.ts`, `accidents.validation.test.ts`; UI `frontend/src/pages/AccidentNewPage.test.tsx` | Pasó (dentro de la suite de arriba) | `S3.3-tests-2026-11-15.txt` | La UI se probó con jsdom, no en un navegador real |
| AC-2 | `GET /api/accidents` sin cookie | `backend/tests/integration/auth.guard.test.ts` | Pasó | `S3.3-tests-2026-11-15.txt` | |
| AC-3 | Usuario B pide accidente de A | `backend/tests/integration/accidents.ownership.test.ts` | Pasó (404 sin datos de A) | `S3.3-tests-2026-11-15.txt` | Usuarios creados con bcrypt de costo reducido en las pruebas |
| AC-4 | Datos inválidos | `backend/tests/integration/accidents.validation.test.ts`, `backend/tests/unit/domain/Accident.test.ts` | Pasó | `S3.3-tests-2026-11-15.txt` | |
| AC-5 | Listado vacío y con datos | `backend/tests/integration/accidents.list.test.ts`; UI `AccidentListPage.test.tsx` | Pasó | `S3.3-tests-2026-11-15.txt` | UI solo en jsdom |
| AC-6 | Persistencia tras reinicio | `RESTART_APP_CMD=<reinicio> scripts/verify-persistence.sh http://localhost:3000` contra `npm start` del build | Pasó: el accidente creado era idéntico antes y después de reiniciar el proceso de la app y de `docker compose restart db` (exit 0) | `S3.3-AC6-persistencia-2026-11-15.txt` | La app se reinició matando y relanzando el proceso; el reinicio de BD fue `docker compose restart db` (contenedor, no el host). Cuenta de prueba dejada en la BD de desarrollo |
| AC-7 | Sin secretos | `npm run scan:secrets` (gitleaks v8.30.1 sobre el historial, 60 commits de todas las ramas); grep de `frontend/dist`; `backend/tests/integration/security.test.ts` (respuestas y logs sin `password_hash`/`JWT_SECRET`); curl a register/login/me/lista | Pasó con una salvedad: la primera ejecución de gitleaks halló 4 coincidencias, revisadas a mano como falsos positivos (valor de ejemplo público de `JWT_SECRET` en `env.ts` y en un spec, contraseña ficticia de una prueba, contraseña ficticia en la evidencia AC-9) e ignoradas por fingerprint en `.gitleaksignore`; la segunda ejecución dio "no leaks found" (exit 0). grep de `dist/`: 0 coincidencias (valores reales de `.env` y patrones `postgres://`, `DATABASE_URL`, `JWT_SECRET`, `password_hash`, `VITE_`). 0 apariciones de `password_hash`, `$2b$`, el secreto o la contraseña en respuestas y log del curl | `S3.3-AC7-gitleaks-dist-2026-11-15.txt`, `S3.3-AC7-respuestas-2026-11-15.txt`, `S3.3-password-hash-2026-11-15.txt` | El escaneo se hizo en local (no en CI). La allowlist por fingerprint oculta esos 4 hallazgos concretos, ya revisados |
| AC-8 | Matriz de transiciones | `backend/tests/unit/domain/AccidentStatus.test.ts` | Pasó | `S3.3-tests-2026-11-15.txt` | |
| AC-9 | Clon nuevo, solo README | `git clone` local a un directorio temporal y los pasos del README: `npm ci`, `.env`, `docker compose up -d db`, `npm run migrate`, `npm run build`, `npm run seed:reviewer`, `npm start`, registro, login, crear accidente, listarlo, cambiar estado como revisor | Pasó sin modificar el README: todos los pasos con exit 0 y el flujo completo respondió bien (`/` y una ruta SPA 200 HTML, `/api/no-existe` 404 JSON, 201 de registro y de accidente, listado con el accidente, PATCH del revisor 200) | `S3.3-AC9-clon-limpio-2026-11-15.txt` | Se usó `POSTGRES_PORT=5433` y `COMPOSE_PROJECT_NAME=accidentes9` para no chocar con la BD en marcha (el README lo documenta). El flujo de UI se hizo por HTTP con curl, no con un navegador. El clon, su contenedor y su volumen se eliminaron |

Hash de contraseña en BD (NFR-02, AC-35): `SELECT left(password_hash,7)` en las 5 cuentas existentes dio `$2b$12$` en todas, longitud 60 (`S3.3-password-hash-2026-11-15.txt`).

Servido de producción (AD-10): `backend/tests/integration/static.test.ts` (6 pruebas, incluidas en el total) y comprobación manual contra `npm start` en el AC-9: ruta SPA 200 HTML, `/api` desconocida 404 JSON.

## Lo que NO se ejecutó

- **CI de GitHub Actions**: no hay remoto; `.github/workflows/ci.yml` existe pero nunca corrió. El job `secretos` y el job `verificar` están sin ejecutar.
- **Prueba E2E automatizada en navegador**: no existe. La UI solo se probó con Vitest + jsdom y con peticiones HTTP. La verificación manual de la interfaz en un navegador real queda pendiente para la persona humana.
- **Pruebas de carga, accesibilidad o compatibilidad de navegadores**: no se hicieron.
- **`npm audit`**: `npm ci` informó 3 vulnerabilidades moderadas; no se investigaron ni se corrigieron.
- **Despliegue con HTTPS**: `COOKIE_SECURE=true` no se probó con TLS real (ver `docs/LIMITATIONS.md`).
- **Licencias transitivas** y las licencias de BMAD, `reference-architecture-node` y Node-Boilerplate: no verificadas (ver `docs/SOURCES.md`).
- **Revisión humana de seguridad** de las historias: recomendada y pendiente.
- **Merge de `feat/S3.3-entrega` a `main`**: no realizado.

Limitaciones conocidas del producto: `docs/LIMITATIONS.md`.

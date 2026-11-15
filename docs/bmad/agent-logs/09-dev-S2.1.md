# Log 09 — Dev S2.1 (Autenticación y endurecimiento HTTP)

Fecha: 2026-11-15. Skill: `bmad-build-auto`. Modelo: Sonnet 5.5. Rama: `feat/S2.1-auth` (desde `main`).

## Pasos
- Step 1 (clarificar/ruta): ejecutado; árbol limpio, rama creada. Contexto de épica 2 no existía: compilado por subagente (`epic-2-context.md`).
- Step 2 (plan): `spec-2-1-autenticacion-y-endurecimiento-http.md` escrito (matriz E/S, Code Map, notas de diseño) y pasado a ready-for-dev.
- Step 3 (implementar): instalé dependencias del stack fijado en el spine; un subagente implementó el spec; yo revisé el código clave y ejecuté toda la verificación.
- Step 4 (review): 4 capas (blind, edge-case, verification-gap, intent-alignment) en subagentes; triage de 35 hallazgos en el spec; 11 parches aplicados por mí, 2 diferidos, resto rechazado con motivo.
- Omitido: re-engagement del subagente de implementación (apliqué los parches yo mismo, eran pequeños). Nota: la plataforma lanzó los subagentes en segundo plano; esperé sus notificaciones antes de continuar.

## Archivos
- `backend/src/application/`: `errors.ts` (Unauthenticated/Forbidden/NotFound) y casos de uso `RegisterUser`, `LoginUser`, `LogoutUser`, `AuthenticateRequest`, `GetCurrentUser`.
- `backend/src/infrastructure/`: `security/JwtTokenService.ts`, `logging/PinoLogger.ts`, guardia de producción en `config/env.ts`.
- `backend/src/interfaces/http/`: `app.ts`, `middleware/{authenticate,requireRole,validate,rateLimit}`, `schemas/authSchemas.ts`, `presenters/userPresenter.ts`, `controllers/authController.ts`, `routes/authRoutes.ts`, `errors/errorMapper.ts`.
- `backend/src/main/container.ts`, `server.ts` (listen, purga horaria, aviso COOKIE_SECURE, apagado ordenado).
- Pruebas: `tests/fakes/index.ts`, `tests/unit/application/auth.test.ts`, `tests/unit/infrastructure/{JwtTokenService,PinoLogger,env}.test.ts`, `tests/integration/{auth,security}.test.ts`, `tests/support/httpApp.ts`.
- Docs: spec, `epic-2-context.md`, `sprint-status.yaml` (S1.3 -> done; S2.1 -> review), evidencia `docs/evidence/S2.1-*.txt`.

## Comandos y resultados reales
- `npm run build`: exit 0 (`S2.1-build.txt`).
- `npm run lint:arch`: exit 0, 61 módulos sin violaciones y check-globals sin violaciones (`S2.1-lint-arch.txt`).
- `npx tsc --noEmit -p backend/tsconfig.json`: exit 0 (`S2.1-typecheck.txt`).
- `npm test`: exit 0; backend 20 archivos / 213 pruebas verdes contra `accidentes_test` real; frontend sin pruebas (`S2.1-tests.txt`).
- Búsqueda de secretos: sin coincidencias del JWT_SECRET real en backend/docs (`S2.1-scan.txt`). `.env` no versionado.
- Arranque manual de `backend/dist/main/server.js` con el `.env` local: aviso COOKIE_SECURE, purga inicial y `GET /api/auth/me` 401 con cabeceras helmet (lo reportó el subagente de implementación; no lo repetí).

## Desviaciones y decisiones
- `LogoutUser` recibe `Clock` para derivar `expiresAt` sin `new Date(` (regla de `check-globals`).
- Un solo limitador compartido por IP para login y registro (10/15 min).
- Login valida contraseña de forma laxa (1..1024) para no revelar reglas; registro aplica >=8 caracteres y <=72 bytes.
- Pruebas de integración consolidadas en `auth.test.ts` y `security.test.ts` en lugar de los nombres del Test Map.
- Extras: `Cache-Control: no-store` en `/api`, 404 JSON para `/api/*` desconocido, `requireRole` listo para S2.2/S2.3.

## Pendientes
- Diferidos: `trust proxy` configurable; pruebas de estática/SPA y de `purgeRevocations` contra Pg.
- Rate limit en memoria; sin logs de acceso ni correlación de peticiones.
- Merge a main pendiente (no se hizo); revisión humana de seguridad recomendada.

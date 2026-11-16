---
title: 'S3.1 App React con landing, cuenta y rutas protegidas'
type: 'feature'
created: '2026-11-15'
status: 'in-progress'
baseline_revision: '38b9d2713ea3217355d2ea376f18104db2dbe052'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'docs/bmad/implementation-artifacts/epic-3-context.md'
  - 'docs/bmad/planning-artifacts/architecture/architecture-accidentes-personales-2026-11-15/ARCHITECTURE-SPINE.md'
  - 'docs/DECISIONS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** el frontend es un placeholder; un visitante no puede ver la landing, registrarse, ingresar ni salir, ni existen rutas protegidas.

**Approach:** SPA React 18 + Vite + TS con `react-router-dom` 7.18.5. `src/api/` es el único adaptador HTTP (único lugar con `fetch`, `credentials:'include'`, base `/api`, errores normalizados a `{code,message,details}`). Un `AuthProvider` (`useAuth`) consulta `/api/auth/me` y `RequireAuth` redirige a `/login` (solo UX; el servidor es la autoridad).

## Boundaries & Constraints

**Always:** UI y textos en español; `fetch` solo en `frontend/src/api/` (`npm run lint:arch` lo verifica; ni siquiera escribir la cadena `fetch(` en otros archivos, tests incluidos); sin secretos ni `VITE_*` privados; el proxy `/api -> http://localhost:3000` ya está en `vite.config.ts`; un 401 limpia el estado de auth (y por tanto navega a `/login` vía `RequireAuth`) EXCEPTO para `/auth/login` y `/auth/me`; la landing es pública; mensajes de login genéricos (401 -> "Correo o contraseña incorrectos", nunca revelar si el email existe); 429 -> "Demasiados intentos, espera unos minutos"; 409 en registro -> mensaje genérico ("No se pudo completar el registro...") sin afirmar que el email existe; 400 -> mostrar `details` por campo (`field` -> `FieldError`) y mensaje general si no hay detalle; error de red -> "No se pudo conectar con el servidor"; tras registro exitoso (201, no inicia sesión) el frontend hace login con las mismas credenciales y navega a `/accidentes`; logout llama `POST /auth/logout`, limpia estado y navega a `/`; validación cliente del registro: email formato, contraseña >= 8, nombre 3-120; etiquetas accesibles (`<label htmlFor>`), `role="alert"` en errores, botón deshabilitado + texto de carga mientras envía; CSS simple y responsivo en `src/styles.css`.

**Never:** llamar a la API fuera de `src/api/`; guardar token en `localStorage` (la sesión es cookie httpOnly); decidir autorización solo en el cliente como si fuera segura; tocar el backend; agregar dependencias no pinned (solo las ya instaladas: react-router-dom, @testing-library/react, @testing-library/dom, jsdom); formulario de accidentes y listado reales (son S3.2: aquí solo páginas placeholder protegidas).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Landing | visitante en `/` | propósito + enlaces "Registrar un accidente" y "Ingresar para consultar mis accidentes" | - |
| Registrar sin sesión | clic en "Registrar un accidente" (`/accidentes/nuevo`), `/me` da 401 | redirige a `/login` | sin mensaje de error por el 401 de `/me` |
| Ruta protegida cargando | `/me` pendiente | "Cargando..." sin redirigir | - |
| Con sesión | `/me` 200 | `RequireAuth` renderiza el hijo | - |
| Login OK | credenciales válidas | guarda usuario, navega a `from` o `/accidentes` | - |
| Login 401 | credenciales malas | mensaje genérico en `role="alert"`, sin redirección | no limpia ni navega |
| Login 429 | rate limit | mensaje de demasiados intentos | - |
| Registro OK | 201 | login automático y navegación | si el login falla, mostrar mensaje y enlazar a `/login` |
| Registro 409 / 400 | email repetido / datos inválidos | mensaje genérico / errores por campo | - |
| Logout | clic en "Salir" | POST logout, estado limpio, `/` | si falla la red igual se limpia el estado local |
| Ruta inexistente | `/xyz` | página 404 en español con enlace al inicio | - |

</intent-contract>

## Code Map

- `frontend/src/main.tsx` -- reemplazar placeholder: `BrowserRouter` + `AuthProvider` + `App`, importar `styles.css`.
- `frontend/src/App.tsx` -- tabla de rutas: `/` Landing, `/login`, `/registro`, `/accidentes` y `/accidentes/nuevo` (dentro de `RequireAuth` + `Layout`), `*` NotFound.
- `frontend/src/api/client.ts` -- `request<T>(method, path, body?)`: único `fetch`; `ApiError {status, code, message, details?}`; error de red -> `ApiError(0,'NETWORK_ERROR',...)`; 204 -> undefined; `setUnauthorizedHandler(fn)` invocado en 401 salvo path `/auth/login` y `/auth/me`.
- `frontend/src/api/types.ts` -- `User {id,email,fullName,role:'USER'|'REVIEWER'}`, `ApiErrorDetail {field,message}`.
- `frontend/src/api/auth.ts` -- `registerUser`, `loginUser`, `logoutUser`, `getMe` (rutas `/auth/register|login|logout|me`).
- `frontend/src/hooks/useAuth.tsx` -- `AuthProvider` + `useAuth()`: `{user, status:'loading'|'authenticated'|'anonymous', login, register, logout}`; carga `getMe()` al montar (401 -> anonymous); registra el unauthorized handler.
- `frontend/src/components/{RequireAuth,Layout,FieldError}.tsx` -- `RequireAuth` (`<Navigate to="/login" replace state={{from}}/>`), `Layout` (cabecera, enlaces, botón Salir, `<Outlet/>`), `FieldError`.
- `frontend/src/pages/{Landing,Login,Register,AccidentNew,AccidentList,NotFound}Page.tsx` -- las dos de accidentes son placeholders ("Disponible pronto") que S3.2 reemplaza.
- `frontend/src/styles.css`, `frontend/vitest.config.ts` (jsdom, `src/test-setup.ts` con `afterEach(cleanup)`), `frontend/package.json` (script `test` ya existe).
- Backend contrato (solo lectura): `backend/src/interfaces/http/schemas/authSchemas.ts`, `errors/errorMapper.ts` (`{error:{code,message,details?:[{field,message}]}}`).

## Tasks & Acceptance

**Execution:**
- `frontend/src/api/{client,types,auth}.ts` -- adaptador HTTP único -- AD-11
- `frontend/src/hooks/useAuth.tsx`, `frontend/src/components/*`, `frontend/src/pages/*`, `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/styles.css` -- UI y rutas
- `frontend/vitest.config.ts`, `frontend/src/test-setup.ts` -- entorno de pruebas jsdom
- `frontend/src/pages/LandingPage.test.tsx` (AC-28), `frontend/src/components/RequireAuth.test.tsx` (redirección y carga), `frontend/src/pages/LoginPage.test.tsx` (401 genérico, 429, éxito) -- mockear SOLO el módulo `../api/auth` con `vi.mock`
- `frontend/src/api/client.test.ts` -- puede stubear el `fetch` global dentro de `src/api/` (ahí es legal): 401 normal llama al handler; 401 en `/auth/login` y `/auth/me` no; error normalizado; red -> NETWORK_ERROR

**Acceptance Criteria:**
- Given un visitante, when abre `/`, then ve el propósito y los dos accesos (FR-01, AC-28).
- Given sin sesión, when pulsa "Registrar un accidente" o abre `/accidentes`, then termina en `/login` (AD-11).
- Given errores 400/401/409/429 en login/registro, then se muestran mensajes claros sin revelar si el email existe (NFR-07).
- Given registro exitoso, then se hace login y se entra; given logout, then la sesión se limpia y se vuelve a `/`.
- Given `npm run lint:arch`, then pasa (solo `src/api/` usa fetch).

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run build` -- expected: exit 0 (frontend `tsc --noEmit && vite build` y backend)
- `npm run lint:arch` -- expected: exit 0
- `npm test` -- expected: backend y frontend en verde
- Humo: backend (`npm run dev:backend`) + `npm run dev:frontend`; con `curl -c/-b` a `http://localhost:5173/api/...`: register -> login -> me; guardado en `docs/evidence/S3.1-humo-proxy.txt`

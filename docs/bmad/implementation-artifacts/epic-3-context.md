# Epic 3 Context: Frontend y entrega

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Entregar una interfaz React usable sobre la API ya construida (Epics 1 y 2), servir el build de producción desde el mismo proceso Express y dejar evidencia honesta y reproducible de entrega, de modo que un evaluador pueda arrancar el proyecto desde un clon nuevo solo con el README y verificar el flujo completo, la persistencia y la ausencia de secretos.

## Stories

- Story 3.1: App React con landing, cuenta y rutas protegidas
- Story 3.2: Formulario de accidente, listado y detalle
- Story 3.3: Build de producción, README y evidencia de entrega

## Requirements & Constraints

- Landing pública con dos accesos (registrar accidente, ingresar a consultar); sin sesión, las rutas protegidas redirigen a login/registro.
- Registro y login muestran errores claros del backend (400, 401, 409, 429) sin revelar si un email existe; tras registrarse el frontend hace login (el registro no inicia sesión); logout limpia sesión y redirige.
- Formulario de accidente: validación en cliente espejo de los límites del backend y pintado de los `details` por campo; botón deshabilitado con indicador durante el envío y confirmación al éxito.
- Campos y límites: nombre del afectado 3–120; tipo de documento CC/CE/TI/PASAPORTE; número de documento 5–20 alfanuméricos; teléfono 7–15 dígitos con `+` opcional; email de contacto válido; tipo de accidente TRANSITO/LABORAL/DOMESTICO/DEPORTIVO/OTRO; fecha no futura y ≥ 1900-01-01; lugar 3–200; descripción 20–2000. Longitudes en code points.
- Listado: empty state, estados de carga y error de red; detalle de id ajeno o inexistente muestra "no encontrado".
- Estados en API en mayúsculas (REGISTRADO, EN_REVISION, CERRADO); etiquetas en español solo en la UI.
- Entrega: `npm run build` + `npm start` funcionan en mismo origen; README reproducible (instalar → BD → migrar → compilar → sembrar → ejecutar → crear cuenta → registrar → consultar), explica el vínculo accidente-cuenta por identidad verificada en servidor, prerrequisitos, topología de mismo sitio, `COOKIE_SECURE` y `LIMITATIONS.md`.
- Persistencia tras `docker compose restart`; gitleaks sobre el historial y grep de `frontend/dist` con 0 hallazgos; `TEST_REPORT.md` lista cada prueba ejecutada con resultado y limitaciones, sin declarar nada sin evidencia.
- Definition of Done común: pruebas de la historia ejecutadas con resultado registrado, `npm run lint:arch` en verde, sin secretos en código/docs/historial (solo `.env.example` ficticio), sin imports prohibidos, commit pequeño referenciando la historia. No hay diseño UX formal.

## Technical Decisions

- Frontend: React 18.3.1, react-router-dom 7, Vite 8 (`react-ts`, sin oxlint), TypeScript 5.9 con `strict` explícito; pruebas con Vitest + Testing Library + jsdom. No se requiere ninguna variable `VITE_*`.
- Solo `frontend/src/api/` llama a `fetch`, siempre con `credentials:'include'` y base relativa `/api`; normaliza errores a `{code,message,details}`. `check-globals.mjs` falla si hay `fetch(` fuera de `src/api/`.
- Un 401 limpia el estado de auth y navega a `/login`, excepto en `/auth/login` y `/auth/me` (la landing es pública). `RequireAuth` solo mejora UX; el servidor es la autoridad.
- Estructura: `src/api/{client,auth,accidents,types,accidentSchema}.ts`, `src/pages/{Landing,Login,Register,AccidentNew,AccidentList,AccidentDetail}Page.tsx`, `src/components/{RequireAuth,StatusBadge,FieldError}.tsx`, `statusLabels.ts`, `src/hooks/{useAuth.tsx,useAsync.ts}`.
- Contrato API consumido: `/auth/register|login|logout|me`; `POST /accidents`; `GET /accidents` (resumen `{id, accidentType, occurredOn, status}`, ≤ 100); `GET /accidents/:id`. Errores con forma `{ error: { code, message, details? } }`; códigos relevantes: VALIDATION_ERROR, UNAUTHENTICATED, EMAIL_TAKEN, RATE_LIMITED, NOT_FOUND, SERVICE_UNAVAILABLE.
- Mismo origen en producción: Express sirve `/api/*` y `frontend/dist` con fallback `index.html` para rutas GET no-`/api`; en desarrollo Vite (`:5173`) hace proxy de `/api` a `http://localhost:3000`.
- Cookie de sesión `httpOnly`, `sameSite=lax`, `secure` según `COOKIE_SECURE` (false solo para `http://localhost`, true tras TLS).
- Scripts raíz: `build` (vite → `frontend/dist`; tsc → `backend/dist`), `start`, `migrate`, `seed:reviewer` (corre desde `dist/`, por eso se compila antes de sembrar), `test`, `lint:arch`, `scan:secrets`.
- Postgres 16 en `docker-compose.yml` (solo `db`, volumen `pgdata`); la app corre en el host.

## Cross-Story Dependencies

- 3.1 depende de la API de auth (Epic 2, historia 2.1); 3.2 depende de 3.1 (sesión, `RequireAuth`, cliente `api/`) y de la API de accidentes (2.2); 3.3 depende de 3.1 y 3.2 y de la migración y semilla del Revisor (Epic 1, historia 1.3).
- La validación del cliente debe mantenerse alineada con los límites del backend y de la BD.

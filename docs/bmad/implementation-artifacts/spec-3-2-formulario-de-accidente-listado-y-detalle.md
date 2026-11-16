---
title: 'S3.2 Formulario de accidente, listado y detalle'
type: 'feature'
created: '2026-11-15'
status: 'in-progress'
baseline_revision: '23652d6a59ace23a54778370b78457ae7bb77e35'
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

**Problem:** el usuario autenticado no puede registrar un accidente ni ver su lista y detalle; `/accidentes` y `/accidentes/nuevo` son placeholders de S3.1.

**Approach:** formulario con validación en cliente espejo de DEC-007 (`src/api/accidentSchema.ts`) que además pinta los `details` del 400 del backend; listado y detalle con estados de carga, error, vacío y "no encontrado"; etiquetas de estado en español centralizadas en `src/components/statusLabels.ts`. Todo acceso HTTP vive en `src/api/accidents.ts` (usa `request` de `client.ts`).

## Boundaries & Constraints

**Always:** textos en español; `fetch` solo en `src/api/` (ni siquiera escribir la cadena `fetch(` fuera de `src/api/`); contrato exacto del backend: `POST /accidents` con SOLO `{affectedName, documentType, documentNumber, phone, contactEmail, accidentType, occurredOn, place, description}` (nunca `status`, `ownerId`, `userId`; campo extra = 400), 201 devuelve detalle (+ `id,status,createdAt,updatedAt`); `GET /accidents` -> `[{id,accidentType,occurredOn,status}]`; `GET /accidents/:id` -> detalle, 404 (`NOT_FOUND`) para ajeno/inexistente/no-uuid, mismo cuerpo; errores `{error:{code,message,details?:[{field,message}]}}`; límites DEC-007 con longitudes en code points (`[...s].length`) tras `trim`: affectedName 3-120, documentType en CC/CE/TI/PASAPORTE, documentNumber `^[A-Za-z0-9]{5,20}$`, phone `^\+?[0-9]{7,15}$`, contactEmail 3-254 con formato email, accidentType en TRANSITO/LABORAL/DOMESTICO/DEPORTIVO/OTRO, occurredOn `YYYY-MM-DD` fecha real, >= 1900-01-01 y no futura (hoy calculado en zona `America/Bogota` con `Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'})`, función `todayInBogota(now = new Date())` inyectable para pruebas), place 3-200, description 20-2000; etiquetas de tipo (Tránsito, Laboral, Doméstico, Deportivo, Otro) y de documento; `statusLabels` tipado `Record<AccidentStatus,string>` (Registrado, En revisión, Cerrado) para que agregar un estado obligue por compilación; `AccidentStatus` y tipos viven en `src/api/types.ts` (unión); fechas `occurredOn` se muestran como dd/mm/aaaa por manipulación de string (sin `new Date` para evitar corrimiento de zona); durante el envío botón deshabilitado con texto/indicador de carga; al éxito, confirmación visible con enlace al detalle y formulario limpio/oculto; errores por campo con `label htmlFor`, `aria-describedby`, `role=alert` (reutilizar `FieldError`); los `details[].field` del backend se asocian al campo homónimo y los de campos desconocidos van a un mensaje general; error de red/5xx con mensaje y botón "Reintentar" en listado y detalle; vacío del listado: mensaje "Aún no has registrado accidentes" + enlace al formulario; ruta `/accidentes/:id` dentro de `RequireAuth`+`Layout` (declarada después de `/accidentes/nuevo`); 404 muestra "Accidente no encontrado" con enlace al listado; `StatusBadge` usa `statusLabels`; hook `useAsync` para carga con `reload`.

**Never:** tocar el backend; agregar dependencias (no hay zod en el frontend: validador manual); enviar campos que no sean los 9; exponer ownerId; decidir autorización solo en cliente; cambiar el comportamiento de auth de S3.1.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Campos vacíos | enviar formulario vacío | error por cada campo requerido, no se llama a la API | foco/lectura vía `role=alert` |
| Límites | descripción 19 chars, fecha futura, fecha < 1900, documento con símbolos, teléfono corto | error del campo correspondiente | - |
| Envío válido | 9 campos válidos | botón deshabilitado + "Enviando..." durante la petición; luego confirmación con enlace al detalle | - |
| 400 backend | `details:[{field:'description',message:'x'}]` | mensaje en el campo; campo desconocido -> mensaje general | no limpia lo escrito |
| Error de red | fetch rechaza | mensaje general "No se pudo conectar..." y botón habilitado | - |
| Lista vacía | `[]` | empty state con enlace a registrar | - |
| Lista con datos | `[{id,accidentType:'TRANSITO',occurredOn:'2026-11-10',status:'EN_REVISION'}]` | fila con "Tránsito", "10/11/2026" y "En revisión" | - |
| Lista/detalle cargando o error | pendiente / red | "Cargando..." / mensaje + Reintentar | - |
| Detalle propio | 200 | los 9 campos con etiquetas, estado, fechas de registro | - |
| Detalle ajeno/inexistente | 404 | "Accidente no encontrado" + enlace al listado | no muestra datos |

</intent-contract>

## Code Map

- `frontend/src/api/client.ts` -- `request<T>(method,path,body?)`, `ApiError{status,code,message,details}`; reutilizar sin cambios.
- `frontend/src/api/types.ts` -- agregar `AccidentStatus`, `AccidentType`, `DocumentType`, `AccidentSummary`, `Accident`, `CreateAccidentInput` (+ constantes `ACCIDENT_TYPES`, `DOCUMENT_TYPES`, `ACCIDENT_STATUSES` si ayudan).
- `frontend/src/api/accidentSchema.ts` -- `validateAccident(input, today?)` -> `Record<campo,mensaje>`, `todayInBogota`, etiquetas de tipo de accidente y documento.
- `frontend/src/api/accidents.ts` -- `createAccident`, `listAccidents`, `getAccident`.
- `frontend/src/components/{statusLabels.ts,StatusBadge.tsx}`, `frontend/src/hooks/useAsync.ts`.
- `frontend/src/pages/{AccidentNewPage,AccidentListPage,AccidentDetailPage}.tsx`, `frontend/src/App.tsx` (ruta `:id`), `frontend/src/styles.css` (tabla/lista, badge, estados).
- Referencia de estilo y mocks: `frontend/src/pages/RegisterPage.tsx`, `RegisterPage.test.tsx` (mock de `../api/auth`; aquí se mockea `../api/accidents`, nunca `fetch`).
- Backend contrato (solo lectura): `backend/src/interfaces/http/schemas/accidentSchemas.ts`, `presenters/accidentPresenter.ts`, `errors/errorMapper.ts`.

## Tasks & Acceptance

**Execution:**
- `frontend/src/api/{types,accidentSchema,accidents}.ts` -- tipos, validador espejo, llamadas -- AD-8, AD-11
- `frontend/src/components/{statusLabels.ts,StatusBadge.tsx}`, `frontend/src/hooks/useAsync.ts` -- etiquetas centralizadas y carga
- `frontend/src/pages/{AccidentNew,AccidentList,AccidentDetail}Page.tsx`, `App.tsx`, `styles.css` -- UI
- `frontend/src/api/accidentSchema.test.ts` -- cada fila de límites del validador (incluida fecha futura con `today` inyectado y 1899)
- `frontend/src/pages/AccidentNewPage.test.tsx` (AC-1 UI) -- errores por campo requerido sin llamar a la API; botón deshabilitado durante envío (promesa pendiente); éxito con confirmación; 400 con `details` pintado
- `frontend/src/pages/AccidentListPage.test.tsx` (AC-5 UI) -- vacío; fecha+estado en español; error con Reintentar
- `frontend/src/pages/AccidentDetailPage.test.tsx` -- detalle propio y 404 "no encontrado"
- `frontend/src/components/statusLabels.test.ts` -- una etiqueta por estado del catálogo

**Acceptance Criteria:**
- Given el formulario, when faltan campos o se violan límites, then error por campo (cliente) y `details` del backend (FR-05, AC-1).
- Given envío en curso, then botón deshabilitado con indicador; al éxito, confirmación.
- Given cuenta sin accidentes, then empty state (FR-07, AC-5).
- Given accidentes propios, then listado y detalle muestran tipo, fecha y estado en español; id ajeno -> "no encontrado" (FR-07, FR-08).
- Given red caída, then listado y detalle muestran error con reintento.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run build` -- expected: exit 0
- `npm run lint:arch` -- expected: exit 0
- `npm test` -- expected: backend y frontend en verde
- Humo (lo corre el padre): backend + vite; por `:5173/api`: register -> login -> POST accidente -> GET lista -> GET detalle; segundo usuario recibe 404 en el detalle ajeno.

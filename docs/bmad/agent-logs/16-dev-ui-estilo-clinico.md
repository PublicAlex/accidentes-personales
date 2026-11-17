# Log 16 — Dev (UX): estilo visual clínico

- Fecha: 2026-11-17
- Skill: `bmad-build-auto` (una iteración) · Modelo: Sonnet 5.5
- Intención: "mejorar los estilos visuales para que parezca un aplicativo de registro médico/clínico" (solo visual).
- Rama: `feat/ui-estilo-clinico` (desde `main`), sin push ni merge.

## Pasos
1. Activación del skill, árbol limpio, rama creada desde `main`.
2. Investigación del frontend (páginas, componentes, tests) para fijar qué markup no se podía romper (consultas por rol/etiqueta/texto exacto).
3. Implementación directa (no se delegó a un subagente: la tarea del agente prohíbe re-delegar todo el trabajo; desviación consciente del paso 3 del skill, sin spec file separado).
4. Revisión proporcional al cambio (CSS/markup): relectura del diff contra el brief y los tests; sin subagentes de revisión.
5. Verificación real y evidencia.

## Archivos
- Nuevos: `frontend/src/components/Icon.tsx` (SVG inline genéricos), `frontend/src/components/SiteHeader.tsx` (cabecera + pie).
- Modificados: `frontend/src/styles.css` (reescrito con tokens `:root`), `App.tsx` (PublicLayout para rutas públicas y 404), `Layout.tsx`, `StatusBadge.tsx`, `statusLabels.ts`, páginas Landing/Login/Register/AccidentList/AccidentDetail/AccidentNew/NotFound, `index.html` (título), `Layout.test.tsx` (botón "Salir" -> "Cerrar sesión", mismo comportamiento).

## Comandos y resultados
- `npm run build` -> OK (tsc + vite + backend). Evidencia: `docs/evidence/UI-estilo-clinico-build.txt`.
- `npm run lint:arch` -> OK, sin violaciones. Evidencia: `docs/evidence/UI-estilo-clinico-lint-arch.txt`.
- `npm test` -> primer intento falló por Postgres apagado (ECONNREFUSED, entorno, no código). Tras `docker compose up -d --wait db`: backend 30 archivos/281 tests OK; frontend 12 archivos/48 tests OK. Evidencia: `docs/evidence/UI-estilo-clinico-test.txt`. Después se detuvo el contenedor `db`.
- No se hizo inspección visual en navegador ni medición automática de contraste (contrastes elegidos de paletas AA conocidas).

## Decisiones de diseño
- Tokens en una sola sección `:root`; fuente del sistema; sin dependencias ni CDNs.
- Colores de estado centralizados en `statusColors` junto a `statusLabels` (fondo/texto/punto vía variables CSS inline): agregar un estado = una entrada en cada mapa.
- Asteriscos de obligatorio por CSS (`label.required::after`) para no alterar el nombre accesible de las etiquetas; se añadió `aria-required` en inputs de texto.
- La lista usa una sola `<table>` que colapsa a tarjetas con CSS (`data-label`), evitando contenido duplicado en el DOM.
- Detalle: el estado pasa a la cabecera de la ficha y las marcas de tiempo a una línea de tiempo (mismo texto y 2 ocurrencias de fecha, como asserta el test).
- Cabecera: marca "Registro de Accidentes Personales", correo y "Cerrar sesión"; el h1 de la landing conserva "Accidentes personales" (lo asserta un test). Pie "Datos ficticios — MVP".
- Foco visible, `prefers-reduced-motion`, diseño a 360 px sin scroll horizontal (por construcción CSS; no medido en navegador).

# 12 - Dev S3.1 App React con landing, cuenta y rutas protegidas

- Skill: `bmad-build-auto` (agente Dev BMAD). Modelo: Sonnet. Fecha: 2026-11-15. Rama: `feat/S3.1-frontend-base` desde `main`.

## Pasos
- Antes: sprint-status S2.2 y S2.3 a `done`. Step 1 (ruta libre): contexto de epic 3 compilado por subagente; árbol limpio. Step 2: spec `spec-3-1-*.md`. Step 3: subagente de implementación; verificación propia (build, lint:arch, pruebas). Step 4: 4 revisores en paralelo; 2 parches medium y 2 low aplicados por mí, resto rechazado con motivo, 0 diferidos.
- Omitidos: ninguno.

## Archivos
- Frontend: adaptador `src/api/`, `useAuth`, `RequireAuth`, `Layout`, páginas Landing/Login/Register/NotFound y placeholders de accidentes, `styles.css`, vitest jsdom y 6 archivos de prueba. Dependencias: react-router-dom, Testing Library, jsdom (versiones del spine).

## Comandos y resultados reales
- `npm run build` exit 0; `npm run lint:arch` exit 0; `npm test`: backend 29 archivos/275 pruebas, frontend 6 archivos/21 pruebas, exit 0.
- Humo por el proxy de Vite (:5173): `/me` 401, register 201, login 200, `/me` 200, logout 204, `/me` 401. Evidencia: `docs/evidence/S3.1-{build,lint-arch,tests,humo-proxy}.txt`.

## Desviaciones
- Subagentes lanzados en segundo plano por la herramienta; se esperó su finalización. Un primer intento de humo falló (procesos no persistían) y se repitió con servidores en segundo plano; el archivo de humo contiene solo la ejecución buena. Se detuvieron los servidores.
- Se crearon usuarios `humo*@example.test` en la BD de desarrollo.

## Pendientes
- UI no probada en navegador real. Páginas de accidentes son placeholders (S3.2). Rechazados de bajo valor: getMe con 5xx tratado como anónimo, `register` del contexto sin usar.

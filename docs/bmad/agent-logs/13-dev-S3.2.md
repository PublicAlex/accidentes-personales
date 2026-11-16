# 13 - Dev S3.2 Formulario de accidente, listado y detalle

- Skill: `bmad-build-auto` (agente Dev BMAD). Modelo: Sonnet. Fecha: 2026-11-15. Rama: `feat/S3.2-accidentes-ui` creada desde `feat/S3.1-frontend-base`.

## Pasos
- Step 1 (ruta libre): contexto de epic 3 en caché (compilado en S3.1); árbol limpio. Step 2: spec `spec-3-2-*.md`. Step 3: subagente de implementación; verificación propia. Step 4: 4 revisores en paralelo; 2 medium y 4 low parcheados por mí, 2 low diferidos, resto rechazado con motivo.
- Omitidos: compilar contexto de epic (existente).

## Archivos
- Frontend: `api/{types,accidentSchema,accidents}.ts`, `statusLabels.ts`, `StatusBadge`, `useAsync`, tres páginas de accidentes, ruta `:id`, estilos y 6 archivos de prueba (esquema, formulario, listado, detalle, etiquetas, api).

## Comandos y resultados reales
- `npm run build` exit 0; `npm run lint:arch` exit 0; `npm test`: backend 29 archivos/275 pruebas, frontend 12 archivos/48 pruebas, exit 0.
- Humo por el proxy de Vite: registro de dos usuarios, login, lista vacía `[]`, POST accidente 201, POST inválido 400 con `details`, lista, detalle propio 200, detalle ajeno 404, lista del otro usuario vacía. Evidencia: `docs/evidence/S3.2-{build,lint-arch,tests,humo-proxy}.txt`.

## Desviaciones
- Subagentes en segundo plano por la herramienta; se esperó su finalización. Servidores dev detenidos tras el humo. Se crearon usuarios `s32*@example.test` y un accidente en la BD de desarrollo.

## Pendientes
- UI no probada en navegador real. Diferidos (low): prueba de cambio de `:id` en `useAsync` y prueba de ruta a nivel `App`.

# 17 - Revisión y mejora del README

- Fecha: 2026-11-17. Rama: `feat/ui-estilo-clinico`.
- Skill: `bmad-review` (headless). Modelo: Sonnet.
- Petición humana: verificar que el README explique bien cómo ejecutar y describa claro el proyecto.

## Lentes usadas

`structure`, `prose` (tras structure), `verification-gap` (sobre las afirmaciones ejecutables) y `edge-case-hunter` (lector con clon nuevo). Adversarial omitida (documentación operativa).

## Hallazgos

11 en total: 3 altos, 5 medios, 3 bajos. Informe: `docs/bmad/reviews/readme-review-2026-11-17.md`.

## Cambios aplicados a `README.md`

- Descripción corta (qué hace, para quién, MVP con datos ficticios) y lista de funcionalidades.
- Stack y arquitectura en pocas líneas, con enlace a `docs/architecture.md`.
- Separación entre "Ejecutar en local (rápido)" y "Primera vez desde un clon nuevo" (secretos con `openssl`).
- "Probar la aplicación" con ejemplo `curl` y cookie jar del Revisor.
- Detener/reiniciar, modo desarrollo, pruebas, solución de problemas, estructura, índice de documentación, nota BMAD 6.12.4.
- Las secciones de diseño (topología, cookie, vínculo accidente-cuenta) se retiraron del README; quedan en `docs/architecture.md`, `docs/api.md` y DEC-015.

## Verificación (real)

- Los 7 scripts `npm run` citados existen en `package.json`; 0 enlaces relativos rotos.
- Secuencia rápida sobre el checkout actual: `docker compose up -d db` (ya estaba arriba), `npm run migrate` (sin migraciones pendientes), `npm run build`, `npm run seed:reviewer` ("Revisor listo"), servidor en segundo plano: `GET /` 200 `text/html`; `GET /api/auth/me` 401. Servidor detenido; la BD queda arriba.
- No se ejecutó el `PATCH` del Revisor ni `npm test` en esta pasada (el ejemplo `curl` sigue `docs/api.md`, sin ejecutarse aquí).
- Salida completa: `docs/evidence/README-verificacion-2026-11-17.txt`.

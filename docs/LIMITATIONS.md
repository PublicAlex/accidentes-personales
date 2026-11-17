# Limitaciones conocidas

## Decisiones aceptadas

- **Cookie sin `Secure` por defecto (DEC-015).** `.env.example` trae `COOKIE_SECURE=false` para correr el build en `http://localhost`. Con HTTPS debe ser `true`. Con `NODE_ENV=production` y `false` se registra un aviso al arrancar.
- **Semilla del revisor sobre un email existente (DEC-019).** `seed:reviewer` hace upsert por email: si una cuenta `USER` ya usa `REVIEWER_EMAIL`, pasa a `REVIEWER` y su contraseña se reemplaza por la de `REVIEWER_PASSWORD`. No hay escalada de privilegios, pero los accidentes de esa cuenta quedan bajo el revisor. Mitigación: usar un email de revisor que no esté expuesto al registro público.
- **Email duplicado en el registro (DEC-012).** Devuelve `409` con mensaje genérico; permite enumerar emails registrados. Se mitiga con rate limit.
- **El registro no inicia sesión.** El frontend hace login tras registrarse.

## Alcance del MVP

- Despliegue real (TLS, proxy inverso, `trust proxy`, secretos gestionados), alta disponibilidad y observabilidad quedan fuera de alcance. El proyecto corre local desde el build.
- Sin `trust proxy` configurable: detrás de un proxy, el rate limit vería la IP del proxy.
- El rate limit está en memoria y por proceso; se reinicia con el servidor y solo cubre registro y login (no `POST /api/accidents`).
- El listado devuelve como máximo 100 accidentes, sin paginación ni indicador de truncamiento.
- El cambio de estado solo existe por API (rol `REVIEWER`); la UI no lo ofrece, y los revisores solo leen sus propios accidentes.
- Sin refresh de sesión: el JWT dura 1 hora.
- Sin logs de acceso ni correlación de peticiones.
- Un solo servicio Docker (`db`); la aplicación corre en el host.

## Deuda de pruebas y herramientas (diferidos de las historias)

- `check-globals` revisa por línea (no detecta comentarios ni alias como `globalThis`); solo algunas reglas de dependency-cruiser tienen prueba de violación; `scan-secrets` no inspecciona binarios.
- El script `dev` usa `&` y `wait`, y no es portable a Windows.
- Migraciones: el ciclo down/up no tiene prueba automatizada (se verificó a mano en S1.3).
- La purga de revocaciones expiradas no tiene prueba contra PostgreSQL real.
- `useAsync` puede mostrar un instante datos del id anterior al cambiar `:id`, sin prueba de cambio de id ni de respuesta obsoleta; falta prueba de la ruta `/accidentes/:id` a nivel `App`.
- La interfaz no se probó en un navegador real (solo Vitest con jsdom).
- El historial de revisión y las pruebas ejecutadas de la entrega se registran en `docs/TEST_REPORT.md` y `docs/evidence/`, no aquí.

## Licencias

Las licencias de varias fuentes no se pudieron verificar localmente; ver `docs/SOURCES.md`.

## `npm audit` (revisado el 2026-11-15)
- 3 vulnerabilidades moderadas, todas en `glob`/`minimatch`, dependencias transitivas de `node-pg-migrate@9.0.0`. Una es GHSA-g3hv-75wg-m249, un DoS por patrones glob.
- Impacto: solo afecta a la herramienta de migraciones, que se ejecuta a mano con patrones fijos del repositorio. Ese código no corre en el servidor HTTP ni recibe entradas de usuarios.
- Decisión: se acepta en el MVP. La corrección que propone `npm audit fix --force` implica un cambio mayor; queda pendiente actualizar cuando `node-pg-migrate` publique una versión corregida.

## Enumeración de cuentas en el registro (DEC-021)
- El registro responde "Este email ya está registrado". Se eligió por claridad para el usuario. El rate limit de `/api/auth/register` lo mitiga, y el login no revela si una cuenta existe.

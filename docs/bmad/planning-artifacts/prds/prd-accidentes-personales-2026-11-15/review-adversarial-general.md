# Revisión adversarial general del PRD (accidentes personales, MVP)

Objetivo revisado: `prd.md` (status: draft, 2026-11-15) contrastado con `docs/DECISIONS.md` (DEC-001..DEC-009). No se modificó `prd.md`. Las citas llevan número de línea del `prd.md` actual.

## 1. Veredicto

**NO APTO para pasar a arquitectura e historias tal como está.** El PRD está bien estructurado pero es una versión anterior a la revisión humana: DEC-005..DEC-008 no están integradas y varias de ellas lo contradicen de frente (logout, rol revisor, validaciones, hardening). Además contiene contradicciones internas que existen aunque se ignoren las decisiones (404 vs 400 vs 500, "ignora o rechaza", CHECK de estado vs "añadir un estado sin tocar otras capas", enumeración por email duplicado). Los 9 ACs dejan sin cobertura la mitad de los FR, incluido todo el rol REVIEWER y el logout, justo lo que la sustentación va a atacar.

Recuento: ver sección 6.

## 2. Desincronización con DEC-005..DEC-008 (ubicaciones exactas)

### DEC-005 (logout real: cookie httpOnly + sameSite=lax, 1 h, `jti`, `revoked_tokens`, puerto `TokenRevocationRepository`)
| Línea | Cita exacta | Problema |
|---|---|---|
| 45 (FR-03) | "Cerrar sesión invalida la sesión en el cliente y el servidor deja de aceptarla." | Sin mecanismo. Es el texto que DEC-005 declara incumplible con JWT stateless. No menciona `jti`, `revoked_tokens` ni expiración 1 h. |
| 96 (NFR-05) | "Los endpoints privados devuelven 401 sin sesión válida." | No define "válida": no incluye revocada, expirada ni firma/alg inválidos. |
| 95 (NFR-04) | "El servidor toma la identidad del token o sesión validados" | "token o sesión" deja abierto JWT en header, cookie o sesión server-side. DEC-005 fija JWT en cookie. |
| 98 (NFR-07) | "`[ASSUMPTION: cookie httpOnly, helmet, CORS restringido y rate limit en login como buenas prácticas, no obligatorias.]`" | La cookie httpOnly/sameSite/secure pasa a obligatoria (DEC-005). |
| 128 (Supuestos) | "sesión por cookie httpOnly" | Sigue como supuesto; ya es decisión. |
| 134 (Preg. 4) | "Política de expiración de sesión y de rate limit en login." | Resuelta: 1 h y 10 intentos/15 min/IP. |
| 84-87 (FR-11) | "PK, FK `accidents.user_id → users.id`, `UNIQUE(users.email)`, `NOT NULL`, `CHECK` sobre estado, tipo y fecha, e índice por `user_id`." | Falta la tabla `revoked_tokens` (jti, expiración) y su limpieza. |
| 101 (NFR-08) | "Puertos con adaptadores." | No exige el puerto `TokenRevocationRepository` ni que el middleware dependa de él. |
| 109-117 (ACs) | (ninguno) | Ningún AC prueba logout (token reusado tras logout = 401). |
| 6-8 / 11 | "Las decisiones técnicas ya cerradas están en `docs/DECISIONS.md` y aquí solo aparecen como restricciones." | Falso a la fecha: DEC-005..008 cambian requisitos y no aparecen. |

### DEC-006 (`users.role` USER|REVIEWER; solo REVIEWER usa PATCH; semilla desde env; el dueño no puede cambiar estado)
| Línea | Cita exacta | Problema |
|---|---|---|
| 20 | "**Revisor (rol opcional):** avanza el estado de un accidente. `[ASSUMPTION: existe el rol; ver preguntas abiertas.]`" | El rol ya existe y es obligatorio para la demo. |
| 80-81 (FR-10) | "#### FR-10: Cambiar estado (opcional)" / "Un actor autorizado ... `[ASSUMPTION: opcional en el enunciado; actor y rol sin definir.]`" | Ya definido: solo REVIEWER. Sigue "opcional" y "actor sin definir". |
| 131 (Preg. 1) | "Quién ejecuta el cambio de estado (FR-10) y con qué rol; ¿se implementa en el MVP?" | Resuelta. |
| 23-27 (Glosario) | (no hay "Rol", "Revisor") | Términos ausentes. |
| 18-21 (Usuario) | "**No usuarios (v1):** aseguradoras, ajustadores externos, administradores con acceso a datos de terceros." | Choca con REVIEWER, que modifica accidentes de terceros (ver C-02). |
| 123 (Fuera de alcance) | "Panel de administración, aseguradoras o ajustadores con acceso a datos de terceros." | Idem; hay que delimitar qué ve el REVIEWER. |
| 84-87 (FR-11) | (sin `users.role`) | Falta columna, CHECK ('USER','REVIEWER') y DEFAULT 'USER'. |
| 36-45 (FR-02) | "Un visitante crea una cuenta con email, contraseña y nombre completo." | No dice que `role` en el body se rechaza ni que el registro público siempre crea USER. |
| 47-48 (FR-04) | "consulta quién es (`/api/auth/me`)" | No dice que devuelve `role`, que el frontend necesita. |
| (no existe) | | No hay FR/NFR para el script de semilla del revisor ni sus variables en NFR-06. |
| 105-117 (ACs) | (ninguno) | Cero ACs de REVIEWER: USER recibe 403 en PATCH, REVIEWER avanza, salto de estado falla, dueño no cambia su estado. |
| 94 (NFR-03) | "Toda consulta de accidentes filtra por `id` y `owner_id`." | Imposible para el REVIEWER sin excepción explícita. |

### DEC-007 (validaciones concretas)
| Línea | Cita exacta | Problema |
|---|---|---|
| 52 (FR-05) | "nombre del afectado, tipo y número de documento, teléfono, email de contacto, tipo de accidente, fecha, lugar y descripción" | Sin formatos: tipos de documento (CC/CE/TI/PASAPORTE), número 5-20 alfanumérico, teléfono 7-15 dígitos con `+` opcional, lugar 3-200. |
| 54 | "La descripción respeta longitud mínima y máxima (`[ASSUMPTION: valores a definir en arquitectura]`)" | Ya definido: 20-2000. Delegarlo a arquitectura es incorrecto. |
| 53 | "`[ASSUMPTION: tránsito, laboral, doméstico, deportivo, otro]`" | DEC-007 no cierra los tipos de accidente. Sigue abierto aunque la pregunta 3 se declare resuelta (ver M-12). |
| 38-40 (FR-02) | (sin mínimo de contraseña) | Falta "mínimo 8 caracteres" (y máximo, ver H-09). |
| 133 (Preg. 3) | "Longitudes mínima y máxima de la descripción y formato de documento por tipo." | Resuelta. |
| 128 (Supuestos) | "límites de descripción" | Resuelto. |
| 57 / 96 | "Validación obligatoria en frontend y backend" / "Todo input se valida en el servidor." | No dice que los esquemas Zod viven en el adaptador HTTP y las invariantes en el dominio. Con FR-05 se arriesga duplicar o mover reglas al controlador (choca con NFR-08 "Controladores HTTP sin reglas de negocio"). |

### DEC-008 (helmet, CORS a `FRONTEND_ORIGIN` con credentials, rate limit 10/15 min/IP, bcrypt 12 rounds; obligatorio)
| Línea | Cita exacta | Problema |
|---|---|---|
| 98 (NFR-07) | "`[ASSUMPTION: ... como buenas prácticas, no obligatorias.]`" | Contradice a DEC-008: son obligatorias. |
| 93 (NFR-02) | "bcrypt (o argon2); nunca texto plano." | Fija 12 rounds. "(o argon2)" contradice la decisión y deja el coste sin definir. |
| 97 (NFR-06) | "El backend valida las variables al arrancar y falla rápido." | No lista `FRONTEND_ORIGIN`, secreto JWT, credenciales de semilla. |
| 134 (Preg. 4) | "Política de expiración de sesión y de rate limit en login." | Resuelta. |
| 109-117 (ACs) | (ninguno) | Sin AC para 429, cabeceras helmet ni CORS (origen no permitido). |

## 3. Hallazgos

Formato: ID, severidad, ubicación, problema, fix.

### CRITICAL

**C-01 | critical | FR-03 (l.45), NFR-05 (l.96), NFR-04 (l.95)** Logout inverificable. "el servidor deja de aceptarla" es imposible con JWT stateless sin lista de revocación; "invalida la sesión en el cliente" con cookie httpOnly solo se logra con `Set-Cookie` de borrado desde el servidor (JS no puede). Un evaluador que reusa el JWT copiado tras logout recibe 200. Fix: reescribir FR-03 con DEC-005: logout inserta `jti` en `revoked_tokens` (hasta `exp`), responde `Set-Cookie` de expiración, y todo endpoint privado devuelve 401 con token revocado, expirado o con firma inválida. Añadir AC-10 (reusar la cookie tras logout = 401). Definir fail-closed si falla la consulta a `revoked_tokens`.

**C-02 | critical | NFR-03 (l.94) vs FR-10 (l.81) vs Visión (l.14) vs l.21 y l.123** Contradicción de autorización. NFR-03 dice "Toda consulta de accidentes filtra por `id` y `owner_id`" y la visión dice "únicamente sus propios accidentes". Un REVIEWER debe cambiar el estado de accidentes ajenos, y "No usuarios: ... administradores con acceso a datos de terceros" lo excluye. Tal como está escrito, el revisor es un fallo eliminatorio por diseño, o el PRD no se puede implementar. Fix: modificar NFR-03 con la excepción exacta: "las consultas de lectura de un USER filtran por owner_id; el único acceso cross-owner permitido es `PATCH /api/accidents/:id/status` para REVIEWER". Definir qué puede leer el REVIEWER (¿listado global? ¿detalle?). Si el REVIEWER no puede listar, no puede saber qué id revisar: añadir `GET /api/accidents` global para REVIEWER o aceptar que opera por id conocido (poco demostrable). Corregir la lista de "No usuarios" y "Fuera de alcance".

**C-03 | critical | FR-02 (l.38-40), FR-04 (l.48), NFR-04 (l.95)** Escalada de privilegios sin cubrir. El PRD trata el mass assignment de `userId` (FR-05) pero no el de `role` en el registro: con `users.role` (DEC-006) un `POST /api/auth/register {role:"REVIEWER"}` ignorado/aceptado según implementación es acceso total al flujo de cambio de estado. Tampoco dice de dónde sale el rol en cada petición: un `role` en el JWT permanece vigente hasta 1 h tras degradar o cambiar al usuario. Fix: FR-02 "el registro público siempre crea `role=USER`; un campo `role` en el cuerpo se rechaza con 400". NFR-04: "identidad y rol se resuelven en servidor; el rol se lee de BD (o claim firmado con aceptación explícita de 1 h de desfase)". AC nuevo: registro con `role:"REVIEWER"` falla y no crea REVIEWER.

### HIGH

**H-01 | high | FR-10 (l.80-81), sección 6 (l.105-117)** Cero ACs para FR-10/rol. DEC-006 lo hace central para la sustentación ("cambio en vivo") pero ninguno de los 9 escenarios lo toca. La transición de FR-09 solo se prueba por unidad (AC-8), nunca por API. Fix: ACs 10+ en Dado/Cuando/Entonces: (a) USER hace PATCH = 403; (b) REVIEWER `Registrado→En revisión` = 200 y estado cambiado; (c) salto o retroceso = 4xx exacto y estado intacto; (d) sin sesión = 401; (e) el dueño ve el nuevo estado en lista y detalle.

**H-02 | high | FR-05 (l.56 y l.57), AC-4 (l.112)** "Un `userId` o `ownerId` en el cuerpo se ignora o se rechaza" / "campos desconocidos se rechazan o ignoran" / AC-4 "400 o campo ignorado". Dos comportamientos incompatibles y un AC que acepta ambos: ningún test automatizado puede ser determinista y la API no tiene contrato. Ignorar en silencio además oculta intentos de ataque y rompe la simetría con el 400 de campos inválidos. Fix: elegir. Recomendado: Zod `.strict()`, 400 con detalle por campo para cualquier campo desconocido, incluidos `userId`, `ownerId`, `role`, `status`, `id`. AC-4 se parte en filas separadas, cada una con un único resultado.

**H-03 | high | FR-02 (l.39) vs FR-03 (l.44)** Enumeración de usuarios. FR-03 se esfuerza en un mensaje genérico, pero FR-02 "Email duplicado devuelve error" es un oráculo de existencia de cuenta (409/400 distinto de 201). "sin revelar datos adicionales" no define nada: ¿status? ¿mensaje? Además, el rate limit de DEC-008 solo cubre login, de modo que el registro es un oráculo sin freno. Un login con email inexistente además suele saltarse bcrypt y responde más rápido que con email existente y contraseña incorrecta (oráculo temporal). Fix: decidir y documentar. O bien se acepta la enumeración vía registro (MVP sin verificación de email, justificado) con 409 y mensaje fijo, y se rate-limita también `/register`; o bien registro siempre 202/201 genérico (inviable sin verificación de email). Exigir comparación bcrypt contra hash ficticio cuando el email no existe. Normalizar email (lower/trim, `citext` o índice único sobre `lower(email)`): hoy `A@x.com` y `a@x.com` pueden ser dos cuentas.

**H-04 | high | FR-08 (l.70), NFR-03 (l.94), NFR-05 (l.96), FR-10** Orden de validación 400/401/403/404/409 sin definir. Casos concretos: (a) `GET /api/accidents/abc` con `id` UUID en PG lanza `22P02` y termina como 500 con mensaje de BD, rompiendo NFR-07; (b) PATCH de USER sobre accidente ajeno, ¿403 por rol o 404 por propiedad?; (c) PATCH con body inválido sobre un id ajeno, ¿400 o 404?; si valida body antes de buscar, el 400 revela algo; si responde 404 primero, es correcto; (d) PATCH de REVIEWER sobre id inexistente. Fix: especificar el orden normativo: 401 (auth) → 403 (rol, independiente del recurso) → 400 (formato de `id`) o 404 (ids malformados tratados como 404 sin distinguir) → 404 (inexistente/no visible) → 400 (body) → 409/422 (transición inválida). Ids malformados deben dar el mismo 404 que inexistentes (o 400 en ambos casos, pero constante).

**H-05 | high | FR-09 (l.77) y FR-10** "Una transición inválida devuelve error 4xx". Inverificable: 400, 409, 422 pasan. Fix: un código fijo (recomendado 409 o 422) y cuerpo de error con código de dominio. Definir también estado igual al actual (`Registrado→Registrado`) y concurrencia: dos revisores que cambian a la vez deben resolverse con `UPDATE ... WHERE status = $esperado` o bloqueo optimista.

**H-06 | high | FR-11 (l.86) vs FR-09 (l.78)** "`CHECK` sobre estado" vs "El conjunto de estados está centralizado para poder añadir uno sin tocar otras capas". Un CHECK en BD obliga a una migración, es decir, tocar la capa de persistencia, justo en la prueba en vivo. Además, el "centralizado" no cubre el glosario (l.26) ni las etiquetas del frontend. Fix: redefinir como "añadir un estado = un cambio en el dominio + una migración + etiqueta en el frontend, sin tocar casos de uso ni controladores", o usar tabla de estados con FK. Reescribir el criterio de forma verificable.

**H-07 | high | Sección 6, mapa de cobertura** Más de la mitad de los FR/NFR sin AC. Sin AC: FR-01, FR-02, FR-03 (login/logout/genérico), FR-04, FR-06, FR-09 vía API, FR-10, NFR-04 de forma aislada (solo AC-4), NFR-06 (fail-fast), NFR-07, NFR-10, y FR-08 en el listado (AC-3 solo prueba detalle, no que el listado de B excluya los de A). Fix: añadir ACs de credenciales erróneas idénticas, logout, listado aislado entre usuarios, arranque sin variables obligatorias (falla con mensaje), rate limit 429, rol. O bajar explícitamente de alcance los que no se prueban.

**H-08 | high | Línea 16 y l.128** "Éxito: cumplir los 9 escenarios" y el supuesto "el éxito se mide solo por los 9 escenarios". Contradice NFR-08/NFR-10 (rúbrica de arquitectura, honestidad de pruebas), DEC-008 ("criterio de seguridad (15 pts)") y la propia l.16 ("no incurrir en ningún fallo eliminatorio (NFR-01, NFR-03, NFR-05)"), que omite NFR-02 (contraseñas en claro) que AC-7 sí cubre. Fix: eliminar el supuesto, alinear la lista de eliminatorios con la rúbrica real, y enlazar la rúbrica en el PRD.

**H-09 | high | FR-02, NFR-02 (l.93), DEC-007** Bcrypt sin máximo de contraseña. Mínimo 8 sin máximo permite DoS por hashing de contraseñas enormes, y bcrypt trunca silenciosamente en 72 bytes. Fix: máximo 72 bytes (o 128 caracteres con pre-hash) en FR-02 y en el esquema Zod; rounds = 12 explícitos en NFR-02.

**H-10 | high | NFR-04 (l.95), glosario "Propietario" (l.27), DEC-005** Superficie del token ambigua. "token o sesión" permite aceptar `Authorization: Bearer` además de cookie, lo que reabre el almacenamiento en `localStorage` (token en el bundle/JS, contra el espíritu de NFR-01) y el análisis de CSRF. Fix: "El JWT viaja únicamente en cookie httpOnly; el servidor ignora el header `Authorization`; el cuerpo de login no devuelve el token". Fijar algoritmo (p. ej. HS256) y rechazar `alg=none`; secreto con longitud mínima validada en arranque (NFR-06).

**H-11 | high | NFR-07 (l.98) / DEC-008 / NFR-06** Rate limit y CORS no verificables como están. "10 intentos cada 15 min por IP" tras proxy usa la IP del proxy salvo `trust proxy`; sin definir respuesta (429 + `Retry-After`), qué cuenta como intento (¿solo fallidos?), ni qué pasa con registro. Un atacante puede además bloquear a un usuario legítimo que comparte IP. `FRONTEND_ORIGIN` no está en NFR-06. Fix: especificar 429, contar solo fallidos por IP (y opcionalmente por email), documentar `trust proxy` y añadir `FRONTEND_ORIGIN` y secreto JWT como variables obligatorias; ACs para 429 y CORS rechazado.

### MEDIUM

**M-01 | medium | NFR-07 (l.98) vs FR-05 (l.57)** "mensajes genéricos al cliente" frente a "400 con detalle por campo". Contradicción aparente. Fix: "las respuestas 400 de validación incluyen `{campo, código}`; los 5xx son genéricos". Definir el formato del contrato de error (campos, nombres) para que AC-1 sea comprobable.

**M-02 | medium | FR-05 (l.54) y FR-11 (l.86)** "Fecha no es futura" + "`CHECK` sobre ... fecha". Un CHECK con `CURRENT_DATE` es no inmutable y se rompe al restaurar datos; además falta zona horaria (¿día en UTC o del cliente?), tipo (`date` vs `timestamptz`) y cota inferior. Fix: comparar en el dominio contra reloj inyectado (`Clock` port, testeable por AC-8); CHECK solo para cotas fijas; definir "hoy" en UTC y cota inferior razonable.

**M-03 | medium | FR-08 (l.70), FR-11 (l.86)** Tipo de `id` sin definir. NFR-03 dice "Un UUID no sustituye el control" pero FR-11 solo dice "PK". Ids secuenciales filtran volumen y facilitan enumeración, y la comparación 404-idéntico queda sin sentido si se pueden recorrer. Fix: `uuid` (v4/v7) obligatorio.

**M-04 | medium | FR-07 (l.65-66)** "listado de sus accidentes con fecha y estado". Falta id (para ir al detalle), tipo, orden (¿por fecha de registro desc?), paginación o límite. Una lista sin límite es un problema de rendimiento y de exposición. Fix: campos mínimos, orden determinista y límite por defecto.

**M-05 | medium | FR-03 (l.44-45), NFR-05, AC-2 (l.110)** AC-2 "Una petición sin autenticar consulta accidentes": no nombra endpoint ni cubre token expirado, manipulado o revocado. NFR-05 no enumera qué endpoints son privados (¿`/auth/logout` sin sesión: 401 o 204?). Fix: tabla de endpoints con auth requerida/rol/códigos esperados en el PRD o referencia explícita a ella.

**M-06 | medium | AC-4 (l.112)** Cinco entradas distintas (fecha futura, tipo inexistente, tipos erróneos, campos extra, `userId`) en una fila y con salida disyuntiva. Un fallo pasa desapercibido. Fix: una fila por caso, con resultado único (ver H-02).

**M-07 | medium | AC-6 (l.114)** "se reinicia la app o el contenedor": "contenedor" no aparece en ningún FR/NFR; no se exige Docker/compose ni volumen persistente. Con volumen efímero el AC falla por infraestructura y no por el producto. Fix: exigir `docker-compose` (o equivalente) con volumen nombrado para PostgreSQL y definir el procedimiento de reinicio.

**M-08 | medium | AC-7 (l.115)** "revisión de respuestas" es manual y sin alcance; "grep del `dist/`" sin patrón; gitleaks "sobre el historial" depende de que existiera historial limpio. Fix: patrones concretos (`password`, `JWT_SECRET`, `postgres://`), lista de respuestas a revisar (register, login, me, list, detail, patch) y automatizar con un test que recorra los endpoints y falle si ve `password_hash`.

**M-09 | medium | AC-8 (l.116) / NFR-08 (l.101)** AC-8 "Transiciones válidas e inválidas y validaciones de entidad pasan" no lista casos (¿3 válidas, cuáles inválidas?), y "Cubre" cita NFR-08 pero no prueba dependency-cruiser. Además NFR-08 exige "en CI", y no existe ningún FR/NFR que defina CI. Fix: enumerar la matriz de transiciones (3x3 o 4x4 con nuevo estado) como casos; definir si CI es GitHub Actions o un script `npm run lint:arch`; quitar el nombre de herramienta si el PRD declara que no prescribe soluciones.

**M-10 | medium | FR-06 (l.61), AC-9 (l.117), NFR-09 (l.102)** "La documentación del repositorio explica ..." sin verificación; el README es requisito de facto (AC-9 "solo README") pero no hay FR del contenido mínimo ni prerrequisitos (versión de Node, Docker, puertos). Fix: FR/NFR con checklist del README (prerrequisitos, `.env`, migraciones, semilla del revisor, comandos de pruebas, sección sobre el vínculo cuenta-accidente) y verificación por AC-9.

**M-11 | medium | l.11 y NFR-08 (l.101)** "Express, PostgreSQL 16 y React/Vite/TS son decisiones ya cerradas": en `DECISIONS.md` solo Express (DEC-004) está cerrado; PostgreSQL 16, React/Vite/TS, bcrypt, Zod y dependency-cruiser no tienen DEC. Fix: crear DEC para los faltantes o retirar la afirmación "ya cerradas".

**M-12 | medium | l.53 y Preg. 3 (l.133)** DEC-007 declara resuelta la pregunta 3 pero no fija el conjunto de tipos de accidente: el supuesto sigue como `[ASSUMPTION: tránsito, laboral, doméstico, deportivo, otro]` y es el valor del CHECK y del AC-4 ("tipo inexistente"). Fix: promoverlo a DEC con enumeración final y valor persistido (códigos en inglés/mayúsculas vs etiquetas).

**M-13 | medium | NFR-07 (l.98), NFR-01 (l.92)** Datos personales sin política de logs. "logs sin contraseñas ni tokens" no cubre documento, teléfono, email ni descripción del accidente (dato sensible). El seed del revisor toma credenciales de env: `.env.example` con valores ficticios puede dejar una contraseña de revisor débil por defecto usable fuera de local. Fix: "logs sin PII ni cuerpos de petición"; el script de semilla falla si la contraseña es la de ejemplo o menor a 12 caracteres.

**M-14 | medium | FR-09 (l.74-76) y FR-10** Falta auditoría mínima del cambio de estado: quién (`reviewer_id`), cuándo (`updated_at`). Sin ello el "dueño ve el estado" no puede explicar el cambio y el revisor puede negar acciones. Fix: `status_changed_at`/`status_changed_by` o tabla de historial, aunque sea opcional; o declararlo fuera de alcance.

**M-15 | medium | DEC-005 / FR-03** Detalles de revocación no especificados: limpieza de `revoked_tokens` (expiración), índice por `jti`, logout con token ya expirado (¿401 o 204?), logout idempotente, coste de una consulta a BD por petición (latencia aceptada). Fix: incluirlos como criterios del FR-03 para que arquitectura no los invente distinto.

**M-16 | medium | DEC-005 / topología** `sameSite=lax` + CORS con credentials solo funcionan si frontend y backend comparten sitio (localhost con otro puerto sí; dominios distintos no). `secure` solo en producción rompe el desarrollo o la demo si se sirve por HTTP en un host remoto. Fix: documentar la topología soportada (mismo sitio o proxy inverso) y qué protege contra CSRF (`lax` no cubre GET con efectos; los endpoints mutantes exigen `Content-Type: application/json`).

### LOW

**L-01 | low | FR-01 (l.33-34)** "ve el propósito de la plataforma" subjetivo e inverificable; "al menos dos accesos" sin textos exactos. Fix: textos literales o criterio de presencia de dos enlaces con esos rótulos.

**L-02 | low | FR-05 (l.58)** "mensajes de error, confirmación y estados de carga comprensibles" subjetivo. Fix: criterio observable (mensaje junto a cada campo inválido, botón deshabilitado mientras envía, mensaje de éxito tras 201).

**L-03 | low | NFR-08 (l.101)** "Reglas de negocio probables sin BD": errata (probablemente "probadas"). Cambia el sentido del requisito.

**L-04 | low | NFR-10 (l.103)** "Declarar una prueba como pasada sin ejecutarla es una falta grave" es una regla de conducta, no un requisito medible. Fix: exigir un informe de pruebas (comando, fecha, resultado, límites) como entregable.

**L-05 | low | FR-04 (l.48)** Solo prohíbe el hash; no define la forma de la respuesta (`id`, `email`, `name`, `role`). El frontend de DEC-006 necesita `role`.

**L-06 | low | l.1-6, frontmatter** `status: draft` y `updated` sin cambio tras la revisión humana. Registrar versión y changelog contra DEC-005..008.

**L-07 | low | Sección 7 (l.121)** "Recuperación de contraseña ... gestión de perfiles" fuera de alcance: acorde, pero no hay política de cierre de cuentas ni cambio de rol del revisor; documentar que el cambio de rol requiere BD/semilla.

**L-08 | low | NFR-05 / Express** No hay límite de tamaño de cuerpo (`express.json({limit})`) ni límite de tamaño de campos en transporte; Zod valida después de parsear.

**L-09 | low | NFR-01 (l.92)** "historial de Git" sin secretos: un repo ya iniciado puede tener historial previo; si hay secretos antiguos, AC-7 falla y no hay fix de reescritura prevista. Fix: ejecutar gitleaks desde el primer commit y registrar excepciones.

## 4. Matriz de cobertura AC vs FR/NFR

| Requisito | AC que lo cubre | Observación |
|---|---|---|
| FR-01 | ninguno | Sin prueba. |
| FR-02 | ninguno | Sin duplicado, sin mínimo de contraseña, sin `role`. |
| FR-03 | ninguno | Ni mensaje genérico ni logout. |
| FR-04 | AC-7 parcial (sin hash) | Sin AC propio. |
| FR-05 | AC-1, AC-4 | Resultado disyuntivo (H-02). |
| FR-06 | ninguno | Sin verificación. |
| FR-07 | AC-5 | Solo el caso vacío; sin aislamiento entre usuarios. |
| FR-08 | AC-3 | Solo detalle ajeno; no id inexistente ni malformado. |
| FR-09 | AC-8 | Solo unidad; sin API. |
| FR-10 | ninguno | Sin cobertura total. |
| FR-11 | AC-6 | Solo persistencia; sin constraints ni migraciones. |
| NFR-01 | AC-7 | Manual. |
| NFR-02 | AC-7 | Parcial (sin rounds). |
| NFR-03 | AC-3 | Sin listado ni PATCH. |
| NFR-04 | AC-4 | Con resultado disyuntivo. |
| NFR-05 | AC-2 | Sin expirado/revocado. |
| NFR-06 | ninguno | Fail-fast no probado. |
| NFR-07 | ninguno | Sin helmet/CORS/rate limit/errores. |
| NFR-08 | AC-8 (parcial) | dependency-cruiser no probado. |
| NFR-09 | AC-9 | Aceptable, con prerrequisitos indefinidos. |
| NFR-10 | ninguno | No medible. |

## 5. Orden recomendado de corrección
1. Integrar DEC-005..DEC-008 en FR-02/03/04/05/10/11 y NFR-02/06/07/08 y eliminar supuestos y preguntas ya resueltas.
2. Resolver C-02 y C-03 (modelo de autorización con rol).
3. Cerrar H-02/H-04/H-05 (contrato de error y orden de validación) y reescribir AC-4.
4. Añadir ACs 10+ para logout, rol, rate limit, aislamiento del listado y credenciales genéricas.
5. Limpiar medium/low.

## 6. Recuento por severidad
- critical: 3
- high: 11
- medium: 16
- low: 9
- Total: 39

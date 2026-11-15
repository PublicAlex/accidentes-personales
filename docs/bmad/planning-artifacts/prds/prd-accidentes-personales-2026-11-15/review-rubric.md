# PRD Quality Review — Plataforma de accidentes personales (MVP)

Alcance de la revisión: `prd.md` (sin addendum) contrastado con `docs/DECISIONS.md`. DEC-005 a DEC-008 son decisiones de revisión humana que resuelven las preguntas abiertas pero todavía no están integradas en el PRD; por eso se marcan como contradicciones o vacíos donde corresponde.

## Overall verdict
El PRD es compacto y con sustancia real: NFR con umbrales verificables (NFR-03, NFR-08), nueve criterios de aceptación en formato Dado/Cuando/Entonces y una lista clara de fuera de alcance. El riesgo principal es que quedó desfasado respecto de DEC-005..DEC-008. FR-03 exige una invalidación de sesión que el diseño JWT no cumple sin `jti`, FR-10 y la sección 8 siguen abiertos aunque ya están resueltos, y NFR-07 declara "no obligatorias" medidas que DEC-008 hizo obligatorias. Mientras no se integren esas decisiones, arquitectura e historias recibirían dos fuentes en conflicto.

## Decision-readiness — thin
El PRD separa bien lo cerrado (stack, remitido a DECISIONS.md) de lo abierto, pero la sección 8 ya no es una lista de preguntas abiertas. Las cuatro preguntas están resueltas: la 1 por DEC-006, la 3 por DEC-007, la 4 por DEC-008 y la 2 se resuelve con DEC-001. Un lector que solo abra `prd.md` creerá que hay bloqueos que ya no existen y no sabrá cuáles son los valores acordados. Además, algunas "preguntas" nunca fueron abiertas de verdad: "Longitudes mínima y máxima de la descripción" delega a arquitectura una decisión de producto, y el supuesto "404 idéntico para inexistente y ajeno" figura como supuesto en §8 aunque FR-08 y NFR-03 ya lo fijan como requisito firme.

No se nombran trade-offs. No se dice qué se sacrifica al elegir 404 en lugar de 403, por qué JWT en cookie o sesión (la ambigüedad "token o sesión" en NFR-04 es una decisión sin tomar), ni por qué bcrypt "o argon2". Quien objete "¿por qué `REVIEWER` y no un panel de administración?" no encuentra respuesta en el PRD. Está en DEC-006, pero ahí no hay alternativas descartadas.

### Findings
- **high** Sección 8 obsoleta frente a DEC-005..008 (§8) — las cuatro "Preguntas abiertas" ya tienen respuesta y el PRD sigue presentándolas como bloqueos. *Fix:* retirar las preguntas resueltas, incorporar los valores como requisitos (FR-05, FR-10, NFR-07) y dejar una nota de trazabilidad hacia DEC-005..008.
- **high** Mecanismo de sesión sin decidir en el PRD (NFR-04, NFR-07, §8) — NFR-04 dice "token o sesión validados", el supuesto de §8 habla de "sesión por cookie httpOnly" y FR-04 usa `/api/auth/me`. DEC-005 fija JWT en cookie httpOnly, `sameSite=lax`, 1 h de expiración y `jti`. *Fix:* una sola formulación (JWT en cookie httpOnly con expiración de 1 h) en NFR-04 y en el glosario.
- **medium** Decisión nombrada como supuesto (§8: "404 idéntico para inexistente y ajeno") — contradice a FR-08 y NFR-03, donde es requisito firme y criterio eliminatorio. *Fix:* quitarlo de supuestos.
- **medium** Trade-offs ausentes (NFR-02, NFR-03, FR-10) — no se dice qué se pierde con 404 en lugar de 403 (diagnóstico más difícil) ni por qué un único rol `REVIEWER`. *Fix:* una línea de motivo por decisión.

## Substance over theater — adequate
Es en general sustancia, no ornamento. Hay dos personas más un "no usuarios" que sí condicionan decisiones (propietario único, rol Revisor). No hay innovación fingida. La visión ("persistencia real, autorización correcta en el servidor y una arquitectura hexagonal verificable") es específica de esta prueba y no intercambiable. Los NFR centrales llevan umbral o método de verificación: NFR-03 (404, `id` y `owner_id`), NFR-08 (dependency-cruiser en CI) y AC-7 (gitleaks, grep de `dist/`).

La debilidad está en los NFR más blandos. NFR-07 ("mensajes genéricos", "sin stack traces") no tiene criterio de prueba y NFR-10 ("evidencia honesta") es un compromiso de proceso, no un requisito de producto. El "Revisor" aparece como persona, pero el PRD no describe su flujo ni lo respalda con un AC.

### Findings
- **medium** NFR-07 mezcla requisito firme y supuesto (NFR-07) — la frase "`[ASSUMPTION: cookie httpOnly, helmet, CORS restringido y rate limit en login como buenas prácticas, no obligatorias.]`" contradice DEC-008, que lo vuelve obligatorio (helmet, CORS restringido a `FRONTEND_ORIGIN` con credentials, rate limit de 10 intentos cada 15 min por IP). *Fix:* convertir en requisitos con esos umbrales y añadir su AC.
- **low** NFR-10 es proceso, no producto (NFR-10) — no es verificable por un test del sistema. *Fix:* moverlo a "Propósito" o a criterios de entrega.

## Strategic coherence — adequate
La tesis está declarada en §1 (demostrar persistencia, autorización servidor y hexagonal) y el alcance es de tipo "problem-solving mínimo" con lógica coherente: todo lo que está dentro sirve a esos tres ejes, y lo que sobra (recuperación de contraseña, edición, adjuntos) está fuera. La prioridad de seguridad sobre funcionalidad es correcta para una evaluación técnica.

No hay métricas de éxito más allá de "los 9 escenarios". Es aceptable para un MVP evaluado, pero tampoco se nombra contra-métrica ni se vincula el peso de la rúbrica de evaluación (p. ej. los 15 puntos de seguridad que cita DEC-008) con la priorización. FR-10 y el cambio de estado, que DEC-006 justifica por demostrar la regla de transiciones y el cambio en vivo, aparecen en el PRD como "opcional", lo que debilita la coherencia de FR-09: una regla de transición que nadie puede ejecutar no es demostrable.

### Findings
- **high** FR-10 opcional contradice la tesis y DEC-006 (FR-10, §2, §8-1) — el PRD deja el actor "sin definir" y el rol como supuesto. DEC-006 define `users.role` (`USER` por defecto o `REVIEWER`), un script de semilla con credenciales desde variables de entorno y que el dueño solo ve el estado. Sin esto, FR-09 queda sin endpoint que lo ejerza. *Fix:* reescribir FR-10 como obligatorio, con 403 para `USER` y el dueño sin permiso de cambio; añadir AC.
- **low** Sin definición de éxito más allá de los AC (§1, §8) — el "éxito" se registra como supuesto. *Fix:* aceptable; declararlo como definición, no como supuesto.

## Done-ness clarity — thin
La mitad de los FR tienen consecuencias comprobables (FR-05 con 400 por campo, FR-07 con `[]`, FR-08 con 404, FR-09 con 4xx y estado sin cambio), pero hay huecos serios. Varias cifras que un ingeniero necesita no están en el PRD: FR-05 dice "La descripción respeta longitud mínima y máxima (`[ASSUMPTION: valores a definir en arquitectura]`)" y "Tipo de documento" y teléfono carecen de formato. DEC-007 los resuelve (descripción 20 a 2000, lugar 3 a 200, tipos `CC`/`CE`/`TI`/`PASAPORTE`, número 5 a 20 alfanuméricos, teléfono 7 a 15 dígitos con `+` opcional, contraseña mínimo 8), pero nada de eso está en el PRD, y FR-02 no tiene siquiera política de contraseña.

FR-03 es el caso más grave: "Cerrar sesión invalida la sesión en el cliente y el servidor deja de aceptarla" es un requisito que, con JWT stateless, no se puede cumplir sin un mecanismo de revocación. DEC-005 lo corrige con `jti`, tabla `revoked_tokens` y puerto `TokenRevocationRepository`; el PRD no lo menciona y no hay AC para logout. Otras frases sin umbral: "mensajes de error, confirmación y estados de carga comprensibles" (FR-05), "campos desconocidos se rechazan o ignoran" (FR-05; AC-4 acepta ambos, lo que impide una prueba determinista), "400 o campo ignorado" (AC-4). FR-02 pide "error sin revelar datos adicionales" sin código HTTP. NFR-02 acepta "bcrypt (o argon2)" y no fija costo; DEC-008 fija bcrypt con 12 rounds.

La cobertura de los AC es parcial: FR-01, FR-02, FR-03 (login, logout), FR-04, FR-06 y FR-10 no tienen AC. AC-2 prueba 401 solo sobre "consulta accidentes" y AC-3 solo el detalle; nada prueba que el listado filtra por propietario (NFR-03 dice "toda consulta").

### Findings
- **critical** FR-03 exige invalidación de servidor imposible con JWT sin revocación (FR-03) — "el servidor deja de aceptarla" no se cumple con un token stateless. DEC-005 resuelve con `jti` + `revoked_tokens` + `TokenRevocationRepository`, ausentes del PRD. *Fix:* integrar DEC-005 en FR-03 y añadir AC: tras logout, la misma cookie devuelve 401.
- **high** Límites de FR-05 sin valores aunque están decididos (FR-05, §8-3) — "valores a definir en arquitectura" frente a DEC-007. FR-02 tampoco fija política de contraseña (mínimo 8). *Fix:* volcar la tabla de DEC-007 en FR-02 y FR-05, y convertir los supuestos en requisitos.
- **high** Falta AC para FR-10, logout y listado privado (§6) — seis FR sin AC, y NFR-03 sin prueba sobre el listado. *Fix:* añadir AC para logout con `jti`, para `REVIEWER` frente a `USER` (403) en FR-10, transición por API, y listado que no incluye accidentes ajenos.
- **medium** Alternativas abiertas en el comportamiento esperado (FR-05, AC-4) — "se rechazan o ignoran" y "400 o campo ignorado" impiden un test único. *Fix:* elegir una conducta (p. ej. Zod `strict` con 400).
- **medium** Frases sin umbral (FR-05, FR-02) — "comprensibles"; "error sin revelar datos adicionales" sin código. *Fix:* especificar código (409 o 400 genérico) y mensajes por campo.
- **medium** NFR-02 sin costo (NFR-02) — "bcrypt (o argon2)" sin parámetros. *Fix:* "bcrypt con 12 rounds" (DEC-008).
- **low** FR-09 admite el supuesto implícito de un 4xx sin código (FR-09) — *Fix:* 409 o 422 fijo.

## Scope honesty — adequate
La sección 7 hace trabajo real y es explícita (sin recuperación de contraseña, edición, borrado, panel de administración), y "No usuarios (v1)" refuerza el límite. Hay buena transparencia en lo no decidido. El problema es de higiene, no de honestidad: las etiquetas `[ASSUMPTION]` no se corresponden con el índice y el volumen de abiertos es alto para un PRD que alimenta a construcción: cinco `[ASSUMPTION]` inline (§2, FR-05 dos veces, FR-10, NFR-07), cinco entradas en el índice de §8 y cuatro preguntas abiertas, es decir 14 elementos abiertos para 11 FR. DEC-005..008 cierran la mayoría, y el PRD debería reflejarlo.

No hay etiquetas `[NOTE FOR PM]` y la sección 7 no usa `[NON-GOAL for MVP]` donde hay omisiones que alguien podría asumir. Un ejemplo es el cierre de sesión en todos los dispositivos o la renovación del token, que con expiración de 1 h importa.

### Findings
- **medium** Roundtrip de supuestos roto (§2, FR-10, NFR-07 vs §8) — el supuesto del rol Revisor (§2, FR-10) y el de NFR-07 no están en el índice, y "404 idéntico" y "éxito solo por los 9 escenarios" están en el índice pero no inline. *Fix:* una vez integradas las decisiones, eliminar las etiquetas resueltas y reindexar las que queden.
- **low** Omisiones silenciosas (§7) — sin refresh token ni renovación de sesión, con expiración de 1 h (DEC-005), el usuario se desconecta a la hora y esto no está declarado. *Fix:* añadir a §7 como `[NON-GOAL for MVP]`.

## Downstream usability — adequate
Hay glosario, IDs FR-01..FR-11 y NFR-01..NFR-10 contiguos y sin duplicados, y AC-1..AC-9 con columna "Cubre" que facilita la trazabilidad. Las secciones se pueden extraer solas en su mayoría. El glosario, sin embargo, no cubre todos los sustantivos del dominio: falta "Revisor" (usado en §2 y FR-10 por actor), "sesión/token" y los campos de contacto. Hay deriva entre `owner`, `owner_id`, `ownerId`, `user_id` y `userId` (FR-05, FR-11, NFR-03). No hay UJ ni métricas (SM), lo cual es razonable aquí (ver Shape fit). Al ser un PRD que alimenta a arquitectura e historias, los vacíos de la dimensión Done-ness (ausencia de AC por FR) son lo que más pesará al extraer historias.

### Findings
- **medium** Glosario incompleto y deriva de nombres (§3, FR-05, FR-11, NFR-03) — "Revisor" y "Sesión" sin definir; `owner`/`owner_id`/`user_id` con significados solapados. *Fix:* añadir Revisor y Sesión al glosario y fijar `owner_id` como columna.
- **low** Ambigüedad "afectado" vs. "Usuario" (FR-05, §2) — "nombre del afectado" y "Persona afectada (usuario)" sugieren que el titular de la cuenta es el afectado, pero FR-05 recoge sus datos de nuevo. *Fix:* aclarar si se registra por terceros.

## Shape fit — adequate
Es una especificación de capacidades con un único flujo central, y el PRD la trata así: sin UJ, con AC como contrato verificable. Para una prueba técnica de un solo operador, es el formato correcto y la ausencia de UJ no es un defecto. No hay sobreformalización. Es un proyecto nuevo (greenfield), así que no hay referencias a código existente que verificar. El PRD nombra los fallos eliminatorios (NFR-01, 03, 05), lo cual es una buena adaptación al contexto de evaluación. Dado que el rol Revisor añade un segundo actor con permisos diferentes, un flujo breve del Revisor (aunque sea una tabla rol/permiso) aportaría más que un UJ completo.

## Mechanical notes
- **Contradicciones PRD vs DECISIONS.md:** FR-03 (sin `jti`/`revoked_tokens`, DEC-005); FR-10 y §2 (rol `REVIEWER`, semilla, 403 al dueño, DEC-006); FR-05 y FR-02 (límites y formatos, DEC-007); NFR-07 (endurecimiento obligatorio, DEC-008); NFR-02 (bcrypt 12 rounds, DEC-008); §8 (todas las preguntas resueltas); NFR-04 ("token o sesión" frente a JWT en cookie).
- **Estado de `.env`/configuración:** DEC-005 y DEC-008 exigen nuevas variables (`FRONTEND_ORIGIN`, credenciales del Revisor semilla) que NFR-06 no menciona; añadirlas a la lista de variables validadas al arrancar.
- **Modelo de datos:** FR-11 no incluye `users.role` ni la tabla `revoked_tokens` ni su CHECK de roles.
- **IDs:** FR-01..FR-11, NFR-01..NFR-10, AC-1..AC-9 contiguos y únicos; las referencias cruzadas (FR-02 a NFR-02, FR-05 a NFR-04, FR-08 a NFR-03) resuelven. No hay referencia a NFR desde FR-03 ni FR-10 aunque los afectan (NFR-05).
- **Cobertura AC:** FR-01, FR-02, FR-03, FR-04, FR-06, FR-10, NFR-06, NFR-07 y NFR-10 sin AC.
- **Roundtrip de supuestos:** ver Scope honesty; el índice y las etiquetas inline no coinciden.
- **UJ/protagonistas:** no aplica (sin UJ).
- **Secciones requeridas:** presentes para el tipo (visión, alcance, FR, NFR, AC, fuera de alcance). Faltan Métricas de éxito formales (aceptable aquí) y trazabilidad a DEC-005..008.

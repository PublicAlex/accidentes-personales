# Validation Report — Plataforma de accidentes personales (MVP)

- **PRD:** `docs/bmad/planning-artifacts/prds/prd-accidentes-personales-2026-11-15/prd.md`
- **Rubric:** `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-11-15T18:05:00-05:00
- **Grade:** Poor

## Overall verdict
El PRD es compacto y con sustancia real: NFR con umbrales verificables (NFR-03, NFR-08), nueve criterios de aceptación Dado/Cuando/Entonces y fuera de alcance explícito. El riesgo principal es que quedó desfasado respecto de DEC-005..DEC-008: FR-03 exige una invalidación de sesión que JWT no cumple sin `jti`, FR-10 y la sección 8 siguen abiertos aunque ya están resueltos, y NFR-07 declara "no obligatorias" medidas que DEC-008 hizo obligatorias. Mientras no se integren, arquitectura e historias recibirían dos fuentes en conflicto.
La revisión adversarial agrava el cuadro: veredicto NO APTO para pasar a arquitectura. Aparecen contradicciones internas que existen aunque se ignoren las decisiones: NFR-03 (todo filtrado por owner_id) frente al rol REVIEWER que debe tocar accidentes ajenos, escalada de privilegios por `role` en el registro, alternativas "ignora o rechaza" que impiden pruebas deterministas, orden 400/401/403/404 sin definir y más de la mitad de los FR sin AC. Nota de recuento: el rubro cuenta 19 hallazgos y el adversarial 39; varios coinciden (logout, FR-10, límites, AC faltantes).

## Dimension verdicts
- Decision-readiness — thin
- Substance over theater — adequate
- Strategic coherence — adequate
- Done-ness clarity — thin
- Scope honesty — adequate
- Downstream usability — adequate
- Shape fit — adequate

## Findings by severity
Recuento bruto (rubric + adversarial, con solapamientos): critical 4, high 16, medium 24, low 6. Nota: low del adversarial agrupa L-01..L-09. Deduplicado aproximado: critical 3, high 12, medium 20, low 11.

### Critical (4)
**[Rubric · Done-ness clarity]** — FR-03 exige invalidación de servidor imposible con JWT sin revocación (§ FR-03)
"el servidor deja de aceptarla" no se cumple con token stateless. DEC-005: jti + revoked_tokens + TokenRevocationRepository, ausentes del PRD.
Fix: Integrar DEC-005 y añadir AC: tras logout, la misma cookie devuelve 401.

**[Adversarial]** — C-01 Logout inverificable (§ FR-03, NFR-04, NFR-05)
Imposible con JWT stateless; con cookie httpOnly el borrado solo lo hace el servidor con Set-Cookie. Reusar el JWT copiado tras logout daría 200.
Fix: Reescribir FR-03 con DEC-005, AC-10 de token reusado = 401 y fail-closed si falla la consulta a revoked_tokens.

**[Adversarial]** — C-02 Contradicción de autorización con REVIEWER (§ NFR-03, FR-10, §1, §2 No usuarios, §7)
NFR-03 ("toda consulta filtra por id y owner_id") y la visión chocan con un REVIEWER que cambia estado de accidentes ajenos; "No usuarios" excluye administradores con acceso a terceros.
Fix: Excepción exacta: único acceso cross-owner = PATCH de estado para REVIEWER; definir qué lee el REVIEWER; corregir §2 y §7.

**[Adversarial]** — C-03 Escalada de privilegios por `role` en registro (§ FR-02, FR-04, NFR-04)
Mass assignment de role no cubierto; role en JWT persiste hasta 1 h.
Fix: Registro siempre USER, role en body = 400, rol leído de BD o desfase aceptado; AC nuevo.

### High (16)
**[Rubric · Decision-readiness]** — Sección 8 obsoleta frente a DEC-005..008 (§ §8)
Las cuatro preguntas abiertas ya tienen respuesta y el PRD las presenta como bloqueos.
Fix: Retirar las resueltas, incorporar los valores como requisitos (FR-05, FR-10, NFR-07) y dejar nota de trazabilidad a DEC-005..008.

**[Rubric · Decision-readiness]** — Mecanismo de sesión sin decidir (§ NFR-04, NFR-07, §8)
NFR-04 dice "token o sesión validados"; §8 habla de cookie httpOnly; DEC-005 fija JWT en cookie httpOnly, sameSite=lax, 1 h, jti.
Fix: Una sola formulación en NFR-04 y glosario.

**[Rubric · Strategic coherence]** — FR-10 opcional contradice la tesis y DEC-006 (§ FR-10, §2, §8-1)
DEC-006 define users.role (USER/REVIEWER), semilla por variables de entorno y que el dueño solo ve el estado.
Fix: Reescribir FR-10 como obligatorio, 403 para USER, y añadir AC.

**[Rubric · Done-ness clarity]** — Límites de FR-05 sin valores aunque están decididos (§ FR-05, FR-02, §8-3)
DEC-007: descripción 20-2000, lugar 3-200, doc CC/CE/TI/PASAPORTE, número 5-20, teléfono 7-15, contraseña mínimo 8.
Fix: Volcar la tabla de DEC-007 y convertir supuestos en requisitos.

**[Rubric · Done-ness clarity]** — Falta AC para FR-10, logout y listado privado (§ §6)
Seis FR sin AC y NFR-03 sin prueba sobre el listado.
Fix: AC para logout, REVIEWER vs USER (403), transición por API y listado aislado.

**[Adversarial]** — H-01 Cero AC para FR-10/rol (§ FR-10, §6)
Transiciones solo probadas por unidad (AC-8).
Fix: ACs: USER=403, REVIEWER avanza, salto=4xx, sin sesión=401, dueño ve estado.

**[Adversarial]** — H-02 "ignora o rechaza" sin contrato (§ FR-05, AC-4)
Dos comportamientos y un AC que acepta ambos.
Fix: Zod strict, 400 para cualquier campo desconocido; partir AC-4.

**[Adversarial]** — H-03 Enumeración de usuarios y email sin normalizar (§ FR-02, FR-03)
Email duplicado es oráculo; rate limit solo en login; A@x.com y a@x.com distintos; oráculo temporal en login.
Fix: Decidir 409 + rate limit en /register, bcrypt contra hash ficticio, normalizar email.

**[Adversarial]** — H-04 Orden 400/401/403/404/409 sin definir (§ FR-08, NFR-03, NFR-05, FR-10)
Id malformado puede dar 500 (22P02); PATCH ajeno de USER ambiguo.
Fix: Orden normativo y mismo 404 para id malformado/inexistente.

**[Adversarial]** — H-05 "4xx" inverificable y concurrencia (§ FR-09, FR-10)
400/409/422 pasan; sin definir estado igual ni concurrencia.
Fix: Código fijo y UPDATE ... WHERE status = esperado.

**[Adversarial]** — H-06 CHECK de estado vs añadir estado sin tocar capas (§ FR-11, FR-09)
Un CHECK obliga a migración en la prueba en vivo.
Fix: Redefinir criterio o usar tabla de estados con FK.

**[Adversarial]** — H-07 Más de la mitad de FR/NFR sin AC (§ §6)
FR-01..04, 06, 10, NFR-06, 07, 10 sin AC.
Fix: Añadir ACs o bajar alcance explícitamente.

**[Adversarial]** — H-08 Éxito = solo 9 escenarios (§ §1, §8)
Contradice NFR-08/10 y DEC-008 (15 pts); la lista de eliminatorios omite NFR-02.
Fix: Eliminar el supuesto y alinear con la rúbrica.

**[Adversarial]** — H-09 Sin máximo de contraseña (§ FR-02, NFR-02)
bcrypt trunca en 72 bytes y permite DoS.
Fix: Máximo 72 bytes y 12 rounds explícitos.

**[Adversarial]** — H-10 Superficie del token ambigua (§ NFR-04, glosario)
"token o sesión" admite Bearer y localStorage.
Fix: JWT solo en cookie httpOnly, ignorar Authorization, fijar alg.

**[Adversarial]** — H-11 Rate limit y CORS no verificables (§ NFR-07, NFR-06)
Sin 429/Retry-After, trust proxy ni FRONTEND_ORIGIN en NFR-06.
Fix: Especificar y añadir variables y ACs.

### Medium (24)
**[Rubric · Decision-readiness]** — Decisión firme listada como supuesto (§ §8 (404 idéntico))
FR-08 y NFR-03 ya lo fijan como requisito y criterio eliminatorio.
Fix: Quitarlo de supuestos.

**[Rubric · Decision-readiness]** — Trade-offs ausentes (§ NFR-02, NFR-03, FR-10)
No se dice qué se pierde con 404 frente a 403 ni por qué un único rol REVIEWER.
Fix: Una línea de motivo por decisión.

**[Rubric · Substance over theater]** — NFR-07 mezcla requisito y supuesto (§ NFR-07)
Su `[ASSUMPTION: ... no obligatorias]` contradice DEC-008 (helmet, CORS a FRONTEND_ORIGIN con credentials, rate limit 10/15 min/IP).
Fix: Convertir en requisitos con umbrales y añadir AC.

**[Rubric · Done-ness clarity]** — Alternativas abiertas en comportamiento esperado (§ FR-05, AC-4)
"se rechazan o ignoran" impide un test único.
Fix: Elegir una conducta (Zod strict con 400).

**[Rubric · Done-ness clarity]** — Frases sin umbral (§ FR-05, FR-02)
"comprensibles"; "error sin revelar datos adicionales" sin código.
Fix: Especificar código y mensajes por campo.

**[Rubric · Done-ness clarity]** — NFR-02 sin costo (§ NFR-02)
"bcrypt (o argon2)" sin parámetros; DEC-008 fija bcrypt 12 rounds.
Fix: "bcrypt con 12 rounds".

**[Rubric · Scope honesty]** — Roundtrip de supuestos roto (§ §2, FR-10, NFR-07 vs §8)
Supuestos inline no indexados e indexados no inline.
Fix: Tras integrar decisiones, eliminar etiquetas resueltas y reindexar.

**[Rubric · Downstream usability]** — Glosario incompleto y deriva de nombres (§ §3, FR-05, FR-11, NFR-03)
Revisor y Sesión sin definir; owner/owner_id/user_id solapados.
Fix: Añadir términos y fijar owner_id.

**[Adversarial]** — M-01 "mensajes genéricos" vs "400 con detalle" (§ NFR-07, FR-05)
Contradicción aparente.
Fix: Definir contrato de error {campo, código}; 5xx genéricos.

**[Adversarial]** — M-02 Fecha futura: CHECK y zona horaria (§ FR-05, FR-11)
CHECK con CURRENT_DATE no inmutable; falta zona y cota inferior.
Fix: Validar en dominio con Clock inyectado.

**[Adversarial]** — M-03 Tipo de id sin definir (§ FR-08, FR-11)
Ids secuenciales facilitan enumeración.
Fix: uuid obligatorio.

**[Adversarial]** — M-04 Listado sin campos, orden ni límite (§ FR-07)
Falta id, tipo, orden, paginación.
Fix: Definir campos mínimos y límite.

**[Adversarial]** — M-05 AC-2 sin endpoint ni casos de token (§ AC-2, NFR-05)
No cubre expirado, manipulado o revocado.
Fix: Tabla de endpoints con auth/rol/códigos.

**[Adversarial]** — M-06 AC-4 agrupa cinco casos (§ AC-4)
Un fallo pasa desapercibido.
Fix: Una fila por caso.

**[Adversarial]** — M-07 "contenedor" sin requisito de Docker (§ AC-6)
Volumen efímero haría fallar el AC.
Fix: Exigir compose con volumen nombrado.

**[Adversarial]** — M-08 AC-7 manual y sin patrones (§ AC-7)
"revisión de respuestas" sin alcance.
Fix: Patrones concretos y test automatizado.

**[Adversarial]** — M-09 AC-8 sin matriz; CI no definido (§ AC-8, NFR-08)
No enumera casos ni define CI.
Fix: Matriz de transiciones y script lint:arch.

**[Adversarial]** — M-10 README sin contenido mínimo (§ FR-06, AC-9, NFR-09)
Prerrequisitos indefinidos.
Fix: Checklist del README.

**[Adversarial]** — M-11 "decisiones ya cerradas" falso (§ §0, NFR-08)
Solo Express (DEC-004) tiene DEC.
Fix: Crear DEC faltantes o retirar la afirmación.

**[Adversarial]** — M-12 Tipos de accidente siguen abiertos (§ FR-05, §8-3)
DEC-007 no cierra el conjunto.
Fix: Promover a DEC.

**[Adversarial]** — M-13 Sin política de PII en logs ni semilla débil (§ NFR-07, NFR-01)
Logs pueden filtrar documento/teléfono/descripción.
Fix: Logs sin PII; semilla falla con contraseña de ejemplo.

**[Adversarial]** — M-14 Sin auditoría de cambio de estado (§ FR-09, FR-10)
Quién y cuándo.
Fix: status_changed_by/at o fuera de alcance.

**[Adversarial]** — M-15 Detalles de revocación sin especificar (§ FR-03)
Limpieza, índice jti, logout con token expirado, latencia.
Fix: Criterios en FR-03.

**[Adversarial]** — M-16 sameSite=lax + CORS: topología (§ DEC-005)
Funciona solo mismo sitio; secure solo en prod.
Fix: Documentar topología y CSRF.

### Low (6)
**[Rubric · Substance over theater]** — NFR-10 es proceso, no producto (§ NFR-10)
No es verificable por un test del sistema.
Fix: Moverlo a Propósito o a criterios de entrega.

**[Rubric · Strategic coherence]** — Éxito registrado como supuesto (§ §1, §8)
Es una definición, no una inferencia.
Fix: Declararlo como definición (y ver H-08 adversarial).

**[Rubric · Done-ness clarity]** — FR-09 con 4xx sin código (§ FR-09)
Inverificable.
Fix: Fijar 409 o 422.

**[Rubric · Scope honesty]** — Omisión silenciosa de refresh/renovación (§ §7)
Con expiración de 1 h el usuario se desconecta y no está declarado.
Fix: Añadir `[NON-GOAL for MVP]`.

**[Rubric · Downstream usability]** — Ambigüedad "afectado" vs "Usuario" (§ FR-05, §2)
No queda claro si se registra por terceros.
Fix: Aclarar.

**[Adversarial]** — L-01..L-09 (FR-01 subjetivo, FR-05 mensajes, errata "probables" en NFR-08, NFR-10 conducta, FR-04 sin forma, frontmatter sin cambio, §7 cambio de rol, límite de body, historial gitleaks) (§ varios)
Ver detalle en review-adversarial-general.md.
Fix: Ver archivo de revisión.

## Mechanical notes
- Contradicciones PRD vs DECISIONS.md (DEC-005..008): FR-03 sin jti/revoked_tokens/1 h/cookie; FR-10, §2 y glosario sin rol REVIEWER, semilla ni 403 al dueño; FR-02/FR-05 sin límites y formatos de DEC-007; NFR-07 marca como no obligatorio lo que DEC-008 hace obligatorio; NFR-02 sin bcrypt 12 rounds; NFR-04 "token o sesión"; NFR-06 sin FRONTEND_ORIGIN, secreto JWT ni credenciales de semilla; FR-11 sin users.role ni revoked_tokens; NFR-08 sin puerto TokenRevocationRepository; §8 con las 4 preguntas ya resueltas; frontmatter sin versión/changelog.
- Falta en DEC-005..008: tipos de accidente (DEC-007 no los cierra) y DEC para PostgreSQL 16, React/Vite/TS, Zod y dependency-cruiser que el PRD llama "ya cerradas".
- IDs FR-01..11, NFR-01..10, AC-1..9 contiguos y únicos; referencias cruzadas resuelven. FR sin AC: FR-01, 02, 03, 04, 06, 10.
- Roundtrip de supuestos roto (inline vs §8). Sin UJ ni SM: aceptable para este tipo de PRD. Errata: "probables" por "probadas" en NFR-08.

## Reviewer files
- `review-rubric.md`
- `review-adversarial-general.md`
- `.memlog.md` (entradas de revisión humana DEC-005..008)

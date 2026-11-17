# Accidentes personales

Aplicación web para que una persona registre un accidente personal y consulte únicamente sus propios accidentes y el estado de cada uno. Es un MVP: todos los datos son ficticios y no debe usarse con información real.

## Funcionalidades

- Landing pública con acceso a registro e ingreso.
- Cuenta: registro (el email repetido muestra "Este email ya está registrado"), ingreso y cierre de sesión.
- Registro de accidente con validación en cliente y servidor.
- Listado y detalle de tus accidentes, con estado `Registrado` → `En revisión` → `Cerrado`.
- Rol Revisor (`REVIEWER`): cambia el estado de cualquier accidente por API.
- Seguridad: contraseñas con bcrypt, sesión en cookie `httpOnly`, aislamiento por propietario (un id ajeno da `404`).

## Stack y arquitectura

Monorepo npm workspaces: backend Express 5 + TypeScript sobre PostgreSQL 16 (capas dominio, aplicación, infraestructura e interfaces HTTP) y frontend React 18 + Vite. En producción un solo proceso Express sirve `/api/*` y `frontend/dist` (mismo origen, sin CORS). Detalle en [docs/architecture.md](docs/architecture.md).

## Prerrequisitos

- Node.js 24 (ver `.nvmrc`) y npm.
- Docker con el plugin `docker compose`.
- `openssl` (para generar secretos).

## Ejecutar en local (rápido)

Con `.env` ya configurado (si es un clon nuevo, hazlo primero en la sección siguiente):

```bash
npm ci
docker compose up -d db     # postgres:16; crea las BD accidentes y accidentes_test
npm run migrate             # aplica backend/migrations
npm run build               # frontend/dist y backend/dist
npm run seed:reviewer       # crea/actualiza la cuenta REVIEWER con las variables REVIEWER_*
npm start                   # un solo proceso Express
```

Abre <http://localhost:3000> (cambia con `PORT`). El orden es el de DEC-016; se compila antes de sembrar porque la semilla corre desde `backend/dist/`.

## Primera vez desde un clon nuevo

```bash
cp .env.example .env
openssl rand -hex 32   # ejecútalo una vez por secreto
```

Edita `.env` y reemplaza los valores ficticios:

| Variable | Qué poner |
|---|---|
| `JWT_SECRET` | salida de `openssl rand -hex 32` (mínimo 32 caracteres) |
| `POSTGRES_PASSWORD` | salida de `openssl rand -hex 32` |
| `REVIEWER_PASSWORD` | salida de `openssl rand -hex 32` |

`DATABASE_URL` y `TEST_DATABASE_URL` llevan la contraseña y el puerto dentro de la URL: mantenlos iguales a `POSTGRES_PASSWORD` y `POSTGRES_PORT`. El resto de variables (`PORT`, `FRONTEND_ORIGIN`, `COOKIE_SECURE`, `REVIEWER_EMAIL`, etc.) tiene valores válidos en `.env.example`. `COOKIE_SECURE=false` permite correr el build en `http://localhost` (DEC-015); detrás de HTTPS debe ser `true`. Nunca subas `.env` al repositorio.

## Probar la aplicación

1. En la landing elige "Registrar accidente" y crea una cuenta; luego ingresa con ella.
2. Registra un accidente y míralo en el listado y en su detalle (estado inicial `Registrado`).
3. Cambiar el estado lo hace el Revisor, que entra con `REVIEWER_EMAIL` y `REVIEWER_PASSWORD` de tu `.env`. La interfaz no incluye esa acción; se usa la API con una cookie jar:

```bash
curl -c jar.txt -H 'Content-Type: application/json' \
  -d '{"email":"<REVIEWER_EMAIL>","password":"<REVIEWER_PASSWORD>"}' \
  http://localhost:3000/api/auth/login
curl -b jar.txt -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"EN_REVISION"}' \
  http://localhost:3000/api/accidents/<ID_DEL_ACCIDENTE>/status
```

Los estados válidos son `REGISTRADO`, `EN_REVISION` y `CERRADO`, en ese orden (ver [docs/api.md](docs/api.md)). Si no conoces el id, aparece en la URL del detalle del accidente. Borra `jar.txt` al terminar.

## Detener, reiniciar y modo desarrollo

```bash
# Ctrl+C detiene el servidor (npm start)
docker compose stop db      # detiene la BD conservando los datos
docker compose up -d db     # la reinicia
docker compose down -v      # borra también el volumen pgdata (se pierden los datos)
npm run dev                 # backend con tsx watch (:3000) y Vite (:5173)
```

En desarrollo abre <http://localhost:5173> y pon `FRONTEND_ORIGIN=http://localhost:5173` en `.env`; Vite hace proxy de `/api` al backend.

## Pruebas y verificaciones

```bash
docker compose up -d db
npm run migrate:test    # migra la BD de prueba accidentes_test (opcional: npm test ya la migra)
npm test                # backend (unitarias, contrato, integración con BD real) y frontend
npm run lint:arch       # dependency-cruiser + scripts/check-globals.mjs
npm run scan:secrets    # gitleaks en contenedor + secretos en frontend/dist (requiere Docker)
```

Persistencia: `scripts/verify-persistence.sh` (ver el encabezado del script). Resultados en [docs/TEST_REPORT.md](docs/TEST_REPORT.md) y [docs/evidence/](docs/evidence/).

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| Puerto 5432 ocupado al levantar la BD | Define otro `POSTGRES_PORT` (p. ej. `5433`) en `.env` y ajusta el puerto en `DATABASE_URL` y `TEST_DATABASE_URL`. Para convivir con otra instancia usa `COMPOSE_PROJECT_NAME=accidentes2 docker compose up -d db`. |
| Puerto 3000 ocupado | Cambia `PORT` en `.env` (la URL cambia con él) o detén el proceso que lo usa. |
| `ECONNREFUSED` al migrar, sembrar o arrancar | La BD no está levantada o el puerto/contraseña de `DATABASE_URL` no coinciden. Ejecuta `docker compose up -d db` y revisa `docker compose ps`. |
| `EMAIL_TAKEN` (409) al registrarse | Ese email ya tiene cuenta; la interfaz muestra "Este email ya está registrado" (DEC-021). Usa otro o ingresa. |
| `seed:reviewer` rechaza la contraseña | `REVIEWER_PASSWORD` sigue con el valor de ejemplo de `.env.example`. Genera una con `openssl rand -hex 32`. |
| `npm start` rechaza `JWT_SECRET` | Con `NODE_ENV=production` no se acepta el secreto de ejemplo. Genera uno nuevo. |

## Estructura

```text
backend/
  migrations/            migraciones SQL (node-pg-migrate)
  src/domain/            entidades, catálogos y máquina de estados (sin dependencias)
  src/application/       casos de uso y puertos
  src/infrastructure/    adaptadores: pg, bcrypt, jsonwebtoken, pino, config
  src/interfaces/http/   Express: rutas, controladores, esquemas Zod, errorMapper
  src/main/              composición, servidor y semilla del revisor
  tests/                 unit, contract, integration, fakes, support
frontend/src/            api/ (único adaptador HTTP), pages/, components/, hooks/
scripts/                 check-globals, scan-secrets, verify-persistence
docker/                  scripts de inicialización de la BD
docs/                    documentación técnica, evidencias y artefactos BMAD
```

## Documentación

- [API](docs/api.md) · [Modelo de datos](docs/data-model.md) · [Arquitectura](docs/architecture.md)
- [Decisiones](docs/DECISIONS.md) · [Limitaciones conocidas](docs/LIMITATIONS.md)
- [Fuentes y licencias](docs/SOURCES.md) · [Estrategia de Git](docs/GIT_STRATEGY.md)
- [Informe de pruebas](docs/TEST_REPORT.md) · [Trazabilidad](docs/TRACEABILITY.md) · [Evidencias](docs/evidence/)
- [docs/bmad/](docs/bmad/): artefactos del método BMAD. `agent-logs/` contiene los registros de los agentes BMAD (qué hizo cada uno y con qué resultado); `reviews/` las revisiones.

## Método BMAD

El proyecto se construyó con BMAD Method 6.12.4. Los artefactos se organizan en `docs/bmad/`: `planning-artifacts/` (PRD, arquitectura, épicas), `implementation-artifacts/` (contexto de épicas, specs por historia y `sprint-status.yaml`), `agent-logs/` y `reviews/`.

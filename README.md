# Accidentes personales

Aplicación de registro de accidentes personales (backend Express + PostgreSQL 16, frontend React + Vite), en un monorepo npm workspaces.

> README provisional (historia S1.1). Se completa en S3.3 con el orden completo de arranque.

## Requisitos

- Node.js 24 (`.nvmrc`) y npm
- Docker con Compose

## Pasos disponibles en S1.1

```bash
npm install
cp .env.example .env        # valores ficticios; editar antes de usar de verdad
docker compose up -d db     # postgres:16 con las BD accidentes y accidentes_test
npm run lint:arch           # reglas de arquitectura (dependency-cruiser + check-globals)
npm test
```

## Notas

- `migrate*`, `seed:reviewer` y `start` apuntan a código de historias futuras (S1.3, S2.1); `start` por ahora solo valida la configuración.
- `npm run scan:secrets` requiere Docker y la imagen `zricethezav/gitleaks`; si no está disponible, falla de forma explícita.

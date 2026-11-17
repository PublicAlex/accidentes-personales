# Verificacion README - 2026-11-17 (rama feat/ui-estilo-clinico, commit base b344842)
## Scripts del README existen en package.json y enlaces relativos resuelven (ver comprobacion previa: 0 enlaces rotos, 7/7 scripts)
enlaces rotos: []
{'seed:reviewer': True, 'migrate:test': True, 'lint:arch': True, 'migrate': True, 'scan:secrets': True, 'build': True, 'dev': True}
(nota: en la primera pasada habia un servidor previo en :3000; se detuvo y se repitio el arranque limpio abajo)

## $ docker compose up -d db
 Container carpetasinttulo-db-1  Running
exit=0

## $ npm run migrate

> accidentes-personales@0.1.0 migrate
> node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up -m backend/migrations

No migrations to run!
Migrations complete!
exit=0

## $ npm run build

vite v8.3.8 building client environment for production...
transforming...
✓ 43 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.41 kB │ gzip:  0.28 kB
dist/assets/index-BPSQ54EP.css   10.91 kB │ gzip:  2.95 kB
dist/assets/index-CRKqkOul.js   203.79 kB │ gzip: 66.14 kB

✓ built in 241ms

> backend@0.1.0 build
> tsc -p tsconfig.build.json

exit=0

## $ npm run seed:reviewer

> accidentes-personales@0.1.0 seed:reviewer
> node --env-file-if-exists=.env backend/dist/main/seedReviewer.js

Revisor listo: revisor@example.test
exit=0

## $ npm start (equivale a node --env-file-if-exists=.env backend/dist/main/server.js), segundo plano, PID 16544
## 3000 antes: 1 oyentes (tras el arranque, esperado 1)
## curl http://localhost:3000/
200 text/html; charset=utf-8
<title>Registro de Accidentes Personales</title>
## curl /api/auth/me
{"error":{"code":"UNAUTHENTICATED","message":"No autenticado"}} -> 401
## servidor detenido (kill del proceso node pid 16549): oyentes en 3000 = 0
carpetasinttulo-db-1 Up 8 minutes (healthy)
## RESULTADO: PASS (migrate, build, seed, / -> 200 HTML, /api/auth/me -> 401)

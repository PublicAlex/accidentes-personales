# Estrategia de Git

Trunk-based ligero con una sola rama de larga vida, `main`, siempre en verde (`npm run build && npm run lint:arch && npm test`).

## Ramas

- `main`: integra el trabajo terminado.
- `feat/S<epic>.<n>-<resumen>`: una rama por historia (por ejemplo `feat/S3.3-build-readme-evidencia`).
- `fix/<resumen>`: correcciones.
- `docs/<resumen>`: cambios solo de documentación.

Las ramas viven poco y se integran al terminar la historia.

## Integración

No hay remoto, así que no existen pull requests reales. Cada rama se integra con un merge sin fast-forward que simula el PR:

```bash
git switch main
git merge --no-ff feat/S3.3-build-readme-evidencia -m "feat(S3.3): build, README y evidencia de entrega"
```

El commit de merge conserva el límite de la historia en el historial. `.github/pull_request_template.md` sirve de lista de verificación aun sin remoto.

## Commits

Conventional Commits en español, con el id de la historia: `tipo(S3.3): descripción en imperativo`. Tipos usados: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`. Commits pequeños, uno por cambio coherente. Nunca se versionan `.env`, `node_modules`, `dist` ni clones temporales; gitleaks revisa el historial completo en el CI definido en `.github/workflows/ci.yml` (no ejecutado: no hay remoto).

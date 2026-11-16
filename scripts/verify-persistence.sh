#!/usr/bin/env bash
# AC-6: verifica que un accidente sobrevive a reinicios de la app y de la BD.
#
# Uso:
#   scripts/verify-persistence.sh [URL_BASE]            # URL_BASE por defecto: http://localhost:3000
#
# Variables opcionales:
#   RESTART_DB=1   el script ejecuta "docker compose restart db" (por defecto 1; usa 0 si lo orquestas tú)
#   RESTART_APP_CMD  comando que reinicia la app (por defecto vacío: el script pausa y pide que la reinicies)
#
# Requiere la app en marcha (npm start) y la BD migrada. Crea una cuenta nueva por ejecución (deja
# la cuenta de prueba en la BD) y consume 3 intentos del rate limit de register/login (10 cada 15 min).
# Sin RESTART_APP_CMD exige una terminal interactiva: el reinicio de la app debe ser real.
set -euo pipefail

BASE="${1:-http://localhost:3000}"
RESTART_DB="${RESTART_DB:-1}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

STAMP="$(date +%s)$RANDOM"
EMAIL="persistencia-${STAMP}@example.test"
PASS="$(openssl rand -hex 16)"

req() { curl -sS --fail-with-body "$@"; }

echo "== Base: $BASE"
echo "== Registrando cuenta $EMAIL"
req -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"fullName\":\"Persona Persistencia\"}"
echo

login() {
  req -c "$JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null
}

login
echo "== Creando accidente"
CREATED="$(req -b "$JAR" -X POST "$BASE/api/accidents" -H 'Content-Type: application/json' -d '{
  "affectedName":"Persona Persistencia","documentType":"CC","documentNumber":"12345678",
  "phone":"3001234567","contactEmail":"contacto@example.test","accidentType":"TRANSITO",
  "occurredOn":"2024-01-15","place":"Calle 1 con Carrera 2","description":"Accidente de prueba para verificar persistencia."}')"
echo "$CREATED"
ID="$(printf '%s' "$CREATED" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)"
[ -n "$ID" ] || { echo "No se pudo leer el id del accidente" >&2; exit 1; }
BEFORE="$(req -b "$JAR" "$BASE/api/accidents/$ID")"
echo "== Antes del reinicio: $BEFORE"

if [ -n "${RESTART_APP_CMD:-}" ]; then
  echo "== Reiniciando la app: $RESTART_APP_CMD"
  bash -c "$RESTART_APP_CMD"
else
  [ -t 0 ] || { echo "Sin terminal interactiva: define RESTART_APP_CMD para reiniciar la app" >&2; exit 1; }
  echo "== Reinicia la app (Ctrl+C y npm start) y presiona Enter para continuar"
  read -r _
fi

if [ "$RESTART_DB" = "1" ]; then
  echo "== docker compose restart db"
  docker compose restart db
  ok=0
  for _ in $(seq 1 30); do
    # pg_isready no consume rate limit; login se reintenta luego una sola vez
    if docker compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then ok=1; break; fi
    sleep 2
  done
[ "$ok" = "1" ] || { echo "FALLO: la BD no volvió a aceptar conexiones tras el reinicio" >&2; exit 1; }
fi

echo "== Consultando tras reinicios"
login
AFTER="$(req -b "$JAR" "$BASE/api/accidents/$ID")"
echo "$AFTER"

if [ "$BEFORE" = "$AFTER" ]; then
  echo "OK: el accidente $ID persiste sin cambios."
else
  echo "FALLO: el accidente cambió o no coincide." >&2
  exit 1
fi

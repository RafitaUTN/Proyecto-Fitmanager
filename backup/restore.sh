#!/bin/sh
set -e

ARCHIVO="${1:-$(ls -t /backups/*.dump 2>/dev/null | head -n 1)}"
if [ -z "$ARCHIVO" ]; then
  echo "No hay respaldos en /backups. Uso: docker compose exec backup sh /backup/restore.sh [archivo.dump]"
  exit 1
fi

echo "Restaurando $ARCHIVO en ${BACKUP_HOST:-postgres}:${POSTGRES_DB:-fitmanager} ..."
PGPASSWORD="${POSTGRES_PASSWORD:-fitmanager_secret}" pg_restore \
  -h "${BACKUP_HOST:-postgres}" \
  -U "${POSTGRES_USER:-fitmanager}" \
  -d "${POSTGRES_DB:-fitmanager}" \
  --clean --if-exists \
  "$ARCHIVO"

echo "[restore] OK $(date '+%Y-%m-%d %H:%M:%S')" >> /backups/restore.log

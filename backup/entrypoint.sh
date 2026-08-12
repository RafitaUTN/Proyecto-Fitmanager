#!/bin/sh
set -e

CRON_EXPR="${BACKUP_CRON:-0 2 * * *}"
echo "$CRON_EXPR sh /backup/backup.sh" > /etc/crontabs/root

echo "Servicio de respaldo activo: '$CRON_EXPR' (por defecto 02:00 diario)."
echo "Respaldo manual: docker compose exec backup sh /backup/backup.sh"
echo "Restauracion:    docker compose exec backup sh /backup/restore.sh [archivo.dump]"
crond -f

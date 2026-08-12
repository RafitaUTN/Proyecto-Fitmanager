#!/bin/sh
set -e

PGPASSWORD="${POSTGRES_PASSWORD:-fitmanager_secret}" pg_dump \
  -h "${BACKUP_HOST:-postgres}" \
  -U "${POSTGRES_USER:-fitmanager}" \
  -d "${POSTGRES_DB:-fitmanager}" \
  -Fc \
  -f "/backups/fitmanager_$(date +%Y%m%d_%H%M).dump"

find /backups -type f -name '*.dump' -mtime +"${BACKUP_KEEP_DAYS:-7}" -delete

echo "[backup] OK $(date '+%Y-%m-%d %H:%M:%S')" >> /backups/backup.log

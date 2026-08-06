#!/bin/sh
# =====================================================================
#  RNF-10 (Respaldo y recuperación)
#
#  "El sistema deberá realizar copias de seguridad automáticas de la base
#   de datos al menos una vez cada 24 horas y permitir la recuperación
#   completa de la información ante fallos del sistema."
#
#  Este script corre en bucle dentro del contenedor 'backup' definido en
#  docker-compose.yml. Cada INTERVALO_HORAS genera un dump y elimina los
#  que superen RETENCION_DIAS.
#
#  Formato: custom de PostgreSQL (-Fc). Es comprimido y permite restaurar
#  tablas sueltas con pg_restore, cosa que un .sql plano no permite.
# =====================================================================

set -eu

DIRECTORIO_BACKUPS="${DIRECTORIO_BACKUPS:-/backups}"
INTERVALO_HORAS="${INTERVALO_HORAS:-24}"
RETENCION_DIAS="${RETENCION_DIAS:-7}"

log() {
  echo "[backup $(date '+%Y-%m-%d %H:%M:%S')] $1"
}

mkdir -p "$DIRECTORIO_BACKUPS"

log "Servicio de respaldos iniciado"
log "  destino:   $DIRECTORIO_BACKUPS"
log "  intervalo: cada ${INTERVALO_HORAS}h"
log "  retencion: ${RETENCION_DIAS} dias"

# Esperar a que PostgreSQL acepte conexiones antes del primer intento.
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  log "Esperando a PostgreSQL..."
  sleep 5
done
log "PostgreSQL disponible"

while true; do
  MARCA=$(date '+%Y%m%d_%H%M%S')
  ARCHIVO="$DIRECTORIO_BACKUPS/fitmanager_${MARCA}.dump"

  log "Generando respaldo -> $(basename "$ARCHIVO")"

  if pg_dump \
      --host="$POSTGRES_HOST" \
      --username="$POSTGRES_USER" \
      --dbname="$POSTGRES_DB" \
      --format=custom \
      --compress=9 \
      --file="$ARCHIVO" 2>/tmp/backup_error.log; then

    TAMANO=$(du -h "$ARCHIVO" | cut -f1)
    log "OK - respaldo completado ($TAMANO)"

    # Rotación: borrar respaldos más viejos que la retención definida.
    BORRADOS=$(find "$DIRECTORIO_BACKUPS" -name 'fitmanager_*.dump' -type f -mtime "+$RETENCION_DIAS" -print -delete | wc -l)
    if [ "$BORRADOS" -gt 0 ]; then
      log "Rotacion: $BORRADOS respaldo(s) antiguo(s) eliminado(s)"
    fi

    TOTAL=$(find "$DIRECTORIO_BACKUPS" -name 'fitmanager_*.dump' -type f | wc -l)
    log "Respaldos disponibles: $TOTAL"
  else
    log "ERROR - fallo el respaldo:"
    cat /tmp/backup_error.log
    # No abortamos: si la BD estaba momentáneamente caída, reintentamos
    # en el siguiente ciclo en vez de matar el servicio.
  fi

  log "Siguiente respaldo en ${INTERVALO_HORAS}h"
  sleep $((INTERVALO_HORAS * 3600))
done

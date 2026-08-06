#!/bin/sh
# =====================================================================
#  RNF-10 - Restauración de un respaldo
#
#  El RNF exige "permitir la recuperación completa de la información ante
#  fallos del sistema". Un respaldo que nunca se probó a restaurar no
#  cumple el requisito: hay que poder demostrar el camino de vuelta.
#
#  USO (desde la raíz del proyecto):
#
#    # 1. Ver respaldos disponibles
#    docker compose exec backup ls -lh /backups
#
#    # 2. Restaurar uno
#    docker compose exec backup sh /scripts/restore.sh fitmanager_20260806_120000.dump
#
#  ADVERTENCIA: esto SOBRESCRIBE la base de datos actual.
# =====================================================================

set -eu

DIRECTORIO_BACKUPS="${DIRECTORIO_BACKUPS:-/backups}"

if [ $# -lt 1 ]; then
  echo "Uso: restore.sh <nombre_del_archivo.dump>"
  echo ""
  echo "Respaldos disponibles:"
  ls -1 "$DIRECTORIO_BACKUPS"/fitmanager_*.dump 2>/dev/null | sed 's|.*/|  |' || echo "  (ninguno)"
  exit 1
fi

ARCHIVO="$DIRECTORIO_BACKUPS/$1"

if [ ! -f "$ARCHIVO" ]; then
  echo "ERROR: no existe $ARCHIVO"
  exit 1
fi

echo "==================================================="
echo " RESTAURACION DE RESPALDO"
echo "==================================================="
echo "  Archivo: $1"
echo "  Destino: $POSTGRES_DB en $POSTGRES_HOST"
echo ""
echo "  Esto SOBRESCRIBE los datos actuales."
echo "==================================================="
echo ""

# --clean elimina los objetos antes de recrearlos.
# --if-exists evita errores si algún objeto no existía.
# --no-owner ignora los dueños originales (útil entre entornos distintos).
pg_restore \
  --host="$POSTGRES_HOST" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --verbose \
  "$ARCHIVO"

echo ""
echo "Restauracion completada."
echo "Reinicia el backend para limpiar conexiones y caché:"
echo "  docker compose restart backend"

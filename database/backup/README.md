# Respaldos automáticos — RNF-10

Implementación del RNF-10 (Respaldo y recuperación):

> El sistema deberá realizar copias de seguridad automáticas de la base de datos al menos una vez cada 24 horas y permitir la recuperación completa de la información ante fallos del sistema.

## Cómo funciona

El servicio `backup` del `docker-compose.yml` levanta un contenedor `postgres:17-alpine` que ejecuta `backup.sh` en bucle. Cada ciclo genera un dump de la base y borra los que superen la retención.

| Parámetro | Valor por defecto | Variable de entorno |
|---|---|---|
| Intervalo entre respaldos | 24 horas | `BACKUP_INTERVALO_HORAS` |
| Retención | 7 días | `BACKUP_RETENCION_DIAS` |
| Destino | volumen `backups_data` | — |

Los dumps usan el **formato custom** de PostgreSQL (`-Fc`), comprimido. A diferencia de un `.sql` plano, permite restaurar tablas sueltas con `pg_restore` en vez de todo o nada.

Se guardan en un volumen de Docker, no en un bind mount, para que sobrevivan a un `docker compose down` sin `-v`.

## Verificar que está corriendo

```bash
docker compose logs -f backup
```

Salida esperada:

```
[backup 2026-08-06 12:00:00] Servicio de respaldos iniciado
[backup 2026-08-06 12:00:00] PostgreSQL disponible
[backup 2026-08-06 12:00:01] Generando respaldo -> fitmanager_20260806_120001.dump
[backup 2026-08-06 12:00:03] OK - respaldo completado (248K)
[backup 2026-08-06 12:00:03] Siguiente respaldo en 24h
```

## Listar respaldos

```bash
docker compose exec backup ls -lh /backups
```

## Restaurar

**Sobrescribe la base de datos actual.**

```bash
docker compose exec backup sh /scripts/restore.sh fitmanager_20260806_120001.dump
docker compose restart backend
```

Sin argumentos, `restore.sh` lista los respaldos disponibles.

## Sacar un respaldo fuera del contenedor

```bash
docker cp fitmanager-backup:/backups/fitmanager_20260806_120001.dump ./
```

## Probar el ciclo completo

Para la evidencia del entregable conviene demostrar que la recuperación funciona, no solo que el respaldo se genera. Un respaldo que nunca se restauró no cumple el RNF.

```bash
# 1. Respaldo inmediato (sin esperar 24h)
docker compose exec backup sh -c 'pg_dump -h postgres -U fitmanager -d fitmanager -Fc -f /backups/prueba.dump'

# 2. Provocar una pérdida de datos
docker compose exec postgres psql -U fitmanager -d fitmanager -c "DELETE FROM cliente;"

# 3. Confirmar que se perdieron
docker compose exec postgres psql -U fitmanager -d fitmanager -c "SELECT COUNT(*) FROM cliente;"

# 4. Restaurar
docker compose exec backup sh /scripts/restore.sh prueba.dump

# 5. Confirmar que volvieron
docker compose exec postgres psql -U fitmanager -d fitmanager -c "SELECT COUNT(*) FROM cliente;"
```

## Acelerar el ciclo para probarlo

En el `.env` de la raíz:

```
BACKUP_INTERVALO_HORAS=1
```

Y `docker compose up -d backup`. Recuerda devolverlo a 24 después.

## Limitación conocida

Los respaldos viven en el mismo host que la base de datos. Ante una falla del disco se pierden ambos. Para producción habría que replicarlos a almacenamiento externo (S3, Backblaze, o el sistema de respaldos gestionado del proveedor de base de datos).

# Recuperación de la base de datos de FitManager

## Contenido del backup

Cada artifact contiene un archivo `.tar.gz` con `roles.sql`, `schema.sql`, `data.sql`, `SHA256SUMS` y `manifest.txt`. Conserva el esquema PostgreSQL, constraints, relaciones, datos y tenant IDs. No contiene Storage objects ni secretos de aplicación.

## Requisitos

- Acceso autorizado al repositorio privado y a GitHub Actions.
- Docker Desktop.
- Supabase CLI 2.101.0.
- Cliente PostgreSQL 17 (`psql`, `createdb`).
- Node.js 22 para la validación FitManager.

## Descargar el artifact

1. Abrir **GitHub → Actions → Database Backup**.
2. Seleccionar una ejecución verde y descargar su artifact, o usar `gh run download RUN_ID -n ARTIFACT_NAME`.
3. Extraer el ZIP de GitHub y localizar el `.tar.gz` interno.

## Verificar y descomprimir

En Linux/macOS/WSL:

```bash
gzip -t fitmanager-db-backup-*.tar.gz
mkdir restore-files
tar -xzf fitmanager-db-backup-*.tar.gz -C restore-files
cd restore-files
sha256sum --check SHA256SUMS
```

Revisar `manifest.txt`. Nunca publicar los SQL ni copiarlos al repositorio.

## Crear un destino seguro

Nunca restaurar sobre producción. Crear una base PostgreSQL 17 vacía cuyo nombre indique claramente que es temporal, por ejemplo `fitmanager_restore_drill`. Verificar host, puerto y nombre antes de continuar.

## Restaurar

La restauración oficial se ejecuta en una sola transacción y se detiene ante el primer error:

```bash
psql --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$RESTORE_DATABASE_URL"
```

En un Supabase nuevo pueden existir roles administrados previamente. Si `roles.sql` informa que un rol ya existe, comparar el archivo y seguir la sección de troubleshooting oficial de Supabase; no borrar roles administrados a ciegas. Los usuarios `LOGIN` personalizados requieren contraseñas nuevas y nunca se recuperan desde el dump.

## Validar integridad

Desde `backend/`:

```bash
RESTORE_PHASE=pre-migration RESTORE_DATABASE_URL='postgresql://.../fitmanager_restore_drill' npm run test:restore
```

`pre-migration` valida el restore point productivo actual y admite que todavía no exista `ejercicio_media_cache`. Después de ejecutar y verificar `prisma migrate deploy` sobre la copia restaurada, repetir sin esa excepción:

```bash
RESTORE_PHASE=post-migration RESTORE_DATABASE_URL='postgresql://.../fitmanager_restore_drill' npm run test:restore
```

El validador solo acepta localhost y una base cuyo nombre contenga `restore`. Comprueba las 23 tablas esperadas, migraciones fallidas, índices inválidos, constraints sin validar, registros huérfanos, notificaciones sin destinatario y hechos sin tenant.

Para un drill con dos gimnasios:

```bash
RESTORE_PHASE=pre-migration REQUIRE_TWO_TENANTS=true RESTORE_DATABASE_URL='postgresql://.../fitmanager_restore_drill' npm run test:restore
```

Después arrancar FitManager contra esa base temporal y comprobar login, clientes, membresías, pagos, asistencias, rutinas, transferencias y notificaciones. Confirmar que Gym A no lista ni modifica recursos de Gym B.

## Prisma migrations

Consultar `_prisma_migrations` antes de ejecutar `prisma migrate deploy`. Si el dump corresponde al esquema actual, las migraciones ya deben figurar aplicadas. No ejecutar `migrate reset`, `db push --force-reset`, `DROP SCHEMA`, `TRUNCATE` ni migraciones destructivas sobre un restore sin comparar primero el estado.

## Errores frecuentes

- Archivo vacío: descartar el artifact y revisar el workflow.
- Checksum incorrecto: no restaurar; descargar otra vez.
- `supabase_admin`/`cli_login_postgres`: seguir el troubleshooting oficial de Supabase; no elevar privilegios indiscriminadamente.
- Constraint o FK fallida: abortar, conservar logs y no conectar la aplicación.
- Migraciones locales posteriores al backup: restaurar primero y evaluar `prisma migrate status` antes de desplegar código más nuevo.

## Finalización

Conservar el reporte del drill, destruir únicamente la base temporal después de verificar el nombre exacto y nunca reutilizar sus credenciales en producción.

## Último drill verificado

El 2026-08-11 se restauró un dump de prueba con Supabase CLI 2.101.0 en un contenedor PostgreSQL 17 nuevo. Resultado: PASS; 23 tablas, 20 migraciones, dos tenants, conteos origen/destino idénticos y cero fallos de integridad. La restauración tardó 0,54 s. RNF-10 seguirá en estado PARCIAL hasta que el repositorio sea privado, exista `SUPABASE_DB_URL` como GitHub Secret y una ejecución programada produzca un artifact privado descargable.

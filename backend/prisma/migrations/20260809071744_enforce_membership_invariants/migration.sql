-- BUG-001 / DB-001: application checks alone cannot protect concurrent writes.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cliente_membresia_activa"
  ON "cliente_membresia" ("id_cliente")
  WHERE "estado" = 'activo';

ALTER TABLE "cliente_membresia"
  ADD CONSTRAINT "cliente_membresia_fechas_validas"
  CHECK ("fecha_fin" >= "fecha_inicio");


ALTER TABLE "cliente_membresia"
  DROP CONSTRAINT IF EXISTS "cliente_membresia_fechas_validas";
DROP INDEX IF EXISTS "idx_cliente_membresia_activa";


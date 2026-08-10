DROP INDEX IF EXISTS "cliente_membresia_fecha_vencimiento_pago_idx";
DROP INDEX IF EXISTS "cliente_membresia_fecha_pago_habilitada_idx";
ALTER TABLE "cliente_membresia"
  DROP COLUMN IF EXISTS "fecha_vencimiento_pago",
  DROP COLUMN IF EXISTS "fecha_pago_habilitada",
  DROP COLUMN IF EXISTS "monto_adeudado";

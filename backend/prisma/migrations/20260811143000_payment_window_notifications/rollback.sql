DROP INDEX IF EXISTS "pago_id_gimnasio_id_cliente_membresia_fecha_pago_id_pago_idx";
DROP INDEX IF EXISTS "email_outbox_event_key_key";
ALTER TABLE "email_outbox" DROP COLUMN IF EXISTS "event_key";

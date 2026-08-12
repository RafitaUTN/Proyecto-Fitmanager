ALTER TABLE "email_outbox" ADD COLUMN IF NOT EXISTS "event_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "email_outbox_event_key_key"
  ON "email_outbox"("event_key");

CREATE INDEX IF NOT EXISTS "pago_id_gimnasio_id_cliente_membresia_fecha_pago_id_pago_idx"
  ON "pago"("id_gimnasio", "id_cliente_membresia", "fecha_pago", "id_pago");

ALTER TABLE "notificacion" ADD COLUMN IF NOT EXISTS "event_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "notificacion_event_key_key" ON "notificacion"("event_key");
ALTER TABLE "notificacion"
  ADD CONSTRAINT "notificacion_destinatario_check"
  CHECK (num_nonnulls("id_cliente", "id_gimnasio", "id_usuario_destino") >= 1);

CREATE TABLE IF NOT EXISTS "email_outbox" (
  "id" BIGSERIAL PRIMARY KEY,
  "destinatario" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "ultimo_error" TEXT,
  "proximo_reintento" TIMESTAMP(3),
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enviado_en" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "email_outbox_estado_proximo_reintento_idx" ON "email_outbox"("estado", "proximo_reintento");
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;
DO $revoke_email_outbox$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE email_outbox FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON SEQUENCE email_outbox_id_seq FROM %I', role_name);
    END IF;
  END LOOP;
END
$revoke_email_outbox$;

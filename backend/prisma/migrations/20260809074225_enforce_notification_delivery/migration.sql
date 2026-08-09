ALTER TABLE "notificacion" ADD COLUMN "event_key" TEXT;
CREATE UNIQUE INDEX "notificacion_event_key_key" ON "notificacion"("event_key");
ALTER TABLE "notificacion"
  ADD CONSTRAINT "notificacion_destinatario_check"
  CHECK (num_nonnulls("id_cliente", "id_gimnasio", "id_usuario_destino") >= 1);

CREATE TABLE "email_outbox" (
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
CREATE INDEX "email_outbox_estado_proximo_reintento_idx" ON "email_outbox"("estado", "proximo_reintento");
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "email_outbox" FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE "email_outbox_id_seq" FROM anon, authenticated, service_role;

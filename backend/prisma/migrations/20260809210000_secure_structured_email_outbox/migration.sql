-- El contenido histórico podía contener tokens de acción en texto plano.
-- Se elimina de forma intencional e irreversible antes de habilitar el outbox estructurado.
ALTER TABLE "email_outbox"
  ADD COLUMN "template_id" TEXT NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "contexto" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "id_token" BIGINT;

ALTER TABLE "email_outbox"
  ALTER COLUMN "html" SET DEFAULT '',
  ALTER COLUMN "texto" SET DEFAULT '';

UPDATE "email_outbox"
SET
  "html" = '',
  "texto" = '',
  "estado" = CASE
    WHEN "estado" IN ('PENDIENTE', 'FALLIDO') THEN 'DESCARTADO'
    ELSE "estado"
  END,
  "ultimo_error" = CASE
    WHEN "estado" IN ('PENDIENTE', 'FALLIDO') THEN 'LEGACY_SECRET_REMOVED'
    ELSE "ultimo_error"
  END,
  "proximo_reintento" = NULL;

ALTER TABLE "email_outbox"
  ADD CONSTRAINT "email_outbox_id_token_fkey"
  FOREIGN KEY ("id_token") REFERENCES "token"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "email_outbox_id_token_idx" ON "email_outbox"("id_token");

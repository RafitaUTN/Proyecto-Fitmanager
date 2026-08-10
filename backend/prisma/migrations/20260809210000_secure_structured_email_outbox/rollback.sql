DROP INDEX IF EXISTS "email_outbox_id_token_idx";
ALTER TABLE "email_outbox" DROP CONSTRAINT IF EXISTS "email_outbox_id_token_fkey";
ALTER TABLE "email_outbox"
  DROP COLUMN IF EXISTS "id_token",
  DROP COLUMN IF EXISTS "contexto",
  DROP COLUMN IF EXISTS "template_id";
ALTER TABLE "email_outbox" ALTER COLUMN "html" DROP DEFAULT;

-- Nota: el HTML/texto histórico eliminado por seguridad no puede recuperarse.

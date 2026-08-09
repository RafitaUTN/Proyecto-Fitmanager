DROP TABLE IF EXISTS "email_outbox";
ALTER TABLE "notificacion" DROP CONSTRAINT IF EXISTS "notificacion_destinatario_check";
DROP INDEX IF EXISTS "notificacion_event_key_key";
ALTER TABLE "notificacion" DROP COLUMN IF EXISTS "event_key";

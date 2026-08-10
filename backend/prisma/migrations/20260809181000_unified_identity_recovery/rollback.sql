DELETE FROM "token" WHERE "id_cliente" IS NULL;
ALTER TABLE "token" DROP CONSTRAINT IF EXISTS "token_un_solo_actor_check";
ALTER TABLE "token" DROP CONSTRAINT IF EXISTS "token_id_usuario_fkey";
DROP INDEX IF EXISTS "token_id_usuario_idx";
ALTER TABLE "token" DROP COLUMN IF EXISTS "id_usuario";
ALTER TABLE "token" ALTER COLUMN "id_cliente" SET NOT NULL;

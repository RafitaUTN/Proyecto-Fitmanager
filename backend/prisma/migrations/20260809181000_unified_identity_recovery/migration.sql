ALTER TABLE "token" ALTER COLUMN "id_cliente" DROP NOT NULL;
ALTER TABLE "token" ADD COLUMN "id_usuario" BIGINT;

ALTER TABLE "token"
ADD CONSTRAINT "token_id_usuario_fkey"
FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "token_id_usuario_idx" ON "token"("id_usuario");

ALTER TABLE "token"
ADD CONSTRAINT "token_un_solo_actor_check"
CHECK (num_nonnulls("id_cliente", "id_usuario") = 1);

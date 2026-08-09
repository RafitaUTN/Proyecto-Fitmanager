-- CreateTable: refresh_token
CREATE TABLE IF NOT EXISTS "refresh_token" (
    "id" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "refresh_token_id_usuario_idx" ON "refresh_token"("id_usuario");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: prevent duplicate active memberships per client
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cliente_membresia_activa" ON "cliente_membresia"("id_cliente", "estado") WHERE "estado" = 'activo';

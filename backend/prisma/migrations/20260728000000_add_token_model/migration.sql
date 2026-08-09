-- Migration: add_token_model
-- Token model for password setup email activation flow

-- Create TipoToken enum
DO $token_enum$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoToken') THEN
        CREATE TYPE "TipoToken" AS ENUM ('ACTIVACION', 'RECUPERACION', 'CAMBIO_CORREO');
    END IF;
END $token_enum$;

-- Create Token table
CREATE TABLE IF NOT EXISTS "token" (
    "id" BIGSERIAL PRIMARY KEY,
    "id_cliente" BIGINT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "usado_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT
);

-- Create unique index on token_hash
CREATE UNIQUE INDEX IF NOT EXISTS "token_token_hash_key" ON "token"("token_hash");

-- Create indexes
CREATE INDEX IF NOT EXISTS "token_id_cliente_idx" ON "token"("id_cliente");
CREATE INDEX IF NOT EXISTS "token_tipo_idx" ON "token"("tipo");
CREATE INDEX IF NOT EXISTS "token_expira_en_idx" ON "token"("expira_en");

-- Add foreign key
DO $token_fk$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'token' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'token_id_cliente_fkey'
    ) THEN
        ALTER TABLE "token" ADD CONSTRAINT "token_id_cliente_fkey"
            FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE CASCADE;
    END IF;
END $token_fk$;

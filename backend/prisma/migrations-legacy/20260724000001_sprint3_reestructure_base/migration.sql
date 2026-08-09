-- Migration: sprint3_reestructure_base
-- Captures db push changes that exist in the database but were never migrated.
-- All objects already exist in the database; this migration is for Prisma's tracking.

-- CreateEnum: No new enums needed

-- CreateTable: horario_entrenador
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "horario_entrenador" (
      "id_horario" BIGSERIAL NOT NULL,
      "id_entrenador" BIGINT NOT NULL,
      "dia_semana" INTEGER NOT NULL,
      "hora_inicio" TEXT NOT NULL,
      "hora_fin" TEXT NOT NULL,
      CONSTRAINT "horario_entrenador_pkey" PRIMARY KEY ("id_horario")
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- AlterTable: usuario ADD COLUMN capacidad_max
DO $$ BEGIN
  ALTER TABLE "usuario" ADD COLUMN "capacidad_max" INTEGER NOT NULL DEFAULT 30;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable: cliente ADD COLUMN id_entrenador
DO $$ BEGIN
  ALTER TABLE "cliente" ADD COLUMN "id_entrenador" BIGINT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable: solicitud_transferencia ADD COLUMN ip_solicitud
DO $$ BEGIN
  ALTER TABLE "solicitud_transferencia" ADD COLUMN "ip_solicitud" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable: solicitud_transferencia ADD COLUMN ip_respuesta
DO $$ BEGIN
  ALTER TABLE "solicitud_transferencia" ADD COLUMN "ip_respuesta" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable: solicitud_auditoria restructure (columns changed via db push)
-- Drop old columns from v3 if they exist
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" DROP COLUMN IF EXISTS "usuario";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" DROP COLUMN IF EXISTS "detalles";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Add new columns for solicitud_auditoria
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" ADD COLUMN "id_usuario" BIGINT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" ADD COLUMN "ip" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" ADD COLUMN "estado_anterior" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" ADD COLUMN "estado_nuevo" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" ADD COLUMN "observaciones" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Fix not-null constraints for estado_nuevo on solicitud_auditoria
DO $$ BEGIN
  ALTER TABLE "solicitud_auditoria" ALTER COLUMN "estado_nuevo" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- AlterTable: cliente_membresia estado default
DO $$ BEGIN
  ALTER TABLE "cliente_membresia" ALTER COLUMN "estado" SET DEFAULT 'activo';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- CreateIndex: horario_entrenador_id_entrenador_idx
CREATE INDEX IF NOT EXISTS "horario_entrenador_id_entrenador_idx" ON "horario_entrenador"("id_entrenador");

-- CreateIndex: cliente_id_entrenador_idx
CREATE INDEX IF NOT EXISTS "cliente_id_entrenador_idx" ON "cliente"("id_entrenador");

-- CreateIndex: idx_cliente_membresia_activa
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cliente_membresia_activa" ON "cliente_membresia"("id_cliente", "estado") WHERE estado = 'activo';

-- CreateIndex: cliente_membresia_id_cliente_estado_idx
CREATE INDEX IF NOT EXISTS "cliente_membresia_id_cliente_estado_idx" ON "cliente_membresia"("id_cliente", "estado");

-- AddForeignKey: horario_entrenador_id_entrenador_fkey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'horario_entrenador_id_entrenador_fkey'
  ) THEN
    ALTER TABLE "horario_entrenador" ADD CONSTRAINT "horario_entrenador_id_entrenador_fkey"
      FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- AddForeignKey: cliente_id_entrenador_fkey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cliente_id_entrenador_fkey'
  ) THEN
    ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_entrenador_fkey"
      FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Migration: sprint3_reestructure
-- Aplica cambios Sprint 3: multi-tenant ejercicios/rutinas, RutinaEntrenador, data migration

-- ============================================================
-- 1. Ejercicio: agregar columnas multi-tenant + metadatos
-- ============================================================
ALTER TABLE "ejercicio" ADD COLUMN "id_gimnasio" BIGINT;
ALTER TABLE "ejercicio" ADD COLUMN "nivel" TEXT NOT NULL DEFAULT 'principiante';
ALTER TABLE "ejercicio" ADD COLUMN "categoria" TEXT;
ALTER TABLE "ejercicio" ADD COLUMN "estado" BOOLEAN NOT NULL DEFAULT true;

-- Asignar ejercicios existentes al primer gimnasio registrado
UPDATE "ejercicio" SET "id_gimnasio" = (SELECT MIN("id_gimnasio") FROM "gimnasio") WHERE "id_gimnasio" IS NULL;
ALTER TABLE "ejercicio" ALTER COLUMN "id_gimnasio" SET NOT NULL;

-- ============================================================
-- 2. Rutina: agregar columnas multi-tenant + creador
-- ============================================================
ALTER TABLE "rutina" ADD COLUMN "id_gimnasio" BIGINT;
ALTER TABLE "rutina" ADD COLUMN "id_usuario_creador" BIGINT;

-- Asignar gimnasio desde el usuario asociado (id_entrenador)
UPDATE "rutina" r
SET "id_gimnasio" = u."id_gimnasio",
    "id_usuario_creador" = r."id_entrenador"
FROM "usuario" u
WHERE u."id_usuario" = r."id_entrenador";

ALTER TABLE "rutina" ALTER COLUMN "id_gimnasio" SET NOT NULL;
ALTER TABLE "rutina" ALTER COLUMN "id_usuario_creador" SET NOT NULL;

-- ============================================================
-- 3. Crear tabla RutinaEntrenador
-- ============================================================
CREATE TABLE IF NOT EXISTS "rutina_entrenador" (
    "id_rutina" BIGINT NOT NULL,
    "id_entrenador" BIGINT NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "rutina_entrenador_pkey" PRIMARY KEY ("id_rutina", "id_entrenador")
);

-- Migrar datos: un registro por cada rutina existente
INSERT INTO "rutina_entrenador" ("id_rutina", "id_entrenador", "estado")
SELECT r."id_rutina", r."id_entrenador", true
FROM "rutina" r
WHERE NOT EXISTS (
    SELECT 1 FROM "rutina_entrenador" re
    WHERE re."id_rutina" = r."id_rutina" AND re."id_entrenador" = r."id_entrenador"
);

-- ============================================================
-- 4. ClienteRutina: agregar id_entrenador_asignador
-- ============================================================
ALTER TABLE "cliente_rutina" ADD COLUMN "id_entrenador_asignador" BIGINT;

-- Backfill con el entrenador asociado a la rutina original
UPDATE "cliente_rutina" cr
SET "id_entrenador_asignador" = r."id_entrenador"
FROM "rutina" r
WHERE r."id_rutina" = cr."id_rutina"
  AND cr."id_entrenador_asignador" IS NULL;

-- ============================================================
-- 5. Eliminar columna id_entrenador de rutina
--    (datos migrados a rutina_entrenador + id_usuario_creador)
-- ============================================================
ALTER TABLE "rutina" DROP CONSTRAINT IF EXISTS "rutina_id_entrenador_fkey";
DROP INDEX IF EXISTS "rutina_id_entrenador_idx";
ALTER TABLE "rutina" DROP COLUMN IF EXISTS "id_entrenador";

-- ============================================================
-- 6. Nuevos índices
-- ============================================================
CREATE INDEX IF NOT EXISTS "ejercicio_id_gimnasio_idx" ON "ejercicio"("id_gimnasio");
CREATE INDEX IF NOT EXISTS "rutina_id_gimnasio_idx" ON "rutina"("id_gimnasio");
CREATE INDEX IF NOT EXISTS "rutina_id_usuario_creador_idx" ON "rutina"("id_usuario_creador");
CREATE INDEX IF NOT EXISTS "rutina_entrenador_id_entrenador_idx" ON "rutina_entrenador"("id_entrenador");
CREATE INDEX IF NOT EXISTS "cliente_rutina_id_rutina_idx" ON "cliente_rutina"("id_rutina");
CREATE INDEX IF NOT EXISTS "cliente_rutina_id_entrenador_asignador_idx" ON "cliente_rutina"("id_entrenador_asignador");

-- ============================================================
-- 7. Nuevas Foreign Keys
-- ============================================================
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_id_gimnasio_fkey"
  FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "rutina" ADD CONSTRAINT "rutina_id_gimnasio_fkey"
  FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "rutina" ADD CONSTRAINT "rutina_id_usuario_creador_fkey"
  FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "rutina_entrenador" ADD CONSTRAINT "rutina_entrenador_id_rutina_fkey"
  FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "rutina_entrenador" ADD CONSTRAINT "rutina_entrenador_id_entrenador_fkey"
  FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "cliente_rutina" ADD CONSTRAINT "cliente_rutina_id_entrenador_asignador_fkey"
  FOREIGN KEY ("id_entrenador_asignador") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================
-- 8. Corregir FKs de migraciones previas (cascade behaviour)
-- ============================================================
ALTER TABLE "notificacion" DROP CONSTRAINT IF EXISTS "notificacion_id_cliente_fkey";
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_cliente_fkey"
  FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "solicitud_auditoria" DROP CONSTRAINT IF EXISTS "solicitud_auditoria_id_solicitud_fkey";
ALTER TABLE "solicitud_auditoria" ADD CONSTRAINT "solicitud_auditoria_id_solicitud_fkey"
  FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_transferencia"("id") ON UPDATE CASCADE ON DELETE CASCADE;

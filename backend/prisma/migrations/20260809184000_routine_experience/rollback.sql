DROP INDEX IF EXISTS "rutina_ejercicio_id_rutina_orden_idx";
ALTER TABLE "rutina_ejercicio" DROP COLUMN IF EXISTS "orden", DROP COLUMN IF EXISTS "notas", DROP COLUMN IF EXISTS "descanso";
ALTER TABLE "rutina" DROP COLUMN IF EXISTS "dificultad", DROP COLUMN IF EXISTS "duracion_minutos", DROP COLUMN IF EXISTS "objetivo";

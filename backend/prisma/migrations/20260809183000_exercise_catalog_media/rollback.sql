DROP INDEX IF EXISTS "ejercicio_id_gimnasio_grupo_muscular_nivel_estado_idx";
ALTER TABLE "ejercicio"
DROP COLUMN IF EXISTS "musculos_secundarios",
DROP COLUMN IF EXISTS "equipo",
DROP COLUMN IF EXISTS "instrucciones",
DROP COLUMN IF EXISTS "tipo_media",
DROP COLUMN IF EXISTS "animacion_url",
DROP COLUMN IF EXISTS "imagen_url";

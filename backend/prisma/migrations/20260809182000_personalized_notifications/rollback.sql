DROP INDEX IF EXISTS "notificacion_id_gimnasio_rol_destino_idx";
ALTER TABLE "notificacion" DROP COLUMN IF EXISTS "accion_url";
ALTER TABLE "notificacion" DROP COLUMN IF EXISTS "rol_destino";

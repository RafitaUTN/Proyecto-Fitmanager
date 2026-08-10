ALTER TABLE "notificacion"
ADD COLUMN "rol_destino" TEXT,
ADD COLUMN "accion_url" TEXT;

CREATE INDEX "notificacion_id_gimnasio_rol_destino_idx"
ON "notificacion"("id_gimnasio", "rol_destino");

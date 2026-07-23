-- CreateIndex
CREATE INDEX "membresia_id_gimnasio_idx" ON "membresia"("id_gimnasio");

-- CreateIndex
CREATE INDEX "notificacion_id_gimnasio_idx" ON "notificacion"("id_gimnasio");

-- CreateIndex
CREATE INDEX "notificacion_tipo_idx" ON "notificacion"("tipo");

-- CreateIndex
CREATE INDEX "notificacion_leida_idx" ON "notificacion"("leida");

-- CreateIndex
CREATE INDEX "notificacion_fecha_envio_idx" ON "notificacion"("fecha_envio");

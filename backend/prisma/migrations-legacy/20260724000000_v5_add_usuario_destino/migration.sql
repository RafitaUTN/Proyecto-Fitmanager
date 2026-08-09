-- AlterTable: Add id_usuario_destino to Notificacion
ALTER TABLE "notificacion" ADD COLUMN "id_usuario_destino" BIGINT;

-- CreateIndex
CREATE INDEX "notificacion_id_usuario_destino_idx" ON "notificacion"("id_usuario_destino");

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_destino_fkey" 
  FOREIGN KEY ("id_usuario_destino") REFERENCES "usuario"("id_usuario") 
  ON DELETE SET NULL ON UPDATE CASCADE;

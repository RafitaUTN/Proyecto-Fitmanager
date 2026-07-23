-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('MEMBRESIA', 'TRANSFERENCIA', 'SISTEMA');

-- CreateTable
CREATE TABLE "solicitud_transferencia" (
    "id" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_gym_origen" BIGINT NOT NULL,
    "id_gym_destino" BIGINT NOT NULL,
    "id_usuario_solicita" BIGINT NOT NULL,
    "id_usuario_respuesta" BIGINT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "observaciones" TEXT,
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(3),

    CONSTRAINT "solicitud_transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_auditoria" (
    "id" BIGSERIAL NOT NULL,
    "id_solicitud" BIGINT NOT NULL,
    "accion" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "detalles" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitud_auditoria_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Notificacion
ALTER TABLE "notificacion" ALTER COLUMN "id_cliente" DROP NOT NULL;
ALTER TABLE "notificacion" ADD COLUMN "id_gimnasio" BIGINT;
ALTER TABLE "notificacion" ADD COLUMN "id_solicitud" BIGINT;
ALTER TABLE "notificacion" ADD COLUMN "tipo" "TipoNotificacion" NOT NULL DEFAULT 'MEMBRESIA';

-- AddForeignKey
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_gym_origen_fkey" FOREIGN KEY ("id_gym_origen") REFERENCES "gimnasio"("id_gimnasio") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_gym_destino_fkey" FOREIGN KEY ("id_gym_destino") REFERENCES "gimnasio"("id_gimnasio") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_usuario_solicita_fkey" FOREIGN KEY ("id_usuario_solicita") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_usuario_respuesta_fkey" FOREIGN KEY ("id_usuario_respuesta") REFERENCES "usuario"("id_usuario") ON UPDATE CASCADE ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "solicitud_auditoria" ADD CONSTRAINT "solicitud_auditoria_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_transferencia"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_transferencia"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "solicitud_transferencia_id_cliente_estado_idx" ON "solicitud_transferencia"("id_cliente", "estado");
CREATE INDEX "solicitud_transferencia_id_gym_origen_estado_idx" ON "solicitud_transferencia"("id_gym_origen", "estado");
CREATE INDEX "solicitud_transferencia_id_gym_destino_estado_idx" ON "solicitud_transferencia"("id_gym_destino", "estado");

-- AlterEnum: Notificacion.tipo uses TipoNotificacion (already handled via ALTER TABLE ADD COLUMN above)

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('MEMBRESIA', 'TRANSFERENCIA', 'SISTEMA');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('ACTIVACION', 'RECUPERACION', 'CAMBIO_CORREO');

-- CreateTable
CREATE TABLE "horario_entrenador" (
    "id_horario" BIGSERIAL NOT NULL,
    "id_entrenador" BIGINT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,

    CONSTRAINT "horario_entrenador_pkey" PRIMARY KEY ("id_horario")
);

-- CreateTable
CREATE TABLE "gimnasio" (
    "id_gimnasio" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gimnasio_pkey" PRIMARY KEY ("id_gimnasio")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "capacidad_max" INTEGER NOT NULL DEFAULT 30,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id_cliente" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "id_entrenador" BIGINT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "contrasena" TEXT,
    "ultimo_acceso" TIMESTAMP(3),

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "membresia" (
    "id_membresia" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracion_dias" INTEGER NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "membresia_pkey" PRIMARY KEY ("id_membresia")
);

-- CreateTable
CREATE TABLE "cliente_membresia" (
    "id_cliente_membresia" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_membresia" BIGINT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',

    CONSTRAINT "cliente_membresia_pkey" PRIMARY KEY ("id_cliente_membresia")
);

-- CreateTable
CREATE TABLE "pago" (
    "id_pago" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_cliente_membresia" BIGINT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo_pago" TEXT NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "asistencia" (
    "id_asistencia" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "fecha_hora_ingreso" TIMESTAMP(3) NOT NULL,
    "fecha_hora_salida" TIMESTAMP(3),

    CONSTRAINT "asistencia_pkey" PRIMARY KEY ("id_asistencia")
);

-- CreateTable
CREATE TABLE "rutina" (
    "id_rutina" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "id_usuario_creador" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rutina_pkey" PRIMARY KEY ("id_rutina")
);

-- CreateTable
CREATE TABLE "ejercicio" (
    "id_ejercicio" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "grupo_muscular" TEXT NOT NULL,
    "descripcion" TEXT,
    "nivel" TEXT NOT NULL DEFAULT 'principiante',
    "categoria" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ejercicio_pkey" PRIMARY KEY ("id_ejercicio")
);

-- CreateTable
CREATE TABLE "rutina_ejercicio" (
    "id_rutina" BIGINT NOT NULL,
    "id_ejercicio" BIGINT NOT NULL,
    "series" INTEGER NOT NULL,
    "repeticiones" INTEGER NOT NULL,
    "peso_sugerido" DECIMAL(6,2),

    CONSTRAINT "rutina_ejercicio_pkey" PRIMARY KEY ("id_rutina","id_ejercicio")
);

-- CreateTable
CREATE TABLE "rutina_entrenador" (
    "id_rutina" BIGINT NOT NULL,
    "id_entrenador" BIGINT NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rutina_entrenador_pkey" PRIMARY KEY ("id_rutina","id_entrenador")
);

-- CreateTable
CREATE TABLE "cliente_rutina" (
    "id_cliente_rutina" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_rutina" BIGINT NOT NULL,
    "id_entrenador_asignador" BIGINT,
    "fecha_asignacion" DATE NOT NULL,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL,

    CONSTRAINT "cliente_rutina_pkey" PRIMARY KEY ("id_cliente_rutina")
);

-- CreateTable
CREATE TABLE "cliente_rutina_ejercicio" (
    "id_cliente_rutina_ejercicio" BIGSERIAL NOT NULL,
    "id_cliente_rutina" BIGINT NOT NULL,
    "id_ejercicio" BIGINT,
    "nombre" TEXT NOT NULL,
    "grupo_muscular" TEXT NOT NULL,
    "series" INTEGER NOT NULL,
    "repeticiones" INTEGER NOT NULL,
    "peso" DECIMAL(6,2),
    "descanso" INTEGER,
    "observaciones" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cliente_rutina_ejercicio_pkey" PRIMARY KEY ("id_cliente_rutina_ejercicio")
);

-- CreateTable
CREATE TABLE "solicitud_transferencia" (
    "id" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_gym_origen" BIGINT NOT NULL,
    "id_gym_destino" BIGINT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(3),
    "id_usuario_solicita" BIGINT NOT NULL,
    "id_usuario_respuesta" BIGINT,
    "observaciones" TEXT,
    "ip_solicitud" TEXT,
    "ip_respuesta" TEXT,

    CONSTRAINT "solicitud_transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_auditoria" (
    "id" BIGSERIAL NOT NULL,
    "id_solicitud" BIGINT NOT NULL,
    "accion" TEXT NOT NULL,
    "id_usuario" BIGINT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "solicitud_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_refresh_token" (
    "id" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token" (
    "id" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT,

    CONSTRAINT "token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id_notificacion" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT,
    "id_gimnasio" BIGINT,
    "id_solicitud" BIGINT,
    "id_usuario_destino" BIGINT,
    "event_key" TEXT,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL DEFAULT 'MEMBRESIA',
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" BIGSERIAL NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,
    "proximo_reintento" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_en" TIMESTAMP(3),

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "horario_entrenador_id_entrenador_idx" ON "horario_entrenador"("id_entrenador");

-- CreateIndex
CREATE UNIQUE INDEX "gimnasio_correo_key" ON "gimnasio"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "usuario_id_gimnasio_idx" ON "usuario"("id_gimnasio");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_cedula_key" ON "cliente"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_correo_key" ON "cliente"("correo");

-- CreateIndex
CREATE INDEX "cliente_id_gimnasio_idx" ON "cliente"("id_gimnasio");

-- CreateIndex
CREATE INDEX "cliente_id_entrenador_idx" ON "cliente"("id_entrenador");

-- CreateIndex
CREATE INDEX "cliente_correo_idx" ON "cliente"("correo");

-- CreateIndex
CREATE INDEX "cliente_cedula_idx" ON "cliente"("cedula");

-- CreateIndex
CREATE INDEX "cliente_fecha_registro_idx" ON "cliente"("fecha_registro");

-- CreateIndex
CREATE INDEX "membresia_id_gimnasio_idx" ON "membresia"("id_gimnasio");

-- CreateIndex
CREATE INDEX "cliente_membresia_id_cliente_idx" ON "cliente_membresia"("id_cliente");

-- CreateIndex
CREATE INDEX "cliente_membresia_id_membresia_idx" ON "cliente_membresia"("id_membresia");

-- CreateIndex
CREATE INDEX "cliente_membresia_estado_idx" ON "cliente_membresia"("estado");

-- CreateIndex
CREATE INDEX "cliente_membresia_id_cliente_estado_idx" ON "cliente_membresia"("id_cliente", "estado");

-- CreateIndex
CREATE INDEX "cliente_membresia_fecha_fin_idx" ON "cliente_membresia"("fecha_fin");

-- CreateIndex
CREATE INDEX "cliente_membresia_fecha_inicio_idx" ON "cliente_membresia"("fecha_inicio");

-- CreateIndex
CREATE INDEX "pago_id_gimnasio_idx" ON "pago"("id_gimnasio");

-- CreateIndex
CREATE INDEX "pago_id_cliente_idx" ON "pago"("id_cliente");

-- CreateIndex
CREATE INDEX "pago_id_cliente_membresia_idx" ON "pago"("id_cliente_membresia");

-- CreateIndex
CREATE INDEX "pago_fecha_pago_idx" ON "pago"("fecha_pago");

-- CreateIndex
CREATE INDEX "pago_estado_idx" ON "pago"("estado");

-- CreateIndex
CREATE INDEX "asistencia_id_gimnasio_idx" ON "asistencia"("id_gimnasio");

-- CreateIndex
CREATE INDEX "asistencia_id_cliente_idx" ON "asistencia"("id_cliente");

-- CreateIndex
CREATE INDEX "asistencia_fecha_hora_ingreso_idx" ON "asistencia"("fecha_hora_ingreso");

-- CreateIndex
CREATE INDEX "asistencia_fecha_hora_salida_idx" ON "asistencia"("fecha_hora_salida");

-- CreateIndex
CREATE INDEX "rutina_id_gimnasio_idx" ON "rutina"("id_gimnasio");

-- CreateIndex
CREATE INDEX "rutina_id_usuario_creador_idx" ON "rutina"("id_usuario_creador");

-- CreateIndex
CREATE INDEX "ejercicio_id_gimnasio_idx" ON "ejercicio"("id_gimnasio");

-- CreateIndex
CREATE INDEX "rutina_entrenador_id_entrenador_idx" ON "rutina_entrenador"("id_entrenador");

-- CreateIndex
CREATE INDEX "cliente_rutina_id_cliente_idx" ON "cliente_rutina"("id_cliente");

-- CreateIndex
CREATE INDEX "cliente_rutina_id_rutina_idx" ON "cliente_rutina"("id_rutina");

-- CreateIndex
CREATE INDEX "cliente_rutina_id_entrenador_asignador_idx" ON "cliente_rutina"("id_entrenador_asignador");

-- CreateIndex
CREATE INDEX "cliente_rutina_estado_idx" ON "cliente_rutina"("estado");

-- CreateIndex
CREATE INDEX "idx_cliente_rutina_estado" ON "cliente_rutina"("id_cliente", "estado");

-- CreateIndex
CREATE INDEX "cliente_rutina_ejercicio_id_cliente_rutina_idx" ON "cliente_rutina_ejercicio"("id_cliente_rutina");

-- CreateIndex
CREATE INDEX "cliente_rutina_ejercicio_id_ejercicio_idx" ON "cliente_rutina_ejercicio"("id_ejercicio");

-- CreateIndex
CREATE INDEX "idx_cliente_rutina_ej_orden" ON "cliente_rutina_ejercicio"("id_cliente_rutina", "orden");

-- CreateIndex
CREATE INDEX "solicitud_transferencia_id_gym_origen_estado_idx" ON "solicitud_transferencia"("id_gym_origen", "estado");

-- CreateIndex
CREATE INDEX "solicitud_transferencia_id_gym_destino_estado_idx" ON "solicitud_transferencia"("id_gym_destino", "estado");

-- CreateIndex
CREATE INDEX "solicitud_transferencia_id_cliente_estado_idx" ON "solicitud_transferencia"("id_cliente", "estado");

-- CreateIndex
CREATE INDEX "solicitud_transferencia_fecha_solicitud_idx" ON "solicitud_transferencia"("fecha_solicitud");

-- CreateIndex
CREATE INDEX "solicitud_auditoria_id_solicitud_idx" ON "solicitud_auditoria"("id_solicitud");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_id_usuario_idx" ON "refresh_token"("id_usuario");

-- CreateIndex
CREATE INDEX "refresh_token_expira_en_idx" ON "refresh_token"("expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_refresh_token_token_hash_key" ON "cliente_refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "cliente_refresh_token_id_cliente_idx" ON "cliente_refresh_token"("id_cliente");

-- CreateIndex
CREATE INDEX "cliente_refresh_token_expira_en_idx" ON "cliente_refresh_token"("expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "token_token_hash_key" ON "token"("token_hash");

-- CreateIndex
CREATE INDEX "token_id_cliente_idx" ON "token"("id_cliente");

-- CreateIndex
CREATE INDEX "token_tipo_idx" ON "token"("tipo");

-- CreateIndex
CREATE INDEX "token_expira_en_idx" ON "token"("expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "notificacion_event_key_key" ON "notificacion"("event_key");

-- CreateIndex
CREATE INDEX "notificacion_id_gimnasio_idx" ON "notificacion"("id_gimnasio");

-- CreateIndex
CREATE INDEX "notificacion_id_usuario_destino_idx" ON "notificacion"("id_usuario_destino");

-- CreateIndex
CREATE INDEX "notificacion_id_cliente_idx" ON "notificacion"("id_cliente");

-- CreateIndex
CREATE INDEX "notificacion_tipo_idx" ON "notificacion"("tipo");

-- CreateIndex
CREATE INDEX "notificacion_leida_idx" ON "notificacion"("leida");

-- CreateIndex
CREATE INDEX "notificacion_fecha_envio_idx" ON "notificacion"("fecha_envio");

-- CreateIndex
CREATE INDEX "email_outbox_estado_proximo_reintento_idx" ON "email_outbox"("estado", "proximo_reintento");

-- AddForeignKey
ALTER TABLE "horario_entrenador" ADD CONSTRAINT "horario_entrenador_id_entrenador_fkey" FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_entrenador_fkey" FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_membresia" ADD CONSTRAINT "cliente_membresia_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_membresia" ADD CONSTRAINT "cliente_membresia_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresia"("id_membresia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_cliente_membresia_fkey" FOREIGN KEY ("id_cliente_membresia") REFERENCES "cliente_membresia"("id_cliente_membresia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina" ADD CONSTRAINT "rutina_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina" ADD CONSTRAINT "rutina_id_usuario_creador_fkey" FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicio" ADD CONSTRAINT "rutina_ejercicio_id_rutina_fkey" FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicio" ADD CONSTRAINT "rutina_ejercicio_id_ejercicio_fkey" FOREIGN KEY ("id_ejercicio") REFERENCES "ejercicio"("id_ejercicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_entrenador" ADD CONSTRAINT "rutina_entrenador_id_rutina_fkey" FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_entrenador" ADD CONSTRAINT "rutina_entrenador_id_entrenador_fkey" FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina" ADD CONSTRAINT "cliente_rutina_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina" ADD CONSTRAINT "cliente_rutina_id_rutina_fkey" FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina" ADD CONSTRAINT "cliente_rutina_id_entrenador_asignador_fkey" FOREIGN KEY ("id_entrenador_asignador") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina_ejercicio" ADD CONSTRAINT "cliente_rutina_ejercicio_id_cliente_rutina_fkey" FOREIGN KEY ("id_cliente_rutina") REFERENCES "cliente_rutina"("id_cliente_rutina") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina_ejercicio" ADD CONSTRAINT "cliente_rutina_ejercicio_id_ejercicio_fkey" FOREIGN KEY ("id_ejercicio") REFERENCES "ejercicio"("id_ejercicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_gym_origen_fkey" FOREIGN KEY ("id_gym_origen") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_gym_destino_fkey" FOREIGN KEY ("id_gym_destino") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_usuario_solicita_fkey" FOREIGN KEY ("id_usuario_solicita") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_transferencia" ADD CONSTRAINT "solicitud_transferencia_id_usuario_respuesta_fkey" FOREIGN KEY ("id_usuario_respuesta") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_auditoria" ADD CONSTRAINT "solicitud_auditoria_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_transferencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_refresh_token" ADD CONSTRAINT "cliente_refresh_token_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token" ADD CONSTRAINT "token_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_transferencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_destino_fkey" FOREIGN KEY ("id_usuario_destino") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

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
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id_cliente" BIGSERIAL NOT NULL,
    "id_gimnasio" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,

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
    "estado" TEXT NOT NULL,

    CONSTRAINT "cliente_membresia_pkey" PRIMARY KEY ("id_cliente_membresia")
);

-- CreateTable
CREATE TABLE "pago" (
    "id_pago" BIGSERIAL NOT NULL,
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
    "id_cliente" BIGINT NOT NULL,
    "fecha_hora_ingreso" TIMESTAMP(3) NOT NULL,
    "fecha_hora_salida" TIMESTAMP(3),

    CONSTRAINT "asistencia_pkey" PRIMARY KEY ("id_asistencia")
);

-- CreateTable
CREATE TABLE "rutina" (
    "id_rutina" BIGSERIAL NOT NULL,
    "id_entrenador" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rutina_pkey" PRIMARY KEY ("id_rutina")
);

-- CreateTable
CREATE TABLE "ejercicio" (
    "id_ejercicio" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "grupo_muscular" TEXT NOT NULL,
    "descripcion" TEXT,

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
CREATE TABLE "cliente_rutina" (
    "id_cliente_rutina" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_rutina" BIGINT NOT NULL,
    "fecha_asignacion" DATE NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "cliente_rutina_pkey" PRIMARY KEY ("id_cliente_rutina")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id_notificacion" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

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
CREATE INDEX "cliente_correo_idx" ON "cliente"("correo");

-- CreateIndex
CREATE INDEX "cliente_cedula_idx" ON "cliente"("cedula");

-- CreateIndex
CREATE INDEX "cliente_membresia_id_cliente_idx" ON "cliente_membresia"("id_cliente");

-- CreateIndex
CREATE INDEX "cliente_membresia_estado_idx" ON "cliente_membresia"("estado");

-- CreateIndex
CREATE INDEX "pago_id_cliente_idx" ON "pago"("id_cliente");

-- CreateIndex
CREATE INDEX "pago_fecha_pago_idx" ON "pago"("fecha_pago");

-- CreateIndex
CREATE INDEX "asistencia_id_cliente_idx" ON "asistencia"("id_cliente");

-- CreateIndex
CREATE INDEX "asistencia_fecha_hora_ingreso_idx" ON "asistencia"("fecha_hora_ingreso");

-- CreateIndex
CREATE INDEX "rutina_id_entrenador_idx" ON "rutina"("id_entrenador");

-- CreateIndex
CREATE INDEX "cliente_rutina_id_cliente_idx" ON "cliente_rutina"("id_cliente");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_membresia" ADD CONSTRAINT "cliente_membresia_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_membresia" ADD CONSTRAINT "cliente_membresia_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresia"("id_membresia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_cliente_membresia_fkey" FOREIGN KEY ("id_cliente_membresia") REFERENCES "cliente_membresia"("id_cliente_membresia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina" ADD CONSTRAINT "rutina_id_entrenador_fkey" FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicio" ADD CONSTRAINT "rutina_ejercicio_id_rutina_fkey" FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicio" ADD CONSTRAINT "rutina_ejercicio_id_ejercicio_fkey" FOREIGN KEY ("id_ejercicio") REFERENCES "ejercicio"("id_ejercicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina" ADD CONSTRAINT "cliente_rutina_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_rutina" ADD CONSTRAINT "cliente_rutina_id_rutina_fkey" FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

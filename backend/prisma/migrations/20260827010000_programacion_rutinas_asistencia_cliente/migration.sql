-- Evolución de rutinas hacia sesiones programadas sin romper asignaciones flexibles existentes.
-- La aplicación sigue accediendo mediante backend/Prisma; estas tablas no se exponen directamente al frontend.

DO $$ BEGIN
  CREATE TYPE "NivelCliente" AS ENUM ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'EXPERTO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NivelSesionRutina" AS ENUM ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'EXPERTO', 'TODOS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoSesionRutina" AS ENUM ('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrigenAsistencia" AS ENUM ('STAFF', 'CLIENTE', 'AUTOMATICA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "cliente"
  ADD COLUMN IF NOT EXISTS "nivel" "NivelCliente" NOT NULL DEFAULT 'PRINCIPIANTE';

ALTER TABLE "asistencia"
  ADD COLUMN IF NOT EXISTS "origen" "OrigenAsistencia" NOT NULL DEFAULT 'STAFF';

CREATE TABLE IF NOT EXISTS "programacion_rutina" (
  "id_programacion" BIGSERIAL NOT NULL,
  "id_gimnasio" BIGINT NOT NULL,
  "id_rutina" BIGINT NOT NULL,
  "id_entrenador" BIGINT NOT NULL,
  "fecha" DATE NOT NULL,
  "hora_inicio" TIMESTAMP(3) NOT NULL,
  "hora_fin" TIMESTAMP(3) NOT NULL,
  "estado" "EstadoSesionRutina" NOT NULL DEFAULT 'PROGRAMADA',
  "capacidad" INTEGER,
  "notas" TEXT,
  "cancelada_en" TIMESTAMP(3),
  "cancelada_por" BIGINT,
  "motivo_cancelacion" TEXT,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "programacion_rutina_pkey" PRIMARY KEY ("id_programacion"),
  CONSTRAINT "programacion_rutina_rango_valido_chk" CHECK ("hora_fin" > "hora_inicio"),
  CONSTRAINT "programacion_rutina_capacidad_valida_chk" CHECK ("capacidad" IS NULL OR "capacidad" > 0)
);

CREATE TABLE IF NOT EXISTS "programacion_rutina_cliente" (
  "id_programacion_cliente" BIGSERIAL NOT NULL,
  "id_programacion" BIGINT NOT NULL,
  "id_cliente" BIGINT NOT NULL,
  "completada" BOOLEAN NOT NULL DEFAULT false,
  "completada_en" TIMESTAMP(3),
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "programacion_rutina_cliente_pkey" PRIMARY KEY ("id_programacion_cliente")
);

CREATE TABLE IF NOT EXISTS "programacion_rutina_nivel" (
  "id_programacion" BIGINT NOT NULL,
  "nivel" "NivelSesionRutina" NOT NULL,

  CONSTRAINT "programacion_rutina_nivel_pkey" PRIMARY KEY ("id_programacion", "nivel")
);

DO $$ BEGIN
  ALTER TABLE "programacion_rutina"
    ADD CONSTRAINT "programacion_rutina_id_gimnasio_fkey"
    FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "programacion_rutina"
    ADD CONSTRAINT "programacion_rutina_id_rutina_fkey"
    FOREIGN KEY ("id_rutina") REFERENCES "rutina"("id_rutina") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "programacion_rutina"
    ADD CONSTRAINT "programacion_rutina_id_entrenador_fkey"
    FOREIGN KEY ("id_entrenador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "programacion_rutina"
    ADD CONSTRAINT "programacion_rutina_cancelada_por_fkey"
    FOREIGN KEY ("cancelada_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "programacion_rutina_cliente"
    ADD CONSTRAINT "programacion_rutina_cliente_id_programacion_fkey"
    FOREIGN KEY ("id_programacion") REFERENCES "programacion_rutina"("id_programacion") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "programacion_rutina_cliente"
    ADD CONSTRAINT "programacion_rutina_cliente_id_cliente_fkey"
    FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "programacion_rutina_nivel"
    ADD CONSTRAINT "programacion_rutina_nivel_id_programacion_fkey"
    FOREIGN KEY ("id_programacion") REFERENCES "programacion_rutina"("id_programacion") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "programacion_rutina_cliente_id_programacion_id_cliente_key"
  ON "programacion_rutina_cliente" ("id_programacion", "id_cliente");

CREATE INDEX IF NOT EXISTS "cliente_id_gimnasio_nivel_idx" ON "cliente" ("id_gimnasio", "nivel");
CREATE INDEX IF NOT EXISTS "asistencia_id_gimnasio_fecha_hora_salida_idx" ON "asistencia" ("id_gimnasio", "fecha_hora_salida");
CREATE INDEX IF NOT EXISTS "programacion_rutina_id_gimnasio_fecha_idx" ON "programacion_rutina" ("id_gimnasio", "fecha");
CREATE INDEX IF NOT EXISTS "programacion_rutina_id_gimnasio_id_entrenador_fecha_idx" ON "programacion_rutina" ("id_gimnasio", "id_entrenador", "fecha");
CREATE INDEX IF NOT EXISTS "programacion_rutina_id_gimnasio_estado_fecha_idx" ON "programacion_rutina" ("id_gimnasio", "estado", "fecha");
CREATE INDEX IF NOT EXISTS "programacion_rutina_id_rutina_idx" ON "programacion_rutina" ("id_rutina");
CREATE INDEX IF NOT EXISTS "programacion_rutina_cliente_id_cliente_idx" ON "programacion_rutina_cliente" ("id_cliente");
CREATE INDEX IF NOT EXISTS "programacion_rutina_cliente_id_cliente_completada_idx" ON "programacion_rutina_cliente" ("id_cliente", "completada");
CREATE INDEX IF NOT EXISTS "programacion_rutina_nivel_nivel_idx" ON "programacion_rutina_nivel" ("nivel");

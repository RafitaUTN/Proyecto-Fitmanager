ALTER TABLE "ejercicio"
ADD COLUMN "imagen_url" TEXT,
ADD COLUMN "animacion_url" TEXT,
ADD COLUMN "tipo_media" TEXT,
ADD COLUMN "instrucciones" TEXT,
ADD COLUMN "equipo" TEXT,
ADD COLUMN "musculos_secundarios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "ejercicio_id_gimnasio_grupo_muscular_nivel_estado_idx"
ON "ejercicio"("id_gimnasio", "grupo_muscular", "nivel", "estado");

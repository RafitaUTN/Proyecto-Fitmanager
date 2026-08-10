ALTER TABLE "rutina"
ADD COLUMN "objetivo" TEXT,
ADD COLUMN "duracion_minutos" INTEGER,
ADD COLUMN "dificultad" TEXT;

ALTER TABLE "rutina_ejercicio"
ADD COLUMN "descanso" INTEGER,
ADD COLUMN "notas" TEXT,
ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT "id_rutina", "id_ejercicio",
         ROW_NUMBER() OVER (PARTITION BY "id_rutina" ORDER BY "id_ejercicio") AS position
  FROM "rutina_ejercicio"
)
UPDATE "rutina_ejercicio" re
SET "orden" = ordered.position
FROM ordered
WHERE re."id_rutina" = ordered."id_rutina" AND re."id_ejercicio" = ordered."id_ejercicio";

CREATE INDEX "rutina_ejercicio_id_rutina_orden_idx" ON "rutina_ejercicio"("id_rutina", "orden");

-- Migration: sprint3_snapshot
-- ClienteRutinaEjercicio for snapshot-based client routines

-- 1. Add columns to cliente_rutina
ALTER TABLE "cliente_rutina" ADD COLUMN IF NOT EXISTS "fecha_inicio" DATE;
ALTER TABLE "cliente_rutina" ADD COLUMN IF NOT EXISTS "fecha_fin" DATE;
ALTER TABLE "cliente_rutina" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

-- 2. Create cliente_rutina_ejercicio table
CREATE TABLE IF NOT EXISTS "cliente_rutina_ejercicio" (
    "id_cliente_rutina_ejercicio" BIGSERIAL PRIMARY KEY,
    "id_cliente_rutina" BIGINT NOT NULL,
    "id_ejercicio" BIGINT,
    "nombre" VARCHAR(255) NOT NULL,
    "grupo_muscular" VARCHAR(100) NOT NULL,
    "series" INTEGER NOT NULL,
    "repeticiones" INTEGER NOT NULL,
    "peso" DECIMAL(6,2),
    "descanso" INTEGER,
    "observaciones" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" BOOLEAN NOT NULL DEFAULT true
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS "cliente_rutina_ejercicio_id_cliente_rutina_idx" 
    ON "cliente_rutina_ejercicio"("id_cliente_rutina");
CREATE INDEX IF NOT EXISTS "cliente_rutina_ejercicio_id_ejercicio_idx" 
    ON "cliente_rutina_ejercicio"("id_ejercicio");

-- 4. Add foreign keys
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cliente_rutina_ejercicio' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'id_cliente_rutina'
    ) THEN
        ALTER TABLE "cliente_rutina_ejercicio" 
            ADD CONSTRAINT "cliente_rutina_ejercicio_id_cliente_rutina_fkey"
            FOREIGN KEY ("id_cliente_rutina") 
            REFERENCES "cliente_rutina"("id_cliente_rutina") 
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cliente_rutina_ejercicio' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'id_ejercicio'
    ) THEN
        ALTER TABLE "cliente_rutina_ejercicio" 
            ADD CONSTRAINT "cliente_rutina_ejercicio_id_ejercicio_fkey"
            FOREIGN KEY ("id_ejercicio") 
            REFERENCES "ejercicio"("id_ejercicio") 
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

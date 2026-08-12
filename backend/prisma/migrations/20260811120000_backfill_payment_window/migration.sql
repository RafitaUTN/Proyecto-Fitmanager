-- Backfill: abre la ventana de pago 5 días antes del vencimiento.
-- Corrige registros creados antes de que la regla se aplicara al crear/asignar membresías.
UPDATE "cliente_membresia"
SET "fecha_pago_habilitada" = GREATEST("fecha_inicio", "fecha_fin" - INTERVAL '5 days')
WHERE "fecha_pago_habilitada" IS DISTINCT FROM GREATEST("fecha_inicio", "fecha_fin" - INTERVAL '5 days');

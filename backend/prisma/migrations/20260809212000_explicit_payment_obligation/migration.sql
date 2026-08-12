ALTER TABLE "cliente_membresia"
  ADD COLUMN "monto_adeudado" DECIMAL(10,2),
  ADD COLUMN "fecha_pago_habilitada" DATE,
  ADD COLUMN "fecha_vencimiento_pago" DATE;

-- Regla canónica: la obligación del período se vuelve cobrable y vence al
-- finalizar el período de servicio adquirido. El precio queda congelado.
UPDATE "cliente_membresia" cm
SET
  "monto_adeudado" = m."precio",
  "fecha_pago_habilitada" = cm."fecha_fin",
  "fecha_vencimiento_pago" = cm."fecha_fin"
FROM "membresia" m
WHERE m."id_membresia" = cm."id_membresia";

ALTER TABLE "cliente_membresia"
  ALTER COLUMN "monto_adeudado" SET NOT NULL,
  ALTER COLUMN "fecha_pago_habilitada" SET NOT NULL,
  ALTER COLUMN "fecha_vencimiento_pago" SET NOT NULL;

CREATE INDEX "cliente_membresia_fecha_pago_habilitada_idx" ON "cliente_membresia"("fecha_pago_habilitada");
CREATE INDEX "cliente_membresia_fecha_vencimiento_pago_idx" ON "cliente_membresia"("fecha_vencimiento_pago");

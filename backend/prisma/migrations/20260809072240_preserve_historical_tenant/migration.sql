-- Snapshot tenant ownership on historical facts. This prevents a later client
-- transfer from moving payments and attendance between gyms retroactively.
ALTER TABLE "pago" ADD COLUMN "id_gimnasio" BIGINT;
UPDATE "pago" p
SET "id_gimnasio" = c."id_gimnasio"
FROM "cliente" c
WHERE c."id_cliente" = p."id_cliente";
ALTER TABLE "pago" ALTER COLUMN "id_gimnasio" SET NOT NULL;
ALTER TABLE "pago"
  ADD CONSTRAINT "pago_id_gimnasio_fkey"
  FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "pago_id_gimnasio_idx" ON "pago"("id_gimnasio");

ALTER TABLE "asistencia" ADD COLUMN "id_gimnasio" BIGINT;
UPDATE "asistencia" a
SET "id_gimnasio" = c."id_gimnasio"
FROM "cliente" c
WHERE c."id_cliente" = a."id_cliente";
ALTER TABLE "asistencia" ALTER COLUMN "id_gimnasio" SET NOT NULL;
ALTER TABLE "asistencia"
  ADD CONSTRAINT "asistencia_id_gimnasio_fkey"
  FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "asistencia_id_gimnasio_idx" ON "asistencia"("id_gimnasio");

-- Race-proof state invariants. Application checks remain for friendly errors.
CREATE UNIQUE INDEX "idx_asistencia_cliente_abierta"
  ON "asistencia"("id_cliente")
  WHERE "fecha_hora_salida" IS NULL;

CREATE UNIQUE INDEX "idx_transferencia_cliente_pendiente"
  ON "solicitud_transferencia"("id_cliente")
  WHERE "estado" = 'PENDIENTE';

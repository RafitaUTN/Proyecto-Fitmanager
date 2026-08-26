CREATE TABLE "obligacion_pago" (
  "id_obligacion_pago" BIGSERIAL PRIMARY KEY,
  "id_gimnasio" BIGINT NOT NULL,
  "id_cliente" BIGINT NOT NULL,
  "id_cliente_membresia" BIGINT NOT NULL,
  "periodo_inicio" DATE NOT NULL,
  "periodo_fin" DATE NOT NULL,
  "monto_total" DECIMAL(10, 2) NOT NULL,
  "fecha_pago_habilitada" DATE NOT NULL,
  "fecha_vencimiento" DATE NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "tipo" TEXT NOT NULL DEFAULT 'PERIODO',
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "pago"
  ADD COLUMN "id_obligacion_pago" BIGINT,
  ADD COLUMN "referencia_pago" TEXT;

INSERT INTO "obligacion_pago" (
  "id_gimnasio",
  "id_cliente",
  "id_cliente_membresia",
  "periodo_inicio",
  "periodo_fin",
  "monto_total",
  "fecha_pago_habilitada",
  "fecha_vencimiento",
  "estado",
  "tipo"
)
SELECT
  c."id_gimnasio",
  cm."id_cliente",
  cm."id_cliente_membresia",
  cm."fecha_inicio",
  cm."fecha_fin",
  cm."monto_adeudado",
  cm."fecha_pago_habilitada",
  cm."fecha_vencimiento_pago",
  CASE
    WHEN COALESCE(SUM(CASE WHEN p."estado" IN ('completado', 'confirmado') THEN p."monto" ELSE 0 END), 0) >= cm."monto_adeudado" THEN 'COMPLETADA'
    WHEN COALESCE(SUM(CASE WHEN p."estado" IN ('completado', 'confirmado') THEN p."monto" ELSE 0 END), 0) > 0 THEN 'PARCIAL'
    WHEN cm."fecha_vencimiento_pago" < CURRENT_DATE THEN 'VENCIDA'
    ELSE 'PENDIENTE'
  END,
  'PERIODO'
FROM "cliente_membresia" cm
INNER JOIN "cliente" c ON c."id_cliente" = cm."id_cliente"
LEFT JOIN "pago" p ON p."id_cliente_membresia" = cm."id_cliente_membresia"
GROUP BY
  c."id_gimnasio",
  cm."id_cliente",
  cm."id_cliente_membresia",
  cm."fecha_inicio",
  cm."fecha_fin",
  cm."monto_adeudado",
  cm."fecha_pago_habilitada",
  cm."fecha_vencimiento_pago";

UPDATE "pago" p
SET "id_obligacion_pago" = op."id_obligacion_pago"
FROM "obligacion_pago" op
WHERE op."id_cliente_membresia" = p."id_cliente_membresia"
  AND op."tipo" = 'PERIODO'
  AND p."fecha_pago"::date BETWEEN op."periodo_inicio" AND (op."periodo_fin" + INTERVAL '1 day')::date;

UPDATE "pago" p
SET "id_obligacion_pago" = op."id_obligacion_pago"
FROM "obligacion_pago" op
WHERE p."id_obligacion_pago" IS NULL
  AND op."id_cliente_membresia" = p."id_cliente_membresia"
  AND op."tipo" = 'PERIODO';

CREATE UNIQUE INDEX "obligacion_pago_id_cliente_membresia_periodo_inicio_periodo_fin_tipo_key"
  ON "obligacion_pago" ("id_cliente_membresia", "periodo_inicio", "periodo_fin", "tipo");

CREATE INDEX "obligacion_pago_id_gimnasio_idx" ON "obligacion_pago" ("id_gimnasio");
CREATE INDEX "obligacion_pago_id_cliente_idx" ON "obligacion_pago" ("id_cliente");
CREATE INDEX "obligacion_pago_id_cliente_membresia_idx" ON "obligacion_pago" ("id_cliente_membresia");
CREATE INDEX "obligacion_pago_estado_idx" ON "obligacion_pago" ("estado");
CREATE INDEX "obligacion_pago_fecha_pago_habilitada_idx" ON "obligacion_pago" ("fecha_pago_habilitada");
CREATE INDEX "obligacion_pago_fecha_vencimiento_idx" ON "obligacion_pago" ("fecha_vencimiento");
CREATE INDEX "pago_id_obligacion_pago_idx" ON "pago" ("id_obligacion_pago");
CREATE INDEX "pago_id_gimnasio_metodo_pago_referencia_pago_idx" ON "pago" ("id_gimnasio", "metodo_pago", "referencia_pago");

ALTER TABLE "obligacion_pago"
  ADD CONSTRAINT "obligacion_pago_id_gimnasio_fkey" FOREIGN KEY ("id_gimnasio") REFERENCES "gimnasio"("id_gimnasio") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "obligacion_pago_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "obligacion_pago_id_cliente_membresia_fkey" FOREIGN KEY ("id_cliente_membresia") REFERENCES "cliente_membresia"("id_cliente_membresia") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pago"
  ADD CONSTRAINT "pago_id_obligacion_pago_fkey" FOREIGN KEY ("id_obligacion_pago") REFERENCES "obligacion_pago"("id_obligacion_pago") ON DELETE SET NULL ON UPDATE CASCADE;

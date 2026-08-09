ALTER TABLE "cliente"
  ADD COLUMN IF NOT EXISTS "contrasena_temporal" BOOLEAN NOT NULL DEFAULT false;

DO $token_timestamps$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'token'
      AND column_name = 'expira_en' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "token" ALTER COLUMN "expira_en" TYPE TIMESTAMPTZ(3) USING "expira_en" AT TIME ZONE 'UTC';
    ALTER TABLE "token" ALTER COLUMN "usado_en" TYPE TIMESTAMPTZ(3) USING "usado_en" AT TIME ZONE 'UTC';
    ALTER TABLE "token" ALTER COLUMN "creado_en" TYPE TIMESTAMPTZ(3) USING "creado_en" AT TIME ZONE 'UTC';
  END IF;
END
$token_timestamps$;

ALTER TABLE "token" DROP CONSTRAINT IF EXISTS "token_id_cliente_fkey";
ALTER TABLE "token" ADD CONSTRAINT "token_id_cliente_fkey"
  FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "asistencia_fecha_hora_salida_idx" ON "asistencia"("fecha_hora_salida");
CREATE INDEX IF NOT EXISTS "cliente_fecha_registro_idx" ON "cliente"("fecha_registro");
CREATE INDEX IF NOT EXISTS "cliente_membresia_fecha_fin_idx" ON "cliente_membresia"("fecha_fin");
CREATE INDEX IF NOT EXISTS "cliente_membresia_fecha_inicio_idx" ON "cliente_membresia"("fecha_inicio");
CREATE INDEX IF NOT EXISTS "cliente_membresia_id_membresia_idx" ON "cliente_membresia"("id_membresia");
CREATE INDEX IF NOT EXISTS "cliente_rutina_estado_idx" ON "cliente_rutina"("estado");
CREATE INDEX IF NOT EXISTS "idx_cliente_rutina_estado" ON "cliente_rutina"("id_cliente", "estado");
CREATE INDEX IF NOT EXISTS "idx_cliente_rutina_ej_orden" ON "cliente_rutina_ejercicio"("id_cliente_rutina", "orden");
CREATE INDEX IF NOT EXISTS "notificacion_id_cliente_idx" ON "notificacion"("id_cliente");
CREATE INDEX IF NOT EXISTS "pago_estado_idx" ON "pago"("estado");
CREATE INDEX IF NOT EXISTS "pago_id_cliente_membresia_idx" ON "pago"("id_cliente_membresia");
CREATE INDEX IF NOT EXISTS "refresh_token_expira_en_idx" ON "refresh_token"("expira_en");
CREATE INDEX IF NOT EXISTS "solicitud_auditoria_id_solicitud_idx" ON "solicitud_auditoria"("id_solicitud");
CREATE INDEX IF NOT EXISTS "solicitud_transferencia_fecha_solicitud_idx" ON "solicitud_transferencia"("fecha_solicitud");

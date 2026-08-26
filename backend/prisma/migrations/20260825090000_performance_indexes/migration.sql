-- Índices compuestos para consultas críticas bajo carga.
-- Alineados con filtros multi-tenant, paginación por fecha y contadores.

CREATE INDEX IF NOT EXISTS "cliente_id_gimnasio_estado_fecha_registro_idx"
  ON "cliente" ("id_gimnasio", "estado", "fecha_registro");

CREATE INDEX IF NOT EXISTS "pago_id_gimnasio_fecha_pago_idx"
  ON "pago" ("id_gimnasio", "fecha_pago");

CREATE INDEX IF NOT EXISTS "pago_id_gimnasio_estado_fecha_pago_idx"
  ON "pago" ("id_gimnasio", "estado", "fecha_pago");

CREATE INDEX IF NOT EXISTS "asistencia_id_gimnasio_fecha_hora_ingreso_idx"
  ON "asistencia" ("id_gimnasio", "fecha_hora_ingreso");

CREATE INDEX IF NOT EXISTS "asistencia_id_gimnasio_id_cliente_fecha_hora_ingreso_idx"
  ON "asistencia" ("id_gimnasio", "id_cliente", "fecha_hora_ingreso");

CREATE INDEX IF NOT EXISTS "notificacion_id_gimnasio_fecha_envio_idx"
  ON "notificacion" ("id_gimnasio", "fecha_envio");

CREATE INDEX IF NOT EXISTS "notificacion_id_gimnasio_rol_destino_fecha_envio_idx"
  ON "notificacion" ("id_gimnasio", "rol_destino", "fecha_envio");

CREATE INDEX IF NOT EXISTS "notificacion_id_usuario_destino_leida_fecha_envio_idx"
  ON "notificacion" ("id_usuario_destino", "leida", "fecha_envio");

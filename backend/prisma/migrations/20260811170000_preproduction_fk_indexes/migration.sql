CREATE INDEX IF NOT EXISTS "rutina_ejercicio_id_ejercicio_idx"
  ON "rutina_ejercicio"("id_ejercicio");

CREATE INDEX IF NOT EXISTS "solicitud_transferencia_id_usuario_solicita_idx"
  ON "solicitud_transferencia"("id_usuario_solicita");

CREATE INDEX IF NOT EXISTS "solicitud_transferencia_id_usuario_respuesta_idx"
  ON "solicitud_transferencia"("id_usuario_respuesta");

CREATE INDEX IF NOT EXISTS "notificacion_id_solicitud_idx"
  ON "notificacion"("id_solicitud");

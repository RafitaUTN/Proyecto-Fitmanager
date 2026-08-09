-- Non-destructive rollback: keep the pre-existing production column and token
-- timestamp types. Remove only indexes introduced by this reconciliation.
DROP INDEX IF EXISTS "asistencia_fecha_hora_salida_idx";
DROP INDEX IF EXISTS "cliente_fecha_registro_idx";
DROP INDEX IF EXISTS "cliente_membresia_fecha_fin_idx";
DROP INDEX IF EXISTS "cliente_membresia_fecha_inicio_idx";
DROP INDEX IF EXISTS "cliente_membresia_id_membresia_idx";
DROP INDEX IF EXISTS "cliente_rutina_estado_idx";
DROP INDEX IF EXISTS "idx_cliente_rutina_estado";
DROP INDEX IF EXISTS "idx_cliente_rutina_ej_orden";
DROP INDEX IF EXISTS "notificacion_id_cliente_idx";
DROP INDEX IF EXISTS "pago_estado_idx";
DROP INDEX IF EXISTS "pago_id_cliente_membresia_idx";
DROP INDEX IF EXISTS "refresh_token_expira_en_idx";
DROP INDEX IF EXISTS "solicitud_auditoria_id_solicitud_idx";
DROP INDEX IF EXISTS "solicitud_transferencia_fecha_solicitud_idx";

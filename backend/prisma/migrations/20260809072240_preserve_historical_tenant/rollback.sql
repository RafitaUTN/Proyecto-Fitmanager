-- Emergency rollback. Dropping the snapshot columns loses tenant attribution
-- written after this migration; export those values before executing it.
DROP INDEX IF EXISTS "idx_transferencia_cliente_pendiente";
DROP INDEX IF EXISTS "idx_asistencia_cliente_abierta";
DROP INDEX IF EXISTS "asistencia_id_gimnasio_idx";
ALTER TABLE "asistencia" DROP CONSTRAINT IF EXISTS "asistencia_id_gimnasio_fkey";
ALTER TABLE "asistencia" DROP COLUMN IF EXISTS "id_gimnasio";
DROP INDEX IF EXISTS "pago_id_gimnasio_idx";
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_gimnasio_fkey";
ALTER TABLE "pago" DROP COLUMN IF EXISTS "id_gimnasio";

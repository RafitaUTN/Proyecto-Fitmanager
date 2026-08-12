-- Race-proof duplicate routine assignment. The application check
-- (buscarAsignacionActiva) remains for friendly errors, but concurrent
-- writes must not be able to create two active assignments of the same
-- routine for the same client.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cliente_rutina_activa"
  ON "cliente_rutina" ("id_cliente", "id_rutina")
  WHERE "estado" = 'activa';

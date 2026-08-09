CREATE TABLE IF NOT EXISTS "cliente_refresh_token" (
  "id" BIGSERIAL PRIMARY KEY,
  "id_cliente" BIGINT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expira_en" TIMESTAMP(3) NOT NULL,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cliente_refresh_token_id_cliente_fkey"
    FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cliente_refresh_token_token_hash_key" ON "cliente_refresh_token"("token_hash");
CREATE INDEX IF NOT EXISTS "cliente_refresh_token_id_cliente_idx" ON "cliente_refresh_token"("id_cliente");
CREATE INDEX IF NOT EXISTS "cliente_refresh_token_expira_en_idx" ON "cliente_refresh_token"("expira_en");

ALTER TABLE "cliente_refresh_token" ENABLE ROW LEVEL SECURITY;
DO $revoke_client_sessions$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE cliente_refresh_token FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON SEQUENCE cliente_refresh_token_id_seq FROM %I', role_name);
    END IF;
  END LOOP;
END
$revoke_client_sessions$;

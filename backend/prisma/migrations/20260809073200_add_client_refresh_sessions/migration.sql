CREATE TABLE "cliente_refresh_token" (
  "id" BIGSERIAL PRIMARY KEY,
  "id_cliente" BIGINT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expira_en" TIMESTAMP(3) NOT NULL,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cliente_refresh_token_id_cliente_fkey"
    FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "cliente_refresh_token_token_hash_key" ON "cliente_refresh_token"("token_hash");
CREATE INDEX "cliente_refresh_token_id_cliente_idx" ON "cliente_refresh_token"("id_cliente");
CREATE INDEX "cliente_refresh_token_expira_en_idx" ON "cliente_refresh_token"("expira_en");

ALTER TABLE "cliente_refresh_token" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "cliente_refresh_token" FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE "cliente_refresh_token_id_seq" FROM anon, authenticated, service_role;

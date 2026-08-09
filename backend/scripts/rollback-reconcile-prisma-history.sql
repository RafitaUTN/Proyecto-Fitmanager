-- Roll back metadata reconciliation only. Schema and business data are intact.
BEGIN;
DELETE FROM _prisma_migrations WHERE migration_name IN (
  '20260715000000_baseline',
  '20260809070459_secure_data_plane',
  '20260809071744_enforce_membership_invariants',
  '20260809072240_preserve_historical_tenant',
  '20260809073200_add_client_refresh_sessions',
  '20260809074225_enforce_notification_delivery',
  '20260809075414_reconcile_schema_drift'
);
UPDATE _prisma_migrations
SET checksum = 'hOt2xHsWWVeR2kQUMgn0zqtwORicrX+qQW++6/vLGi0='
WHERE migration_name = '20260728000000_add_token_model'
  AND checksum = '83e6f5796c496e02bf180ae881fb7d9fd8ba55c06e7cca1740109443883341a4';
COMMIT;

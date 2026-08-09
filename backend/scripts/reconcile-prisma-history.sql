-- Production-only metadata reconciliation after validating the baseline on an
-- empty PostgreSQL 17 database. This does not execute schema DDL or mutate
-- business data; it records DDL already applied through Supabase migrations.
BEGIN;

DO $checksum$
BEGIN
  UPDATE _prisma_migrations
  SET checksum = '83e6f5796c496e02bf180ae881fb7d9fd8ba55c06e7cca1740109443883341a4'
  WHERE migration_name = '20260728000000_add_token_model'
    AND checksum = 'hOt2xHsWWVeR2kQUMgn0zqtwORicrX+qQW++6/vLGi0=';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token migration metadata was not in the expected pre-remediation state';
  END IF;
END
$checksum$;

WITH expected(migration_name, checksum) AS (VALUES
  ('20260715000000_baseline', 'cdbf84149b840512d359593ba48ce793d62570f0e3c96aedbf508c8dbccf5c1e'),
  ('20260809070459_secure_data_plane', '77fd21afc2d898206b42f8793067977e0470a701b052d02603f14060a14a8a3b'),
  ('20260809071744_enforce_membership_invariants', 'ab3821ec66f878254d71ada53dd2ca9989da54543492b6a4ffef3067ae885a27'),
  ('20260809072240_preserve_historical_tenant', '50d0f1b0ad74914da25828bafd12df81044a4b071b8d7ede29acc476aaab3837'),
  ('20260809073200_add_client_refresh_sessions', '909b75e33f86f286a9c5c4189efcf3b295139386225e6160eb5da8d754c2cebb'),
  ('20260809074225_enforce_notification_delivery', '4fb29e4352e946ebc7358526b0d7ebec1077c395fbca8a7f24344fee90907a6a'),
  ('20260809075414_reconcile_schema_drift', '46a40186089fee9ffb33f3f3604afc75edcf4a448425b0885a5612255d920f3d')
)
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
SELECT md5(expected.migration_name)::uuid::text, expected.checksum, now(), expected.migration_name, now(), 1
FROM expected
WHERE NOT EXISTS (
  SELECT 1 FROM _prisma_migrations current WHERE current.migration_name = expected.migration_name
);

COMMIT;

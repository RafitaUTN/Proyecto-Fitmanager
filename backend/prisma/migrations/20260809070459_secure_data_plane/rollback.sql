-- EMERGENCY ROLLBACK ONLY.
-- Re-enables the insecure Data API posture that existed before SEC-001.
-- Do not execute unless application availability depends on direct Data API
-- access and the incident owner has accepted the data-exposure risk.

DO $secure_data_plane_rollback$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT c.relname
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$secure_data_plane_rollback$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;


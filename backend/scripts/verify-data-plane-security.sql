-- Read-only verification for SEC-001. Expected result: all boolean privilege
-- columns are false, rls_enabled equals application_tables, policies equals 0.
WITH application_tables AS (
  SELECT c.oid, c.relname, c.relrowsecurity
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname <> '_prisma_migrations'
)
SELECT
  count(*)::integer AS application_tables,
  count(*) FILTER (WHERE relrowsecurity)::integer AS rls_enabled,
  bool_or(has_table_privilege('anon', oid, 'SELECT')) AS anon_can_select,
  bool_or(has_table_privilege('anon', oid, 'INSERT')) AS anon_can_insert,
  bool_or(has_table_privilege('authenticated', oid, 'SELECT')) AS authenticated_can_select,
  bool_or(has_table_privilege('authenticated', oid, 'UPDATE')) AS authenticated_can_update,
  bool_or(has_table_privilege('service_role', oid, 'SELECT')) AS service_role_can_select
FROM application_tables;

SELECT count(*)::integer AS policies
FROM pg_catalog.pg_policies
WHERE schemaname = 'public';

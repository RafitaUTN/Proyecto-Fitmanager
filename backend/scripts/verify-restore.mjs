import pg from 'pg'

const raw = process.env.RESTORE_DATABASE_URL
if (!raw) throw new Error('RESTORE_DATABASE_URL es obligatoria')

const url = new URL(raw)
const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres'])
if (!localHosts.has(url.hostname) || !url.pathname.toLowerCase().includes('restore')) {
  throw new Error('Restore verification bloqueada fuera de una base local con nombre que contenga restore')
}

const restorePhase = process.env.RESTORE_PHASE ?? 'post-migration'
if (!['pre-migration', 'post-migration'].includes(restorePhase)) {
  throw new Error('RESTORE_PHASE debe ser pre-migration o post-migration')
}

const expectedTables = [
  '_prisma_migrations', 'asistencia', 'cliente', 'cliente_membresia', 'cliente_refresh_token',
  'cliente_rutina', 'cliente_rutina_ejercicio', 'ejercicio', 'ejercicio_media_cache', 'email_outbox',
  'gimnasio', 'horario_entrenador', 'membresia', 'notificacion', 'pago', 'refresh_token', 'rutina',
  'rutina_ejercicio', 'rutina_entrenador', 'solicitud_auditoria', 'solicitud_transferencia', 'token', 'usuario',
]
const phaseExpectedTables = restorePhase === 'pre-migration'
  ? expectedTables.filter((table) => table !== 'ejercicio_media_cache')
  : expectedTables

const pool = new pg.Pool({ connectionString: raw, max: 2, connectionTimeoutMillis: 10_000 })

try {
  const tablesResult = await pool.query(`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `)
  const actualTables = tablesResult.rows.map((row) => row.tablename)
  const missingTables = phaseExpectedTables.filter((table) => !actualTables.includes(table))
  if (missingTables.length) throw new Error(`Tablas faltantes tras restore: ${missingTables.join(', ')}`)
  if (restorePhase === 'post-migration' && actualTables.length < expectedTables.length) {
    throw new Error(`Restore post-migraciÃ³n incompleto: ${actualTables.length}/${expectedTables.length} tablas`)
  }

  const auditResult = await pool.query(`
    select json_build_object(
      'gyms', (select count(*) from gimnasio),
      'users', (select count(*) from usuario),
      'clients', (select count(*) from cliente),
      'memberships', (select count(*) from cliente_membresia),
      'payments', (select count(*) from pago),
      'attendances', (select count(*) from asistencia),
      'routines', (select count(*) from rutina),
      'notifications', (select count(*) from notificacion),
      'transfers', (select count(*) from solicitud_transferencia),
      'failed_migrations', (select count(*) from _prisma_migrations where finished_at is null or rolled_back_at is not null),
      'invalid_indexes', (select count(*) from pg_index where not indisvalid),
      'unvalidated_constraints', (select count(*) from pg_constraint where connamespace = 'public'::regnamespace and not convalidated),
      'orphan_memberships', (select count(*) from cliente_membresia cm left join cliente c on c.id_cliente=cm.id_cliente where c.id_cliente is null),
      'orphan_payments', (select count(*) from pago p left join cliente_membresia cm on cm.id_cliente_membresia=p.id_cliente_membresia where cm.id_cliente_membresia is null),
      'orphan_attendances', (select count(*) from asistencia a left join cliente c on c.id_cliente=a.id_cliente where c.id_cliente is null),
      'orphan_routine_assignments', (select count(*) from cliente_rutina cr left join cliente c on c.id_cliente=cr.id_cliente left join rutina r on r.id_rutina=cr.id_rutina where c.id_cliente is null or r.id_rutina is null),
      'notifications_without_recipient', (select count(*) from notificacion where id_gimnasio is null and id_cliente is null and id_usuario_destino is null),
      'tenantless_payments', (select count(*) from pago where id_gimnasio is null),
      'tenantless_attendances', (select count(*) from asistencia where id_gimnasio is null)
    ) as audit
  `)
  const audit = auditResult.rows[0].audit
  const integrityKeys = [
    'failed_migrations', 'invalid_indexes', 'unvalidated_constraints', 'orphan_memberships',
    'orphan_payments', 'orphan_attendances', 'orphan_routine_assignments',
    'notifications_without_recipient', 'tenantless_payments', 'tenantless_attendances',
  ]
  const failures = integrityKeys.filter((key) => Number(audit[key]) !== 0)
  if (failures.length) throw new Error(`Integridad post-restore inválida: ${failures.join(', ')}`)
  if (process.env.REQUIRE_TWO_TENANTS === 'true' && Number(audit.gyms) < 2) {
    throw new Error('La prueba multi-tenant requiere al menos dos gimnasios restaurados')
  }

  console.log(JSON.stringify({ status: 'PASS', phase: restorePhase, tables: actualTables.length, ...audit }))
} finally {
  await pool.end()
}

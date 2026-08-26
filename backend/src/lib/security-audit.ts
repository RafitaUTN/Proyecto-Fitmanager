/**
 * Utilidad compartida security-audit para la API de FitManager.
 *
 * @remarks Evita duplicar lógica transversal usada por controladores, servicios o middlewares.
 */
export type SecurityAuditEvent = 'PASSWORD_CHANGED' | 'PASSWORD_RESET'

export function recordSecurityAudit(
  event: SecurityAuditEvent,
  actor: { actorType: 'CLIENTE' | 'STAFF'; actorId: bigint; gymId: bigint },
): void {
  console.info(
    JSON.stringify({
      level: 'info',
      event: 'security_audit',
      action: event,
      actorType: actor.actorType,
      actorId: actor.actorId.toString(),
      gymId: actor.gymId.toString(),
      occurredAt: new Date().toISOString(),
    }),
  )
}

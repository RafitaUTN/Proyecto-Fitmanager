export type SecurityAuditEvent = 'PASSWORD_CHANGED' | 'PASSWORD_RESET'

export function recordSecurityAudit(event: SecurityAuditEvent, actor: { actorType: 'CLIENTE' | 'STAFF'; actorId: bigint; gymId: bigint }): void {
  console.info(JSON.stringify({
    level: 'info',
    event: 'security_audit',
    action: event,
    actorType: actor.actorType,
    actorId: actor.actorId.toString(),
    gymId: actor.gymId.toString(),
    occurredAt: new Date().toISOString(),
  }))
}

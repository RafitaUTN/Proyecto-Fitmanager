/**
 * Tipos compartidos request-context para la API.
 *
 * @remarks Extiende contratos TypeScript usados por Express, serialización o contexto autenticado.
 */
export type StaffRole = 'Administrador' | 'Recepcionista' | 'Entrenador'
export type ActorType = 'STAFF' | 'CLIENTE'

/** Identidad y tenant verificados contra la base de datos. */
export type RequestContext = {
  actorId: bigint
  actorType: ActorType
  role: StaffRole | 'Cliente'
  gymId: bigint
}

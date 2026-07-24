export const QueryKeys = {
  clientes: (filters?: Record<string, string>) => ['clientes', filters].filter(Boolean),
  clientesPago: () => ['clientes-pago'],
  usuarios: () => ['usuarios'],
  membresias: () => ['membresias'],
  pagos: () => ['pagos'],
  asignaciones: (idCliente?: number) => ['asignaciones', idCliente].filter(Boolean),
  notificaciones: (tipo?: string) => ['notificaciones', tipo].filter(Boolean),
  notificacionesContar: () => ['notificaciones', 'contar'],
  transferencias: (id?: number) => ['transferencias', id].filter(Boolean),
  transferenciasIndicadores: () => ['transferencias', 'indicadores'],
  dashboardAdmin: () => ['dashboard', 'admin'],
  dashboardRecepcion: () => ['dashboard', 'recepcion'],
  dashboardEntrenador: () => ['dashboard', 'entrenador'],
} as const

export type QueryKeyType = ReturnType<(typeof QueryKeys)[keyof typeof QueryKeys]>

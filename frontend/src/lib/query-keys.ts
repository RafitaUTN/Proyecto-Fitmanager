export const QueryKeys = {
  clientes: (filters?: Record<string, string>) => ['clientes', filters].filter(Boolean),
  clientesPago: () => ['clientes-pago'],
  usuarios: () => ['usuarios'],
  membresias: () => ['membresias'],
  pagos: (idCliente?: number) => ['pagos', idCliente].filter(Boolean),
  asignaciones: (idCliente?: number) => ['asignaciones', idCliente].filter(Boolean),
  notificaciones: (tipo?: string) => ['notificaciones', tipo].filter(Boolean),
  notificacionesContar: () => ['notificaciones', 'contar'],
  transferencias: (id?: number) => ['transferencias', id].filter(Boolean),
  transferenciasIndicadores: () => ['transferencias', 'indicadores'],
  dashboardAdmin: () => ['dashboard', 'admin'],
  dashboardRecepcion: () => ['dashboard', 'recepcion'],
  dashboardEntrenador: () => ['dashboard', 'entrenador'],
  ejercicios: () => ['ejercicios'],
  rutinas: (filtros?: Record<string, string>) => ['rutinas', filtros].filter(Boolean),
  rutina: (id: number) => ['rutinas', id],
  asignacionesRutina: (id: number) => ['rutinas', id, 'asignaciones'],
  asistencias: (filtros?: Record<string, unknown>) => ['asistencias', filtros].filter(Boolean),
  asistenciasHoy: () => ['asistencias', 'hoy'],
} as const

export type QueryKeyType = ReturnType<(typeof QueryKeys)[keyof typeof QueryKeys]>

/**
 * Utilidad frontend query-keys.
 *
 * @remarks Centraliza lógica compartida por páginas, hooks o componentes del cliente web.
 */
export const QueryKeys = {
  clientes: (filters?: Record<string, string>) => ['clientes', filters].filter(Boolean),
  perfilCliente: (id: number) => ['clientes', id, 'perfil'],
  clientesPago: () => ['clientes-pago'],
  usuarios: (filters?: Record<string, unknown>) => ['usuarios', filters].filter(Boolean),
  miPerfil: () => ['usuarios', 'me'],
  membresias: () => ['membresias'],
  pagos: (filtro?: {
    idCliente?: number
    fechaInicio?: string
    fechaFin?: string
    page?: number
    pageSize?: number
    search?: string
  }) =>
    [
      'pagos',
      filtro?.idCliente,
      filtro?.fechaInicio,
      filtro?.fechaFin,
      filtro?.page,
      filtro?.pageSize,
      filtro?.search,
    ].filter(Boolean),
  asignaciones: (idCliente?: number) => ['asignaciones', idCliente].filter(Boolean),
  notificaciones: (tipo?: string, filters?: Record<string, unknown>) =>
    ['notificaciones', tipo, filters].filter(Boolean),
  notificacionesContar: () => ['notificaciones', 'contar'],
  transferencias: (id?: number) => ['transferencias', id].filter(Boolean),
  transferenciasIndicadores: () => ['transferencias', 'indicadores'],
  dashboardAdmin: () => ['dashboard', 'admin'],
  dashboardRecepcion: () => ['dashboard', 'recepcion'],
  dashboardEntrenador: () => ['dashboard', 'entrenador'],
  ejercicios: () => ['ejercicios'],
  mediaEjercicios: (query: string) => ['ejercicios', 'media', query],
  rutinas: (filtros?: Record<string, string>) => ['rutinas', filtros].filter(Boolean),
  rutina: (id: number) => ['rutinas', id],
  asignacionesRutina: (id: number) => ['rutinas', id, 'asignaciones'],
  programacionesRutina: (filtros?: Record<string, unknown>) => ['programaciones-rutinas', filtros].filter(Boolean),
  asistencias: (filtros?: Record<string, unknown>) => ['asistencias', filtros].filter(Boolean),
  asistenciasHoy: () => ['asistencias', 'hoy'],
  asistenciasClientesElegibles: () => ['asistencias', 'clientes-elegibles'],
  reportes: {
    ingresosMensuales: () => ['reportes', 'ingresos-mensuales'],
    nuevosClientes: () => ['reportes', 'nuevos-clientes'],
    distribucionMembresias: () => ['reportes', 'distribucion-membresias'],
    metodosPago: () => ['reportes', 'metodos-pago'],
    clientesActivosInactivos: () => ['reportes', 'clientes-activos-inactivos'],
    asistencias: () => ['reportes', 'asistencias'],
    asistenciasPorHora: () => ['reportes', 'asistencias-por-hora'],
    ingresosDiarios: () => ['reportes', 'ingresos-diarios'],
  },
} as const

type ExtractQueryKey<T> = T extends (...args: unknown[]) => infer R ? R : never
export type QueryKeyType = ExtractQueryKey<(typeof QueryKeys)[keyof typeof QueryKeys]>

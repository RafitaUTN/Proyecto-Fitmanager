/**
 * Página Asistencias de la aplicación FitManager.
 *
 * @remarks Orquesta componentes, estado local y hooks de datos para resolver un flujo visible del usuario.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import {
  useAsistencias,
  useAsistenciasHoy,
  useAsistenciasActivas,
  useRegistrarEntrada,
  useRegistrarSalida,
  useClientesAsistencia,
  useClientesElegibles,
  type AsistenciaFiltros,
} from '@/hooks/use-asistencias'
import { downloadReport } from '@/lib/download'
import { Clock3, LogOut, UserRoundCheck } from 'lucide-react'

export function Asistencias() {
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [soloDentro, setSoloDentro] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [registroCliente, setRegistroCliente] = useState('')
  const [historialOpen, setHistorialOpen] = useState(false)

  const filtros: AsistenciaFiltros = {
    ...(clienteFiltro ? { id_cliente: parseInt(clienteFiltro) } : {}),
    ...(fechaInicio ? { fecha_inicio: fechaInicio } : {}),
    ...(fechaFin ? { fecha_fin: fechaFin } : {}),
    solo_dentro: soloDentro,
    pagina,
    limite: pageSize,
  }

  const { data: historial } = useAsistencias(filtros)
  const { data: hoy } = useAsistenciasHoy()
  const { data: presentes, isLoading: cargandoPresentes } = useAsistenciasActivas()
  const { data: clientes } = useClientesAsistencia()
  const { data: clientesElegibles, isLoading: cargandoElegibles } = useClientesElegibles()
  const entradaMutation = useRegistrarEntrada(() => {
    setRegistroCliente('')
  })
  const salidaMutation = useRegistrarSalida()

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function calcDuracion(ingreso: string, salida: string | null) {
    const diff = new Date(salida ?? Date.now()).getTime() - new Date(ingreso).getTime()
    const mins = Math.floor(diff / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m} min`
  }

  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider leading-none">ASISTENCIAS</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button variant="outline" onClick={() => setHistorialOpen(true)} className="w-full sm:w-auto">
            Historial
          </Button>
          <Button variant="outline" onClick={() => downloadReport('asistencias')} className="w-full sm:w-auto">
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-card p-5">
          <h3 className="font-heading text-xl text-foreground tracking-wider mb-4">REGISTRAR ENTRADA</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={registroCliente}
              onChange={(e) => setRegistroCliente(e.target.value)}
              className="min-w-0 flex-1 rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar cliente...</option>
              {clientesElegibles?.map((c: any) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre} {c.apellido} - {c.cedula}
                </option>
              ))}
            </select>
            <Button
              onClick={() => entradaMutation.mutate({ id_cliente: parseInt(registroCliente) })}
              disabled={!registroCliente || entradaMutation.isPending}
              className="w-full sm:w-auto"
            >
              Entrada
            </Button>
          </div>
          {!cargandoElegibles && clientesElegibles?.length === 0 && (
            <p className="text-xs text-muted-dark mt-2">
              No hay clientes elegibles: solo se listan clientes activos con membresía vigente y sin entrada abierta.
            </p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-heading text-xl text-foreground tracking-wider">REGISTRAR SALIDA</h3>
            <span className="text-xs rounded-full bg-green-500/10 text-green-400 px-2.5 py-1">
              {presentes?.length ?? 0} dentro
            </span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cargandoPresentes && <div className="h-24 rounded-card bg-surface-light animate-pulse" />}
            {presentes?.map((asistencia) => (
              <article
                key={asistencia.id_asistencia}
                className="rounded-card border border-border bg-surface-light/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-foreground font-semibold">
                      <UserRoundCheck size={16} className="text-green-400 shrink-0" aria-hidden="true" />
                      {asistencia.cliente.nombre} {asistencia.cliente.apellido}
                    </p>
                    <p className="text-xs text-muted mt-2">Entrada: {formatFecha(asistencia.fecha_hora_ingreso)}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-dark mt-1">
                      <Clock3 size={13} aria-hidden="true" />
                      En gimnasio: {calcDuracion(asistencia.fecha_hora_ingreso, null)}
                    </p>
                    <p className="text-xs text-muted-dark mt-1">
                      Entrada registrada por: {asistencia.origen === 'CLIENTE' ? 'Cliente' : 'Personal'}
                    </p>
                    {asistencia.rutina_programada ? (
                      <div className="mt-3 rounded-input border border-border bg-background/40 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
                          Rutina actual/próxima
                        </p>
                        <p className="text-sm text-foreground font-semibold mt-1">
                          {asistencia.rutina_programada.nombre}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {formatHora(asistencia.rutina_programada.hora_inicio)} -{' '}
                          {formatHora(asistencia.rutina_programada.hora_fin)} ·{' '}
                          {asistencia.rutina_programada.entrenador.nombre}{' '}
                          {asistencia.rutina_programada.entrenador.apellido}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-dark mt-2">Sin rutina programada pendiente para hoy.</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => salidaMutation.mutate(asistencia.id_asistencia)}
                    disabled={salidaMutation.isPending}
                    aria-label={`Registrar salida de ${asistencia.cliente.nombre} ${asistencia.cliente.apellido}`}
                    className="shrink-0"
                  >
                    <LogOut size={15} aria-hidden="true" /> Salida
                  </Button>
                </div>
              </article>
            ))}
            {!cargandoPresentes && presentes?.length === 0 && (
              <p className="text-sm text-muted-dark py-6 text-center">No hay clientes dentro del gimnasio.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-card p-5">
        <h3 className="font-heading text-xl text-foreground tracking-wider mb-4">HOY</h3>
        <div className="desktop-table-adaptive overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left p-3 text-muted font-medium">Cliente</th>
                <th className="text-left p-3 text-muted font-medium">Entrada</th>
                <th className="text-left p-3 text-muted font-medium">Salida</th>
                <th className="text-left p-3 text-muted font-medium">Duración</th>
                <th className="text-left p-3 text-muted font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {hoy?.map((a) => (
                <tr key={a.id_asistencia} className="border-t border-border">
                  <td className="p-3 text-foreground font-medium">
                    {a.cliente.nombre} {a.cliente.apellido}
                  </td>
                  <td className="p-3 text-muted">{formatFecha(a.fecha_hora_ingreso)}</td>
                  <td className="p-3 text-muted">{a.fecha_hora_salida ? formatFecha(a.fecha_hora_salida) : '—'}</td>
                  <td className="p-3 text-muted">{calcDuracion(a.fecha_hora_ingreso, a.fecha_hora_salida)}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-badge font-medium ${
                        a.fecha_hora_salida ? 'bg-muted/10 text-muted-dark' : 'bg-green-500/10 text-green-400'
                      }`}
                    >
                      {a.fecha_hora_salida ? 'Completado' : 'En gimnasio'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!hoy || hoy.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted">
                    Sin registros hoy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list space-y-3">
          {hoy?.map((a) => (
            <article key={a.id_asistencia} className="rounded-card border border-border bg-surface-light/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {a.cliente.nombre} {a.cliente.apellido}
                  </p>
                  <p className="mt-2 text-xs text-muted">Entrada: {formatFecha(a.fecha_hora_ingreso)}</p>
                  <p className="mt-1 text-xs text-muted">Salida: {a.fecha_hora_salida ? formatFecha(a.fecha_hora_salida) : '—'}</p>
                  <p className="mt-1 text-xs text-muted-dark">Duración: {calcDuracion(a.fecha_hora_ingreso, a.fecha_hora_salida)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-badge px-2.5 py-1 text-xs font-medium ${
                    a.fecha_hora_salida ? 'bg-muted/10 text-muted-dark' : 'bg-green-500/10 text-green-400'
                  }`}
                >
                  {a.fecha_hora_salida ? 'Completado' : 'Dentro'}
                </span>
              </div>
            </article>
          ))}
          {(!hoy || hoy.length === 0) && <p className="py-8 text-center text-sm text-muted">Sin registros hoy</p>}
        </div>
      </div>

      {historialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 pt-5 sm:p-4 sm:pt-8"
          onClick={() => setHistorialOpen(false)}
        >
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div
            className="relative w-full max-w-6xl rounded-card border border-border bg-surface p-4 shadow-xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-heading text-xl text-foreground tracking-wider">HISTORIAL</h3>
              <button
                onClick={() => setHistorialOpen(false)}
                className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs text-muted-dark mb-1">Cliente</label>
                <select
                  value={clienteFiltro}
                  onChange={(e) => {
                    setClienteFiltro(e.target.value)
                    setPagina(1)
                  }}
                  className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos</option>
                  {clientes?.map((c: any) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-dark mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value)
                    setPagina(1)
                  }}
                  className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-dark mb-1">Fecha fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value)
                    setPagina(1)
                  }}
                  className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloDentro}
                    onChange={(e) => {
                      setSoloDentro(e.target.checked)
                      setPagina(1)
                    }}
                    className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-muted">Solo dentro</span>
                </label>
              </div>
            </div>

            <div className="desktop-table-adaptive overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-light">
                  <tr>
                    <th className="text-left p-3 text-muted font-medium">Cliente</th>
                    <th className="text-left p-3 text-muted font-medium">Entrada</th>
                    <th className="text-left p-3 text-muted font-medium">Salida</th>
                    <th className="text-left p-3 text-muted font-medium">Duración</th>
                    <th className="text-left p-3 text-muted font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial?.data?.map((a) => (
                    <tr key={a.id_asistencia} className="border-t border-border">
                      <td className="p-3 text-foreground font-medium">
                        {a.cliente.nombre} {a.cliente.apellido}
                      </td>
                      <td className="p-3 text-muted">{formatFecha(a.fecha_hora_ingreso)}</td>
                      <td className="p-3 text-muted">{a.fecha_hora_salida ? formatFecha(a.fecha_hora_salida) : '—'}</td>
                      <td className="p-3 text-muted">{calcDuracion(a.fecha_hora_ingreso, a.fecha_hora_salida)}</td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-badge font-medium ${
                            a.fecha_hora_salida ? 'bg-muted/10 text-muted-dark' : 'bg-green-500/10 text-green-400'
                          }`}
                        >
                          {a.fecha_hora_salida ? 'Completado' : 'En gimnasio'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!historial || historial.data?.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted">
                        Sin registros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mobile-card-list space-y-3">
              {historial?.data?.map((a) => (
                <article key={a.id_asistencia} className="rounded-card border border-border bg-surface-light/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {a.cliente.nombre} {a.cliente.apellido}
                      </p>
                      <p className="mt-2 text-xs text-muted">Entrada: {formatFecha(a.fecha_hora_ingreso)}</p>
                      <p className="mt-1 text-xs text-muted">
                        Salida: {a.fecha_hora_salida ? formatFecha(a.fecha_hora_salida) : '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted-dark">
                        Duración: {calcDuracion(a.fecha_hora_ingreso, a.fecha_hora_salida)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-badge px-2.5 py-1 text-xs font-medium ${
                        a.fecha_hora_salida ? 'bg-muted/10 text-muted-dark' : 'bg-green-500/10 text-green-400'
                      }`}
                    >
                      {a.fecha_hora_salida ? 'Completado' : 'Dentro'}
                    </span>
                  </div>
                </article>
              ))}
              {(!historial || historial.data?.length === 0) && (
                <p className="py-8 text-center text-sm text-muted">Sin registros</p>
              )}
            </div>

            <Pagination
              pagination={
                historial
                  ? {
                      page: historial.pagina,
                      pageSize: historial.limite,
                      totalItems: historial.total,
                      totalPages: Math.max(1, historial.totalPaginas),
                      hasNextPage: historial.pagina < historial.totalPaginas,
                      hasPreviousPage: historial.pagina > 1,
                    }
                  : undefined
              }
              onPageChange={setPagina}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPagina(1)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

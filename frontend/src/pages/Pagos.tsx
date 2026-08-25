import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { useClientesPago, usePagos, useAsignacionesCliente, useCrearPago, useResumenPago, useSugerenciasPago, type SugerenciaPago } from '@/hooks/use-pagos'
import { http } from '@/lib/http-client'
import { Paginacion } from '@/components/ui/Paginacion'
import { downloadReport } from '@/lib/download'
import { formatFecha } from '@/lib/fecha'

const pagoSchema = z.object({
  id_cliente: z.string().min(1, 'Seleccione un cliente'),
  id_cliente_membresia: z.string().min(1, 'Seleccione una membresía'),
  monto: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto inválido'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'sinpe']),
})

type PagoForm = z.infer<typeof pagoSchema>

interface ClienteElegido {
  id_cliente: number
  nombre: string
  apellido: string
  cedula: string
}

export function Pagos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [resultadosCliente, setResultadosCliente] = useState<ClienteElegido[]>([])
  const [clienteElegido, setClienteElegido] = useState<ClienteElegido | null>(null)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [pagina, setPagina] = useState(1)

  // Cambiar un filtro reinicia la paginacion: la pagina 4 del listado anterior
  // rara vez existe en el nuevo, y quedaria una tabla vacia sin explicacion.
  function cambiarFiltro(aplicar: () => void) {
    aplicar()
    setPagina(1)
  }
  const { data: clientes } = useClientesPago()
  const { data: sugerencias } = useSugerenciasPago(modalOpen)
  const { data: paginaPagos, isLoading } = usePagos({
    idCliente: filtroCliente ? parseInt(filtroCliente) : undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
    pagina,
  })
  const pagos = paginaPagos?.data
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema),
  })

  const clienteSeleccionado = watch('id_cliente')
  const asignacionSeleccionada = watch('id_cliente_membresia')
  const { data: asignaciones } = useAsignacionesCliente(clienteSeleccionado ? parseInt(clienteSeleccionado) : undefined)
  const { data: resumenPago, isLoading: cargandoResumen } = useResumenPago(asignacionSeleccionada ? parseInt(asignacionSeleccionada) : undefined)
  const crearPagoMutation = useCrearPago(() => { reset(); setModalOpen(false) })

  function limpiarBuscador() {
    setBusquedaCliente('')
    setResultadosCliente([])
    setClienteElegido(null)
  }

  function abrirModal() {
    reset()
    limpiarBuscador()
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    reset()
    limpiarBuscador()
  }

  // La busqueda va contra /clientes, que filtra por nombre, apellido o cedula.
  // Asi tambien aparecen los clientes con deuda que no estan en ventana de pago.
  async function buscarClientes(termino: string) {
    setBusquedaCliente(termino)
    if (termino.trim().length < 1) {
      setResultadosCliente([])
      return
    }
    try {
      const encontrados = await http.get<{ data: ClienteElegido[] }>(`/clientes?q=${encodeURIComponent(termino)}&limite=8`)
      setResultadosCliente(encontrados.data)
    } catch {
      setResultadosCliente([])
    }
  }

  function elegirCliente(cliente: ClienteElegido, idObligacion?: number) {
    setClienteElegido(cliente)
    setBusquedaCliente('')
    setResultadosCliente([])
    setValue('id_cliente', String(cliente.id_cliente), { shouldValidate: true })
    setValue('id_cliente_membresia', idObligacion ? String(idObligacion) : '')
  }

  async function onSubmit(data: PagoForm) {
    crearPagoMutation.mutate({
      id_cliente: parseInt(data.id_cliente),
      id_cliente_membresia: parseInt(data.id_cliente_membresia),
      monto: parseFloat(data.monto),
      metodo_pago: data.metodo_pago,
    })
  }

  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    sinpe: 'SINPE',
  }
  const motivoPago = resumenPago?.motivo_no_pagable === 'MEMBRESIA_FUTURA'
    ? 'La membresía todavía no ha iniciado.'
    : resumenPago?.motivo_no_pagable === 'VENTANA_NO_ABIERTA'
      ? `Esta membresía todavía no se encuentra dentro del periodo de pago. El próximo pago estará disponible a partir del ${formatFecha(resumenPago.fecha_pago_habilitada)}.`
    : resumenPago?.motivo_no_pagable === 'MEMBRESIA_INACTIVA'
      ? 'La membresía no está activa.'
      : resumenPago?.motivo_no_pagable === 'SALDO_COMPLETADO'
        ? 'La obligación ya está pagada por completo.'
      : null
  const estadoLabel: Record<string, string> = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', PAGADO: 'Pagado', COMPLETADO: 'Pagado', VENCIDO: 'Vencido' }
  const badgeEstado = (estado: string) => estado === 'PAGADO' || estado === 'COMPLETADO'
    ? 'bg-green-500/15 text-green-400'
    : estado === 'VENCIDO'
      ? 'bg-red-500/15 text-red-400'
      : 'bg-amber-500/15 text-amber-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">PAGOS</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => downloadReport('pagos-detalle', fechaInicio || undefined, fechaFin || undefined)}>Exportar</Button>
          <Button onClick={abrirModal}>Nuevo Pago</Button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-card p-4">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <label className="text-sm text-muted shrink-0">Filtrar por cliente:</label>
          <select value={filtroCliente} onChange={(e) => cambiarFiltro(() => setFiltroCliente(e.target.value))}
            className="max-w-xs rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los clientes</option>
            {clientes?.map((c: any) => (
              <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
            ))}
          </select>
          <label className="text-sm text-muted shrink-0">Desde:</label>
          <input type="date" value={fechaInicio} onChange={(e) => cambiarFiltro(() => setFechaInicio(e.target.value))}
            className="rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <label className="text-sm text-muted shrink-0">Hasta:</label>
          <input type="date" value={fechaFin} onChange={(e) => cambiarFiltro(() => setFechaFin(e.target.value))}
            className="rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Cliente</th>
              <th className="text-left p-4 text-muted font-medium">Plan</th>
              <th className="text-left p-4 text-muted font-medium">Monto pagado</th>
              <th className="text-left p-4 text-muted font-medium">Pendiente</th>
              <th className="text-left p-4 text-muted font-medium">Método</th>
              <th className="text-left p-4 text-muted font-medium">Fecha</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">Cargando...</td></tr>
            )}
            {pagos?.map(p => (
              <tr key={p.id_pago} className="border-t border-border">
                <td className="p-4 text-foreground">{p.cliente.nombre} {p.cliente.apellido}</td>
                <td className="p-4 text-muted">{p.cliente_membresia.membresia.nombre}</td>
                <td className="p-4 font-medium text-foreground">₡{Number(p.monto).toLocaleString()}</td>
                <td className="p-4 font-medium text-primary">₡{Number(p.saldo_pendiente).toLocaleString()}</td>
                <td className="p-4 text-muted">{metodoLabel[p.metodo_pago] || p.metodo_pago}</td>
                <td className="p-4 text-muted">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`${badgeEstado(p.estado_obligacion)} text-xs px-2.5 py-1 rounded-badge font-medium`}>{estadoLabel[p.estado_obligacion]}</span>
                </td>
              </tr>
            ))}
            {!isLoading && pagos?.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">Sin pagos registrados</td></tr>
            )}
          </tbody>
        </table>
        </div>

        <Paginacion
          pagina={pagina}
          totalPaginas={paginaPagos?.totalPaginas ?? 1}
          total={paginaPagos?.total}
          onCambiar={setPagina}
        />
      </div>

      {/* Modal Nuevo Pago */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cerrarModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">REGISTRAR PAGO</h3>
              <button onClick={cerrarModal} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
                  <input type="hidden" {...register('id_cliente')} />
                  {clienteElegido ? (
                    <div className="flex items-center justify-between gap-3 rounded-input border border-border bg-surface-light/60 px-3 py-2.5">
                      <span className="text-sm text-foreground">
                        {clienteElegido.nombre} {clienteElegido.apellido}
                        <span className="text-muted"> - {clienteElegido.cedula}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { limpiarBuscador(); setValue('id_cliente', ''); setValue('id_cliente_membresia', '') }}
                        className="text-xs text-primary hover:underline cursor-pointer bg-transparent border-none shrink-0"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={busquedaCliente}
                        onChange={(e) => buscarClientes(e.target.value)}
                        placeholder="Buscar por nombre, apellido o cédula"
                        className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="mt-2 max-h-52 overflow-y-auto rounded-input border border-border divide-y divide-border">
                        {busquedaCliente.trim() ? (
                          resultadosCliente.length > 0 ? resultadosCliente.map((c) => (
                            <button
                              key={c.id_cliente}
                              type="button"
                              onClick={() => elegirCliente(c)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-light cursor-pointer bg-transparent border-none"
                            >
                              <span className="text-foreground">{c.nombre} {c.apellido}</span>
                              <span className="text-muted ml-2">- {c.cedula}</span>
                            </button>
                          )) : <p className="px-3 py-3 text-xs text-muted">Sin coincidencias.</p>
                        ) : (
                          sugerencias && sugerencias.length > 0 ? sugerencias.map((sug: SugerenciaPago) => (
                            <button
                              key={sug.id_cliente_membresia}
                              type="button"
                              onClick={() => elegirCliente(sug, sug.id_cliente_membresia)}
                              className="w-full text-left px-3 py-2 hover:bg-surface-light cursor-pointer bg-transparent border-none"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-foreground">
                                  {sug.nombre} {sug.apellido}
                                  <span className="text-muted ml-2">- {sug.cedula}</span>
                                </span>
                                <span className="text-xs font-semibold text-primary shrink-0">
                                  ₡{sug.saldo_pendiente.toLocaleString('es-CR')}
                                </span>
                              </div>
                              <p className="text-xs text-muted-dark">
                                {sug.membresia} · {estadoLabel[sug.estado_pago]}
                                {sug.pago_habilitado ? '' : ' · fuera de ventana'}
                              </p>
                            </button>
                          )) : <p className="px-3 py-3 text-xs text-muted">No hay cobros pendientes por ahora. Buscá al cliente por nombre o cédula.</p>
                        )}
                      </div>
                    </>
                  )}
                  {errors.id_cliente && <p className="text-destructive text-xs mt-1">{errors.id_cliente.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Membresía</label>
                  <select {...register('id_cliente_membresia')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" disabled={!clienteSeleccionado}>
                    <option value="">Seleccionar...</option>
                    {asignaciones?.filter(a => a.estado === 'activo').map(a => (
                      <option key={a.id_cliente_membresia} value={a.id_cliente_membresia}>
                        {a.membresia.nombre} - ₡{Number(a.membresia.precio).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {errors.id_cliente_membresia && <p className="text-destructive text-xs mt-1">{errors.id_cliente_membresia.message}</p>}
                </div>
              </div>
              {asignacionSeleccionada && (
                <div className="rounded-card border border-border bg-surface-light/60 p-4" aria-live="polite">
                  {cargandoResumen ? <p className="text-sm text-muted animate-pulse">Calculando saldo...</p> : resumenPago && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div><p className="text-xs text-muted-dark uppercase tracking-wide">{resumenPago.membresia}</p><p className="text-sm text-foreground font-medium">Estado: {estadoLabel[resumenPago.estado_pago]}</p></div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeEstado(resumenPago.estado_pago)}`}>{estadoLabel[resumenPago.estado_pago]}</span>
                      </div>
                      <dl className="grid grid-cols-3 gap-3 text-sm">
                        <div><dt className="text-muted-dark text-xs">Total</dt><dd className="text-foreground font-semibold">₡{resumenPago.monto_total.toLocaleString('es-CR')}</dd></div>
                        <div><dt className="text-muted-dark text-xs">Pagado</dt><dd className="text-green-400 font-semibold">₡{resumenPago.monto_pagado.toLocaleString('es-CR')}</dd></div>
                        <div><dt className="text-muted-dark text-xs">Pendiente</dt><dd className="text-primary font-semibold">₡{resumenPago.saldo_pendiente.toLocaleString('es-CR')}</dd></div>
                      </dl>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted">
                        <p>Vencimiento: {formatFecha(resumenPago.fecha_vencimiento_pago)}</p>
                        <p>Pago disponible desde: {formatFecha(resumenPago.fecha_pago_habilitada)}</p>
                      </div>
                      {motivoPago ? <p className="text-xs text-amber-400" role="status">{motivoPago}</p> : null}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Monto (₡)</label>
                  <input type="number" min="0.01" max={resumenPago?.saldo_pendiente} step="0.01" {...register('monto')} disabled={!resumenPago?.pago_habilitado}
                    className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" />
                  {errors.monto && <p className="text-destructive text-xs mt-1">{errors.monto.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Método de Pago</label>
                  <select {...register('metodo_pago')} disabled={!resumenPago?.pago_habilitado} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
                    <option value="">Seleccionar...</option>
                    {Object.entries(metodoLabel).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  {errors.metodo_pago && <p className="text-destructive text-xs mt-1">{errors.metodo_pago.message}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || crearPagoMutation.isPending || !resumenPago?.pago_habilitado} className="flex-1">Registrar Pago</Button>
                <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

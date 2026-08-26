/**
 * Página Pagos de la aplicación FitManager.
 *
 * @remarks Orquesta componentes, estado local y hooks de datos para resolver un flujo visible del usuario.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import {
  useClientesPago,
  useClientesPagoSugeridos,
  usePagos,
  useAsignacionesCliente,
  useCrearPago,
  useResumenPago,
} from '@/hooks/use-pagos'
import { downloadReport } from '@/lib/download'
import { formatFecha } from '@/lib/fecha'
import { Pagination } from '@/components/ui/Pagination'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const pagoSchema = z
  .object({
    id_cliente: z.string().min(1, 'Seleccione un cliente'),
    id_cliente_membresia: z.string().min(1, 'Seleccione una membresía'),
    monto: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto inválido'),
    metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'sinpe']),
    referencia_pago: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (['tarjeta', 'transferencia', 'sinpe'].includes(data.metodo_pago) && !data.referencia_pago?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['referencia_pago'],
        message: 'Ingrese el identificador o número de comprobante',
      })
    }
  })

type PagoForm = z.infer<typeof pagoSchema>

export function Pagos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [clientePagoSearch, setClientePagoSearch] = useState('')
  const [clientePagoFocused, setClientePagoFocused] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 300)
  const debouncedClientePagoSearch = useDebouncedValue(clientePagoSearch, 300)
  const { data: clientes } = useClientesPago()
  const { data: clientesPagoSugeridos } = useClientesPagoSugeridos(5)
  const { data: pagos, isLoading } = usePagos({
    idCliente: filtroCliente ? parseInt(filtroCliente) : undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
    page,
    pageSize,
    search: debouncedSearch || undefined,
  })
  const pagosLista = pagos?.data ?? []
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema),
  })

  const clienteSeleccionado = watch('id_cliente')
  const asignacionSeleccionada = watch('id_cliente_membresia')
  const metodoSeleccionado = watch('metodo_pago')
  const requiereReferencia = ['tarjeta', 'transferencia', 'sinpe'].includes(metodoSeleccionado)
  const { data: asignaciones } = useAsignacionesCliente(clienteSeleccionado ? parseInt(clienteSeleccionado) : undefined)
  const { data: resumenPago, isLoading: cargandoResumen } = useResumenPago(
    asignacionSeleccionada ? parseInt(asignacionSeleccionada) : undefined,
  )
  const crearPagoMutation = useCrearPago(() => {
    reset()
    setModalOpen(false)
  })
  const clientePagoTerm = debouncedClientePagoSearch.trim().toLowerCase()
  const clientesPagoFiltrados = clientePagoTerm
    ? (clientes ?? [])
        .filter((c) => `${c.nombre} ${c.apellido} ${c.cedula}`.toLowerCase().includes(clientePagoTerm))
        .slice(0, 8)
    : (clientesPagoSugeridos ?? [])
  const mostrarSugerenciasCliente = clientePagoFocused && !clienteSeleccionado

  function abrirModal() {
    reset()
    setClientePagoSearch('')
    setClientePagoFocused(false)
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setClientePagoSearch('')
    setClientePagoFocused(false)
    reset()
  }

  function seleccionarClientePago(c: { id_cliente: number; nombre: string; apellido: string; cedula: string }) {
    setValue('id_cliente', String(c.id_cliente), { shouldValidate: true })
    setValue('id_cliente_membresia', '')
    setClientePagoSearch(`${c.nombre} ${c.apellido} - ${c.cedula}`)
    setClientePagoFocused(false)
  }

  async function onSubmit(data: PagoForm) {
    crearPagoMutation.mutate({
      id_cliente: parseInt(data.id_cliente),
      id_cliente_membresia: parseInt(data.id_cliente_membresia),
      monto: parseFloat(data.monto),
      metodo_pago: data.metodo_pago,
      referencia_pago: data.referencia_pago?.trim() || undefined,
    })
  }

  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    sinpe: 'SINPE',
  }
  const motivoPago =
    resumenPago?.motivo_no_pagable === 'MEMBRESIA_FUTURA'
      ? 'La membresía todavía no ha iniciado.'
      : resumenPago?.motivo_no_pagable === 'VENTANA_NO_ABIERTA'
        ? `El pago para la siguiente renovación estará disponible a partir del ${formatFecha(resumenPago.fecha_pago_habilitada)}.`
        : resumenPago?.motivo_no_pagable === 'MEMBRESIA_INACTIVA'
          ? 'La membresía no está activa.'
          : resumenPago?.motivo_no_pagable === 'SALDO_COMPLETADO'
            ? 'La obligación ya está pagada por completo.'
            : null
  const mensajePagoDisponible =
    resumenPago?.pago_habilitado && resumenPago.saldo_pendiente > 0
      ? resumenPago.estado_pago === 'PARCIAL'
        ? `Saldo pendiente del periodo actual disponible para pago: ₡${resumenPago.saldo_pendiente.toLocaleString('es-CR')}.`
        : 'Pago disponible para registrar.'
      : null
  const estadoLabel: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
    PAGADO: 'Pagado',
    COMPLETADO: 'Pagado',
    VENCIDO: 'Vencido',
  }
  const badgeEstado = (estado: string) =>
    estado === 'PAGADO' || estado === 'COMPLETADO'
      ? 'bg-green-500/15 text-green-400'
      : estado === 'VENCIDO'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-amber-500/15 text-amber-400'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider leading-none">PAGOS</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            variant="outline"
            onClick={() => downloadReport('pagos-detalle', fechaInicio || undefined, fechaFin || undefined)}
            className="w-full sm:w-auto"
          >
            Exportar
          </Button>
          <Button onClick={abrirModal} className="w-full sm:w-auto">
            Nuevo Pago
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-card p-4">
        <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_auto_1fr_auto_1fr] xl:items-center">
          <label className="text-sm text-muted shrink-0">Cliente:</label>
          <select
            value={filtroCliente}
            onChange={(e) => {
              setFiltroCliente(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los clientes</option>
            {clientes?.map((c: any) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {c.nombre} {c.apellido} - {c.cedula}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar cliente o comprobante..."
            className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="text-sm text-muted shrink-0">Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="text-sm text-muted shrink-0">Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => {
              setFechaFin(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="desktop-table-adaptive overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left p-4 text-muted font-medium">Cliente</th>
                <th className="text-left p-4 text-muted font-medium">Plan</th>
                <th className="text-left p-4 text-muted font-medium">Monto pagado</th>
                <th className="text-left p-4 text-muted font-medium">Pendiente</th>
                <th className="text-left p-4 text-muted font-medium">Método</th>
                <th className="text-left p-4 text-muted font-medium">Comprobante</th>
                <th className="text-left p-4 text-muted font-medium">Fecha</th>
                <th className="text-left p-4 text-muted font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted">
                    Cargando...
                  </td>
                </tr>
              )}
              {pagosLista.map((p) => (
                <tr key={p.id_pago} className="border-t border-border">
                  <td className="p-4 text-foreground">
                    {p.cliente.nombre} {p.cliente.apellido}
                  </td>
                  <td className="p-4 text-muted">{p.cliente_membresia.membresia.nombre}</td>
                  <td className="p-4 font-medium text-foreground">₡{Number(p.monto).toLocaleString()}</td>
                  <td className="p-4 font-medium text-primary">₡{Number(p.saldo_pendiente).toLocaleString()}</td>
                  <td className="p-4 text-muted">{metodoLabel[p.metodo_pago] || p.metodo_pago}</td>
                  <td className="p-4 text-muted">{p.referencia_pago || '—'}</td>
                  <td className="p-4 text-muted">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span
                      className={`${badgeEstado(p.estado_obligacion)} text-xs px-2.5 py-1 rounded-badge font-medium`}
                    >
                      {estadoLabel[p.estado_obligacion]}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && pagosLista.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted">
                    Sin pagos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list space-y-3">
          {isLoading && <p className="py-6 text-center text-sm text-muted">Cargando...</p>}
          {pagosLista.map((p) => (
            <article key={p.id_pago} className="rounded-card border border-border bg-surface-light/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {p.cliente.nombre} {p.cliente.apellido}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">{p.cliente_membresia.membresia.nombre}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Pagado: ₡{Number(p.monto).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs font-medium text-primary">
                    Pendiente: ₡{Number(p.saldo_pendiente).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {metodoLabel[p.metodo_pago] || p.metodo_pago} · {new Date(p.fecha_pago).toLocaleDateString()}
                  </p>
                  {p.referencia_pago && <p className="mt-1 truncate text-xs text-muted-dark">Comp.: {p.referencia_pago}</p>}
                </div>
                <span
                  className={`${badgeEstado(p.estado_obligacion)} shrink-0 rounded-badge px-2.5 py-1 text-xs font-medium`}
                >
                  {estadoLabel[p.estado_obligacion]}
                </span>
              </div>
            </article>
          ))}
          {!isLoading && pagosLista.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Sin pagos registrados</p>
          )}
        </div>
        <Pagination
          pagination={pagos?.pagination}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>

      {/* Modal Nuevo Pago */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 pt-5 sm:items-center sm:p-4" onClick={cerrarModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div
            className="relative w-full max-w-lg rounded-card border border-border bg-surface p-4 shadow-xl space-y-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">REGISTRAR PAGO</h3>
              <button
                onClick={cerrarModal}
                className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
                  <input type="hidden" {...register('id_cliente')} />
                  <div className="relative">
                    <input
                      value={clientePagoSearch}
                      onFocus={() => setClientePagoFocused(true)}
                      onClick={() => setClientePagoFocused(true)}
                      onChange={(e) => {
                        setClientePagoSearch(e.target.value)
                        setClientePagoFocused(true)
                        setValue('id_cliente', '')
                        setValue('id_cliente_membresia', '')
                      }}
                      placeholder="Buscar por nombre, apellido o cédula..."
                      className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {mostrarSugerenciasCliente && (
                      <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-card border border-border bg-surface shadow-xl">
                        {!clientePagoTerm && clientesPagoFiltrados.length > 0 && (
                          <p className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-dark border-b border-border">
                            Clientes con pago habilitado
                          </p>
                        )}
                        {clientesPagoFiltrados.map((c) => (
                          <button
                            type="button"
                            key={c.id_cliente}
                            onClick={() => seleccionarClientePago(c)}
                            className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-surface-light border-b border-border last:border-0"
                          >
                            <span className="font-medium">
                              {c.nombre} {c.apellido}
                            </span>
                            <span className="text-muted ml-2">{c.cedula}</span>
                            {'saldo_pendiente' in c && 'estado_pago' in c && (
                              <span className="block text-xs text-primary mt-0.5">
                                {c.estado_pago === 'PARCIAL' ? 'Pago parcial pendiente' : 'Pago habilitado'} · ₡
                                {Number(c.saldo_pendiente).toLocaleString('es-CR')}
                              </span>
                            )}
                          </button>
                        ))}
                        {clientesPagoFiltrados.length === 0 && (
                          <p className="px-3 py-2.5 text-sm text-muted">
                            {clientePagoTerm ? 'Sin resultados' : 'No hay clientes con pago habilitado en este momento'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.id_cliente && <p className="text-destructive text-xs mt-1">{errors.id_cliente.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Membresía</label>
                  <select
                    {...register('id_cliente_membresia')}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    disabled={!clienteSeleccionado}
                  >
                    <option value="">Seleccionar...</option>
                    {asignaciones
                      ?.filter((a) => a.estado === 'activo')
                      .map((a) => (
                        <option key={a.id_cliente_membresia} value={a.id_cliente_membresia}>
                          {a.membresia.nombre} - ₡{Number(a.membresia.precio).toLocaleString()}
                        </option>
                      ))}
                  </select>
                  {errors.id_cliente_membresia && (
                    <p className="text-destructive text-xs mt-1">{errors.id_cliente_membresia.message}</p>
                  )}
                </div>
              </div>
              {asignacionSeleccionada && (
                <div className="rounded-card border border-border bg-surface-light/60 p-4" aria-live="polite">
                  {cargandoResumen ? (
                    <p className="text-sm text-muted animate-pulse">Calculando saldo...</p>
                  ) : (
                    resumenPago && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs text-muted-dark uppercase tracking-wide">{resumenPago.membresia}</p>
                            <p className="text-sm text-foreground font-medium">
                              Estado: {estadoLabel[resumenPago.estado_pago]}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeEstado(resumenPago.estado_pago)}`}
                          >
                            {estadoLabel[resumenPago.estado_pago]}
                          </span>
                        </div>
                        <dl className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <dt className="text-muted-dark text-xs">Total</dt>
                            <dd className="text-foreground font-semibold">
                              ₡{resumenPago.monto_total.toLocaleString('es-CR')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-dark text-xs">Pagado</dt>
                            <dd className="text-green-400 font-semibold">
                              ₡{resumenPago.monto_pagado.toLocaleString('es-CR')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-dark text-xs">Pendiente</dt>
                            <dd className="text-primary font-semibold">
                              ₡{resumenPago.saldo_pendiente.toLocaleString('es-CR')}
                            </dd>
                          </div>
                        </dl>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted">
                          <p>Vencimiento: {formatFecha(resumenPago.fecha_vencimiento_pago)}</p>
                          <p>Pago disponible desde: {formatFecha(resumenPago.fecha_pago_habilitada)}</p>
                        </div>
                        {mensajePagoDisponible ? (
                          <p className="text-xs text-green-400" role="status">
                            {mensajePagoDisponible}
                          </p>
                        ) : null}
                        {motivoPago ? (
                          <p className="text-xs text-amber-400" role="status">
                            {motivoPago}
                          </p>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Monto (₡)</label>
                  <input
                    type="number"
                    min="0.01"
                    max={resumenPago?.saldo_pendiente}
                    step="0.01"
                    {...register('monto')}
                    disabled={!resumenPago?.pago_habilitado}
                    className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  {errors.monto && <p className="text-destructive text-xs mt-1">{errors.monto.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Método de Pago</label>
                  <select
                    {...register('metodo_pago')}
                    disabled={!resumenPago?.pago_habilitado}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">Seleccionar...</option>
                    {Object.entries(metodoLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {errors.metodo_pago && <p className="text-destructive text-xs mt-1">{errors.metodo_pago.message}</p>}
                </div>
              </div>
              {requiereReferencia && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Identificador / Número de comprobante
                  </label>
                  <input
                    type="text"
                    {...register('referencia_pago')}
                    disabled={!resumenPago?.pago_habilitado}
                    className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  {errors.referencia_pago && (
                    <p className="text-destructive text-xs mt-1">{errors.referencia_pago.message}</p>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || crearPagoMutation.isPending || !resumenPago?.pago_habilitado}
                  className="flex-1"
                >
                  Registrar Pago
                </Button>
                <Button type="button" variant="outline" onClick={cerrarModal}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

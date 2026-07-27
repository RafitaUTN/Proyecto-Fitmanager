import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { useClientesPago, usePagos, useAsignacionesCliente, useCrearPago } from '@/hooks/use-pagos'

const pagoSchema = z.object({
  id_cliente: z.string().min(1, 'Seleccione un cliente'),
  id_cliente_membresia: z.string().min(1, 'Seleccione una membresía'),
  monto: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto inválido'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'sinpe']),
})

type PagoForm = z.infer<typeof pagoSchema>

export function Pagos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const { data: clientes } = useClientesPago()
  const { data: pagos, isLoading } = usePagos(filtroCliente ? parseInt(filtroCliente) : undefined)
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema),
  })

  const clienteSeleccionado = watch('id_cliente')
  const { data: asignaciones } = useAsignacionesCliente(clienteSeleccionado ? parseInt(clienteSeleccionado) : undefined)
  const crearPagoMutation = useCrearPago(() => { reset(); setModalOpen(false) })

  function abrirModal() {
    reset()
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    reset()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">PAGOS</h2>
        <Button onClick={abrirModal}>Nuevo Pago</Button>
      </div>

      <div className="bg-surface border border-border rounded-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-muted shrink-0">Filtrar por cliente:</label>
          <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}
            className="max-w-xs rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los clientes</option>
            {clientes?.map((c: any) => (
              <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Cliente</th>
              <th className="text-left p-4 text-muted font-medium">Plan</th>
              <th className="text-left p-4 text-muted font-medium">Monto</th>
              <th className="text-left p-4 text-muted font-medium">Método</th>
              <th className="text-left p-4 text-muted font-medium">Fecha</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Cargando...</td></tr>
            )}
            {pagos?.map(p => (
              <tr key={p.id_pago} className="border-t border-border">
                <td className="p-4 text-foreground">{p.cliente.nombre} {p.cliente.apellido}</td>
                <td className="p-4 text-muted">{p.cliente_membresia.membresia.nombre}</td>
                <td className="p-4 font-medium text-foreground">₡{Number(p.monto).toLocaleString()}</td>
                <td className="p-4 text-muted">{metodoLabel[p.metodo_pago] || p.metodo_pago}</td>
                <td className="p-4 text-muted">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className="bg-secondary/10 text-secondary text-xs px-2.5 py-1 rounded-badge font-medium">{p.estado}</span>
                </td>
              </tr>
            ))}
            {!isLoading && pagos?.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Sin pagos registrados</td></tr>
            )}
          </tbody>
        </table>
        </div>
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
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
                  <select {...register('id_cliente')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Seleccionar...</option>
                    {clientes?.map(c => (
                      <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
                    ))}
                  </select>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Monto (₡)</label>
                  <input type="number" step="0.01" {...register('monto')}
                    className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  {errors.monto && <p className="text-destructive text-xs mt-1">{errors.monto.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Método de Pago</label>
                  <select {...register('metodo_pago')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Seleccionar...</option>
                    {Object.entries(metodoLabel).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  {errors.metodo_pago && <p className="text-destructive text-xs mt-1">{errors.metodo_pago.message}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || crearPagoMutation.isPending} className="flex-1">Registrar Pago</Button>
                <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

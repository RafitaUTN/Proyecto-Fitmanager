import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Cliente { id_cliente: number; nombre: string; apellido: string; cedula: string }
interface MembresiaCliente {
  id_cliente_membresia: number
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  membresia: { nombre: string; precio: number }
}
interface Pago {
  id_pago: number
  monto: number
  metodo_pago: string
  fecha_pago: string
  estado: string
  cliente: { nombre: string; apellido: string; cedula: string }
  cliente_membresia: { membresia: { nombre: string } }
}

const pagoSchema = z.object({
  id_cliente: z.string().min(1, 'Seleccione un cliente'),
  id_cliente_membresia: z.string().min(1, 'Seleccione una membresía'),
  monto: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto inválido'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'sinpe']),
})

type PagoForm = z.infer<typeof pagoSchema>

export function Pagos() {
  const token = useAuthStore((s) => s.token)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [asignaciones, setAsignaciones] = useState<MembresiaCliente[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema),
  })

  const clienteSeleccionado = watch('id_cliente')

  async function cargar() {
    const [cRes, pRes] = await Promise.all([
      fetch(`${API_URL}/clientes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/pagos`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (cRes.ok) setClientes(await cRes.json())
    if (pRes.ok) setPagos(await pRes.json())
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!clienteSeleccionado) return
    fetch(`${API_URL}/clientes-membresias?id_cliente=${clienteSeleccionado}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(setAsignaciones)
  }, [clienteSeleccionado])

  async function onSubmit(data: PagoForm) {
    const body = {
      id_cliente: parseInt(data.id_cliente),
      id_cliente_membresia: parseInt(data.id_cliente_membresia),
      monto: parseFloat(data.monto),
      metodo_pago: data.metodo_pago,
    }
    const res = await fetch(`${API_URL}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      reset()
      setShowForm(false)
      cargar()
    }
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
        <Button onClick={() => { setShowForm(!showForm); reset() }}>
          {showForm ? 'Cancelar' : 'Nuevo Pago'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-4">
          <h3 className="font-heading text-xl text-foreground tracking-wider">REGISTRAR PAGO</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
              <select {...register('id_cliente')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Seleccionar...</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
                ))}
              </select>
              {errors.id_cliente && <p className="text-destructive text-xs mt-1">{errors.id_cliente.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Membresía</label>
              <select {...register('id_cliente_membresia')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" disabled={!clienteSeleccionado}>
                <option value="">Seleccionar...</option>
                {asignaciones.filter(a => a.estado === 'activo').map(a => (
                  <option key={a.id_cliente_membresia} value={a.id_cliente_membresia}>
                    {a.membresia.nombre} - ₡{Number(a.membresia.precio).toLocaleString()}
                  </option>
                ))}
              </select>
              {errors.id_cliente_membresia && <p className="text-destructive text-xs mt-1">{errors.id_cliente_membresia.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" disabled={isSubmitting}>Registrar Pago</Button>
        </form>
      )}

      <div className="bg-surface border border-border rounded-card overflow-hidden">
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
            {pagos.map(p => (
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
            {pagos.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Sin pagos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

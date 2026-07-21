import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Cliente { id_cliente: number; nombre: string; apellido: string; cedula: string }
interface Membresia { id_membresia: number; nombre: string; precio: number; duracion_dias: number }
interface Asignacion {
  id_cliente_membresia: number
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  membresia: { nombre: string }
  cliente?: { nombre: string; apellido: string }
}

const asignarSchema = z.object({
  id_cliente: z.string().min(1, 'Seleccione un cliente'),
  id_membresia: z.string().min(1, 'Seleccione un plan'),
  fecha_inicio: z.string().min(1, 'Seleccione una fecha'),
})

type AsignarForm = z.infer<typeof asignarSchema>

export function AsignarMembresia() {
  const token = useAuthStore((s) => s.token)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [membresias, setMembresias] = useState<Membresia[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AsignarForm>({
    resolver: zodResolver(asignarSchema),
  })

  async function cargar() {
    const [cRes, mRes, aRes] = await Promise.all([
      fetch(`${API_URL}/clientes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/membresias`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/clientes-membresias`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (cRes.ok) setClientes(await cRes.json())
    if (mRes.ok) setMembresias(await mRes.json())
    if (aRes.ok) setAsignaciones(await aRes.json())
  }

  useEffect(() => { cargar() }, [])

  async function onSubmit(data: AsignarForm) {
    const body = { id_cliente: parseInt(data.id_cliente), id_membresia: parseInt(data.id_membresia), fecha_inicio: data.fecha_inicio }
    const res = await fetch(`${API_URL}/clientes-membresias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      reset()
      cargar()
    }
  }

  async function renovar(id: number) {
    await fetch(`${API_URL}/clientes-membresias/${id}/renovar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    cargar()
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl text-foreground tracking-wider">ASIGNAR MEMBRESÍA</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
            <select {...register('id_cliente')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Seleccionar...</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
              ))}
            </select>
            {errors.id_cliente && <p className="text-destructive text-xs mt-1">{errors.id_cliente.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Plan</label>
            <select {...register('id_membresia')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Seleccionar...</option>
              {membresias.filter(m => m.precio).map((m) => (
                <option key={m.id_membresia} value={m.id_membresia}>{m.nombre} - ₡{Number(m.precio).toLocaleString()}</option>
              ))}
            </select>
            {errors.id_membresia && <p className="text-destructive text-xs mt-1">{errors.id_membresia.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Fecha de Inicio</label>
            <input type="date" {...register('fecha_inicio')}
              className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.fecha_inicio && <p className="text-destructive text-xs mt-1">{errors.fecha_inicio.message}</p>}
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>Asignar</Button>
      </form>

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Cliente</th>
              <th className="text-left p-4 text-muted font-medium">Plan</th>
              <th className="text-left p-4 text-muted font-medium">Inicio</th>
              <th className="text-left p-4 text-muted font-medium">Fin</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
              <th className="text-left p-4 text-muted font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((a) => (
              <tr key={a.id_cliente_membresia} className="border-t border-border">
                <td className="p-4 text-foreground">{a.cliente ? `${a.cliente.nombre} ${a.cliente.apellido}` : '-'}</td>
                <td className="p-4 text-muted">{a.membresia.nombre}</td>
                <td className="p-4 text-muted">{new Date(a.fecha_inicio).toLocaleDateString()}</td>
                <td className="p-4 text-muted">{new Date(a.fecha_fin).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${a.estado === 'activo' ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {a.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 space-x-3">
                  <button onClick={() => renovar(a.id_cliente_membresia)} className="text-primary hover:underline text-xs font-medium">Renovar</button>
                  {a.estado === 'activo' && (
                    <button onClick={async () => { await fetch(`${API_URL}/clientes-membresias/${a.id_cliente_membresia}/cancelar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); cargar() }}
                      className="text-destructive hover:underline text-xs font-medium">Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
            {asignaciones.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Sin asignaciones</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

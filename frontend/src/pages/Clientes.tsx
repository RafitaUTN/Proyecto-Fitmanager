import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TransferRequestModal, type TransferRequestData } from '@/components/TransferRequestModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  cedula: string
  telefono: string | null
  correo: string
  fecha_nacimiento: string | null
  fecha_registro: string
  estado: boolean
}

const clienteSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  cedula: z.string().min(1),
  telefono: z.string().optional(),
  correo: z.string().email(),
  fecha_nacimiento: z.string().optional(),
})

type ClienteForm = z.infer<typeof clienteSchema>

export function Clientes() {
  const token = useAuthStore((s) => s.token)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [error, setError] = useState('')
  const [transferData, setTransferData] = useState<TransferRequestData | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
  })

  async function cargar() {
    const res = await fetch(`${API_URL}/clientes`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setClientes(await res.json())
  }

  useEffect(() => { cargar() }, [])

  async function onSubmit(data: ClienteForm) {
    setError('')
    const url = editing ? `${API_URL}/clientes/${editing.id_cliente}` : `${API_URL}/clientes`
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      reset()
      setShowForm(false)
      setEditing(null)
      cargar()
      return
    }

    const body = await res.json().catch(() => null)
    if (!body) { setError(`Error ${res.status}`); return }

    if (res.status === 409 && !editing && body.error) {
      try {
        const parsed = JSON.parse(body.error)
        if (parsed?.codigo === 'CLIENTE_ACTIVO_OTRO_GYM') {
          setTransferData(parsed)
          return
        }
      } catch {
        // plain text error message
      }
    }

    setError(body.error || `Error ${res.status}`)
  }

  function editar(c: Cliente) {
    setEditing(c)
    setShowForm(true)
    reset({
      nombre: c.nombre,
      apellido: c.apellido,
      cedula: c.cedula,
      telefono: c.telefono || '',
      correo: c.correo,
      fecha_nacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.slice(0, 10) : '',
    })
  }

  async function toggleEstado(c: Cliente) {
    await fetch(`${API_URL}/clientes/${c.id_cliente}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: !c.estado }),
    })
    cargar()
  }

  async function eliminar(id: number) {
    if (!window.confirm('¿Eliminar este cliente?')) return
    await fetch(`${API_URL}/clientes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    cargar()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">CLIENTES</h2>
        <Button onClick={() => { setShowForm(!showForm); setEditing(null); reset() }}>
          {showForm ? 'Cancelar' : 'Nuevo Cliente'}
        </Button>
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2 rounded-button">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-4">
          <h3 className="font-heading text-xl text-foreground tracking-wider">{editing ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
              <Input {...register('nombre')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Apellido</label>
              <Input {...register('apellido')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Cédula</label>
              <Input {...register('cedula')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Teléfono</label>
              <Input {...register('telefono')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
            <Input type="email" {...register('correo')} />
            {errors.correo && <p className="text-destructive text-xs mt-1">{errors.correo.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Fecha de Nacimiento</label>
            <Input type="date" {...register('fecha_nacimiento')} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {editing ? 'Actualizar' : 'Guardar'}
          </Button>
        </form>
      )}

      <div className="bg-surface border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Nombre</th>
              <th className="text-left p-4 text-muted font-medium">Cédula</th>
              <th className="text-left p-4 text-muted font-medium">Correo</th>
              <th className="text-left p-4 text-muted font-medium">Teléfono</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
              <th className="text-left p-4 text-muted font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id_cliente} className="border-t border-border">
                <td className="p-4 text-foreground">{c.nombre} {c.apellido}</td>
                <td className="p-4 text-muted">{c.cedula}</td>
                <td className="p-4 text-muted">{c.correo}</td>
                <td className="p-4 text-muted">{c.telefono || '-'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${c.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {c.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 space-x-3">
                  <button onClick={() => editar(c)} className="text-primary hover:underline text-xs font-medium">Editar</button>
                  <button onClick={() => toggleEstado(c)}
                    className={`hover:underline text-xs font-medium ${c.estado ? 'text-destructive' : 'text-secondary'}`}>
                    {c.estado ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => eliminar(c.id_cliente)} className="text-destructive hover:underline text-xs font-medium">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransferRequestModal
        open={transferData !== null}
        data={transferData}
        onCancel={() => setTransferData(null)}
        onSuccess={() => {
          setTransferData(null)
          cargar()
        }}
      />
    </div>
  )
}

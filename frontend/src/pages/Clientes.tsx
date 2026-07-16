import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
  })

  async function cargar() {
    const res = await fetch(`${API_URL}/clientes`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setClientes(await res.json())
  }

  useEffect(() => { cargar() }, [])

  async function onSubmit(data: ClienteForm) {
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
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clientes</h2>
        <Button onClick={() => { setShowForm(!showForm); setEditing(null); reset() }}>
          {showForm ? 'Cancelar' : 'Nuevo Cliente'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="font-semibold">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input {...register('nombre')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido</label>
              <Input {...register('apellido')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <Input {...register('cedula')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <Input {...register('telefono')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <Input type="email" {...register('correo')} />
            {errors.correo && <p className="text-red-500 text-xs">{errors.correo.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
            <Input type="date" {...register('fecha_nacimiento')} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {editing ? 'Actualizar' : 'Guardar'}
          </Button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Cédula</th>
              <th className="text-left p-3">Correo</th>
              <th className="text-left p-3">Teléfono</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id_cliente} className="border-t">
                <td className="p-3">{c.nombre} {c.apellido}</td>
                <td className="p-3">{c.cedula}</td>
                <td className="p-3">{c.correo}</td>
                <td className="p-3">{c.telefono || '-'}</td>
                <td className="p-3">{c.estado ? 'Activo' : 'Inactivo'}</td>
                <td className="p-3">
                  <button onClick={() => editar(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

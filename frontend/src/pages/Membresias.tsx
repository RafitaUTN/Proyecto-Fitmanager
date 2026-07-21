import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Membresia {
  id_membresia: number
  nombre: string
  descripcion: string | null
  precio: number
  duracion_dias: number
  estado: boolean
}

const membresiaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Precio inválido'),
  duracion_dias: z.string().regex(/^\d+$/, 'Debe ser un número'),
})

type MembresiaForm = z.infer<typeof membresiaSchema>

export function Membresias() {
  const token = useAuthStore((s) => s.token)
  const [items, setItems] = useState<Membresia[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Membresia | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MembresiaForm>({
    resolver: zodResolver(membresiaSchema),
  })

  async function cargar() {
    const res = await fetch(`${API_URL}/membresias`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { cargar() }, [])

  async function onSubmit(data: MembresiaForm) {
    const body = { ...data, precio: parseFloat(data.precio), duracion_dias: parseInt(data.duracion_dias) }
    const url = editing ? `${API_URL}/membresias/${editing.id_membresia}` : `${API_URL}/membresias`
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      reset()
      setShowForm(false)
      setEditing(null)
      cargar()
    }
  }

  function editar(m: Membresia) {
    setEditing(m)
    setShowForm(true)
    reset({ nombre: m.nombre, descripcion: m.descripcion || '', precio: String(m.precio), duracion_dias: String(m.duracion_dias) })
  }

  async function toggleEstado(m: Membresia) {
    await fetch(`${API_URL}/membresias/${m.id_membresia}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: !m.estado }),
    })
    cargar()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Planes de Membresía</h2>
        <Button onClick={() => { setShowForm(!showForm); setEditing(null); reset({ duracion_dias: '30' }) }}>
          {showForm ? 'Cancelar' : 'Nuevo Plan'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="font-semibold">{editing ? 'Editar Plan' : 'Nuevo Plan'}</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input {...register('nombre')} />
            {errors.nombre && <p className="text-red-500 text-xs">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <Input {...register('descripcion')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Precio (₡)</label>
              <Input type="number" step="0.01" {...register('precio')} />
              {errors.precio && <p className="text-red-500 text-xs">{errors.precio.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duración (días)</label>
              <Input type="number" {...register('duracion_dias')} />
              {errors.duracion_dias && <p className="text-red-500 text-xs">{errors.duracion_dias.message}</p>}
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>{editing ? 'Actualizar' : 'Guardar'}</Button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <div key={m.id_membresia} className="bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">{m.nombre}</h3>
              <span className={`text-xs px-2 py-1 rounded ${m.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {m.estado ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {m.descripcion && <p className="text-sm text-gray-600">{m.descripcion}</p>}
            <p className="text-2xl font-bold text-blue-600">₡{Number(m.precio).toLocaleString()}</p>
            <p className="text-sm text-gray-500">{m.duracion_dias} días</p>
            <div className="space-x-2">
              <button onClick={() => editar(m)} className="text-blue-600 hover:underline text-sm">Editar</button>
              <button onClick={() => toggleEstado(m)} className={`hover:underline text-sm ${m.estado ? 'text-red-600' : 'text-green-600'}`}>
                {m.estado ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No hay planes de membresía</p>}
      </div>
    </div>
  )
}

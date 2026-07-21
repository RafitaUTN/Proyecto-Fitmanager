import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Usuario {
  id_usuario: number
  nombre: string
  apellido: string
  correo: string
  rol: string
  estado: boolean
}

const crearSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  correo: z.string().email(),
  password: z.string().min(6),
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']),
})

type CrearForm = z.infer<typeof crearSchema>

export function Usuarios() {
  const token = useAuthStore((s) => s.token)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CrearForm>({
    resolver: zodResolver(crearSchema),
    defaultValues: { rol: 'Recepcionista' },
  })

  async function cargarUsuarios() {
    const res = await fetch(`${API_URL}/usuarios`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setUsuarios(await res.json())
  }

  useEffect(() => { cargarUsuarios() }, [])

  async function onSubmit(data: CrearForm) {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      reset()
      setShowForm(false)
      cargarUsuarios()
    }
  }

  async function toggleEstado(u: Usuario) {
    await fetch(`${API_URL}/usuarios/${u.id_usuario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: !u.estado }),
    })
    cargarUsuarios()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Usuarios</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input {...register('nombre')} />
              {errors.nombre && <p className="text-red-500 text-xs">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido</label>
              <Input {...register('apellido')} />
              {errors.apellido && <p className="text-red-500 text-xs">{errors.apellido.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <Input type="email" {...register('correo')} />
            {errors.correo && <p className="text-red-500 text-xs">{errors.correo.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <Input type="password" {...register('password')} />
            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select {...register('rol')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="Administrador">Administrador</option>
              <option value="Recepcionista">Recepcionista</option>
              <option value="Entrenador">Entrenador</option>
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting}>Guardar</Button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Correo</th>
              <th className="text-left p-3">Rol</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id_usuario} className="border-t">
                <td className="p-3">{u.nombre} {u.apellido}</td>
                <td className="p-3">{u.correo}</td>
                <td className="p-3">{u.rol}</td>
                <td className="p-3">{u.estado ? 'Activo' : 'Inactivo'}</td>
                <td className="p-3">
                  <button onClick={() => toggleEstado(u)} className={`hover:underline text-xs ${u.estado ? 'text-red-600' : 'text-green-600'}`}>
                    {u.estado ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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
        <h2 className="font-heading text-3xl text-foreground tracking-wider">USUARIOS</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
              <Input {...register('nombre')} />
              {errors.nombre && <p className="text-destructive text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Apellido</label>
              <Input {...register('apellido')} />
              {errors.apellido && <p className="text-destructive text-xs mt-1">{errors.apellido.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
            <Input type="email" {...register('correo')} />
            {errors.correo && <p className="text-destructive text-xs mt-1">{errors.correo.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Contraseña</label>
            <Input type="password" {...register('password')} />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Rol</label>
            <select {...register('rol')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="Administrador">Administrador</option>
              <option value="Recepcionista">Recepcionista</option>
              <option value="Entrenador">Entrenador</option>
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting}>Guardar</Button>
        </form>
      )}

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Nombre</th>
              <th className="text-left p-4 text-muted font-medium">Correo</th>
              <th className="text-left p-4 text-muted font-medium">Rol</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
              <th className="text-left p-4 text-muted font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id_usuario} className="border-t border-border">
                <td className="p-4 text-foreground">{u.nombre} {u.apellido}</td>
                <td className="p-4 text-muted">{u.correo}</td>
                <td className="p-4">
                  <span className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-badge font-medium">{u.rol}</span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${u.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {u.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => toggleEstado(u)}
                    className={`text-xs font-medium hover:underline ${u.estado ? 'text-destructive' : 'text-secondary'}`}>
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

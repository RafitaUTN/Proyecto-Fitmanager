import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUsuarios, useCrearUsuario, useActualizarUsuario, useEliminarUsuario } from '@/hooks/use-usuarios'

const crearSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  correo: z.string().email(),
  password: z.string().min(6),
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']),
})

type CrearForm = z.infer<typeof crearSchema>

export function Usuarios() {
  const [showForm, setShowForm] = useState(false)

  const { data: usuarios, isLoading } = useUsuarios()
  const crearMutation = useCrearUsuario(() => { reset(); setShowForm(false) })
  const actualizarMutation = useActualizarUsuario()
  const eliminarMutation = useEliminarUsuario()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CrearForm>({
    resolver: zodResolver(crearSchema),
    defaultValues: { rol: 'Recepcionista' },
  })

  async function onSubmit(data: CrearForm) {
    crearMutation.mutate(data)
  }

  function toggleEstado(u: { id_usuario: number; estado: boolean }) {
    actualizarMutation.mutate({ id: u.id_usuario, data: { estado: !u.estado } })
  }

  function eliminar(id: number) {
    if (!window.confirm('¿Eliminar este usuario?')) return
    eliminarMutation.mutate(id)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Button type="submit" disabled={isSubmitting || crearMutation.isPending}>Guardar</Button>
        </form>
      )}

      <div className="bg-surface border border-border rounded-card overflow-x-auto">
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
            {isLoading && (
              <tr><td colSpan={5} className="p-6 text-center text-muted">Cargando...</td></tr>
            )}
            {usuarios?.map((u) => (
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
                <td className="p-4 space-x-3">
                  <button onClick={() => toggleEstado(u)}
                    className={`text-xs font-medium hover:underline ${u.estado ? 'text-destructive' : 'text-secondary'}`}>
                    {u.estado ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => eliminar(u.id_usuario)} className="text-destructive hover:underline text-xs font-medium">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {usuarios?.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted">Sin usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

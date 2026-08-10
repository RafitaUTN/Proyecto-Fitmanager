import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useUsuarios, useCrearUsuario, useActualizarUsuario, useEliminarUsuario } from '@/hooks/use-usuarios'
import { PasswordRequirements } from '@/features/auth/PasswordRequirements'
import { strongPasswordSchema } from '@/features/auth/password-policy'

const crearSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  correo: z.string().email('Correo inválido'),
  password: strongPasswordSchema,
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']),
})

const editarSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  correo: z.string().email('Correo inválido'),
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']),
  password: z.union([z.literal(''), strongPasswordSchema]),
})

type CrearForm = z.infer<typeof crearSchema>
type EditarForm = z.infer<typeof editarSchema>

export function Usuarios() {
  const authUser = useAuthStore((s) => s.usuario)
  const [modalOpen, setModalOpen] = useState<'crear' | 'editar' | null>(null)
  const [editTarget, setEditTarget] = useState<{ id_usuario: number; nombre: string; apellido: string; correo: string; rol: string; estado: boolean } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const { data: usuarios, isLoading } = useUsuarios()
  const crearMutation = useCrearUsuario(() => { setModalOpen(null); resetCrear() })
  const actualizarMutation = useActualizarUsuario(() => { setModalOpen(null); setEditTarget(null); resetEditar() })
  const eliminarMutation = useEliminarUsuario()

  const crearForm = useForm<CrearForm>({
    resolver: zodResolver(crearSchema),
    defaultValues: { rol: 'Recepcionista' },
  })

  const editarForm = useForm<EditarForm>({
    resolver: zodResolver(editarSchema),
  })
  const crearPassword = useWatch({ control: crearForm.control, name: 'password', defaultValue: '' })
  const editarPassword = useWatch({ control: editarForm.control, name: 'password', defaultValue: '' })

  function resetCrear() {
    crearForm.reset({ nombre: '', apellido: '', correo: '', password: '', rol: 'Recepcionista' })
  }

  function resetEditar() {
    editarForm.reset({ nombre: '', apellido: '', correo: '', rol: 'Recepcionista', password: '' })
  }

  function abrirCrear() {
    resetCrear()
    setModalOpen('crear')
  }

  function abrirEditar(u: typeof editTarget) {
    if (!u) return
    setEditTarget(u)
    editarForm.reset({
      nombre: u.nombre,
      apellido: u.apellido,
      correo: u.correo,
      rol: u.rol as 'Administrador' | 'Recepcionista' | 'Entrenador',
      password: '',
    })
    setModalOpen('editar')
  }

  async function onSubmitCrear(data: CrearForm) {
    crearMutation.mutate(data)
  }

  async function onSubmitEditar(data: EditarForm) {
    if (!editTarget) return
    const payload: any = {
      nombre: data.nombre,
      apellido: data.apellido,
      correo: data.correo,
      rol: data.rol,
      estado: editTarget.estado,
    }
    if (data.password) {
      payload.password = data.password
    }
    actualizarMutation.mutate({ id: editTarget.id_usuario, data: payload })
  }

  function toggleEstado(u: { id_usuario: number; estado: boolean }) {
    actualizarMutation.mutate({ id: u.id_usuario, data: { estado: !u.estado } })
  }

  function confirmarEliminar() {
    if (confirmDeleteId !== null) {
      eliminarMutation.mutate(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  const esMismoUsuario = (id: number) => authUser && Number(authUser.id_usuario) === id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">USUARIOS</h2>
        <Button onClick={abrirCrear}>Nuevo Usuario</Button>
      </div>

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
                <td className="p-4 text-foreground">
                  {u.nombre} {u.apellido}
                  {esMismoUsuario(u.id_usuario) && <span className="text-xs text-muted-dark ml-2">(tú)</span>}
                </td>
                <td className="p-4 text-muted">{u.correo}</td>
                <td className="p-4">
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-badge font-medium">{u.rol}</span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${u.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {u.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 space-x-3">
                  <button onClick={() => abrirEditar(u)} className="text-primary hover:underline text-xs font-medium">
                    Editar
                  </button>
                  <button onClick={() => toggleEstado(u)}
                    className={`text-xs font-medium hover:underline ${u.estado ? 'text-destructive' : 'text-secondary'}`}>
                    {u.estado ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => setConfirmDeleteId(u.id_usuario)} className="text-destructive hover:underline text-xs font-medium">
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

      {/* Modal Crear */}
      {modalOpen === 'crear' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setModalOpen(null); resetCrear() }}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">NUEVO USUARIO</h3>
              <button onClick={() => { setModalOpen(null); resetCrear() }} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            <form onSubmit={crearForm.handleSubmit(onSubmitCrear)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
                  <Input {...crearForm.register('nombre')} />
                  {crearForm.formState.errors.nombre && <p className="text-destructive text-xs mt-1">{crearForm.formState.errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Apellido</label>
                  <Input {...crearForm.register('apellido')} />
                  {crearForm.formState.errors.apellido && <p className="text-destructive text-xs mt-1">{crearForm.formState.errors.apellido.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
                <Input type="email" {...crearForm.register('correo')} />
                {crearForm.formState.errors.correo && <p className="text-destructive text-xs mt-1">{crearForm.formState.errors.correo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Contraseña</label>
                <Input type="password" {...crearForm.register('password')} />
                {crearForm.formState.errors.password && <p className="text-destructive text-xs mt-1">{crearForm.formState.errors.password.message}</p>}
                <div className="mt-2"><PasswordRequirements value={crearPassword} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Rol</label>
                <select {...crearForm.register('rol')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="Administrador">Administrador</option>
                  <option value="Recepcionista">Recepcionista</option>
                  <option value="Entrenador">Entrenador</option>
                </select>
              </div>
              <Button type="submit" disabled={crearForm.formState.isSubmitting || crearMutation.isPending} className="w-full">Guardar</Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalOpen === 'editar' && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setModalOpen(null); setEditTarget(null); resetEditar() }}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">EDITAR USUARIO</h3>
              <button onClick={() => { setModalOpen(null); setEditTarget(null); resetEditar() }} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            <form onSubmit={editarForm.handleSubmit(onSubmitEditar)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
                  <Input {...editarForm.register('nombre')} />
                  {editarForm.formState.errors.nombre && <p className="text-destructive text-xs mt-1">{editarForm.formState.errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Apellido</label>
                  <Input {...editarForm.register('apellido')} />
                  {editarForm.formState.errors.apellido && <p className="text-destructive text-xs mt-1">{editarForm.formState.errors.apellido.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
                <Input type="email" {...editarForm.register('correo')} />
                {editarForm.formState.errors.correo && <p className="text-destructive text-xs mt-1">{editarForm.formState.errors.correo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Rol</label>
                <select {...editarForm.register('rol')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="Administrador">Administrador</option>
                  <option value="Recepcionista">Recepcionista</option>
                  <option value="Entrenador">Entrenador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Estado</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit_estado" checked={editTarget.estado}
                      onChange={() => setEditTarget({ ...editTarget, estado: true })}
                      className="accent-primary" />
                    <span className="text-sm text-foreground">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit_estado" checked={!editTarget.estado}
                      onChange={() => setEditTarget({ ...editTarget, estado: false })}
                      className="accent-primary" />
                    <span className="text-sm text-foreground">Inactivo</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Nueva contraseña <span className="text-muted-dark font-normal">(opcional)</span></label>
                <Input type="password" {...editarForm.register('password')} placeholder="Dejar vacío para mantener" />
                {editarForm.formState.errors.password && <p className="text-destructive text-xs mt-1">{editarForm.formState.errors.password.message}</p>}
                {editarPassword ? <div className="mt-2"><PasswordRequirements value={editarPassword} /></div> : null}
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={actualizarMutation.isPending} className="flex-1">Guardar Cambios</Button>
                <Button type="button" variant="outline" onClick={() => { setModalOpen(null); setEditTarget(null); resetEditar() }}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmDeleteId(null)}
        title="Eliminar usuario"
        description="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminarMutation.isPending}
      />
    </div>
  )
}

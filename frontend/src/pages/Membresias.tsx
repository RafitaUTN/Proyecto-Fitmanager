import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useMembresias, useCrearMembresia, useActualizarMembresia, useEliminarMembresia } from '@/hooks/use-membresias'

const membresiaSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  precio: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Precio inválido'),
  duracion_dias: z.string().regex(/^\d+$/, 'Debe ser un número'),
})

type MembresiaForm = z.infer<typeof membresiaSchema>

export function Membresias() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const [modalOpen, setModalOpen] = useState<'crear' | 'editar' | null>(null)
  const [editing, setEditing] = useState<{ id_membresia: number; nombre: string; descripcion: string | null; precio: number; duracion_dias: number } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const { data: items, isLoading } = useMembresias()
  const crearMutation = useCrearMembresia(() => cerrarModal())
  const actualizarMutation = useActualizarMembresia(() => cerrarModal())
  const eliminarMutation = useEliminarMembresia()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MembresiaForm>({
    resolver: zodResolver(membresiaSchema),
  })

  function cerrarModal() {
    setModalOpen(null)
    setEditing(null)
    reset()
  }

  async function onSubmit(data: MembresiaForm) {
    const body = { nombre: data.nombre, descripcion: data.descripcion, precio: parseFloat(data.precio), duracion_dias: parseInt(data.duracion_dias) }
    if (editing) {
      actualizarMutation.mutate({ id: editing.id_membresia, data: body })
    } else {
      crearMutation.mutate(body)
    }
  }

  function abrirCrear() {
    reset({ nombre: '', descripcion: '', precio: '', duracion_dias: '30' })
    setEditing(null)
    setModalOpen('crear')
  }

  function abrirEditar(m: { id_membresia: number; nombre: string; descripcion: string | null; precio: number; duracion_dias: number }) {
    setEditing(m)
    reset({ nombre: m.nombre, descripcion: m.descripcion || '', precio: String(m.precio), duracion_dias: String(m.duracion_dias) })
    setModalOpen('editar')
  }

  function toggleEstado(m: { id_membresia: number; estado: boolean }) {
    actualizarMutation.mutate({ id: m.id_membresia, data: { estado: !m.estado } })
  }

  function confirmarEliminar() {
    if (confirmDeleteId !== null) {
      eliminarMutation.mutate(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">PLANES MEMBRESÍA</h2>
        <PermissionGuard permission={() => esAdmin}>
          <Button onClick={abrirCrear}>Nuevo Plan</Button>
        </PermissionGuard>
      </div>

      {isLoading && <p className="text-muted text-center py-6">Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items?.map((m) => (
          <div key={m.id_membresia} className="bg-surface border border-border rounded-card p-5 space-y-3 hover:border-primary/30 transition-all duration-200">
            <div className="flex justify-between items-start">
              <h3 className="font-heading text-xl text-foreground tracking-wider">{m.nombre}</h3>
              <span className={`text-[11px] px-2.5 py-1 rounded-badge font-medium ${m.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                {m.estado ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {m.descripcion && <p className="text-sm text-muted">{m.descripcion}</p>}
            <p className="text-3xl font-bold text-primary">₡{Number(m.precio).toLocaleString()}</p>
            <p className="text-sm text-muted-dark">{m.duracion_dias} días</p>
            <div className="flex gap-3 pt-1">
              <PermissionGuard permission={() => esAdmin}>
                <button onClick={() => abrirEditar(m)} className="text-primary hover:underline text-sm font-medium">Editar</button>
                <button onClick={() => toggleEstado(m)}
                  className={`hover:underline text-sm font-medium ${m.estado ? 'text-destructive' : 'text-secondary'}`}>
                  {m.estado ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => setConfirmDeleteId(m.id_membresia)} className="text-destructive hover:underline text-sm font-medium">
                  Eliminar
                </button>
              </PermissionGuard>
            </div>
          </div>
        ))}
        {!isLoading && items?.length === 0 && <p className="text-muted col-span-full text-center py-12">No hay planes de membresía</p>}
      </div>

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cerrarModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">{editing ? 'EDITAR PLAN' : 'NUEVO PLAN'}</h3>
              <button onClick={cerrarModal} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
                <Input {...register('nombre')} />
                {errors.nombre && <p className="text-destructive text-xs mt-1">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Descripción</label>
                <Input {...register('descripcion')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Precio (₡)</label>
                  <Input type="number" step="0.01" {...register('precio')} />
                  {errors.precio && <p className="text-destructive text-xs mt-1">{errors.precio.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Duración (días)</label>
                  <Input type="number" {...register('duracion_dias')} />
                  {errors.duracion_dias && <p className="text-destructive text-xs mt-1">{errors.duracion_dias.message}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || crearMutation.isPending || actualizarMutation.isPending} className="flex-1">
                  {editing ? 'Actualizar' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmDeleteId(null)}
        title="Eliminar plan"
        description="¿Estás seguro de eliminar este plan de membresía? Los clientes con este plan asignado no se verán afectados."
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminarMutation.isPending}
      />
    </div>
  )
}

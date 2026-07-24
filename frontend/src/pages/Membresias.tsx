import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useMembresias, useCrearMembresia, useActualizarMembresia, useEliminarMembresia } from '@/hooks/use-membresias'

const membresiaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Precio inválido'),
  duracion_dias: z.string().regex(/^\d+$/, 'Debe ser un número'),
})

type MembresiaForm = z.infer<typeof membresiaSchema>

export function Membresias() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<{ id_membresia: number } | null>(null)

  const { data: items, isLoading } = useMembresias()
  const crearMutation = useCrearMembresia(() => { reset(); setShowForm(false); setEditing(null) })
  const actualizarMutation = useActualizarMembresia(() => { reset(); setShowForm(false); setEditing(null) })
  const eliminarMutation = useEliminarMembresia()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MembresiaForm>({
    resolver: zodResolver(membresiaSchema),
  })

  async function onSubmit(data: MembresiaForm) {
    const body = { nombre: data.nombre, descripcion: data.descripcion, precio: parseFloat(data.precio), duracion_dias: parseInt(data.duracion_dias) }
    if (editing) {
      actualizarMutation.mutate({ id: editing.id_membresia, data: body })
    } else {
      crearMutation.mutate(body)
    }
  }

  function editar(m: { id_membresia: number; nombre: string; descripcion: string | null; precio: number; duracion_dias: number }) {
    setEditing(m)
    setShowForm(true)
    reset({ nombre: m.nombre, descripcion: m.descripcion || '', precio: String(m.precio), duracion_dias: String(m.duracion_dias) })
  }

  function toggleEstado(m: { id_membresia: number; estado: boolean }) {
    actualizarMutation.mutate({ id: m.id_membresia, data: { estado: !m.estado } })
  }

  function eliminar(id: number) {
    if (!window.confirm('¿Eliminar este plan?')) return
    eliminarMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">PLANES MEMBRESÍA</h2>
        <PermissionGuard permission={() => esAdmin}>
          <Button onClick={() => { setShowForm(!showForm); setEditing(null); reset({ duracion_dias: '30' }) }}>
            {showForm ? 'Cancelar' : 'Nuevo Plan'}
          </Button>
        </PermissionGuard>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-4">
          <h3 className="font-heading text-xl text-foreground tracking-wider">{editing ? 'EDITAR PLAN' : 'NUEVO PLAN'}</h3>
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
          <Button type="submit" disabled={isSubmitting || crearMutation.isPending || actualizarMutation.isPending}>
            {editing ? 'Actualizar' : 'Guardar'}
          </Button>
        </form>
      )}

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
                <button onClick={() => editar(m)} className="text-primary hover:underline text-sm font-medium">Editar</button>
                <button onClick={() => toggleEstado(m)}
                  className={`hover:underline text-sm font-medium ${m.estado ? 'text-destructive' : 'text-secondary'}`}>
                  {m.estado ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => eliminar(m.id_membresia)} className="text-destructive hover:underline text-sm font-medium">
                  Eliminar
                </button>
              </PermissionGuard>
            </div>
          </div>
        ))}
        {!isLoading && items?.length === 0 && <p className="text-muted col-span-full text-center py-12">No hay planes de membresía</p>}
      </div>
    </div>
  )
}

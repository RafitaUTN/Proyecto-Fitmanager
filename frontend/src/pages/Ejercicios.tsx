import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth.store'
import { useEjercicios, useCrearEjercicio, useActualizarEjercicio, useEliminarEjercicio } from '@/hooks/use-ejercicios'

const niveles = ['principiante', 'intermedio', 'avanzado'] as const

const categorias = [
  'Pecho', 'Espalda', 'Pierna', 'Bíceps', 'Tríceps',
  'Hombro', 'Abdomen', 'Cardio', 'Funcional', 'Movilidad',
]

const ejercicioSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(100),
  grupo_muscular: z.string().min(1, 'Requerido').max(50),
  descripcion: z.string().optional(),
  nivel: z.enum(niveles).optional().default('principiante'),
  categoria: z.string().optional(),
})

type EjercicioForm = z.infer<typeof ejercicioSchema>

const nivelLabel: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

const nivelColor: Record<string, string> = {
  principiante: 'bg-green-500/10 text-green-400',
  intermedio: 'bg-yellow-500/10 text-yellow-400',
  avanzado: 'bg-red-500/10 text-red-400',
}

export function Ejercicios() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const esAdminOEntrenador = usuario?.rol === 'Administrador' || usuario?.rol === 'Entrenador'
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<{ id: number } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const { data: ejercicios, isLoading } = useEjercicios()
  const crearMutation = useCrearEjercicio(() => cerrarModal())
  const actualizarMutation = useActualizarEjercicio(() => cerrarModal())
  const eliminarMutation = useEliminarEjercicio()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EjercicioForm>({
    resolver: zodResolver(ejercicioSchema) as any,
  })

  function cerrarModal() {
    setModalOpen(false)
    setEditando(null)
    reset()
  }

  function abrirCrear() {
    reset({ nombre: '', grupo_muscular: '', descripcion: '', nivel: 'principiante', categoria: '' })
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEdicion(ej: { id_ejercicio: number; nombre: string; grupo_muscular: string; descripcion: string | null; nivel: string; categoria: string | null; estado: boolean }) {
    setEditando({ id: ej.id_ejercicio })
    reset({
      nombre: ej.nombre,
      grupo_muscular: ej.grupo_muscular,
      descripcion: ej.descripcion || '',
      nivel: ej.nivel as typeof niveles[number],
      categoria: ej.categoria || '',
    })
    setModalOpen(true)
  }

  function toggleEstado(ej: { id_ejercicio: number; estado: boolean }) {
    actualizarMutation.mutate({ id: ej.id_ejercicio, data: { estado: !ej.estado } })
  }

  async function onSubmit(data: EjercicioForm) {
    if (editando) {
      actualizarMutation.mutate({ id: editando.id, data })
    } else {
      crearMutation.mutate(data)
    }
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
        <h2 className="font-heading text-3xl text-foreground tracking-wider">EJERCICIOS</h2>
        {esAdminOEntrenador && <Button onClick={abrirCrear}>Nuevo Ejercicio</Button>}
      </div>

      <div className="bg-surface border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Nombre</th>
              <th className="text-left p-4 text-muted font-medium">Grupo Muscular</th>
              <th className="text-left p-4 text-muted font-medium">Categoría</th>
              <th className="text-left p-4 text-muted font-medium">Nivel</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
              <th className="text-left p-4 text-muted font-medium">Usos</th>
              {esAdminOEntrenador && <th className="text-left p-4 text-muted font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={esAdminOEntrenador ? 7 : 6} className="p-6 text-center text-muted">Cargando...</td></tr>
            )}
            {ejercicios?.map((ej) => (
              <tr key={ej.id_ejercicio} className="border-t border-border">
                <td className="p-4 text-foreground font-medium">{ej.nombre}</td>
                <td className="p-4"><span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-badge font-medium">{ej.grupo_muscular}</span></td>
                <td className="p-4 text-muted">{ej.categoria || '—'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${nivelColor[ej.nivel] || nivelColor.principiante}`}>
                    {nivelLabel[ej.nivel] || ej.nivel}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${ej.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {ej.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-muted">{ej._count.rutina_ejercicios}</td>
                {esAdminOEntrenador && (
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirEdicion(ej)}
                        className="text-xs px-3 py-1.5 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleEstado(ej)}
                        className={`text-xs px-3 py-1.5 rounded-button transition-colors cursor-pointer border ${
                          ej.estado
                            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
                            : 'bg-secondary/10 text-secondary hover:bg-secondary/20 border-secondary/20'
                        }`}
                      >
                        {ej.estado ? 'Desactivar' : 'Activar'}
                      </button>
                      {esAdmin && (
                        <button
                          onClick={() => setConfirmDeleteId(ej.id_ejercicio)}
                          className="text-xs px-3 py-1.5 rounded-button bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer border border-destructive/20"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!isLoading && ejercicios?.length === 0 && (
              <tr><td colSpan={esAdminOEntrenador ? 7 : 6} className="p-6 text-center text-muted">Sin ejercicios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cerrarModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">{editando ? 'EDITAR EJERCICIO' : 'NUEVO EJERCICIO'}</h3>
              <button onClick={cerrarModal} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
                  <input {...register('nombre')}
                    className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  {errors.nombre && <p className="text-destructive text-xs mt-1">{errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Grupo Muscular</label>
                  <select {...register('grupo_muscular')}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Seleccionar...</option>
                    {['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Piernas', 'Core', 'Cardio', 'Cuerpo completo'].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {errors.grupo_muscular && <p className="text-destructive text-xs mt-1">{errors.grupo_muscular.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Categoría</label>
                  <select {...register('categoria')}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Nivel</label>
                  <select {...register('nivel')}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Descripción</label>
                <textarea {...register('descripcion')}
                  rows={3}
                  className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || crearMutation.isPending || actualizarMutation.isPending} className="flex-1">
                  {editando ? 'Guardar Cambios' : 'Crear Ejercicio'}
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
        title="Eliminar ejercicio"
        description="¿Estás seguro de eliminar este ejercicio? Las rutinas que lo incluyen no se verán afectadas."
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminarMutation.isPending}
      />
    </div>
  )
}

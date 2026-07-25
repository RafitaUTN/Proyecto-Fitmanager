import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth.store'
import { useRutinas, useRutina, useCrearRutina, useActualizarRutina, useEliminarRutina, useAsignarRutina, useAsignacionesRutina, useClienteRutina, useRutinasDeCliente, useActualizarEjercicioCliente, useActualizarClienteRutina } from '@/hooks/use-rutinas'
import { useEjercicios } from '@/hooks/use-ejercicios'
import { useClientes } from '@/hooks/use-clientes'
import { useUsuarios } from '@/hooks/use-usuarios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

const ejercicioEnRutinaSchema = z.object({
  id_ejercicio: z.string().min(1, 'Requerido'),
  series: z.string().regex(/^\d+$/, 'Entero positivo'),
  repeticiones: z.string().regex(/^\d+$/, 'Entero positivo'),
  peso_sugerido: z.string().optional(),
})

const rutinaSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(100),
  descripcion: z.string().optional(),
  ejercicios: z.array(ejercicioEnRutinaSchema).min(1, 'Agregue al menos un ejercicio'),
})

type RutinaForm = z.infer<typeof rutinaSchema>

export function Rutinas() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const idUsuario = usuario?.id_usuario

  const [selectedId, setSelectedId] = useState<number | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [asignandoClienteId, setAsignandoClienteId] = useState<number | null>(null)
  const [asignandoEntrenadorId, setAsignandoEntrenadorId] = useState<number | null>(null)
  const [clienteAsignar, setClienteAsignar] = useState('')
  const [entrenadorAsignar, setEntrenadorAsignar] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // Trainer: client routine management
  const [clienteRutinaModal, setClienteRutinaModal] = useState(false)
  const [clienteRutinaId, setClienteRutinaId] = useState<number | undefined>()
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | undefined>()
  const [editandoEjercicio, setEditandoEjercicio] = useState<{ id: number; series: number; repeticiones: number; peso: number | null; descanso: number | null; observaciones: string | null } | null>(null)
  const [ejercicioEditModal, setEjercicioEditModal] = useState(false)

  const { data: rutinas, isLoading } = useRutinas()
  const { data: detalle } = useRutina(selectedId)
  const { data: ejercicios } = useEjercicios(esAdmin)
  const ejerciciosActivos = ejercicios?.filter((ej: any) => ej.estado) ?? []
  const { data: clientes } = useClientes(esAdmin ? undefined : { id_entrenador: String(idUsuario) })
  const { data: usuarios } = useUsuarios()
  const entrenadores = usuarios?.filter((u: any) => u.rol === 'Entrenador') ?? []
  const { data: asignaciones } = useAsignacionesRutina(selectedId)

  // Trainer: client routines
  const { data: rutinasCliente } = useRutinasDeCliente(clienteSeleccionado)
  const { data: clienteRutinaDetalle } = useClienteRutina(clienteRutinaId)

  const crearMutation = useCrearRutina(() => cerrarModal())
  const actualizarMutation = useActualizarRutina(() => cerrarModal())
  const eliminarMutation = useEliminarRutina()
  const asignarMutation = useAsignarRutina(() => { setAsignandoClienteId(null); setClienteAsignar('') })
  const actualizarEjercicioMutation = useActualizarEjercicioCliente(() => setEjercicioEditModal(false))
  const actualizarClienteRutinaMutation = useActualizarClienteRutina()

  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const asignarEntrenadorMutation = useMutation({
    mutationFn: ({ idRutina, idEntrenador }: { idRutina: number; idEntrenador: number }) =>
      http.post(`/rutinas/${idRutina}/asignar-entrenador`, { id_entrenador: idEntrenador }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      emit(DomainEvents.RUTINA_ASIGNADA_ENTRENADOR)
      addToast('Rutina asignada al entrenador', 'success')
      setAsignandoEntrenadorId(null)
      setEntrenadorAsignar('')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })

  const removerEntrenadorMutation = useMutation({
    mutationFn: ({ idRutina, idEntrenador }: { idRutina: number; idEntrenador: number }) =>
      http.del(`/rutinas/${idRutina}/asignar-entrenador/${idEntrenador}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      emit(DomainEvents.RUTINA_REMOVIDA_ENTRENADOR)
      addToast('Entrenador removido de la rutina', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<RutinaForm>({
    resolver: zodResolver(rutinaSchema),
    defaultValues: { ejercicios: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ejercicios' })

  function cerrarModal() {
    setModalOpen(false)
    setEditandoId(null)
    reset({ nombre: '', descripcion: '', ejercicios: [] })
  }

  function abrirCrear() {
    reset({ nombre: '', descripcion: '', ejercicios: [] })
    setEditandoId(null)
    setModalOpen(true)
  }

  function abrirEdicion(id: number, r: typeof detalle) {
    if (!r) return
    setEditandoId(id)
    reset({
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      ejercicios: r.rutina_ejercicios.map((re) => ({
        id_ejercicio: String(re.id_ejercicio),
        series: String(re.series),
        repeticiones: String(re.repeticiones),
        peso_sugerido: re.peso_sugerido ? String(re.peso_sugerido) : '',
      })),
    })
    setModalOpen(true)
  }

  function handleAsignarCliente() {
    if (!asignandoClienteId || !clienteAsignar) return
    asignarMutation.mutate({ idRutina: asignandoClienteId, id_cliente: parseInt(clienteAsignar) })
  }

  function handleAsignarEntrenador() {
    if (!asignandoEntrenadorId || !entrenadorAsignar) return
    asignarEntrenadorMutation.mutate({ idRutina: asignandoEntrenadorId, idEntrenador: parseInt(entrenadorAsignar) })
  }

  function toggleEstadoRutina(rutina: any) {
    actualizarMutation.mutate({ id: rutina.id_rutina, data: { estado: !rutina.estado } })
  }

  async function onSubmit(data: RutinaForm) {
    const payload = {
      nombre: data.nombre,
      descripcion: data.descripcion || undefined,
      ejercicios: data.ejercicios.map((e) => ({
        id_ejercicio: parseInt(e.id_ejercicio),
        series: parseInt(e.series),
        repeticiones: parseInt(e.repeticiones),
        peso_sugerido: e.peso_sugerido ? parseFloat(e.peso_sugerido) : undefined,
      })),
    }
    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, data: payload })
    } else {
      crearMutation.mutate(payload)
    }
  }

  function confirmarEliminar() {
    if (confirmDeleteId !== null) {
      eliminarMutation.mutate(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  function verRutinaCliente(idClienteRutina: number) {
    setClienteRutinaId(idClienteRutina)
    setClienteRutinaModal(true)
  }

  function abrirEditarEjercicio(ej: any) {
    setEditandoEjercicio({
      id: ej.id_cliente_rutina_ejercicio,
      series: ej.series,
      repeticiones: ej.repeticiones,
      peso: ej.peso,
      descanso: ej.descanso,
      observaciones: ej.observaciones,
    })
    setEjercicioEditModal(true)
  }

  function guardarEjercicio() {
    if (!clienteRutinaId || !editandoEjercicio) return
    actualizarEjercicioMutation.mutate({
      idClienteRutina: clienteRutinaId,
      idEjercicio: editandoEjercicio.id,
      data: {
        series: editandoEjercicio.series,
        repeticiones: editandoEjercicio.repeticiones,
        peso: editandoEjercicio.peso,
        descanso: editandoEjercicio.descanso,
        observaciones: editandoEjercicio.observaciones,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">
          {esAdmin ? 'RUTINAS' : 'MIS RUTINAS'}
        </h2>
        {esAdmin && <Button onClick={abrirCrear}>Nueva Rutina</Button>}
      </div>

      {/* Cards de rutinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-card p-5 animate-pulse">
            <div className="h-5 bg-surface-light rounded w-3/4 mb-3" />
            <div className="h-4 bg-surface-light rounded w-1/2 mb-2" />
            <div className="h-4 bg-surface-light rounded w-1/3" />
          </div>
        ))}
        {rutinas?.map((r: any) => (
          <div
            key={r.id_rutina}
            className={`bg-surface border rounded-card p-5 transition-all cursor-pointer ${
              selectedId === r.id_rutina ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
            } ${!r.estado ? 'opacity-60' : ''}`}
            onClick={() => setSelectedId(selectedId === r.id_rutina ? undefined : r.id_rutina)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{r.nombre}</h3>
                  {!r.estado && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-badge">Inactiva</span>}
                </div>
                <p className="text-sm text-muted mt-1">{r.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-dark">
              <span>{r._count.rutina_ejercicios} ejercicios</span>
              {esAdmin && (
                <>
                  <span>•</span>
                  <span>{r._count.cliente_rutinas} asignaciones</span>
                  <span>•</span>
                  <span>{r._count.entrenadores} entrenadores</span>
                </>
              )}
              <span>•</span>
              <span>{r.creador.nombre} {r.creador.apellido}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(r.id_rutina); setAsignandoClienteId(r.id_rutina); setClienteAsignar('') }}
                size="sm"
              >
                Asignar Cliente
              </Button>
              {esAdmin && (
                <>
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleEstadoRutina(r) }}
                    className={`text-xs px-3 py-1.5 rounded-button transition-colors cursor-pointer border ${
                      r.estado
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
                        : 'bg-secondary/10 text-secondary hover:bg-secondary/20 border-secondary/20'
                    }`}
                  >
                    {r.estado ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(r.id_rutina); setAsignandoEntrenadorId(r.id_rutina); setEntrenadorAsignar('') }}
                    className="text-xs px-3 py-1.5 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border"
                  >
                    Asignar Entrenador
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setConfirmDeleteId(r.id_rutina) }}
                    className="text-xs px-3 py-1.5 rounded-button bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer border border-destructive/20"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!isLoading && rutinas?.length === 0 && (
          <div className="col-span-full bg-surface border border-border rounded-card p-8 text-center text-muted">
            {esAdmin ? 'Sin rutinas registradas' : 'No tienes rutinas asignadas'}
          </div>
        )}
      </div>

      {/* Detalle de rutina seleccionada */}
      {detalle && selectedId && (
        <div className="bg-surface border border-border rounded-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-heading text-2xl text-foreground tracking-wider">{detalle.nombre}</h3>
                {!detalle.estado && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-badge">Inactiva</span>}
              </div>
              <p className="text-muted text-sm">{detalle.descripcion || 'Sin descripción'}</p>
              <p className="text-xs text-muted-dark mt-1">Creado por: {detalle.creador.nombre} {detalle.creador.apellido}</p>
            </div>
            {esAdmin && (
              <button
                onClick={() => abrirEdicion(selectedId, detalle)}
                className="text-sm px-4 py-2 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border"
              >
                Editar Rutina
              </button>
            )}
          </div>

          {esAdmin && detalle.entrenadores && detalle.entrenadores.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted mb-2">Entrenadores asignados</h4>
              <div className="flex flex-wrap gap-2">
                {detalle.entrenadores.map((e: any) => (
                  <span key={e.id_entrenador} className="flex items-center gap-1.5 text-xs bg-surface-light text-foreground px-3 py-1.5 rounded-badge border border-border">
                    {e.entrenador.nombre} {e.entrenador.apellido}
                    {esAdmin && (
                      <button
                        onClick={() => removerEntrenadorMutation.mutate({ idRutina: selectedId, idEntrenador: e.id_entrenador })}
                        className="text-destructive hover:text-destructive/80 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr>
                  <th className="text-left p-3 text-muted font-medium">Ejercicio</th>
                  <th className="text-left p-3 text-muted font-medium">Grupo Muscular</th>
                  <th className="text-left p-3 text-muted font-medium">Series</th>
                  <th className="text-left p-3 text-muted font-medium">Reps</th>
                  <th className="text-left p-3 text-muted font-medium">Peso Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {detalle.rutina_ejercicios.map((re: any) => (
                  <tr key={re.id_ejercicio} className="border-t border-border">
                    <td className="p-3 text-foreground font-medium">{re.ejercicio.nombre}</td>
                    <td className="p-3"><span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-badge">{re.ejercicio.grupo_muscular}</span></td>
                    <td className="p-3 text-muted">{re.series}</td>
                    <td className="p-3 text-muted">{re.repeticiones}</td>
                    <td className="p-3 text-muted">{re.peso_sugerido ? `${re.peso_sugerido} kg` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {asignaciones && asignaciones.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted mb-2">Clientes asignados</h4>
              <div className="flex flex-wrap gap-2">
                {asignaciones.map((a: any) => (
                  <span key={a.id_cliente_rutina} className="flex items-center gap-1.5 text-xs bg-surface-light text-foreground px-3 py-1.5 rounded-badge border border-border">
                    {a.cliente.nombre} {a.cliente.apellido}
                    {a.asignador && <span className="text-muted-dark ml-1">({a.asignador.nombre})</span>}
                    {!esAdmin && (
                      <button
                        onClick={() => verRutinaCliente(a.id_cliente_rutina)}
                        className="text-primary hover:text-primary-hover ml-1 cursor-pointer"
                      >
                        Ver
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Asignar Cliente */}
      {asignandoClienteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAsignandoClienteId(null)}>
          <div className="bg-surface border border-border rounded-card p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-xl text-foreground tracking-wider">ASIGNAR RUTINA A CLIENTE</h3>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
              <select value={clienteAsignar} onChange={(e) => setClienteAsignar(e.target.value)}
                className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Seleccionar...</option>
                {clientes?.map((c: any) => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAsignarCliente} disabled={!clienteAsignar || asignarMutation.isPending}>Asignar</Button>
              <Button onClick={() => setAsignandoClienteId(null)} variant="outline">Cancelar</Button>
            </div>
            {!clienteAsignar && <p className="text-destructive text-xs">Seleccione un cliente para asignar</p>}
          </div>
        </div>
      )}

      {/* Modal Asignar Entrenador (Admin only) */}
      {asignandoEntrenadorId && esAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAsignandoEntrenadorId(null)}>
          <div className="bg-surface border border-border rounded-card p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-xl text-foreground tracking-wider">ASIGNAR RUTINA A ENTRENADOR</h3>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Entrenador</label>
              <select value={entrenadorAsignar} onChange={(e) => setEntrenadorAsignar(e.target.value)}
                className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Seleccionar...</option>
                {entrenadores.map((e: any) => (
                  <option key={e.id_usuario} value={e.id_usuario}>{e.nombre} {e.apellido} - {e.correo}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAsignarEntrenador} disabled={!entrenadorAsignar || asignarEntrenadorMutation.isPending}>Asignar</Button>
              <Button onClick={() => setAsignandoEntrenadorId(null)} variant="outline">Cancelar</Button>
            </div>
            {!entrenadorAsignar && <p className="text-destructive text-xs">Seleccione un entrenador para asignar</p>}
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Rutina (Admin only) */}
      {modalOpen && esAdmin && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={cerrarModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-2xl shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">
                {editandoId ? 'EDITAR RUTINA' : 'NUEVA RUTINA'}
              </h3>
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
                  <label className="block text-sm font-medium text-muted mb-1.5">Descripción</label>
                  <input {...register('descripcion')}
                    className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted">Ejercicios</label>
                  <button type="button" onClick={() => append({ id_ejercicio: '', series: '3', repeticiones: '10', peso_sugerido: '' })}
                    className="text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer bg-transparent border-none">
                    + Agregar ejercicio
                  </button>
                </div>
                {errors.ejercicios && <p className="text-destructive text-xs mb-2">{errors.ejercicios.message}</p>}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-5 gap-2 items-end">
                      <div>
                        <label className="block text-[11px] text-muted-dark mb-0.5">Ejercicio</label>
                        <select {...register(`ejercicios.${index}.id_ejercicio`)}
                          className="w-full rounded-input border border-border bg-surface text-foreground px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="">Seleccionar...</option>
                          {ejercicios?.filter((ej: any) => ej.estado).map((ej: any) => (
                            <option key={ej.id_ejercicio} value={ej.id_ejercicio}>{ej.nombre}</option>
                          ))}
                        </select>
                        {errors.ejercicios?.[index]?.id_ejercicio && <p className="text-destructive text-[11px] mt-0.5">{errors.ejercicios[index]?.id_ejercicio?.message}</p>}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-dark mb-0.5">Series</label>
                        <input type="number" {...register(`ejercicios.${index}.series`)}
                          className="w-full rounded-input border border-border bg-surface text-foreground px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                        {errors.ejercicios?.[index]?.series && <p className="text-destructive text-[11px] mt-0.5">{errors.ejercicios[index]?.series?.message}</p>}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-dark mb-0.5">Reps</label>
                        <input type="number" {...register(`ejercicios.${index}.repeticiones`)}
                          className="w-full rounded-input border border-border bg-surface text-foreground px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                        {errors.ejercicios?.[index]?.repeticiones && <p className="text-destructive text-[11px] mt-0.5">{errors.ejercicios[index]?.repeticiones?.message}</p>}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-dark mb-0.5">Peso (kg)</label>
                        <input type="number" step="0.5" {...register(`ejercicios.${index}.peso_sugerido`)}
                          className="w-full rounded-input border border-border bg-surface text-foreground px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <button type="button" onClick={() => remove(index)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors cursor-pointer bg-transparent border-none py-2">
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || crearMutation.isPending || actualizarMutation.isPending} className="flex-1">
                  {editandoId ? 'Guardar Cambios' : 'Crear Rutina'}
                </Button>
                <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver rutina del cliente (Trainer) */}
      {clienteRutinaModal && clienteRutinaDetalle && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={() => setClienteRutinaModal(false)}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-3xl shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl text-foreground tracking-wider">
                  {clienteRutinaDetalle.cliente.nombre} {clienteRutinaDetalle.cliente.apellido}
                </h3>
                <p className="text-sm text-muted">
                  Rutina: {clienteRutinaDetalle.rutina.nombre}
                </p>
              </div>
              <button onClick={() => setClienteRutinaModal(false)} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-light">
                  <tr>
                    <th className="text-left p-3 text-muted font-medium">Ejercicio</th>
                    <th className="text-left p-3 text-muted font-medium">Grupo Muscular</th>
                    <th className="text-left p-3 text-muted font-medium">Series</th>
                    <th className="text-left p-3 text-muted font-medium">Reps</th>
                    <th className="text-left p-3 text-muted font-medium">Peso</th>
                    <th className="text-left p-3 text-muted font-medium">Descanso</th>
                    <th className="text-left p-3 text-muted font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clienteRutinaDetalle.ejercicios?.map((ej: any) => (
                    <tr key={ej.id_cliente_rutina_ejercicio} className="border-t border-border">
                      <td className="p-3 text-foreground font-medium">{ej.nombre}</td>
                      <td className="p-3"><span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-badge">{ej.grupo_muscular}</span></td>
                      <td className="p-3 text-muted">{ej.series}</td>
                      <td className="p-3 text-muted">{ej.repeticiones}</td>
                      <td className="p-3 text-muted">{ej.peso ? `${ej.peso} kg` : '—'}</td>
                      <td className="p-3 text-muted">{ej.descanso ? `${ej.descanso}s` : '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => abrirEditarEjercicio(ej)}
                          className="text-xs px-3 py-1.5 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {clienteRutinaDetalle.observaciones && (
              <div>
                <h4 className="text-sm font-medium text-muted mb-1">Observaciones</h4>
                <p className="text-sm text-foreground bg-surface-light p-3 rounded-card border border-border">
                  {clienteRutinaDetalle.observaciones}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Editar ejercicio del cliente (Trainer) */}
      {ejercicioEditModal && editandoEjercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEjercicioEditModal(false)}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-md shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">EDITAR EJERCICIO</h3>
              <button onClick={() => setEjercicioEditModal(false)} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Series</label>
                  <input
                    type="number"
                    value={editandoEjercicio.series}
                    onChange={(e) => setEditandoEjercicio({ ...editandoEjercicio, series: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Repeticiones</label>
                  <input
                    type="number"
                    value={editandoEjercicio.repeticiones}
                    onChange={(e) => setEditandoEjercicio({ ...editandoEjercicio, repeticiones: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Peso (kg)</label>
                  <input
                    type="number" step="0.5"
                    value={editandoEjercicio.peso ?? ''}
                    onChange={(e) => setEditandoEjercicio({ ...editandoEjercicio, peso: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Descanso (s)</label>
                  <input
                    type="number"
                    value={editandoEjercicio.descanso ?? ''}
                    onChange={(e) => setEditandoEjercicio({ ...editandoEjercicio, descanso: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Observaciones</label>
                <textarea
                  value={editandoEjercicio.observaciones ?? ''}
                  onChange={(e) => setEditandoEjercicio({ ...editandoEjercicio, observaciones: e.target.value || null })}
                  rows={2}
                  className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={guardarEjercicio} disabled={actualizarEjercicioMutation.isPending} className="flex-1">
                  Guardar Cambios
                </Button>
                <Button onClick={() => setEjercicioEditModal(false)} variant="outline">Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmDeleteId(null)}
        title="Eliminar rutina"
        description="¿Estás seguro de eliminar esta rutina? Se eliminarán también sus ejercicios y asignaciones asociadas."
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminarMutation.isPending}
      />
    </div>
  )
}

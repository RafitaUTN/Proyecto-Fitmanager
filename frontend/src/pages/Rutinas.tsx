import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth.store'
import { useRutinas, useRutina, useCrearRutina, useActualizarRutina, useEliminarRutina, useAsignarRutina, useAsignacionesRutina, useClienteRutina, useActualizarEjercicioCliente } from '@/hooks/use-rutinas'
import { useEjercicios } from '@/hooks/use-ejercicios'
import { useClientes } from '@/hooks/use-clientes'
import { useUsuarios } from '@/hooks/use-usuarios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { downloadReport } from '@/lib/download'
import { QueryKeys } from '@/lib/query-keys'
import { Loader2, AlertCircle, ArrowDown, ArrowUp, Clock3, Dumbbell, Search, Target } from 'lucide-react'

const ejercicioEnRutinaSchema = z.object({
  id_ejercicio: z.string().min(1, 'Requerido'),
  series: z.string().regex(/^\d+$/, 'Entero positivo'),
  repeticiones: z.string().regex(/^\d+$/, 'Entero positivo'),
  peso_sugerido: z.string().optional(),
  descanso: z.string().optional(),
  notas: z.string().max(1000).optional(),
})

const rutinaSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(100),
  descripcion: z.string().optional(),
  objetivo: z.string().max(500).optional(),
  duracion_minutos: z.string().optional(),
  dificultad: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
  ejercicios: z.array(ejercicioEnRutinaSchema).min(1, 'Agregue al menos un ejercicio'),
})

type RutinaForm = z.infer<typeof rutinaSchema>

export function Rutinas() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const esAdminOEntrenador = usuario?.rol === 'Administrador' || usuario?.rol === 'Entrenador'
  const idUsuario = usuario?.id_usuario

  const [detailModalId, setDetailModalId] = useState<number | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [asignandoClienteId, setAsignandoClienteId] = useState<number | null>(null)
  const [asignandoEntrenadorId, setAsignandoEntrenadorId] = useState<number | null>(null)
  const [clienteAsignar, setClienteAsignar] = useState('')
  const [entrenadorAsignar, setEntrenadorAsignar] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Trainer: client routine management
  const [clienteRutinaModal, setClienteRutinaModal] = useState(false)
  const [clienteRutinaId, setClienteRutinaId] = useState<number | undefined>()

  const [editandoEjercicio, setEditandoEjercicio] = useState<{ id: number; series: number; repeticiones: number; peso: number | null; descanso: number | null; observaciones: string | null } | null>(null)
  const [ejercicioEditModal, setEjercicioEditModal] = useState(false)

  const { data: rutinas, isLoading } = useRutinas()
  const { data: detalle, isFetching: detalleLoading } = useRutina(detailModalId)
  const { data: ejercicios } = useEjercicios(esAdminOEntrenador)
  const { data: clientes } = useClientes(esAdmin ? undefined : { id_entrenador: String(idUsuario) })
  const { data: usuarios } = useUsuarios()
  const entrenadores = usuarios?.filter((u: any) => u.rol === 'Entrenador') ?? []
  const { data: asignaciones } = useAsignacionesRutina(detailModalId)

  // Trainer: client routines
  const { data: clienteRutinaDetalle } = useClienteRutina(clienteRutinaId)

  const crearMutation = useCrearRutina(() => cerrarModal())
  const actualizarMutation = useActualizarRutina(() => cerrarModal())
  const eliminarMutation = useEliminarRutina()
  const asignarMutation = useAsignarRutina(() => { setAsignandoClienteId(null); setClienteAsignar('') })
  const actualizarEjercicioMutation = useActualizarEjercicioCliente(() => setEjercicioEditModal(false))

  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const asignarEntrenadorMutation = useMutation({
    mutationFn: ({ idRutina, idEntrenador }: { idRutina: number; idEntrenador: number }) =>
      http.post(`/rutinas/${idRutina}/asignar-entrenador`, { id_entrenador: idEntrenador }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      queryClient.invalidateQueries({ queryKey: QueryKeys.rutina(detailModalId!) })
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.rutina(detailModalId!) })
      emit(DomainEvents.RUTINA_REMOVIDA_ENTRENADOR)
      addToast('Entrenador removido de la rutina', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<RutinaForm>({
    resolver: zodResolver(rutinaSchema),
    defaultValues: { ejercicios: [], dificultad: 'principiante' },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'ejercicios' })

  function cerrarModal() {
    setModalOpen(false)
    setEditandoId(null)
    reset({ nombre: '', descripcion: '', objetivo: '', duracion_minutos: '', dificultad: 'principiante', ejercicios: [] })
  }

  function abrirCrear() {
    reset({ nombre: '', descripcion: '', objetivo: '', duracion_minutos: '', dificultad: 'principiante', ejercicios: [] })
    setEditandoId(null)
    setModalOpen(true)
  }

  function abrirEdicion(id: number, r: typeof detalle) {
    if (!r) return
    setEditandoId(id)
    reset({
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      objetivo: r.objetivo || '',
      duracion_minutos: r.duracion_minutos ? String(r.duracion_minutos) : '',
      dificultad: (r.dificultad as 'principiante' | 'intermedio' | 'avanzado') || 'principiante',
      ejercicios: r.rutina_ejercicios.map((re) => ({
        id_ejercicio: String(re.id_ejercicio),
        series: String(re.series),
        repeticiones: String(re.repeticiones),
        peso_sugerido: re.peso_sugerido ? String(re.peso_sugerido) : '',
        descanso: re.descanso ? String(re.descanso) : '',
        notas: re.notas || '',
      })),
    })
    setModalOpen(true)
  }

  const filteredRutinas = useCallback(() => {
    if (!rutinas) return []
    if (!searchQuery.trim()) return rutinas
    const q = searchQuery.toLowerCase()
    return rutinas.filter(
      (r: any) =>
        r.nombre.toLowerCase().includes(q) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(q)) ||
        `${r.creador.nombre} ${r.creador.apellido}`.toLowerCase().includes(q)
    )
  }, [rutinas, searchQuery])

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
      objetivo: data.objetivo || undefined,
      duracion_minutos: data.duracion_minutos ? parseInt(data.duracion_minutos) : undefined,
      dificultad: data.dificultad,
      ejercicios: data.ejercicios.map((e, index) => ({
        id_ejercicio: parseInt(e.id_ejercicio),
        series: parseInt(e.series),
        repeticiones: parseInt(e.repeticiones),
        peso_sugerido: e.peso_sugerido ? parseFloat(e.peso_sugerido) : undefined,
        descanso: e.descanso ? parseInt(e.descanso) : undefined,
        notas: e.notas || undefined,
        orden: index + 1,
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

  function abrirDetailModal(id: number) {
    setDetailModalId(id)
  }

  function cerrarDetailModal() {
    setDetailModalId(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div><h2 className="font-heading text-4xl text-foreground tracking-wider">{esAdmin ? 'RUTINAS' : 'MIS RUTINAS'}</h2><p className="text-muted mt-1">Diseña planes visuales, ordénalos y asígnalos con claridad.</p></div>
        <div className="flex items-center gap-2">
          {esAdmin && <Button variant="outline" onClick={() => downloadReport('distribucion-membresias')}>Exportar</Button>}
          {esAdminOEntrenador && <Button onClick={abrirCrear}>Nueva Rutina</Button>}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" aria-hidden="true" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar rutina por nombre, descripción o creador..."
          className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Cards de rutinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-card p-5 animate-pulse">
            <div className="h-5 bg-surface-light rounded w-3/4 mb-3" />
            <div className="h-4 bg-surface-light rounded w-1/2 mb-2" />
            <div className="h-4 bg-surface-light rounded w-1/3" />
          </div>
        ))}
        {filteredRutinas()?.map((r: any) => (
          <article
            key={r.id_rutina}
            className={`bg-surface border rounded-card overflow-hidden transition-all hover:-translate-y-1 ${
              !r.estado ? 'opacity-60' : 'hover:border-primary/30'
            } ${detailModalId === r.id_rutina ? 'ring-1 ring-primary border-primary' : 'border-border'}`}
          >
            <div className="grid grid-cols-3 h-28 bg-surface-light border-b border-border">
              {(r.rutina_ejercicios.length ? r.rutina_ejercicios : [{ ejercicio: { id_ejercicio: 0, nombre: 'Rutina', imagen_url: null, animacion_url: null, tipo_media: null } }]).map(({ ejercicio }: any) => {
                const source = ejercicio.tipo_media === 'animacion' ? ejercicio.animacion_url : ejercicio.imagen_url || ejercicio.animacion_url
                return <div key={ejercicio.id_ejercicio} className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-surface"><Dumbbell size={24} className="text-primary/70" aria-hidden="true" />{source && <img src={source} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />}</div>
              })}
            </div>
            <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground truncate">{r.nombre}</h3>
                  {!r.estado && <span className="text-xs shrink-0 bg-destructive/10 text-destructive px-2 py-0.5 rounded-badge">Inactiva</span>}
                  {r.estado && r._count.cliente_rutinas > 0 && (
                    <span className="text-xs shrink-0 bg-secondary/10 text-secondary px-2 py-0.5 rounded-badge">Activa</span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1 truncate">{r.descripcion || 'Sin descripción'}</p>
                {r.objetivo && <p className="flex items-center gap-1.5 text-xs text-muted-dark mt-2"><Target size={13} className="text-primary" />{r.objetivo}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-dark">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                {r._count.rutina_ejercicios} ejercicios
              </span>
              {esAdmin && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    {r._count.cliente_rutinas} asignaciones
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    {r._count.entrenadores} entrenadores
                  </span>
                </>
              )}
              <span>•</span>
              <span>{r.creador.nombre} {r.creador.apellido}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-dark mt-2">
              {r.duracion_minutos && <span className="flex items-center gap-1"><Clock3 size={13} />{r.duracion_minutos} min</span>}
              {r.dificultad && <span className="capitalize rounded-full border border-border px-2 py-0.5">{r.dificultad}</span>}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button size="sm" onClick={() => abrirDetailModal(r.id_rutina)} className="flex-1 !bg-[#a12e05] hover:!bg-[#852504]">
                Ver Detalle
              </Button>
              {esAdminOEntrenador && (
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleEstadoRutina(r)}
                    className={`p-2 rounded-button transition-colors cursor-pointer border ${
                      r.estado
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
                        : 'bg-secondary/10 text-secondary hover:bg-secondary/20 border-secondary/20'
                    }`}
                    title={r.estado ? 'Desactivar' : 'Activar'}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {r.estado
                        ? <><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></>
                        : <><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></>
                      }
                    </svg>
                  </button>
                  {esAdmin && (
                    <button
                      onClick={() => setConfirmDeleteId(r.id_rutina)}
                      className="p-2 rounded-button bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer border border-destructive/20"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            </div>
          </article>
        ))}
        {!isLoading && filteredRutinas()?.length === 0 && (
          <div className="col-span-full bg-surface border border-border rounded-card p-8 text-center text-muted">
            {searchQuery
              ? 'Sin rutinas que coincidan con la búsqueda'
              : esAdmin
                ? 'Sin rutinas registradas'
                : 'No tienes rutinas asignadas'}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={cerrarDetailModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card w-full max-w-4xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            {detalleLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : detalle ? (
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-heading text-2xl text-foreground tracking-wider truncate">{detalle.nombre}</h3>
                      {!detalle.estado && <span className="text-xs shrink-0 bg-destructive/10 text-destructive px-2 py-0.5 rounded-badge">Inactiva</span>}
                    </div>
                    <p className="text-muted text-sm mt-1">{detalle.descripcion || 'Sin descripción'}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-dark">
                      {detalle.objetivo && <span className="flex items-center gap-1"><Target size={14} className="text-primary" />{detalle.objetivo}</span>}
                      {detalle.duracion_minutos && <span className="flex items-center gap-1"><Clock3 size={14} />{detalle.duracion_minutos} min</span>}
                      {detalle.dificultad && <span className="capitalize rounded-full border border-border px-2 py-0.5">{detalle.dificultad}</span>}
                    </div>
                    <p className="text-xs text-muted-dark mt-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Creado por: {detalle.creador.nombre} {detalle.creador.apellido}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={cerrarDetailModal}
                      className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
                  </div>
                </div>

                {/* Action toolbar */}
                <div className="flex flex-wrap gap-2">
                  {esAdminOEntrenador && (
                    <Button size="sm" onClick={() => abrirEdicion(detalle.id_rutina, detalle)}>
                      Editar Rutina
                    </Button>
                  )}

                  <Button size="sm" onClick={() => { setAsignandoClienteId(detalle.id_rutina); setClienteAsignar('') }}>
                    Asignar Cliente
                  </Button>
                  {esAdmin && (
                    <Button size="sm" variant="outline" onClick={() => { setAsignandoEntrenadorId(detalle.id_rutina); setEntrenadorAsignar('') }}>
                      Asignar Entrenador
                    </Button>
                  )}
                  {esAdminOEntrenador && (
                    <button
                      onClick={() => toggleEstadoRutina(detalle)}
                      className={`text-xs px-3 py-1.5 rounded-button transition-colors cursor-pointer border ${
                        detalle.estado
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
                          : 'bg-secondary/10 text-secondary hover:bg-secondary/20 border-secondary/20'
                      }`}
                    >
                      {detalle.estado ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </div>

                {/* Entrenadores asignados */}
                {esAdmin && detalle.entrenadores && detalle.entrenadores.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted mb-2">Entrenadores asignados</h4>
                    <div className="flex flex-wrap gap-2">
                      {detalle.entrenadores.map((e: any) => (
                        <span key={e.id_entrenador} className="flex items-center gap-1.5 text-xs bg-surface-light text-foreground px-3 py-1.5 rounded-badge border border-border">
                          <svg className="w-3.5 h-3.5 text-muted-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                          {e.entrenador.nombre} {e.entrenador.apellido}
                          <button
                            onClick={() => removerEntrenadorMutation.mutate({ idRutina: detalle.id_rutina, idEntrenador: e.id_entrenador })}
                            className="text-destructive hover:text-destructive/80 ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ejercicios */}
                <div>
                  <h4 className="text-sm font-medium text-muted mb-2">Ejercicios</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {detalle.rutina_ejercicios.map((re: any, index: number) => {
                      const source = re.ejercicio.tipo_media === 'animacion' ? re.ejercicio.animacion_url : re.ejercicio.imagen_url || re.ejercicio.animacion_url
                      return <article key={re.id_ejercicio} className="flex gap-3 rounded-card border border-border bg-surface-light/60 p-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-button bg-primary/10 flex items-center justify-center"><Dumbbell size={24} className="text-primary" />{source && <img src={source} alt={`Demostración de ${re.ejercicio.nombre}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />}</div>
                        <div className="min-w-0 flex-1"><p className="text-[10px] text-muted-dark">#{index + 1}</p><h5 className="text-sm font-semibold text-foreground truncate">{re.ejercicio.nombre}</h5><p className="text-xs text-primary">{re.ejercicio.grupo_muscular}</p><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted mt-2"><span>{re.series} series</span><span>{re.repeticiones} reps</span>{re.peso_sugerido && <span>{re.peso_sugerido} kg</span>}{re.descanso !== null && <span>{re.descanso}s descanso</span>}</div>{re.notas && <p className="text-xs text-muted-dark mt-1 line-clamp-2">{re.notas}</p>}</div>
                      </article>
                    })}
                  </div>
                </div>

                {/* Clientes asignados */}
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
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-muted">
                <AlertCircle className="w-10 h-10 mb-3" />
                <p>Error al cargar detalle de la rutina</p>
              </div>
            )}
          </div>
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
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Rutina */}
      {modalOpen && esAdminOEntrenador && (
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_160px] gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Objetivo</label>
                  <input {...register('objetivo')} placeholder="Ej. fuerza de tren superior"
                    className="field" />
                  {errors.objetivo && <p className="text-destructive text-xs mt-1">{errors.objetivo.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Duración (min)</label>
                  <input type="number" min="1" max="600" {...register('duracion_minutos')} className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Dificultad</label>
                  <select {...register('dificultad')} className="field">
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted">Ejercicios</label>
                  <button type="button" onClick={() => append({ id_ejercicio: '', series: '3', repeticiones: '10', peso_sugerido: '', descanso: '90', notas: '' })}
                    className="text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer bg-transparent border-none">
                    + Agregar ejercicio
                  </button>
                </div>
                {errors.ejercicios && <p className="text-destructive text-xs mb-2">{errors.ejercicios.message}</p>}
                <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-card border border-border bg-surface-light/40 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-primary">Ejercicio {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0}
                            aria-label={`Subir ejercicio ${index + 1}`}
                            className="rounded-button border border-border p-1.5 text-muted hover:text-foreground disabled:opacity-30">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1}
                            aria-label={`Bajar ejercicio ${index + 1}`}
                            className="rounded-button border border-border p-1.5 text-muted hover:text-foreground disabled:opacity-30">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => remove(index)}
                            className="ml-1 text-xs text-destructive hover:text-destructive/80 transition-colors cursor-pointer bg-transparent border-none py-1.5">
                            Quitar
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                        <div className="sm:col-span-2">
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
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                        <div>
                          <label className="block text-[11px] text-muted-dark mb-0.5">Descanso (seg)</label>
                          <input type="number" min="0" max="3600" {...register(`ejercicios.${index}.descanso`)} className="field text-xs" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted-dark mb-0.5">Notas técnicas</label>
                          <input {...register(`ejercicios.${index}.notas`)} placeholder="Tempo, postura o variante" className="field text-xs" />
                        </div>
                      </div>
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

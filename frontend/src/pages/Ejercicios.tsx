import { useDeferredValue, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dumbbell, Eye, Filter, Pencil, Plus, Power, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WgerMediaSearch } from '@/components/exercises/WgerMediaSearch'
import { useAuthStore } from '@/store/auth.store'
import { useCatalogoEjercicios, useEjercicioDetalle, useCrearEjercicio, useActualizarEjercicio, useEliminarEjercicio, type Ejercicio } from '@/hooks/use-ejercicios'
import { can } from '@/lib/authz'

const niveles = ['principiante', 'intermedio', 'avanzado'] as const
const grupos = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Piernas', 'Core', 'Cardio', 'Cuerpo completo']
const categorias = ['Pecho', 'Espalda', 'Pierna', 'Bíceps', 'Tríceps', 'Hombro', 'Abdomen', 'Cardio', 'Funcional', 'Movilidad']
const optionalHttpsUrl = z.union([z.literal(''), z.string().refine((value) => value.startsWith('/') || /^https:\/\//i.test(value), 'Usa HTTPS o una ruta local')])
const ejercicioSchema = z.object({
  nombre: z.string().min(1, 'Ingresa el nombre').max(100),
  grupo_muscular: z.string().min(1, 'Selecciona el grupo muscular'),
  descripcion: z.string().max(1000).optional(),
  nivel: z.enum(niveles),
  categoria: z.string().optional(),
  equipo: z.string().max(100).optional(),
  instrucciones: z.string().max(4000).optional(),
  imagen_url: optionalHttpsUrl.optional(),
  musculos_secundarios: z.string().optional(),
})
type EjercicioForm = z.infer<typeof ejercicioSchema>

const nivelStyle: Record<string, string> = {
  principiante: 'bg-green-500/10 text-green-400 border-green-500/20',
  intermedio: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  avanzado: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function ExerciseMedia({ ejercicio, className = '' }: { ejercicio: Pick<Ejercicio, 'nombre' | 'imagen_url' | 'animacion_url' | 'tipo_media' | 'grupo_muscular'>; className?: string }) {
  const [failed, setFailed] = useState(false)
  const source = ejercicio.tipo_media === 'animacion' ? ejercicio.animacion_url : ejercicio.imagen_url || ejercicio.animacion_url
  if (!source || failed) return <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-surface-light to-surface text-primary ${className}`}><Dumbbell size={42} aria-hidden="true" /><span className="text-xs text-muted mt-2">{ejercicio.grupo_muscular}</span></div>
  return <img src={source} alt={`Demostración de ${ejercicio.nombre}`} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover bg-surface-light ${className}`} />
}

export function Ejercicios() {
  const role = useAuthStore((state) => state.role)
  const puedeGestionar = can(role, 'MANAGE_EXERCISES')
  const esAdmin = role === 'Administrador'
  const [buscar, setBuscar] = useState('')
  const busqueda = useDeferredValue(buscar)
  const [grupo, setGrupo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [nivel, setNivel] = useState('')
  const [estado, setEstado] = useState<'activo' | 'inactivo' | 'todos'>('activo')
  const [pagina, setPagina] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editando, setEditando] = useState<Ejercicio | null>(null)
  const [detalleId, setDetalleId] = useState<number>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const { data: catalogo, isLoading, isFetching } = useCatalogoEjercicios({ buscar: busqueda, grupo_muscular: grupo, categoria, nivel, estado, pagina, limite: 12 })
  const { data: detalle, isLoading: detalleLoading } = useEjercicioDetalle(detalleId)
  const crear = useCrearEjercicio(() => cerrarEditor())
  const actualizar = useActualizarEjercicio(() => cerrarEditor())
  const alternarEstado = useActualizarEjercicio(() => setEstado('todos'))
  const eliminar = useEliminarEjercicio()
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EjercicioForm>({ resolver: zodResolver(ejercicioSchema) })

  function limpiarFiltros() { setBuscar(''); setGrupo(''); setCategoria(''); setNivel(''); setEstado('activo'); setPagina(1) }
  function cerrarEditor() { setEditorOpen(false); setEditando(null); reset() }
  function abrirCrear() { reset({ nombre: '', grupo_muscular: '', descripcion: '', nivel: 'principiante', categoria: '', equipo: '', instrucciones: '', imagen_url: '', musculos_secundarios: '' }); setEditando(null); setEditorOpen(true) }
  function abrirEditar(item: Ejercicio) {
    setEditando(item)
    reset({ nombre: item.nombre, grupo_muscular: item.grupo_muscular, descripcion: item.descripcion ?? '', nivel: item.nivel as typeof niveles[number], categoria: item.categoria ?? '', equipo: item.equipo ?? '', instrucciones: item.instrucciones ?? '', imagen_url: item.imagen_url ?? '', musculos_secundarios: item.musculos_secundarios.join(', ') })
    setEditorOpen(true)
  }
  function submit(data: EjercicioForm) {
    const payload = { ...data, imagen_url: data.imagen_url || undefined, tipo_media: data.imagen_url ? 'imagen' as const : undefined, musculos_secundarios: data.musculos_secundarios?.split(',').map((item) => item.trim()).filter(Boolean) }
    if (editando) actualizar.mutate({ id: editando.id_ejercicio, data: payload })
    else crear.mutate(payload)
  }

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><h2 className="font-heading text-4xl text-foreground tracking-wider">CATÁLOGO DE EJERCICIOS</h2><p className="text-muted mt-1">Explora, filtra y administra la biblioteca visual del gimnasio.</p></div>
      {puedeGestionar && <Button onClick={abrirCrear}><Plus size={17} aria-hidden="true" /> Nuevo ejercicio</Button>}
    </header>

    <section className="rounded-card border border-border bg-surface p-4" aria-label="Filtros del catálogo">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3"><Filter size={16} className="text-primary" aria-hidden="true" />Filtros</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <label className="relative xl:col-span-2"><span className="sr-only">Buscar ejercicios</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" /><input value={buscar} onChange={(event) => { setBuscar(event.target.value); setPagina(1) }} placeholder="Buscar por nombre, equipo..." className="w-full rounded-input border border-border bg-background text-foreground pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
        <select value={grupo} onChange={(event) => { setGrupo(event.target.value); setPagina(1) }} aria-label="Grupo muscular" className="rounded-input border border-border bg-background text-foreground px-3 py-2.5 text-sm"><option value="">Todos los músculos</option>{grupos.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={nivel} onChange={(event) => { setNivel(event.target.value); setPagina(1) }} aria-label="Nivel" className="rounded-input border border-border bg-background text-foreground px-3 py-2.5 text-sm"><option value="">Todos los niveles</option>{niveles.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select>
        <select value={estado} onChange={(event) => { setEstado(event.target.value as typeof estado); setPagina(1) }} aria-label="Estado" className="rounded-input border border-border bg-background text-foreground px-3 py-2.5 text-sm"><option value="activo">Activos</option><option value="inactivo">Inactivos</option><option value="todos">Todos</option></select>
      </div>
      <div className="flex items-center justify-between mt-3"><select value={categoria} onChange={(event) => { setCategoria(event.target.value); setPagina(1) }} aria-label="Categoría" className="rounded-input border border-border bg-background text-foreground px-3 py-2 text-sm"><option value="">Todas las categorías</option>{categorias.map((item) => <option key={item}>{item}</option>)}</select><button onClick={limpiarFiltros} className="text-xs text-muted hover:text-primary">Limpiar filtros</button></div>
    </section>

    <div className="flex items-center justify-between text-sm text-muted"><span>{catalogo?.total ?? 0} ejercicios</span>{isFetching && !isLoading && <span className="animate-pulse">Actualizando…</span>}</div>
    {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-80 rounded-card border border-border bg-surface animate-pulse" />)}</div> : catalogo?.data.length === 0 ? <div className="rounded-card border border-border bg-surface p-12 text-center"><Dumbbell className="mx-auto text-muted-dark" size={38} /><p className="text-foreground font-semibold mt-4">No encontramos ejercicios</p><p className="text-sm text-muted mt-1">Ajusta los filtros o crea uno nuevo.</p></div> :
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">{catalogo?.data.map((item) => <article key={item.id_ejercicio} className="group rounded-card border border-border bg-surface overflow-hidden transition-transform hover:-translate-y-1 hover:border-primary/40 focus-within:border-primary/50">
        <ExerciseMedia ejercicio={item} className="w-full h-40" />
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold text-foreground truncate">{item.nombre}</h3><p className="text-xs text-primary mt-1">{item.grupo_muscular}{item.equipo ? ` · ${item.equipo}` : ''}</p></div><span className={`border rounded-full px-2 py-0.5 text-[10px] font-semibold ${nivelStyle[item.nivel]}`}>{item.nivel}</span></div>
          <p className="text-sm text-muted line-clamp-2 min-h-10">{item.descripcion || 'Sin descripción disponible.'}</p>
          <div className="flex items-center justify-between text-xs text-muted-dark"><span>{item._count.rutina_ejercicios} rutinas</span><span>{item.estado ? 'Activo' : 'Inactivo'}</span></div>
          <div className="flex gap-2 pt-1"><Button variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-2" onClick={() => setDetalleId(item.id_ejercicio)}><Eye size={15} /> Ver</Button>{puedeGestionar && <Button variant="outline" size="sm" onClick={() => abrirEditar(item)} aria-label={`Editar ${item.nombre}`}><Pencil size={15} /></Button>}{esAdmin && <Button variant="outline" size="sm" disabled={alternarEstado.isPending} onClick={() => alternarEstado.mutate({ id: item.id_ejercicio, data: { estado: !item.estado } })} aria-label={`${item.estado ? 'Desactivar' : 'Activar'} ${item.nombre}`}><Power size={15} className={item.estado ? 'text-amber-400' : 'text-green-400'} /></Button>}{esAdmin && <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(item.id_ejercicio)} aria-label={`Eliminar ${item.nombre}`}><Trash2 size={15} className="text-destructive" /></Button>}</div>
        </div>
      </article>)}</div>}

    {catalogo && catalogo.totalPaginas > 1 && <nav className="flex items-center justify-center gap-3" aria-label="Paginación"><Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina((value) => value - 1)}>Anterior</Button><span className="text-sm text-muted">Página {pagina} de {catalogo.totalPaginas}</span><Button variant="outline" size="sm" disabled={pagina === catalogo.totalPaginas} onClick={() => setPagina((value) => value + 1)}>Siguiente</Button></nav>}

    {detalleId && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title"><button className="absolute inset-0 bg-black/70" onClick={() => setDetalleId(undefined)} aria-label="Cerrar detalle" /><section className="relative w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-card border border-border bg-surface shadow-2xl"><button onClick={() => setDetalleId(undefined)} className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white"><X size={18} /></button>{detalleLoading ? <div className="h-96 animate-pulse" /> : detalle && <><ExerciseMedia ejercicio={detalle} className="w-full h-64" /><div className="p-6 space-y-5"><div><h2 id="exercise-detail-title" className="font-heading text-3xl tracking-wider text-foreground">{detalle.nombre}</h2><p className="text-primary text-sm">{detalle.grupo_muscular} · {detalle.nivel}</p></div><p className="text-muted leading-relaxed">{detalle.descripcion || 'Sin descripción.'}</p><div className="grid sm:grid-cols-2 gap-4 text-sm"><div className="rounded-button bg-surface-light p-3"><span className="text-muted-dark">Equipo</span><p className="text-foreground mt-1">{detalle.equipo || 'Sin equipo'}</p></div><div className="rounded-button bg-surface-light p-3"><span className="text-muted-dark">Músculos secundarios</span><p className="text-foreground mt-1">{detalle.musculos_secundarios.join(', ') || 'No especificados'}</p></div></div>{detalle.instrucciones && <div><h3 className="font-semibold text-foreground mb-2">Instrucciones</h3><p className="whitespace-pre-line text-sm text-muted leading-relaxed">{detalle.instrucciones}</p></div>}<div><h3 className="font-semibold text-foreground mb-2">Rutinas donde aparece</h3>{detalle.rutina_ejercicios.length ? <ul className="flex flex-wrap gap-2">{detalle.rutina_ejercicios.map(({ rutina }) => <li key={rutina.id_rutina} className="rounded-full border border-border bg-surface-light px-3 py-1 text-xs text-muted">{rutina.nombre}</li>)}</ul> : <p className="text-sm text-muted">Aún no forma parte de una rutina.</p>}</div></div></>}</section></div>}

    {editorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><button className="absolute inset-0 bg-black/70" onClick={cerrarEditor} aria-label="Cerrar editor" /><section className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-2xl"><div className="flex items-center justify-between mb-5"><h2 className="font-heading text-2xl tracking-wider text-foreground">{editando ? 'EDITAR EJERCICIO' : 'NUEVO EJERCICIO'}</h2><button onClick={cerrarEditor} aria-label="Cerrar"><X size={20} /></button></div><form onSubmit={handleSubmit(submit)} className="space-y-4"><div className="grid sm:grid-cols-2 gap-4"><Field label="Nombre" error={errors.nombre?.message}><input {...register('nombre')} className="field" /></Field><Field label="Grupo muscular" error={errors.grupo_muscular?.message}><select {...register('grupo_muscular')} className="field"><option value="">Seleccionar…</option>{grupos.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Categoría"><select {...register('categoria')} className="field"><option value="">Sin categoría</option>{categorias.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Nivel"><select {...register('nivel')} className="field">{niveles.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Equipo"><input {...register('equipo')} className="field" placeholder="Mancuernas, máquina…" /></Field><Field label="Músculos secundarios"><input {...register('musculos_secundarios')} className="field" placeholder="Tríceps, hombros" /></Field></div><Field label="Descripción"><textarea {...register('descripcion')} rows={3} className="field resize-none" /></Field><Field label="Instrucciones"><textarea {...register('instrucciones')} rows={4} className="field resize-none" placeholder="Un paso por línea" /></Field><WgerMediaSearch onSelect={(r) => setValue('imagen_url', r.imagen_url, { shouldValidate: true })} seleccionado={watch('imagen_url')} />{watch('imagen_url') && <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setValue('imagen_url', '', { shouldValidate: true })}><X size={15} /> Quitar imagen</Button></div>}<div className="flex gap-3 pt-2"><Button type="submit" className="flex-1" disabled={crear.isPending || actualizar.isPending}>{editando ? 'Guardar cambios' : 'Crear ejercicio'}</Button><Button type="button" variant="outline" onClick={cerrarEditor}>Cancelar</Button></div></form></section></div>}

    <ConfirmDialog open={confirmDeleteId !== null} onConfirm={() => { if (confirmDeleteId) eliminar.mutate(confirmDeleteId); setConfirmDeleteId(null) }} onCancel={() => setConfirmDeleteId(null)} title="Eliminar ejercicio" description="Solo se puede eliminar si no está incluido en ninguna rutina." confirmLabel="Eliminar" variant="danger" loading={eliminar.isPending} />
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium text-muted mb-1.5">{label}</span>{children}{error && <span className="block text-xs text-destructive mt-1">{error}</span>}</label>
}

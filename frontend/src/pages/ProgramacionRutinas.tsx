/**
 * Página de administración de horarios de rutinas.
 *
 * @remarks Permite a Admin/Entrenador crear sesiones programadas sin eliminar
 * la modalidad flexible de asignación directa existente.
 */
import { useMemo, useState } from 'react'
import { CalendarClock, Plus, XCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useRutinas } from '@/hooks/use-rutinas'
import { useClientes } from '@/hooks/use-clientes'
import { useUsuarios } from '@/hooks/use-usuarios'
import {
  useCancelarProgramacionRutina,
  useCrearProgramacionRutina,
  useProgramacionesRutinas,
} from '@/hooks/use-programaciones-rutinas'
import { formatFecha } from '@/lib/fecha'

const niveles = ['TODOS', 'PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'EXPERTO']

function toInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function localDateTime(fecha: string, hora: string) {
  return `${fecha}T${hora}:00`
}

function formatHora(value: string) {
  return new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function ProgramacionRutinas() {
  const usuario = useAuthStore((s) => s.usuario)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [open, setOpen] = useState(false)
  const desde = toInput(weekStart)
  const hasta = toInput(addDays(weekStart, 6))
  const { data } = useProgramacionesRutinas({ desde, hasta })
  const { data: rutinas = [] } = useRutinas()
  const { data: usuarios } = useUsuarios({ pageSize: 100 })
  const { data: clientes } = useClientes({ pageSize: 100 })
  const crear = useCrearProgramacionRutina()
  const cancelar = useCancelarProgramacionRutina()
  const entrenadores = useMemo(
    () => (usuarios?.data ?? []).filter((u) => u.rol === 'Entrenador' && u.estado),
    [usuarios],
  )
  const clientesList = clientes?.data ?? []
  const sesiones = data?.data ?? []
  const isTrainer = usuario?.rol === 'Entrenador'
  const trainerId = Number(usuario?.id_usuario ?? 0)

  const [form, setForm] = useState({
    id_rutina: '',
    id_entrenador: '',
    fecha: toInput(new Date()),
    hora_inicio: '18:00',
    hora_fin: '18:45',
    nivel: 'TODOS',
    clientes: [] as number[],
    capacidad: '',
    notas: '',
  })

  function submit() {
    const idEntrenador = isTrainer ? trainerId : Number(form.id_entrenador)
    crear.mutate(
      {
        id_rutina: Number(form.id_rutina),
        id_entrenador: idEntrenador,
        fecha: form.fecha,
        hora_inicio: localDateTime(form.fecha, form.hora_inicio),
        hora_fin: localDateTime(form.fecha, form.hora_fin),
        niveles: [form.nivel],
        clientes: form.clientes,
        capacidad: form.capacidad ? Number(form.capacidad) : undefined,
        notas: form.notas || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setForm((current) => ({ ...current, clientes: [], notas: '' }))
        },
      },
    )
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Planificación</p>
          <h1 className="font-heading text-4xl tracking-wider text-foreground sm:text-5xl">HORARIOS DE RUTINAS</h1>
          <p className="mt-2 text-sm text-muted">
            Programa sesiones por rutina, entrenador, nivel y clientes específicos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-5 font-semibold text-white hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" /> Nueva sesión
        </button>
      </header>

      <section className="mb-6 rounded-card border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="rounded-button border border-border px-3 py-2 text-sm text-muted" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            Semana anterior
          </button>
          <p className="text-sm font-semibold text-foreground">
            {formatFecha(desde)} — {formatFecha(hasta)}
          </p>
          <button className="rounded-button border border-border px-3 py-2 text-sm text-muted" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Semana siguiente
          </button>
        </div>
      </section>

      <div className="grid gap-4">
        {sesiones.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-surface p-8 text-center text-muted">
            No hay sesiones programadas en esta semana.
          </div>
        ) : (
          sesiones.map((sesion) => (
            <article key={sesion.id_programacion} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                    <CalendarClock className="h-4 w-4" /> {formatFecha(sesion.fecha)} · {formatHora(sesion.hora_inicio)} -{' '}
                    {formatHora(sesion.hora_fin)}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-foreground">{sesion.rutina.nombre}</h2>
                  <p className="text-sm text-muted">
                    Entrenador: {sesion.entrenador.nombre} {sesion.entrenador.apellido}
                  </p>
                  <p className="mt-1 text-xs text-muted-dark">
                    Niveles: {sesion.niveles.map((n) => n.nivel).join(', ')} · Clientes asignados:{' '}
                    {sesion.clientes.length}
                    {sesion.capacidad ? `/${sesion.capacidad}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-badge px-3 py-1 text-xs font-semibold ${sesion.estado === 'CANCELADA' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {sesion.estado}
                  </span>
                  {sesion.estado !== 'CANCELADA' && (
                    <button
                      type="button"
                      onClick={() => cancelar.mutate({ id: sesion.id_programacion, motivo: 'Cancelada desde panel' })}
                      className="inline-flex items-center gap-2 rounded-button border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="h-4 w-4" /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-3xl rounded-card border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-2xl tracking-wider text-foreground">NUEVA SESIÓN PROGRAMADA</h2>
              <button type="button" className="text-muted hover:text-foreground" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted">
                Rutina
                <select className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.id_rutina} onChange={(e) => setForm({ ...form, id_rutina: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {rutinas.map((r) => <option key={r.id_rutina} value={r.id_rutina}>{r.nombre}</option>)}
                </select>
              </label>
              {!isTrainer && (
                <label className="text-sm text-muted">
                  Entrenador
                  <select className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.id_entrenador} onChange={(e) => setForm({ ...form, id_entrenador: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {entrenadores.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido}</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm text-muted">
                Fecha
                <input type="date" className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </label>
              <label className="text-sm text-muted">
                Nivel
                <select className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                  {niveles.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm text-muted">
                Inicio
                <input type="time" className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
              </label>
              <label className="text-sm text-muted">
                Fin
                <input type="time" className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} />
              </label>
              <label className="text-sm text-muted">
                Capacidad opcional
                <input type="number" className="mt-1 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} />
              </label>
              <label className="text-sm text-muted md:col-span-2">
                Clientes específicos opcionales
                <select multiple className="mt-1 h-32 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.clientes.map(String)} onChange={(e) => setForm({ ...form, clientes: Array.from(e.target.selectedOptions).map((o) => Number(o.value)) })}>
                  {clientesList.map((c) => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido}</option>)}
                </select>
              </label>
              <label className="text-sm text-muted md:col-span-2">
                Notas
                <textarea className="mt-1 min-h-24 w-full rounded-input border border-border bg-background p-3 text-foreground" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="rounded-button border border-border px-4 py-2 text-muted" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="button" disabled={!form.id_rutina || (!isTrainer && !form.id_entrenador) || crear.isPending} className="rounded-button bg-primary px-5 py-2 font-semibold text-white disabled:opacity-60" onClick={submit}>
                Guardar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

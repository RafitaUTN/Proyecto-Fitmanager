/**
 * Página ClienteRutinas de la aplicación FitManager.
 *
 * @remarks Orquesta componentes, estado local y hooks de datos para resolver un flujo visible del usuario.
 */
import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Dumbbell, ImageOff, ListChecks, Target } from 'lucide-react'
import { useClienteRutinas, useClienteRutinasCalendario, useCompletarRutinaProgramada } from '@/hooks/use-cliente-portal'
import { formatFecha } from '@/lib/fecha'

function ExerciseMedia({ image, animation, name }: { image: string | null; animation: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  const source = animation || image

  if (!source || failed) {
    return (
      <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-primary/15 to-surface-light text-muted-dark sm:h-20 sm:w-28 sm:rounded-xl">
        <ImageOff className="h-6 w-6" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={source}
      alt={`Demostración de ${name}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-24 w-full object-cover sm:h-20 sm:w-28 sm:rounded-xl"
    />
  )
}

function toDateInput(date: Date) {
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

function formatHora(value: string) {
  return new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function ClienteRutinas() {
  const { data: rutinas, isLoading, error } = useClienteRutinas()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [vista, setVista] = useState<'semana' | 'lista'>('semana')
  const desde = toDateInput(weekStart)
  const hasta = toDateInput(addDays(weekStart, 6))
  const { data: programadas = [], isLoading: loadingProgramadas } = useClienteRutinasCalendario(desde, hasta)
  const completarMutation = useCompletarRutinaProgramada()
  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const completadas = programadas.filter((s) => s.clientes.some((c) => c.completada)).length
  const progreso = programadas.length ? Math.round((completadas / programadas.length) * 100) : 0

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-12 w-64 animate-pulse rounded bg-surface-light" />
        {[1, 2].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-card border border-border bg-surface" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8 text-4xl">MIS RUTINAS</h1>
        <div
          role="alert"
          className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-5 py-3 rounded-button"
        >
          No pudimos cargar tus rutinas. Inténtalo nuevamente.
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Tu plan de entrenamiento</p>
        <h1 className="font-heading text-foreground tracking-wider leading-none text-4xl sm:text-5xl">MIS RUTINAS</h1>
        <p className="mt-2 text-sm text-muted">
          Consulta tu calendario semanal y tus rutinas flexibles asignadas por el entrenador.
        </p>
      </header>

      <section className="mb-8 rounded-card border border-border bg-surface p-4 sm:p-5" aria-label="Calendario semanal de rutinas">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Rutinas programadas</p>
            <h2 className="text-xl font-bold text-foreground">
              Semana del {formatFecha(desde)} al {formatFecha(hasta)}
            </h2>
            <p className="text-sm text-muted">
              {programadas.length} programadas · {completadas} completadas · progreso {progreso}%
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="inline-flex h-10 items-center gap-2 rounded-button border border-border px-3 text-sm text-muted hover:text-foreground"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="h-10 rounded-button border border-border px-3 text-sm text-muted hover:text-foreground"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="inline-flex h-10 items-center gap-2 rounded-button border border-border px-3 text-sm text-muted hover:text-foreground"
              aria-label="Semana siguiente"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
            <div className="inline-flex overflow-hidden rounded-button border border-border">
              <button
                type="button"
                onClick={() => setVista('semana')}
                className={`h-10 px-3 text-sm ${vista === 'semana' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setVista('lista')}
                className={`h-10 px-3 text-sm ${vista === 'lista' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-light" aria-label={`Progreso semanal ${progreso}%`}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
        </div>

        {loadingProgramadas ? (
          <div className="h-32 animate-pulse rounded-card bg-surface-light" />
        ) : programadas.length === 0 ? (
          <div className="rounded-card border border-dashed border-border p-6 text-center text-muted">
            No tienes rutinas programadas esta semana. Tus rutinas flexibles siguen disponibles abajo.
          </div>
        ) : vista === 'semana' ? (
          <div className="hidden gap-3 lg:grid lg:grid-cols-7">
            {diasSemana.map((dia) => {
              const dayKey = toDateInput(dia)
              const sesionesDia = programadas.filter((s) => s.fecha.slice(0, 10) === dayKey)
              const isToday = dayKey === toDateInput(new Date())
              return (
                <div key={dayKey} className={`min-h-44 rounded-card border p-3 ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {new Intl.DateTimeFormat('es-CR', { weekday: 'short', day: '2-digit' }).format(dia)}
                  </p>
                  <div className="mt-3 space-y-2">
                    {sesionesDia.length === 0 ? (
                      <p className="text-xs text-muted-dark">Descanso</p>
                    ) : (
                      sesionesDia.map((sesion) => {
                        const done = sesion.clientes.some((c) => c.completada)
                        return (
                          <button
                            key={sesion.id_programacion}
                            type="button"
                            onClick={() => !done && completarMutation.mutate(sesion.id_programacion)}
                            disabled={done || completarMutation.isPending}
                            className="w-full rounded-xl border border-primary/25 bg-primary/10 p-3 text-left hover:bg-primary/15 disabled:cursor-default disabled:opacity-80"
                          >
                            <span className="block text-xs font-semibold text-primary">
                              {formatHora(sesion.hora_inicio)} - {formatHora(sesion.hora_fin)}
                            </span>
                            <span className="mt-1 block text-sm font-bold text-foreground">{sesion.rutina.nombre}</span>
                            <span className="mt-1 block text-xs text-muted">
                              {sesion.entrenador.nombre} {sesion.entrenador.apellido}
                            </span>
                            <span className="mt-2 inline-flex items-center gap-1 text-xs text-foreground">
                              <CheckCircle2 className={`h-3.5 w-3.5 ${done ? 'text-green-400' : 'text-muted-dark'}`} />
                              {done ? 'Completada' : 'Marcar completada'}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className={`${vista === 'semana' ? 'lg:hidden' : ''} space-y-3`}>
          {programadas.map((sesion) => {
            const done = sesion.clientes.some((c) => c.completada)
            return (
              <article key={sesion.id_programacion} className="rounded-card border border-border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                      {formatFecha(sesion.fecha)} · {formatHora(sesion.hora_inicio)} - {formatHora(sesion.hora_fin)}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-foreground">{sesion.rutina.nombre}</h3>
                    <p className="text-sm text-muted">
                      Entrenador: {sesion.entrenador.nombre} {sesion.entrenador.apellido}
                    </p>
                    <p className="mt-1 text-xs text-muted-dark">
                      Nivel: {sesion.niveles.map((n) => n.nivel).join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => completarMutation.mutate(sesion.id_programacion)}
                    disabled={done || completarMutation.isPending}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-button px-4 text-sm font-semibold ${
                      done ? 'bg-green-500/10 text-green-400' : 'bg-primary text-white hover:bg-primary-hover'
                    } disabled:cursor-default`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {done ? 'Completada' : 'Marcar completada'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <h2 className="mb-4 font-heading text-2xl tracking-wider text-foreground">RUTINAS FLEXIBLES</h2>

      {!rutinas?.length ? (
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <Dumbbell className="mx-auto mb-3 h-9 w-9 text-primary" aria-hidden="true" />
          <p className="text-muted text-lg">No tienes rutinas asignadas.</p>
          <p className="text-muted-dark text-sm mt-2">Tu entrenador te asignará rutinas personalizadas.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rutinas.map((rutina, routineIndex) => {
            const isExpanded = expanded === rutina.id
            const totalEjercicios = rutina.ejercicios.length
            return (
              <article
                key={rutina.id}
                className={`overflow-hidden rounded-card border bg-surface shadow-sm transition-colors ${
                  isExpanded ? 'border-primary/40' : 'border-border hover:border-primary/25'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`rutina-${rutina.id}`}
                  onClick={() => setExpanded(isExpanded ? null : rutina.id)}
                  className="w-full p-4 text-left transition-colors hover:bg-surface-light/40 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-badge bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                          Día {routineIndex + 1}
                        </span>
                        {rutina.estado && (
                          <span className="rounded-badge bg-green-500/10 px-2.5 py-1 text-[11px] font-medium capitalize text-green-400">
                            {rutina.estado}
                          </span>
                        )}
                      </div>
                      <h2 className="truncate text-lg font-bold text-foreground sm:text-xl">{rutina.nombre}</h2>
                      {rutina.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted">{rutina.descripcion}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5 rounded-badge border border-border bg-background px-2.5 py-1">
                          <ListChecks className="h-3.5 w-3.5 text-primary" />
                          {totalEjercicios} ejercicios
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-badge border border-border bg-background px-2.5 py-1">
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />
                          {formatFecha(rutina.fecha_asignacion)}
                        </span>
                        {rutina.duracion_minutos && (
                          <span className="inline-flex items-center gap-1.5 rounded-badge border border-border bg-background px-2.5 py-1">
                            <Clock3 className="h-3.5 w-3.5 text-primary" />
                            {rutina.duracion_minutos} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {rutina.dificultad && (
                        <span className="hidden rounded-badge bg-primary/10 px-2.5 py-1 text-xs capitalize text-primary sm:inline-flex">
                          {rutina.dificultad}
                        </span>
                      )}
                      <ChevronDown
                        className={`h-5 w-5 text-muted transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div id={`rutina-${rutina.id}`} className="border-t border-border p-4">
                    {rutina.objetivo && (
                      <div className="mb-4 flex gap-3 rounded-card border border-primary/20 bg-primary/5 p-3">
                        <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Objetivo</p>
                          <p className="mt-1 text-sm text-foreground">{rutina.objetivo}</p>
                        </div>
                      </div>
                    )}
                    <ol className="grid gap-3">
                      {rutina.ejercicios.map((exercise, index) => (
                        <li
                          key={`${exercise.id}-${index}`}
                          className="overflow-hidden rounded-card border border-border bg-surface-light/45 p-3 sm:flex sm:items-start sm:gap-3"
                        >
                          <ExerciseMedia
                            image={exercise.imagen_url}
                            animation={exercise.animacion_url}
                            name={exercise.nombre}
                          />
                          <div className="min-w-0 flex-1 pt-3 sm:pt-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                                  Paso {index + 1}
                                </span>
                                <h3 className="truncate text-base font-semibold text-foreground">{exercise.nombre}</h3>
                                {exercise.grupo_muscular && (
                                  <p className="text-xs text-muted">{exercise.grupo_muscular}</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 text-xs">
                                <span className="rounded-badge bg-surface px-2.5 py-1 text-muted">
                                  <strong className="text-foreground">{exercise.series}</strong> series
                                </span>
                                <span className="rounded-badge bg-surface px-2.5 py-1 text-muted">
                                  <strong className="text-foreground">{exercise.repeticiones}</strong> reps
                                </span>
                                {exercise.peso && (
                                  <span className="rounded-badge bg-surface px-2.5 py-1 text-muted">
                                    {exercise.peso} kg
                                  </span>
                                )}
                                {exercise.descanso !== null && (
                                  <span className="rounded-badge bg-surface px-2.5 py-1 text-muted">
                                    {exercise.descanso}s descanso
                                  </span>
                                )}
                              </div>
                            </div>
                            {exercise.descripcion && (
                              <p className="mt-3 text-xs leading-relaxed text-muted">{exercise.descripcion}</p>
                            )}
                            {exercise.notas && (
                              <p className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground">
                                <strong className="text-primary">Indicación:</strong> {exercise.notas}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

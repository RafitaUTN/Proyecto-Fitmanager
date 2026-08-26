/**
 * Página ClienteRutinas de la aplicación FitManager.
 *
 * @remarks Orquesta componentes, estado local y hooks de datos para resolver un flujo visible del usuario.
 */
import { useState } from 'react'
import { CalendarDays, ChevronDown, Clock3, Dumbbell, ImageOff, ListChecks, Target } from 'lucide-react'
import { useClienteRutinas } from '@/hooks/use-cliente-portal'
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

export function ClienteRutinas() {
  const { data: rutinas, isLoading, error } = useClienteRutinas()
  const [expanded, setExpanded] = useState<number | null>(null)

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
          Consulta la técnica, el orden y las indicaciones definidas por tu entrenador.
        </p>
      </header>

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

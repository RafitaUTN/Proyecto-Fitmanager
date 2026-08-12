import { useState } from 'react'
import { ChevronDown, Clock3, Dumbbell, ImageOff, Target } from 'lucide-react'
import { useClienteRutinas } from '@/hooks/use-cliente-portal'
import { formatFecha } from '@/lib/fecha'

function ExerciseMedia({ image, animation, name }: { image: string | null; animation: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  const source = animation || image

  if (!source || failed) {
    return (
      <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-primary/15 to-surface-light text-muted-dark sm:h-full sm:w-40">
        <ImageOff className="h-7 w-7" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={source}
      alt={`Demostración de ${name}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-28 w-full object-cover sm:h-full sm:w-40"
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
        {[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-card border border-border bg-surface" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8 text-4xl">MIS RUTINAS</h1>
        <div role="alert" className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-5 py-3 rounded-button">
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
        <p className="mt-2 text-sm text-muted">Consulta la técnica, el orden y las indicaciones definidas por tu entrenador.</p>
      </header>

      {!rutinas?.length ? (
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <Dumbbell className="mx-auto mb-3 h-9 w-9 text-primary" aria-hidden="true" />
          <p className="text-muted text-lg">No tienes rutinas asignadas.</p>
          <p className="text-muted-dark text-sm mt-2">Tu entrenador te asignará rutinas personalizadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rutinas.map((rutina, routineIndex) => {
            const isExpanded = expanded === rutina.id
            return (
              <article key={rutina.id} className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`rutina-${rutina.id}`}
                  onClick={() => setExpanded(isExpanded ? null : rutina.id)}
                  className="w-full p-5 text-left transition-colors hover:bg-surface-light/50 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary">Día {routineIndex + 1}</span>
                      <h2 className="mt-1 text-xl font-bold text-foreground">{rutina.nombre}</h2>
                      {rutina.descripcion && <p className="mt-1 max-w-2xl text-sm text-muted">{rutina.descripcion}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {rutina.duracion_minutos && <span className="flex items-center gap-1 rounded-badge bg-surface-light px-2.5 py-1"><Clock3 className="h-3.5 w-3.5" />{rutina.duracion_minutos} min</span>}
                      {rutina.dificultad && <span className="rounded-badge bg-primary/10 px-2.5 py-1 capitalize text-primary">{rutina.dificultad}</span>}
                      <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div id={`rutina-${rutina.id}`} className="border-t border-border p-4 sm:p-6">
                    {rutina.objetivo && (
                      <div className="mb-5 flex gap-3 rounded-card border border-primary/20 bg-primary/5 p-4">
                        <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Objetivo</p><p className="mt-1 text-sm text-foreground">{rutina.objetivo}</p></div>
                      </div>
                    )}
                    <ol className="space-y-3">
                      {rutina.ejercicios.map((exercise, index) => (
                        <li key={`${exercise.id}-${index}`} className="overflow-hidden rounded-card border border-border bg-surface-light/45 sm:flex">
                          <ExerciseMedia image={exercise.imagen_url} animation={exercise.animacion_url} name={exercise.nombre} />
                          <div className="flex-1 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">Paso {index + 1}</span>
                                <h3 className="text-base font-semibold text-foreground">{exercise.nombre}</h3>
                                {exercise.grupo_muscular && <p className="text-xs text-muted">{exercise.grupo_muscular}</p>}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="rounded-badge bg-surface px-2.5 py-1 text-muted"><strong className="text-foreground">{exercise.series}</strong> series</span>
                                <span className="rounded-badge bg-surface px-2.5 py-1 text-muted"><strong className="text-foreground">{exercise.repeticiones}</strong> reps</span>
                                {exercise.peso && <span className="rounded-badge bg-surface px-2.5 py-1 text-muted">{exercise.peso} kg</span>}
                                {exercise.descanso !== null && <span className="rounded-badge bg-surface px-2.5 py-1 text-muted">{exercise.descanso}s descanso</span>}
                              </div>
                            </div>
                            {exercise.descripcion && <p className="mt-3 text-xs leading-relaxed text-muted">{exercise.descripcion}</p>}
                            {exercise.notas && <p className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground"><strong className="text-primary">Indicación:</strong> {exercise.notas}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-right text-xs text-muted-dark">Asignada el {formatFecha(rutina.fecha_asignacion)}</p>
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

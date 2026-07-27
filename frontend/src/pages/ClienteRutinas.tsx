import { useState } from 'react'
import { useClienteRutinas } from '@/hooks/use-cliente-portal'

export function ClienteRutinas() {
  const { data: rutinas, isLoading, error } = useClienteRutinas()
  const [expanded, setExpanded] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MIS RUTINAS</h1>
        <div className="text-muted animate-pulse">Cargando rutinas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MIS RUTINAS</h1>
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-5 py-3 rounded-button">
          Error al cargar las rutinas.
        </div>
      </div>
    )
  }

  if (!rutinas || rutinas.length === 0) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MIS RUTINAS</h1>
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <p className="text-muted text-lg">No tienes rutinas asignadas.</p>
          <p className="text-muted-dark text-sm mt-2">Tu entrenador te asignará rutinas personalizadas.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MIS RUTINAS</h1>

      <div className="space-y-4">
        {rutinas.map((rutina) => (
          <div key={rutina.id} className="bg-surface border border-border rounded-card overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === rutina.id ? null : rutina.id)}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-surface-light/50 transition-colors"
            >
              <div>
                <h2 className="text-lg font-bold text-foreground">{rutina.nombre}</h2>
                {rutina.descripcion && (
                  <p className="text-sm text-muted mt-0.5">{rutina.descripcion}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-dark">
                  Asignada: {new Date(rutina.fecha_asignacion).toLocaleDateString()}
                </span>
                <svg
                  className={`w-5 h-5 text-muted transition-transform ${expanded === rutina.id ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {expanded === rutina.id && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-xs text-muted-dark uppercase tracking-wider mb-3 font-medium">Ejercicios</p>
                <div className="space-y-2">
                  {rutina.ejercicios.map((ej) => (
                    <div key={ej.id} className="bg-surface-light rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{ej.nombre}</p>
                        {ej.descripcion && (
                          <p className="text-xs text-muted mt-0.5">{ej.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-dark shrink-0">
                        <span>{ej.series} series</span>
                        <span>{ej.repeticiones} reps</span>
                        {ej.peso && <span>{ej.peso}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {rutina.ejercicios.some((e) => e.notas) && (
                  <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs text-muted-dark font-medium mb-1">Notas:</p>
                    {rutina.ejercicios.filter((e) => e.notas).map((e) => (
                      <p key={e.id} className="text-xs text-muted">
                        <span className="font-medium text-foreground">{e.nombre}:</span> {e.notas}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
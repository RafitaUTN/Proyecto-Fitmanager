import { useState } from 'react'
import { Search, Loader2, ExternalLink, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useBuscarMediaEjercicios, type ExerciseMediaResult } from '@/hooks/use-media'

interface WgerMediaSearchProps {
  onSelect: (resultado: ExerciseMediaResult) => void
  seleccionado?: string | null
}

export function WgerMediaSearch({ onSelect, seleccionado }: WgerMediaSearchProps) {
  const [consulta, setConsulta] = useState('')
  const [buscada, setBuscada] = useState('')
  const { data, isFetching, error } = useBuscarMediaEjercicios(buscada)

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const termino = consulta.trim()
    if (!termino) return
    setBuscada(termino)
  }

  const tieneResultados = (data?.length ?? 0) > 0
  const esError = error !== null

  return (
    <div className="rounded-card border border-border bg-surface/50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Catálogo de imágenes <span className="text-primary">Wger</span>
      </p>

      <form onSubmit={buscar} className="flex gap-2">
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          className="field flex-1"
          placeholder="Ej: press banca, dominadas, sentadilla…"
          aria-label="Buscar ejercicio en el catálogo Wger"
        />
        <Button type="submit" size="sm" className="shrink-0" disabled={isFetching}>
          {isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </Button>
      </form>

      {esError && !tieneResultados && (
        <p className="mt-3 text-xs text-red-400">
          No se pudo consultar el catálogo. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}

      {!isFetching && !tieneResultados && !esError && buscada && (
        <p className="mt-3 text-xs text-muted">Sin coincidencias para «{buscada}». Prueba con otro término.</p>
      )}

      {tieneResultados && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(data ?? []).map((item) => {
              const activo = seleccionado === item.imagen_url
              return (
                <button
                  key={item.id_externo}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`group relative overflow-hidden rounded-button border text-left transition-all ${activo ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/60'}`}
                  aria-pressed={activo}
                  title={item.nombre}
                >
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover bg-surface-light"
                  />
                  <span className="block truncate bg-black/60 px-1.5 py-1 text-[10px] text-white">{item.nombre}</span>
                  {activo && (
                    <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-white">
                      <Check size={10} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-dark">
            <ExternalLink size={11} className="mt-0.5 shrink-0" />
            <span>
              Imágenes bajo licencia de Wger ({data?.[0]?.licencia || 'CC'} · {data?.[0]?.autor || 'comunidad'}). Haz clic para usar la imagen del ejercicio.
            </span>
          </div>
        </>
      )}
    </div>
  )
}

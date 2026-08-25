interface Props {
  pagina: number
  totalPaginas: number
  total?: number
  onCambiar: (pagina: number) => void
}

/** Controles de pagina compartidos por los listados del panel. */
export function Paginacion({ pagina, totalPaginas, total, onCambiar }: Props) {
  if (totalPaginas <= 1) return null
  const boton = 'text-xs px-3 py-1.5 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <button type="button" onClick={() => onCambiar(Math.max(1, pagina - 1))} disabled={pagina <= 1} className={boton}>
        Anterior
      </button>
      <span className="text-xs text-muted-dark">
        Pág. {pagina} de {totalPaginas}
        {typeof total === 'number' ? ` · ${total} registros` : ''}
      </span>
      <button type="button" onClick={() => onCambiar(Math.min(totalPaginas, pagina + 1))} disabled={pagina >= totalPaginas} className={boton}>
        Siguiente
      </button>
    </div>
  )
}

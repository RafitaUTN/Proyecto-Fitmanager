interface ProgressBarProps {
  current: number
  total: number
}

function colorClase(progreso: number) {
  if (progreso >= 85) return 'bg-destructive'
  if (progreso >= 70) return 'bg-yellow-500'
  return 'bg-secondary'
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)))

  return (
    <div className="space-y-1">
      <div className="w-full h-2.5 bg-surface-light rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClase(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted">{current} / {total} días</p>
    </div>
  )
}

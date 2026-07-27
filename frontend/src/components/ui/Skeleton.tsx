interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export function Skeleton({ className = '', width, height = 20, borderRadius = 10 }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        background: 'linear-gradient(90deg, #1B1B1B 25%, #252525 50%, #1B1B1B 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="flex-1" height={16} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#121212', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 20 }}>
          <Skeleton height={14} width="60%" borderRadius={6} />
          <div className="mt-3">
            <Skeleton height={32} width="40%" borderRadius={8} />
          </div>
        </div>
      ))}
    </div>
  )
}

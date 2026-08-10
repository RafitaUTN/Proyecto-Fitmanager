import { lazy, Suspense } from 'react'
import { RoleGuard } from '@/components/RoleGuard'

const ReportsPage = lazy(() => import('@/pages/Reportes').then((module) => ({ default: module.Reportes })))

export function ReportsRoute() {
  return (
    <RoleGuard roles={['Administrador']}>
      <Suspense fallback={<p className="p-6 text-sm text-muted" role="status">Cargando reportes...</p>}>
        <ReportsPage />
      </Suspense>
    </RoleGuard>
  )
}

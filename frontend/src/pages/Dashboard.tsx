import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'

export function Dashboard() {
  const { usuario, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">FitManager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {usuario?.nombre} {usuario?.apellido} ({usuario?.rol})
            </span>
            <Button onClick={logout}>Cerrar Sesión</Button>
          </div>
        </div>
        <p className="text-gray-600">Panel principal — Dashboard</p>
      </div>
    </div>
  )
}

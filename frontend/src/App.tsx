import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/lib/toast'
import { Landing } from '@/pages/Landing'
import { useAuthStore } from '@/store/auth.store'

const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const RegistroGimnasio = lazy(() => import('@/pages/RegistroGimnasio').then(m => ({ default: m.RegistroGimnasio })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const ClienteLayout = lazy(() => import('@/pages/ClienteLayout').then(m => ({ default: m.ClienteLayout })))
const SetupPassword = lazy(() => import('@/pages/SetupPassword').then(m => ({ default: m.SetupPassword })))

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-muted text-sm animate-pulse">Cargando...</div>
      </div>
    </div>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const inicializado = useAuthStore((s) => s.inicializado)

  useEffect(() => {
    useAuthStore.getState().iniciar()
  }, [])

  if (!inicializado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted text-sm animate-pulse">Verificando sesión...</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary name="App">
      <ToastProvider>
        <AuthGate>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/registro" element={<RegistroGimnasio />} />
              <Route path="/login" element={<Login />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/cliente/*" element={<ProtectedRoute><ClienteLayout /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </AuthGate>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

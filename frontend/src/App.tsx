import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/lib/toast'
import { Landing } from '@/pages/Landing'

const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const RegistroGimnasio = lazy(() => import('@/pages/RegistroGimnasio').then(m => ({ default: m.RegistroGimnasio })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted text-sm animate-pulse">Cargando...</div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary name="App">
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/registro" element={<RegistroGimnasio />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import { ApiRequestError } from '@/lib/api'

const staffSchema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

const clientSchema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

type StaffForm = z.infer<typeof staffSchema>
type ClientForm = z.infer<typeof clientSchema>

const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: 'Las credenciales son incorrectas. Verifica el correo y la contraseña.',
  USUARIO_INACTIVO: 'Esta cuenta está desactivada. Contacta al administrador del gimnasio.',
  REFRESH_INVALIDO: 'La sesión expiró. Inicia sesión nuevamente.',
}

export function Login() {
  const [tab, setTab] = useState<'staff' | 'cliente'>('staff')
  const login = useAuthStore((s) => s.login)
  const loginCliente = useAuthStore((s) => s.loginCliente)
  const navigate = useNavigate()

  const staffForm = useForm<StaffForm>({ resolver: zodResolver(staffSchema) })
  const clientForm = useForm<ClientForm>({ resolver: zodResolver(clientSchema) })

  async function onSubmitStaff(data: StaffForm) {
    try {
      await login(data.correo, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      if (err instanceof ApiRequestError && err.codigo && MENSAJES_ERROR[err.codigo]) {
        staffForm.setError('root', { message: MENSAJES_ERROR[err.codigo] })
      } else {
        staffForm.setError('root', { message: err.message || 'Error al iniciar sesión. Intenta de nuevo.' })
      }
    }
  }

  async function onSubmitClient(data: ClientForm) {
    try {
      await loginCliente(data.correo, data.password)
      navigate('/cliente')
    } catch (err: any) {
      if (err instanceof ApiRequestError && err.codigo && MENSAJES_ERROR[err.codigo]) {
        clientForm.setError('root', { message: MENSAJES_ERROR[err.codigo] })
      } else {
        clientForm.setError('root', { message: err.message || 'Error al iniciar sesión. Intenta de nuevo.' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(255,107,53,0.06) 0%, transparent 60%)' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-8">
        <img src="/assets/logo-completo.png" alt="FitManager" className="w-[170px] h-auto mb-6" />

        <div className="w-full max-w-sm bg-surface border border-border rounded-card p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-6">
            <h1 className="font-heading text-4xl text-foreground tracking-wider">INICIAR SESIÓN</h1>
            <p className="text-sm text-muted">Ingresa tus credenciales para continuar</p>
          </div>

          <div className="flex bg-surface-light rounded-button p-1 mb-6">
            <button
              onClick={() => setTab('staff')}
              className={`flex-1 py-2 text-sm font-medium rounded-[12px] transition-all cursor-pointer ${
                tab === 'staff' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setTab('cliente')}
              className={`flex-1 py-2 text-sm font-medium rounded-[12px] transition-all cursor-pointer ${
                tab === 'cliente' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              Cliente
            </button>
          </div>

          {tab === 'staff' ? (
            <form onSubmit={staffForm.handleSubmit(onSubmitStaff)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted">Correo electrónico</label>
                <Input type="email" {...staffForm.register('correo')} placeholder="tu@correo.com" />
                {staffForm.formState.errors.correo && <p className="text-destructive text-xs mt-1">{staffForm.formState.errors.correo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted">Contraseña</label>
                <Input type="password" {...staffForm.register('password')} placeholder="••••••••" />
                {staffForm.formState.errors.password && <p className="text-destructive text-xs mt-1">{staffForm.formState.errors.password.message}</p>}
              </div>

              {staffForm.formState.errors.root && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2.5 rounded-button">
                  {staffForm.formState.errors.root.message}
                </div>
              )}

              <Button type="submit" disabled={staffForm.formState.isSubmitting} size="lg" className="w-full">
                {staffForm.formState.isSubmitting ? 'INGRESANDO...' : 'INGRESAR'}
              </Button>
            </form>
          ) : (
            <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted">Correo electrónico</label>
                <Input type="email" {...clientForm.register('correo')} placeholder="tu@correo.com" />
                {clientForm.formState.errors.correo && <p className="text-destructive text-xs mt-1">{clientForm.formState.errors.correo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted">Contraseña</label>
                <Input type="password" {...clientForm.register('password')} placeholder="••••••••" />
                {clientForm.formState.errors.password && <p className="text-destructive text-xs mt-1">{clientForm.formState.errors.password.message}</p>}
              </div>

              {clientForm.formState.errors.root && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2.5 rounded-button">
                  {clientForm.formState.errors.root.message}
                </div>
              )}

              <Button type="submit" disabled={clientForm.formState.isSubmitting} size="lg" className="w-full">
                {clientForm.formState.isSubmitting ? 'INGRESANDO...' : 'INGRESAR'}
              </Button>
              <Link to="/forgot-password" className="block text-center text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
            </form>
          )}

          <p className="text-sm text-center text-muted mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-primary hover:underline font-medium">Registra tu gimnasio</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

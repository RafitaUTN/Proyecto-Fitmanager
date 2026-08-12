import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import { ApiRequestError } from '@/lib/api'

const loginSchema = z.object({
  correo: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type LoginForm = z.infer<typeof loginSchema>

const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: 'Las credenciales son incorrectas. Verifica el correo y la contraseña.',
  CUENTA_INACTIVA: 'Esta cuenta está desactivada. Contacta al administrador del gimnasio.',
  IDENTIDAD_AMBIGUA: 'Este correo está asociado a más de una cuenta. Contacta al administrador.',
  REFRESH_INVALIDO: 'La sesión expiró. Inicia sesión nuevamente.',
}

export function Login() {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    try {
      const actorType = await login(data.correo, data.password)
      navigate(actorType === 'CLIENTE' ? '/cliente' : '/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof ApiRequestError && error.codigo
        ? MENSAJES_ERROR[error.codigo] ?? error.message
        : error instanceof Error ? error.message : 'No fue posible iniciar sesión.'
      setError('root', { message })
    }
  }

  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-4 py-8" style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 62%)' }}>
      <div className="w-full max-w-sm">
        <img src="/assets/logo-completo.png" alt="FitManager" className="w-[170px] h-auto mx-auto mb-6" />
        <section className="bg-surface border border-border rounded-card p-8 shadow-2xl" aria-labelledby="login-title">
          <div className="text-center mb-7">
            <h1 id="login-title" className="font-heading text-4xl text-foreground tracking-wider">INICIAR SESIÓN</h1>
            <p className="text-sm text-muted mt-2">Accede con el correo de tu cuenta FitManager</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="correo" className="text-sm font-medium text-muted">Correo electrónico</label>
              <Input id="correo" type="email" autoComplete="email" {...register('correo')} placeholder="tu@correo.com" aria-invalid={Boolean(errors.correo)} />
              {errors.correo && <p role="alert" className="text-destructive text-xs">{errors.correo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted">Contraseña</label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} placeholder="••••••••••••" aria-invalid={Boolean(errors.password)} />
              {errors.password && <p role="alert" className="text-destructive text-xs">{errors.password.message}</p>}
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">¿Olvidaste tu contraseña?</Link>
            </div>

            {errors.root && <div role="alert" className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2.5 rounded-button">{errors.root.message}</div>}

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
              {isSubmitting ? 'INICIANDO...' : 'INICIAR SESIÓN'}
            </Button>
          </form>

          <p className="text-sm text-center text-muted mt-6">¿No tienes cuenta?{' '}<Link to="/registro" className="text-primary hover:underline font-medium">Registra tu gimnasio</Link></p>
        </section>
      </div>
    </main>
  )
}

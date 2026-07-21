import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'

const loginSchema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    try {
      await login(data.correo, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError('root', { message: err.message })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(255,107,53,0.06) 0%, transparent 60%)' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-8">
        <img src="/assets/logo-completo.png" alt="FitManager" className="w-[170px] h-auto mb-6" />

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm bg-surface border border-border rounded-card p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="font-heading text-4xl text-foreground tracking-wider">INICIAR SESIÓN</h1>
            <p className="text-sm text-muted">Ingresa tus credenciales para continuar</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted">Correo electrónico</label>
              <Input type="email" {...register('correo')} placeholder="tu@correo.com" />
              {errors.correo && <p className="text-destructive text-xs mt-1">{errors.correo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted">Contraseña</label>
              <Input type="password" {...register('password')} placeholder="••••••••" />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>
          </div>

          {errors.root && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2.5 rounded-button">
              {errors.root.message}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting ? 'INGRESANDO...' : 'INGRESAR'}
          </Button>

          <p className="text-sm text-center text-muted">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-primary hover:underline font-medium">Registra tu gimnasio</Link>
          </p>
        </form>
      </main>
    </div>
  )
}

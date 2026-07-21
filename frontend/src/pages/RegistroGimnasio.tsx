import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'

const registroSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  correo: z.string().email('Correo inválido'),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  usuario: z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    apellido: z.string().min(1, 'El apellido es requerido'),
    correo: z.string().email('Correo inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
  }),
})

type RegistroForm = z.infer<typeof registroSchema>

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export function RegistroGimnasio() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
  })

  async function onSubmit(data: RegistroForm) {
    try {
      const res = await fetch(`${API_URL}/gimnasios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar')
      }
      const body = await res.json()
      login(body.token, body.usuario)
      navigate('/dashboard')
    } catch (err: any) {
      setError('root', { message: err.message })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ backgroundImage: 'radial-gradient(ellipse at top left, rgba(255,107,53,0.06) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(34,197,94,0.04) 0%, transparent 50%)' }}>
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-heading text-xl tracking-wider text-foreground">FITMANAGER</span>
        </Link>
        <Link to="/login" className="text-sm text-muted hover:text-foreground transition-colors">Iniciar sesión</Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-lg bg-surface border border-border rounded-card p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="font-heading text-4xl text-foreground tracking-wider">REGISTRAR GIMNASIO</h1>
            <p className="text-sm text-muted">Crea tu cuenta y comienza a administrar tu gimnasio</p>
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground tracking-wide uppercase">Datos del gimnasio</legend>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
              <Input {...register('nombre')} placeholder="Mi Gimnasio" />
              {errors.nombre && <p className="text-destructive text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
                <Input type="email" {...register('correo')} placeholder="gimnasio@correo.com" />
                {errors.correo && <p className="text-destructive text-xs mt-1">{errors.correo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Teléfono</label>
                <Input {...register('telefono')} placeholder="8888-8888" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Dirección</label>
              <Input {...register('direccion')} placeholder="Alajuela, Costa Rica" />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground tracking-wide uppercase">Datos del administrador</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
                <Input {...register('usuario.nombre')} placeholder="Carlos" />
                {errors.usuario?.nombre && <p className="text-destructive text-xs mt-1">{errors.usuario.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Apellido</label>
                <Input {...register('usuario.apellido')} placeholder="Ramírez" />
                {errors.usuario?.apellido && <p className="text-destructive text-xs mt-1">{errors.usuario.apellido.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
              <Input type="email" {...register('usuario.correo')} placeholder="admin@correo.com" />
              {errors.usuario?.correo && <p className="text-destructive text-xs mt-1">{errors.usuario.correo.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Contraseña</label>
              <Input type="password" {...register('usuario.password')} placeholder="Mínimo 6 caracteres" />
              {errors.usuario?.password && <p className="text-destructive text-xs mt-1">{errors.usuario.password.message}</p>}
            </div>
          </fieldset>

          {errors.root && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2.5 rounded-button">
              {errors.root.message}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR GIMNASIO'}
          </Button>

          <p className="text-sm text-center text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Iniciar sesión</Link>
          </p>
        </form>
      </main>
    </div>
  )
}

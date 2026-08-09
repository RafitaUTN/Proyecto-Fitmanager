import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import { http, HttpClientError } from '@/lib/http-client'

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

export function RegistroGimnasio() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

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
      const body = await http.post<{ token: string; csrfToken: string; usuario: any }>('/gimnasios', data)
      setAuth(body.token, body.usuario, body.csrfToken)
      navigate('/dashboard')
    } catch (err: any) {
      setError('root', { message: err instanceof HttpClientError ? err.message : 'Error de conexión' })
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col" style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 60%)' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-8">
        <img src="/assets/logo-minimalista.png" alt="FitManager" className="w-[110px] h-auto mb-6" />

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-lg bg-surface border border-border rounded-card shadow-2xl" style={{ padding: '24px' }}>
          <div className="text-center space-y-1 mb-5">
            <h1 className="font-heading text-3xl text-foreground tracking-wider">REGISTRAR GIMNASIO</h1>
            <p className="text-sm text-muted">Crea tu cuenta y comienza a administrar tu gimnasio</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nombre del gimnasio</label>
                <Input {...register('nombre')} placeholder="Mi Gimnasio" className="h-9 text-sm" />
                {errors.nombre && <p className="text-destructive text-xs mt-0.5">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Correo del gimnasio</label>
                <Input type="email" {...register('correo')} placeholder="gimnasio@correo.com" className="h-9 text-sm" />
                {errors.correo && <p className="text-destructive text-xs mt-0.5">{errors.correo.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Teléfono</label>
                <Input {...register('telefono')} placeholder="8888-8888" className="h-9 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Dirección</label>
                <Input {...register('direccion')} placeholder="Alajuela, Costa Rica" className="h-9 text-sm" />
              </div>
            </div>
          </div>

          <hr className="border-white/[0.08] my-4" />

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-dark uppercase tracking-wider">Datos del administrador</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nombre</label>
                <Input {...register('usuario.nombre')} placeholder="Carlos" className="h-9 text-sm" />
                {errors.usuario?.nombre && <p className="text-destructive text-xs mt-0.5">{errors.usuario.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Apellido</label>
                <Input {...register('usuario.apellido')} placeholder="Ramírez" className="h-9 text-sm" />
                {errors.usuario?.apellido && <p className="text-destructive text-xs mt-0.5">{errors.usuario.apellido.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Correo del administrador</label>
                <Input type="email" {...register('usuario.correo')} placeholder="admin@correo.com" className="h-9 text-sm" />
                {errors.usuario?.correo && <p className="text-destructive text-xs mt-0.5">{errors.usuario.correo.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Contraseña</label>
                <Input type="password" {...register('usuario.password')} placeholder="Mínimo 6 caracteres" className="h-9 text-sm" />
                {errors.usuario?.password && <p className="text-destructive text-xs mt-0.5">{errors.usuario.password.message}</p>}
              </div>
            </div>
          </div>

          {errors.root && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2 rounded-button mt-4">
              {errors.root.message}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full mt-5 h-10 text-sm">
            {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR GIMNASIO'}
          </Button>

          <p className="text-sm text-center text-muted mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Iniciar sesión</Link>
          </p>
        </form>
      </main>
    </div>
  )
}

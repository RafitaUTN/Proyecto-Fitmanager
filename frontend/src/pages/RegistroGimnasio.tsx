import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiPost } from '@/lib/api'

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
      await apiPost('/gimnasios', data)
      alert('Gimnasio registrado exitosamente')
    } catch (err: any) {
      setError('root', { message: err.message })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-lg bg-white rounded-xl shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Registrar Gimnasio</h1>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-gray-700">Datos del gimnasio</legend>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input {...register('nombre')} />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <Input type="email" {...register('correo')} />
            {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <Input {...register('telefono')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <Input {...register('direccion')} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-gray-700">Datos del administrador</legend>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input {...register('usuario.nombre')} />
            {errors.usuario?.nombre && <p className="text-red-500 text-xs mt-1">{errors.usuario.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apellido</label>
            <Input {...register('usuario.apellido')} />
            {errors.usuario?.apellido && <p className="text-red-500 text-xs mt-1">{errors.usuario.apellido.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <Input type="email" {...register('usuario.correo')} />
            {errors.usuario?.correo && <p className="text-red-500 text-xs mt-1">{errors.usuario.correo.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <Input type="password" {...register('usuario.password')} />
            {errors.usuario?.password && <p className="text-red-500 text-xs mt-1">{errors.usuario.password.message}</p>}
          </div>
        </fieldset>

        {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Registrando...' : 'Registrar'}
        </Button>
      </form>
    </div>
  )
}

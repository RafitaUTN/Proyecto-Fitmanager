import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClientePerfil, useCambiarPassword } from '@/hooks/use-cliente-portal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const passwordSchema = z.object({
  contrasena_actual: z.string().min(1, 'Contraseña actual requerida'),
  contrasena_nueva: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmar: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((d) => d.contrasena_nueva === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})

type PasswordForm = z.infer<typeof passwordSchema>

export function ClientePerfil() {

  const { data: perfil, isLoading } = useClientePerfil()
  const cambiarPassword = useCambiarPassword()
  const [successMsg, setSuccessMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  async function onSubmit(data: PasswordForm) {
    try {
      setSuccessMsg('')
      await cambiarPassword.mutateAsync({
        contrasena_actual: data.contrasena_actual,
        contrasena_nueva: data.contrasena_nueva,
      })
      setSuccessMsg('Contraseña actualizada correctamente.')
      reset()
    } catch (err: any) {
      setError('root', { message: err.message || 'Error al cambiar la contraseña.' })
    }
  }

  return (
    <div>
      <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MI PERFIL</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Información Personal</h2>
          {isLoading ? (
            <div className="text-muted animate-pulse">Cargando...</div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-dark uppercase tracking-wider">Nombre</p>
                <p className="text-foreground font-medium">{perfil?.nombre} {perfil?.apellido}</p>
              </div>
              <div>
                <p className="text-xs text-muted-dark uppercase tracking-wider">Correo</p>
                <p className="text-foreground font-medium">{perfil?.correo}</p>
              </div>
              {perfil?.telefono && (
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Teléfono</p>
                  <p className="text-foreground font-medium">{perfil.telefono}</p>
                </div>
              )}
              {perfil?.cedula && (
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Cédula</p>
                  <p className="text-foreground font-medium">{perfil.cedula}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-dark uppercase tracking-wider">Gimnasio</p>
                <p className="text-foreground font-medium">{perfil?.nombre_gimnasio}</p>
              </div>
              {perfil?.ultimo_acceso && (
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Último Acceso</p>
                  <p className="text-foreground font-medium">{new Date(perfil.ultimo_acceso).toLocaleString()}</p>
                </div>
              )}
              {perfil?.contrasena_temporal && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-2 rounded-button mt-3">
                  Contraseña temporal — cámbiala a continuación.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Cambiar Contraseña</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted">Contraseña Actual</label>
              <Input type="password" {...register('contrasena_actual')} placeholder="••••••••" />
              {errors.contrasena_actual && <p className="text-destructive text-xs mt-1">{errors.contrasena_actual.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted">Nueva Contraseña</label>
              <Input type="password" {...register('contrasena_nueva')} placeholder="Mínimo 6 caracteres" />
              {errors.contrasena_nueva && <p className="text-destructive text-xs mt-1">{errors.contrasena_nueva.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted">Confirmar Nueva Contraseña</label>
              <Input type="password" {...register('confirmar')} placeholder="Repite la nueva contraseña" />
              {errors.confirmar && <p className="text-destructive text-xs mt-1">{errors.confirmar.message}</p>}
            </div>

            {errors.root && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2.5 rounded-button">
                {errors.root.message}
              </div>
            )}

            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center px-4 py-2.5 rounded-button">
                {successMsg}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting || cambiarPassword.isPending} size="lg" className="w-full">
              {isSubmitting || cambiarPassword.isPending ? 'GUARDANDO...' : 'CAMBIAR CONTRASEÑA'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { http, HttpClientError } from '@/lib/http-client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loader2, Check, X, Eye, EyeOff } from 'lucide-react'

type Status = 'verificando' | 'valido' | 'invalido' | 'listo'

const requisitos = [
  { label: '12 caracteres mínimo', test: (p: string) => p.length >= 12 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export function SetupPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<Status>('verificando')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalido'); return }
    http.get<{ valido: boolean }>(`/auth/verificar?token=${token}`)
      .then(() => setStatus('valido'))
      .catch(() => setStatus('invalido'))
  }, [token])

  const passwordValida = requisitos.every((r) => r.test(password))
  const coinciden = password === confirmar && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordValida || !coinciden) return

    setEnviando(true)
    setError('')
    try {
      await http.post('/auth/setup-password', { token, password })
      setExito(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      if (err instanceof HttpClientError) {
        const body = err.body as any
        if (body?.detalles) {
          setError(body.detalles.map((d: any) => d.message).join('. '))
        } else {
          setError(err.message)
        }
      } else {
        setError('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (status === 'verificando') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    )
  }

  if (status === 'invalido') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4">
        <X size={48} className="text-red-500 mb-4" />
        <h1 className="font-heading text-3xl text-foreground tracking-wider mb-2">ENLACE INVÁLIDO</h1>
        <p className="text-muted text-sm mb-6">El enlace ha expirado o ya fue utilizado.</p>
        <Link to="/login" className="text-primary hover:underline text-sm font-medium">Ir a iniciar sesión</Link>
      </div>
    )
  }

  if (exito) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4">
        <Check size={48} className="text-secondary mb-4" />
        <h1 className="font-heading text-3xl text-foreground tracking-wider mb-2">CONTRASEÑA CREADA</h1>
        <p className="text-muted text-sm">Redirigiendo al inicio de sesión...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/assets/logo-completo.png" alt="FitManager" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="font-heading text-3xl text-foreground tracking-wider">CREAR CONTRASEÑA</h1>
          <p className="text-muted text-sm mt-1">Elige una contraseña segura para tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-card border border-border p-6 space-y-5">
          <div className="relative">
            <Input
              type={mostrar ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              autoFocus
            />
            <button type="button" onClick={() => setMostrar(!mostrar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-dark hover:text-foreground cursor-pointer">
              {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div>
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
            {confirmar && !coinciden && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <ul className="space-y-1.5">
            {requisitos.map((r) => {
              const cumple = r.test(password)
              return (
                <li key={r.label} className={`flex items-center gap-2 text-xs ${cumple ? 'text-secondary' : 'text-muted-dark'}`}>
                  {cumple ? <Check size={12} /> : <X size={12} />}
                  {r.label}
                </li>
              )
            })}
          </ul>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-button px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={!passwordValida || !coinciden || enviando}>
            {enviando ? <><Loader2 size={16} className="animate-spin mr-2" /> Creando...</> : 'Crear contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}

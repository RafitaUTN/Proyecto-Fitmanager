import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiPost, ApiRequestError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const valida = (value: string) => value.length >= 12 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !valida(password) || password !== confirmacion) return
    setError('')
    try {
      await apiPost('/auth/reset-password', { token, password })
      setListo(true)
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'No fue posible restablecer la contraseña.')
    }
  }

  return <main className="min-h-dvh bg-background flex items-center justify-center px-4">
    <section className="w-full max-w-md bg-surface border border-border rounded-card p-8">
      <h1 className="font-heading text-4xl tracking-wider text-foreground">NUEVA CONTRASEÑA</h1>
      {listo ? <p className="text-muted mt-4">La contraseña se actualizó y las sesiones anteriores fueron revocadas.</p> :
        <form onSubmit={submit} className="space-y-4 mt-5">
          <Input type="password" placeholder="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <Input type="password" placeholder="Confirmar contraseña" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="new-password" />
          <p className="text-xs text-muted">12+ caracteres, mayúscula, minúscula, número y símbolo.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={!token || !valida(password) || password !== confirmacion}>RESTABLECER</Button>
        </form>}
      <Link to="/login" className="block text-center text-primary text-sm mt-6 hover:underline">Ir al inicio de sesión</Link>
    </section>
  </main>
}

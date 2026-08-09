import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiPost } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function ForgotPassword() {
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setCargando(true)
    try {
      await apiPost('/auth/forgot-password', { correo })
      setEnviado(true)
    } finally {
      setCargando(false)
    }
  }

  return <main className="min-h-dvh bg-background flex items-center justify-center px-4">
    <section className="w-full max-w-md bg-surface border border-border rounded-card p-8">
      <h1 className="font-heading text-4xl tracking-wider text-foreground">RECUPERAR CONTRASEÑA</h1>
      {enviado ? <p className="text-muted mt-4">Si existe una cuenta activa con ese correo, recibirás un enlace válido por 60 minutos.</p> :
        <form onSubmit={submit} className="space-y-4 mt-5">
          <label className="block text-sm text-muted">Correo del portal cliente</label>
          <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
          <Button className="w-full" disabled={cargando}>{cargando ? 'ENVIANDO...' : 'ENVIAR ENLACE'}</Button>
        </form>}
      <Link to="/login" className="block text-center text-primary text-sm mt-6 hover:underline">Volver al inicio de sesión</Link>
    </section>
  </main>
}

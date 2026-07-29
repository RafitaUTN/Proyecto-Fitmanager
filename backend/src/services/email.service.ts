import { env } from '../config/env'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

async function enviar({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!env.resendApiKey) {
    console.warn('[email] RESEND_API_KEY no configurada — correo no enviado')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FitManager <noreply@fitmanager-saas.com>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[email] Error al enviar correo:', res.status, body)
    throw new Error('Error al enviar el correo de activación')
  }
}

export const emailService = { enviar }

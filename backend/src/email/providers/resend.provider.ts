/**
 * Proveedor transaccional basado en Resend.
 *
 * @remarks Usa el SDK oficial para enviar correos desde Vercel sin exponer
 * secretos en el repositorio. El remitente debe configurarse con un dominio
 * verificado o con el sandbox `onboarding@resend.dev` durante pruebas.
 */
import { Resend } from 'resend'
import type { EmailProvider, SendEmailParams } from '../email-provider.interface'
import { env } from '../../config/env'

let resend: Resend | null = null

function getResendClient(): Resend {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY_NO_CONFIGURADO')
  }
  if (!resend) {
    resend = new Resend(env.resendApiKey)
  }
  return resend
}

export const resendProvider: EmailProvider = {
  async send({ to, subject, html, text }: SendEmailParams): Promise<void> {
    const { error } = await getResendClient().emails.send({
      from: env.emailFrom || 'FitManager <onboarding@resend.dev>',
      to,
      subject,
      html,
      text,
    })

    if (error) {
      throw new Error(`RESEND_SEND_FAILED:${error.name || 'unknown'}`)
    }
  },
}

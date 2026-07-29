import { env } from '../config/env'
import { gmailProvider } from './providers/gmail.provider'
import { resendProvider } from './providers/resend.provider'
import { activationEmailHtml } from './templates/activation'
import type { EmailProvider } from './email-provider.interface'

function getProvider(): EmailProvider {
  switch (env.activeEmailProvider) {
    case 'gmail':
      return gmailProvider
    case 'resend':
      return resendProvider
    default:
      return gmailProvider
  }
}

function resolveRecipient(originalTo: string): string {
  if (env.appEnv === 'development' && env.emailDevOverride) {
    console.log('[email] Modo desarrollo: correo redirigido de "%s" a "%s"', originalTo, env.emailDevOverride)
    return env.emailDevOverride
  }
  return originalTo
}

const provider = getProvider()

export const emailService = {
  async sendPasswordSetupEmail(cliente: { nombre: string; correo: string }, token: string): Promise<void> {
    if (!env.resendApiKey && !env.smtpUser) {
      console.warn('[email] Ningún proveedor de correo configurado — correo no enviado')
      return
    }

    const to = resolveRecipient(cliente.correo)
    const enlace = `${env.appUrl}/setup-password?token=${token}`

    console.log('[email] Enviando correo de activación a %s...', to === cliente.correo ? to : `${cliente.correo} → ${to}`)
    await provider.send({
      to,
      subject: 'Bienvenido a FitManager — Activa tu cuenta',
      html: activationEmailHtml({
        nombre: cliente.nombre,
        enlace,
        appUrl: env.appUrl,
      }),
    })
    console.log('[email] Correo de activación enviado correctamente a %s', to)
  },

  async sendPasswordResetEmail(): Promise<void> {
    throw new Error('No implementado')
  },

  async sendMembershipNotification(): Promise<void> {
    throw new Error('No implementado')
  },

  async sendPaymentReceipt(): Promise<void> {
    throw new Error('No implementado')
  },

  async sendGeneralNotification(): Promise<void> {
    throw new Error('No implementado')
  },
}

import { env } from '../config/env'
import { gmailProvider } from './providers/gmail.provider'
import { resendProvider } from './providers/resend.provider'
import { activationEmailHtml } from './templates/activation'
import { passwordResetEmailHtml } from './templates/password-reset'
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

async function sendWithRetry(input: Parameters<EmailProvider['send']>[0]): Promise<void> {
  let lastError: unknown
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      await provider.send(input)
      return
    } catch (error) {
      lastError = error
      if (intento < 3) await new Promise((resolve) => setTimeout(resolve, intento * 250))
    }
  }
  throw lastError
}

export const emailService = {
  async sendPasswordSetupEmail(cliente: { nombre: string; correo: string }, token: string): Promise<void> {
    if (!env.resendApiKey && !env.smtpUser) {
      console.warn('[email] Ningún proveedor de correo configurado — correo no enviado')
      return
    }

    const to = resolveRecipient(cliente.correo)
    const enlace = `${env.appUrl}/setup-password?token=${token}`

    console.log('[email] Enviando correo de activación a %s...', to === cliente.correo ? to : `${cliente.correo} → ${to}`)
    await sendWithRetry({
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

  async sendPasswordResetEmail(cliente: { nombre: string; correo: string }, token: string): Promise<void> {
    if (!env.resendApiKey && !env.smtpUser) {
      console.warn('[email] Ningún proveedor configurado; recuperación no enviada')
      return
    }
    const to = resolveRecipient(cliente.correo)
    const enlace = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`
    await sendWithRetry({
      to,
      subject: 'Restablece tu contraseña de FitManager',
      html: passwordResetEmailHtml({ nombre: cliente.nombre, enlace }),
    })
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

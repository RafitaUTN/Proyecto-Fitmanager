import { env } from '../config/env'
import { prisma } from '../lib/prisma'
import { gmailProvider } from './providers/gmail.provider'
import { resendProvider } from './providers/resend.provider'
import { activationEmail } from './templates/activation'
import { passwordResetEmail } from './templates/password-reset'
import { buildEmailActionUrl } from './email-links'
import type { EmailProvider, SendEmailParams } from './email-provider.interface'

const provider: EmailProvider = env.activeEmailProvider === 'resend' ? resendProvider : gmailProvider
const providerConfigurado = () => env.emailDeliveryEnabled && (env.activeEmailProvider === 'resend' ? Boolean(env.resendApiKey) : Boolean(env.smtpUser && env.smtpPass))

function resolveRecipient(originalTo: string): string {
  return env.appEnv === 'development' && env.emailDevOverride ? env.emailDevOverride : originalTo
}

async function entregar(id: bigint, input: SendEmailParams): Promise<void> {
  if (!providerConfigurado()) {
    await prisma.emailOutbox.update({
      where: { id },
      data: { estado: 'FALLIDO', ultimo_error: 'PROVEEDOR_NO_CONFIGURADO', proximo_reintento: new Date(Date.now() + 15 * 60 * 1000) },
    })
    return
  }
  let lastError: unknown
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      await prisma.emailOutbox.update({ where: { id }, data: { intentos: { increment: 1 } } })
      await provider.send(input)
      await prisma.emailOutbox.update({
        where: { id },
        data: { estado: 'ENVIADO', enviado_en: new Date(), proximo_reintento: null, ultimo_error: null, html: '' },
      })
      return
    } catch (error) {
      lastError = error
      if (intento < 3) await new Promise((resolve) => setTimeout(resolve, intento * 250))
    }
  }
  await prisma.emailOutbox.update({
    where: { id },
    data: { estado: 'FALLIDO', ultimo_error: 'ENVIO_FALLIDO', proximo_reintento: new Date(Date.now() + 15 * 60 * 1000) },
  })
  throw lastError
}

async function encolarYEnviar(tipo: string, input: SendEmailParams): Promise<void> {
  const evento = await prisma.emailOutbox.create({
    data: { destinatario: input.to, asunto: input.subject, html: input.html, texto: input.text, tipo },
  })
  await entregar(evento.id, input)
}

export const emailService = {
  async sendPasswordSetupEmail(cliente: { nombre: string; correo: string; gimnasio: string }, token: string): Promise<void> {
    const to = resolveRecipient(cliente.correo)
    const enlace = buildEmailActionUrl(env.frontendUrl, 'setup-password', token)
    const contenido = activationEmail({ nombre: cliente.nombre, gimnasio: cliente.gimnasio, enlace, frontendUrl: env.frontendUrl })
    await encolarYEnviar('ACTIVACION', {
      to,
      subject: 'Bienvenido a FitManager — Activa tu cuenta',
      ...contenido,
    })
  },

  async sendPasswordResetEmail(cliente: { nombre: string; correo: string }, token: string): Promise<void> {
    const to = resolveRecipient(cliente.correo)
    const enlace = buildEmailActionUrl(env.frontendUrl, 'reset-password', token)
    const contenido = passwordResetEmail({ nombre: cliente.nombre, enlace })
    await encolarYEnviar('RECUPERACION', {
      to,
      subject: 'Restablece tu contraseña de FitManager',
      ...contenido,
    })
  },

  async reenviarPendientes(limite = 25) {
    const ahora = new Date()
    const pendientes = await prisma.emailOutbox.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'FALLIDO'] },
        OR: [{ proximo_reintento: null }, { proximo_reintento: { lte: ahora } }],
      },
      orderBy: { creado_en: 'asc' },
      take: limite,
    })
    let enviados = 0
    for (const evento of pendientes) {
      try {
        await entregar(evento.id, { to: evento.destinatario, subject: evento.asunto, html: evento.html, text: evento.texto })
        const actual = await prisma.emailOutbox.findUnique({ where: { id: evento.id }, select: { estado: true } })
        if (actual?.estado === 'ENVIADO') enviados += 1
      } catch {
        // El evento conserva estado y siguiente reintento; continuar con el lote.
      }
    }
    return { procesados: pendientes.length, enviados }
  },
}

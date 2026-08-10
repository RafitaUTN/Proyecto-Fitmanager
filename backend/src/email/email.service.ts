import { env } from '../config/env'
import { prisma } from '../lib/prisma'
import { tokenService, type RecoveryActor } from '../services/token.service'
import { gmailProvider } from './providers/gmail.provider'
import { resendProvider } from './providers/resend.provider'
import { activationEmail } from './templates/activation'
import { passwordResetEmail } from './templates/password-reset'
import { buildEmailActionUrl } from './email-links'
import type { EmailProvider, SendEmailParams } from './email-provider.interface'

const ACTIVATION_TEMPLATE = 'ACCOUNT_ACTIVATION_V1'
const RECOVERY_TEMPLATE = 'PASSWORD_RECOVERY_V1'

type ActivationContext = { nombre: string; gimnasio: string }
type RecoveryContext = { nombre: string }
type StructuredContext = ActivationContext | RecoveryContext

const provider: EmailProvider = env.activeEmailProvider === 'resend' ? resendProvider : gmailProvider
const providerConfigurado = () => env.emailDeliveryEnabled
  && (env.activeEmailProvider === 'resend' ? Boolean(env.resendApiKey) : Boolean(env.smtpUser && env.smtpPass))

function resolveRecipient(originalTo: string): string {
  return env.appEnv === 'development' && env.emailDevOverride ? env.emailDevOverride : originalTo
}

function renderStructuredEmail(
  templateId: string,
  contexto: StructuredContext,
  token: string,
): Pick<SendEmailParams, 'html' | 'text'> {
  if (templateId === ACTIVATION_TEMPLATE && 'gimnasio' in contexto) {
    const enlace = buildEmailActionUrl(env.frontendUrl, 'setup-password', token)
    return activationEmail({ nombre: contexto.nombre, gimnasio: contexto.gimnasio, enlace, frontendUrl: env.frontendUrl })
  }
  if (templateId === RECOVERY_TEMPLATE) {
    const enlace = buildEmailActionUrl(env.frontendUrl, 'reset-password', token)
    return passwordResetEmail({ nombre: contexto.nombre, enlace })
  }
  throw new Error('EMAIL_TEMPLATE_INVALIDO')
}

function readContext(value: unknown): StructuredContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('EMAIL_CONTEXT_INVALIDO')
  const context = value as Record<string, unknown>
  if (typeof context.nombre !== 'string') throw new Error('EMAIL_CONTEXT_INVALIDO')
  if (context.gimnasio !== undefined && typeof context.gimnasio !== 'string') throw new Error('EMAIL_CONTEXT_INVALIDO')
  return context.gimnasio === undefined
    ? { nombre: context.nombre }
    : { nombre: context.nombre, gimnasio: context.gimnasio }
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
        data: { estado: 'ENVIADO', enviado_en: new Date(), proximo_reintento: null, ultimo_error: null, html: '', texto: '' },
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

async function descartarEvento(id: bigint, motivo: string): Promise<void> {
  await prisma.emailOutbox.update({
    where: { id },
    data: { estado: 'DESCARTADO', ultimo_error: motivo, proximo_reintento: null, html: '', texto: '' },
  })
}

export const emailService = {
  async sendPasswordSetupEmail(
    cliente: { id_cliente: bigint; nombre: string; correo: string; gimnasio: string },
    creadoPor?: bigint,
  ): Promise<void> {
    const to = resolveRecipient(cliente.correo)
    const subject = 'Bienvenido a FitManager — Activa tu cuenta'
    const contexto: ActivationContext = { nombre: cliente.nombre, gimnasio: cliente.gimnasio }
    const queued = await prisma.$transaction(async (tx) => {
      const token = await tokenService.crearActivacionRegistro(cliente.id_cliente, creadoPor, tx)
      const evento = await tx.emailOutbox.create({
        data: {
          destinatario: to,
          asunto: subject,
          html: '',
          texto: '',
          tipo: 'ACTIVACION',
          template_id: ACTIVATION_TEMPLATE,
          contexto,
          id_token: token.id,
        },
        select: { id: true },
      })
      return { id: evento.id, token: token.value }
    })
    const contenido = renderStructuredEmail(ACTIVATION_TEMPLATE, contexto, queued.token)
    await entregar(queued.id, { to, subject, ...contenido })
  },

  async sendPasswordResetEmail(
    cliente: { nombre: string; correo: string },
    actor: RecoveryActor,
  ): Promise<void> {
    const to = resolveRecipient(cliente.correo)
    const subject = 'Restablece tu contraseña de FitManager'
    const contexto: RecoveryContext = { nombre: cliente.nombre }
    const queued = await prisma.$transaction(async (tx) => {
      const token = await tokenService.crearRecuperacionRegistro(actor, tx)
      const evento = await tx.emailOutbox.create({
        data: {
          destinatario: to,
          asunto: subject,
          html: '',
          texto: '',
          tipo: 'RECUPERACION',
          template_id: RECOVERY_TEMPLATE,
          contexto,
          id_token: token.id,
        },
        select: { id: true },
      })
      return { id: evento.id, token: token.value }
    })
    const contenido = renderStructuredEmail(RECOVERY_TEMPLATE, contexto, queued.token)
    await entregar(queued.id, { to, subject, ...contenido })
  },

  async reenviarPendientes(limite = 25) {
    const ahora = new Date()
    const pendientes = await prisma.emailOutbox.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'FALLIDO'] },
        OR: [{ proximo_reintento: null }, { proximo_reintento: { lte: ahora } }],
      },
      include: { token: true },
      orderBy: { creado_en: 'asc' },
      take: limite,
    })

    if (!providerConfigurado()) return { procesados: 0, enviados: 0, omitidos: pendientes.length }

    let enviados = 0
    for (const evento of pendientes) {
      try {
        if (!evento.token || ![ACTIVATION_TEMPLATE, RECOVERY_TEMPLATE].includes(evento.template_id)) {
          await descartarEvento(evento.id, 'EVENTO_NO_REGENERABLE')
          continue
        }
        const actor: RecoveryActor | null = evento.token.id_cliente
          ? { actorType: 'CLIENTE', actorId: evento.token.id_cliente }
          : evento.token.id_usuario
            ? { actorType: 'STAFF', actorId: evento.token.id_usuario }
            : null
        if (!actor) {
          await descartarEvento(evento.id, 'ACTOR_NO_DISPONIBLE')
          continue
        }
        if (evento.template_id === ACTIVATION_TEMPLATE && actor.actorType !== 'CLIENTE') {
          await descartarEvento(evento.id, 'ACTOR_INCOMPATIBLE')
          continue
        }
        const contexto = readContext(evento.contexto)
        const fresh = await prisma.$transaction(async (tx) => {
          const token = evento.template_id === ACTIVATION_TEMPLATE
            ? await tokenService.crearActivacionRegistro(actor.actorId, evento.token?.creado_por ?? undefined, tx)
            : await tokenService.crearRecuperacionRegistro(actor, tx)
          await tx.emailOutbox.update({
            where: { id: evento.id },
            data: { id_token: token.id, estado: 'PENDIENTE', ultimo_error: null, proximo_reintento: null },
          })
          return token.value
        })
        const contenido = renderStructuredEmail(evento.template_id, contexto, fresh)
        await entregar(evento.id, { to: evento.destinatario, subject: evento.asunto, ...contenido })
        const actual = await prisma.emailOutbox.findUnique({ where: { id: evento.id }, select: { estado: true } })
        if (actual?.estado === 'ENVIADO') enviados += 1
      } catch {
        // El token en claro solo vivió en memoria. El evento conserva metadatos de reintento.
      }
    }
    return { procesados: pendientes.length, enviados, omitidos: 0 }
  },
}

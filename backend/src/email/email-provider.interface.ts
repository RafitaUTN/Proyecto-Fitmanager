/**
 * Módulo de correo email-provider.interface.
 *
 * @remarks Centraliza contratos, enlaces o envío de notificaciones transaccionales.
 */
export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailProvider {
  send(params: SendEmailParams): Promise<void>
}

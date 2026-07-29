import nodemailer from 'nodemailer'
import type { EmailProvider, SendEmailParams } from '../email-provider.interface'
import { env } from '../../config/env'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  }
  return transporter
}

export const gmailProvider: EmailProvider = {
  async send({ to, subject, html }: SendEmailParams): Promise<void> {
    const t = getTransporter()

    await t.sendMail({
      from: `FitManager <${env.smtpUser}>`,
      to,
      subject,
      html,
    })
  },
}

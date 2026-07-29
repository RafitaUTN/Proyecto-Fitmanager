import type { EmailProvider, SendEmailParams } from '../email-provider.interface'
import { env } from '../../config/env'

export const resendProvider: EmailProvider = {
  async send({ to, subject, html }: SendEmailParams): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom || 'FitManager <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }
  },
}

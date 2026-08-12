const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[char] as string))

export type PaymentAvailableEmailInput = {
  nombre: string
  plan: string
  vencimiento: string
  saldoPendiente: number
  gimnasio: string
}

export function paymentAvailableEmail(input: PaymentAvailableEmailInput): { html: string; text: string } {
  const saldo = `₡${input.saldoPendiente.toLocaleString('es-CR')}`
  const nombre = escapeHtml(input.nombre)
  const plan = escapeHtml(input.plan)
  const vencimiento = escapeHtml(input.vencimiento)
  const gimnasio = escapeHtml(input.gimnasio)
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#090909;color:#fff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;background:#121212;border:1px solid #292929;border-radius:18px;padding:32px"><h1 style="color:#F97316">Tu pago ya está disponible</h1><p>Hola, <strong>${nombre}</strong>:</p><p>Tu membresía <strong>${plan}</strong> está próxima a vencer.</p><p>Fecha de vencimiento: <strong>${vencimiento}</strong><br>Monto pendiente: <strong>${saldo}</strong></p><p>Ya puedes acercarte a ${gimnasio} para realizar tu pago y mantener activa tu membresía.</p><p>Gracias,<br>${gimnasio}<br>FitManager</p></div></body></html>`
  const text = `Hola, ${input.nombre}:\n\nTu membresía ${input.plan} está próxima a vencer.\n\nFecha de vencimiento: ${input.vencimiento}\nMonto pendiente: ${saldo}\n\nYa puedes acercarte a ${input.gimnasio} para realizar tu pago y mantener activa tu membresía.\n\nGracias,\n${input.gimnasio}\nFitManager`
  return { html, text }
}

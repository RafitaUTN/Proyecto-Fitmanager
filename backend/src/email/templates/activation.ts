const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[char] as string))

export type ActivationEmailInput = {
  nombre: string
  gimnasio: string
  enlace: string
  frontendUrl: string
}

export function activationEmail(input: ActivationEmailInput): { html: string; text: string } {
  const nombre = escapeHtml(input.nombre)
  const gimnasio = escapeHtml(input.gimnasio)
  const enlace = escapeHtml(input.enlace)
  const logo = escapeHtml(`${input.frontendUrl.replace(/\/+$/, '')}/assets/logo-minimalista.png`)
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenido a FitManager</title></head>
<body style="margin:0;padding:0;background:#090909;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#090909"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td align="center" style="padding:8px 0 24px"><img src="${logo}" width="54" height="46" alt="FitManager" style="display:block;border:0;width:54px;height:auto"><div style="font-size:25px;font-weight:800;letter-spacing:2px;margin-top:10px">FITMANAGER</div></td></tr>
<tr><td style="background:#121212;border:1px solid #292929;border-radius:18px;padding:36px 32px">
<h1 style="font-size:25px;line-height:1.25;margin:0 0 20px;color:#ffffff">Bienvenido a FitManager</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 12px;color:#d7dee8">Hola, <strong style="color:#ffffff">${nombre}</strong>.</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 12px;color:#d7dee8">Tu cuenta ha sido creada en <strong style="color:#ffffff">${gimnasio}</strong>.</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 28px;color:#d7dee8">Para comenzar a utilizar FitManager debes crear tu contraseña.</p>
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td bgcolor="#F97316" style="border-radius:12px"><a href="${enlace}" style="display:inline-block;padding:15px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:.4px">CREAR MI CONTRASEÑA</a></td></tr></table>
<p style="font-size:13px;line-height:1.55;margin:28px 0 10px;color:#94a3b8">Este enlace estará disponible durante 24 horas y solo se puede utilizar una vez.</p>
<p style="font-size:13px;line-height:1.55;margin:0;color:#94a3b8">Si el botón no funciona, copia esta URL en tu navegador:</p>
<p style="font-size:12px;line-height:1.55;margin:8px 0 20px;word-break:break-all;color:#F97316">${enlace}</p>
<p style="font-size:13px;line-height:1.55;margin:0;color:#64748b">Si no reconoces esta invitación, puedes ignorar este mensaje.</p>
</td></tr><tr><td align="center" style="padding:24px 8px;color:#64748b;font-size:12px">© 2026 FitManager</td></tr>
</table></td></tr></table></body></html>`
  const text = `FITMANAGER\n\nBienvenido a FitManager\n\nHola, ${input.nombre}.\n\nTu cuenta ha sido creada en ${input.gimnasio}.\n\nPara comenzar a utilizar FitManager debes crear tu contraseña:\n${input.enlace}\n\nEste enlace estará disponible durante 24 horas y solo se puede utilizar una vez.\n\nSi no reconoces esta invitación, puedes ignorar este mensaje.\n\n© 2026 FitManager`
  return { html, text }
}

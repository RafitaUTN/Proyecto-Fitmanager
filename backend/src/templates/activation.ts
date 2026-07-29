const STYLE = `
body { margin:0; padding:0; background:#090909; font-family:Inter,-apple-system,sans-serif; }
table { border-collapse:collapse; }
.container { max-width:600px; margin:0 auto; padding:32px 24px; }
.header { text-align:center; padding:32px 0 24px; }
.header img { height:36px; width:auto; }
.header h1 { font-size:28px; color:#fff; font-weight:700; letter-spacing:2px; margin:12px 0 0; text-transform:uppercase; }
.card { background:#121212; border-radius:18px; padding:32px; border:1px solid rgba(255,255,255,0.08); }
.card h2 { font-size:22px; color:#fff; margin:0 0 8px; }
.card p { font-size:15px; color:#94a3b8; line-height:1.6; margin:0 0 24px; }
.btn { display:inline-block; background:#F97316; color:#fff !important; text-decoration:none; padding:14px 32px; border-radius:14px; font-size:15px; font-weight:700; letter-spacing:0.5px; }
.btn:hover { background:#EA580C; }
.footer { text-align:center; padding:24px; color:#64748b; font-size:13px; }
.footer a { color:#F97316; text-decoration:none; }
`

export function activationEmailHtml({ nombre, enlace }: { nombre: string; enlace: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${STYLE}</style></head>
<body>
<table role="presentation" class="container" align="center">
<tr><td class="header">
<img src="https://fitmanager-saas.vercel.app/assets/logo-minimalista.png" alt="FitManager" />
<h1>FITMANAGER</h1>
</td></tr>
<tr><td class="card">
<h2>Bienvenido, ${nombre}</h2>
<p>Has sido registrado en FitManager. Para activar tu cuenta y crear tu contraseña, haz clic en el siguiente botón:</p>
<p align="center"><a href="${enlace}" class="btn">CREAR CONTRASEÑA</a></p>
<p style="font-size:13px;color:#64748b;text-align:center;margin:0;">Este enlace expira en 24 horas. Si no solicitaste este registro, ignora este correo.</p>
</td></tr>
<tr><td class="footer">
<p>&copy; ${new Date().getFullYear()} FitManager. Todos los derechos reservados.</p>
<p><a href="https://fitmanager-saas.vercel.app">fitmanager-saas.vercel.app</a></p>
</td></tr>
</table>
</body>
</html>`
}

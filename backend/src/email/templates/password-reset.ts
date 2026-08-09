const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[char] as string))

export function passwordResetEmailHtml(input: { nombre: string; enlace: string }): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#090909;color:#fff;font-family:Inter,Arial,sans-serif">
  <div style="max-width:560px;margin:auto;padding:32px 20px">
    <div style="background:#121212;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px">
      <h1 style="margin:0 0 12px;font-size:24px">Restablecer contraseña</h1>
      <p style="color:#94a3b8;line-height:1.6">Hola ${escapeHtml(input.nombre)}. Recibimos una solicitud para restablecer tu contraseña de FitManager.</p>
      <p style="margin:28px 0"><a href="${escapeHtml(input.enlace)}" style="background:#F97316;color:#fff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:700">CREAR NUEVA CONTRASEÑA</a></p>
      <p style="color:#64748b;font-size:13px;line-height:1.5">El enlace expira en 60 minutos y solo puede utilizarse una vez. Si no hiciste la solicitud, ignora este mensaje.</p>
    </div>
  </div></body></html>`
}

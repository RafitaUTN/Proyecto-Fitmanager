import { test, expect, type APIResponse } from '@playwright/test'

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api'
const ADMIN_PASSWORD = 'PagoHab.2026!'

async function apiJson(res: APIResponse) {
  const body = await res.json()
  if (!res.ok()) {
    throw new Error(`${res.status()} ${res.url()}: ${JSON.stringify(body)}`)
  }
  return body
}

function hoyCostaRica(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

test.describe.serial('Ventana de pago en el único modal Registrar Pago', () => {
  let adminCorreo = ''
  let idCliente = 0
  let idClienteMembresia = 0

  test.beforeAll(async ({ request }) => {
    const sufijo = Date.now()
    adminCorreo = `admin.pagohab.${sufijo}@e2e.test`
    const cedulaCliente = `PAGO${sufijo % 100000000}`

    // Preparar datos como un gimnasio real recién registrado
    const gym = await apiJson(await request.post(`${API_URL}/gimnasios`, {
      data: {
        nombre: `Gym Pago Habilitado ${sufijo}`,
        correo: `gym.pagohab.${sufijo}@e2e.test`,
        telefono: '0000-0000',
        direccion: 'E2E',
        usuario: { nombre: 'Admin', apellido: 'Pago', correo: adminCorreo, password: ADMIN_PASSWORD },
      },
    }))
    const headers = { Authorization: `Bearer ${gym.token}` }

    const membresia = await apiJson(await request.post(`${API_URL}/membresias`, {
      headers,
      data: { nombre: 'Plan Pago Habilitado', descripcion: 'Plan para validar pago inmediato', precio: 10000, duracion_dias: 30 },
    }))

    const cliente = await apiJson(await request.post(`${API_URL}/clientes`, {
      headers,
      data: { nombre: 'Pago', apellido: 'Habilitado', cedula: cedulaCliente, correo: `cliente.pagohab.${sufijo}@e2e.test` },
    }))
    idCliente = cliente.id_cliente

    const asignacion = await apiJson(await request.post(`${API_URL}/clientes-membresias`, {
      headers,
      data: { id_cliente: idCliente, id_membresia: membresia.id_membresia, fecha_inicio: hoyCostaRica() },
    }))
    idClienteMembresia = asignacion.id_cliente_membresia

    // La API es la fuente de verdad: una membresía recién iniciada no es pagable.
    const resumen = await apiJson(await request.get(`${API_URL}/pagos/resumen/${idClienteMembresia}`, { headers }))
    expect(resumen.pago_habilitado, `resumen inesperado: ${JSON.stringify(resumen)}`).toBe(false)
    expect(resumen.motivo_no_pagable).toBe('VENTANA_NO_ABIERTA')
    const intento = await request.post(`${API_URL}/pagos`, {
      headers,
      data: { id_cliente: idCliente, id_cliente_membresia: idClienteMembresia, monto: 1000, metodo_pago: 'efectivo' },
    })
    expect(intento.status()).toBe(409)
    expect(await intento.json()).toMatchObject({ codigo: 'PAYMENT_NOT_AVAILABLE_YET' })
  })

  test('informa la fecha y bloquea el pago sin abrir un segundo modal', async ({ page }) => {
    // Login como el admin del gimnasio recién creado
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', adminCorreo)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')

    await page.goto('/dashboard/pagos')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Nuevo Pago' }).click()

    const modalCard = page.locator('.fixed.inset-0.z-50 .relative.bg-surface')
    await expect(modalCard).toBeVisible()

    // Seleccionar el cliente y la membresía recién asignada
    await modalCard.locator('select').first().selectOption(String(idCliente))
    const membresiaSelect = modalCard.locator('select').nth(1)
    await expect(membresiaSelect).toBeEnabled({ timeout: 5000 })
    await membresiaSelect.selectOption(String(idClienteMembresia))

    // El mismo modal explica la causa y bloquea todos los controles de pago.
    const registrarBtn = page.getByRole('button', { name: 'Registrar Pago' })
    await expect(registrarBtn).toBeDisabled({ timeout: 10000 })
    await expect(modalCard.locator('input[name="monto"]')).toBeDisabled()
    await expect(modalCard.locator('select[name="metodo_pago"]')).toBeDisabled()
    await expect(modalCard.getByText(/todavía no se encuentra dentro del periodo de pago/i)).toBeVisible()
    await expect(modalCard.getByText(/Pago disponible desde:/i)).toBeVisible()
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    await expect(page.locator('.fixed.inset-0.z-50')).toHaveCount(1)
  })
})

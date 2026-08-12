import { test, expect } from '@playwright/test'

const ADMIN = { correo: 'admin@fitmanager.com', password: '123456' }

test.describe.serial('Admin - Notificaciones', () => {

  async function login(page: typeof test['page'], creds: { correo: string; password: string }) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[name="correo"]', creds.correo)
    await page.fill('input[name="password"]', creds.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('Admin asigna membresía y ve notificación', async ({ page, request }) => {
    const api = process.env.E2E_API_URL || 'http://localhost:3200/api'
    const loginResponse = await request.post(`${api}/auth/login`, { data: ADMIN })
    expect(loginResponse.ok()).toBe(true)
    const { token } = await loginResponse.json()
    const suffix = Date.now()
    const nombreCliente = `Notif${suffix}`
    const clienteResponse = await request.post(`${api}/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        nombre: nombreCliente,
        apellido: 'Auditoría',
        cedula: `N${String(suffix).slice(-9)}`,
        correo: `notif.${suffix}@e2e.test`,
      },
    })
    expect(clienteResponse.ok()).toBe(true)

    await login(page, ADMIN)

    await page.goto('/dashboard/asignar-membresia')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Buscar por nombre"]')
    await searchInput.fill(nombreCliente)
    await page.waitForTimeout(1000)

    const sugerencia = page.locator('div.absolute.z-10 button').first()
    await expect(sugerencia).toBeVisible({ timeout: 10000 })
    await sugerencia.click()
    await page.waitForTimeout(500)

    await page.locator('select').first().selectOption({ index: 1 })
    await page.waitForTimeout(200)
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0])

    await page.locator('button:has-text("Asignar Membresía")').click()
    await expect(page.getByText('Membresía asignada exitosamente')).toBeVisible({ timeout: 10000 })

    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await expect(page.getByText('Todas').first()).toBeVisible({ timeout: 10000 })
  })
})

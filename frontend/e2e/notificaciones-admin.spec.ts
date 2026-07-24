import { test, expect } from '@playwright/test'

const ADMIN = { correo: 'admin@fitmanager.com', password: '123456' }

test.describe.serial('Admin - Notificaciones', () => {

  async function login(page: typeof test['page'], creds: { correo: string; password: string }) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', creds.correo)
    await page.fill('input[type="password"]', creds.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('Admin asigna membresía con entrenador y ve notificación', async ({ page }) => {
    await login(page, ADMIN)

    await page.goto('/dashboard/asignar-membresia')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Buscar por nombre"]')
    await searchInput.fill('fernando')
    await page.waitForTimeout(800)

    const sugerencia = page.locator('div.absolute.z-10 button').first()
    await expect(sugerencia).toBeVisible({ timeout: 10000 })
    await sugerencia.click()
    await page.waitForTimeout(300)

    await page.locator('select').first().selectOption({ index: 1 })
    await page.waitForTimeout(200)
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0])

    const entrenadorRadio = page.locator('label:has-text("pepito diaz")').first()
    await expect(entrenadorRadio).toBeVisible({ timeout: 5000 })
    await entrenadorRadio.locator('input[type="radio"]').check()
    await page.waitForTimeout(200)

    await page.locator('button:has-text("Asignar Membresía")').click()
    await expect(page.getByText('exitosa')).toBeVisible({ timeout: 10000 })

    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const heading = page.getByRole('heading', { name: 'Cliente asignado' }).first()
    await expect(heading).toBeVisible({ timeout: 10000 })

    const msg = page.getByText('El cliente fernando flores fue asignado al entrenador pepito diaz').first()
    await expect(msg).toBeVisible({ timeout: 5000 })
  })
})

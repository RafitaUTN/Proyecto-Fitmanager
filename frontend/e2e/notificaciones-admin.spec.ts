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

  async function cancelarSiExiste(page: typeof test['page']) {
    await page.waitForTimeout(1500)
    const renovarBtn = page.getByRole('button', { name: 'Renovar' })
    if (await renovarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator('button:has-text("Cancelar")').last().click()
      await page.locator('button:has-text("Cancelar membresía")').click()
      await page.waitForTimeout(1000)
    }
  }

  test('Admin asigna membresía y ve notificación', async ({ page }) => {
    await login(page, ADMIN)

    await page.goto('/dashboard/asignar-membresia')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Buscar por nombre"]')
    await searchInput.fill('pablo')
    await page.waitForTimeout(1000)

    const sugerencia = page.locator('div.absolute.z-10 button').first()
    await expect(sugerencia).toBeVisible({ timeout: 10000 })
    await sugerencia.click()
    await page.waitForTimeout(500)

    await cancelarSiExiste(page)

    await page.locator('select').first().selectOption({ index: 1 })
    await page.waitForTimeout(200)
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0])

    await page.locator('button:has-text("Asignar Membresía")').click()
    await expect(page.getByText('exitosa')).toBeVisible({ timeout: 10000 })

    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await expect(page.getByText('Todas').first()).toBeVisible({ timeout: 10000 })
  })
})

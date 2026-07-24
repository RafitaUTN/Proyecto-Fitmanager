import { test, expect } from '@playwright/test'

const ENTRENADOR = { correo: 'entre@fitmanager.com', password: '123456' }

test.describe.serial('Entrenador - Notificaciones', () => {

  async function login(page: typeof test['page'], creds: { correo: string; password: string }) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', creds.correo)
    await page.fill('input[type="password"]', creds.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('Entrenador ve notificación de nuevo cliente asignado', async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await login(page, ENTRENADOR)

    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const heading = page.getByRole('heading', { name: 'Nuevo cliente asignado' }).first()
    await expect(heading).toBeVisible({ timeout: 15000 })

    const msg = page.getByText('Se te asignó un nuevo cliente: fernando flores').first()
    await expect(msg).toBeVisible({ timeout: 5000 })
  })
})

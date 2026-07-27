import { test, expect } from '@playwright/test'

const RECEPCIONISTA = { correo: 're@fitmanager.com', password: '123456' }

test.describe.serial('Recepcionista - Notificaciones', () => {

  async function login(page: typeof test['page'], creds: { correo: string; password: string }) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', creds.correo)
    await page.fill('input[type="password"]', creds.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('Recepcionista ve notificación de cliente asignado en tabs Todas y Sistema', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await login(page, RECEPCIONISTA)

    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const heading = page.getByRole('heading', { name: 'Cliente asignado' }).first()
    await expect(heading).toBeVisible({ timeout: 15000 })

    const msg = page.getByText('El cliente fernando flores fue asignado al entrenador pepito diaz').first()
    await expect(msg).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Sistema' }).click()
    await page.waitForTimeout(500)
    await expect(heading).toBeVisible({ timeout: 5000 })
  })
})

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

  test('Recepcionista no recibe notificaciones dirigidas a administración', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await login(page, RECEPCIONISTA)

    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await expect(page.getByRole('button', { name: 'Todas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sistema' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cliente asignado' })).toHaveCount(0)
  })
})

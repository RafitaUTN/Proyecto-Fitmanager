import { test, expect } from '@playwright/test'

const RECEPCION = { correo: 're@fitmanager.com', password: '123456' }

test.describe.serial('Sprint 3 - Recepcionista', () => {

  async function login(page: typeof test['page']) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', RECEPCION.correo)
    await page.fill('input[type="password"]', RECEPCION.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('HU-10: Recepcionista filtra pagos por cliente', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/pagos')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(500)
    const filterSelect = page.locator('select').first()
    const options = await filterSelect.locator('option').all()
    if (options.length > 1) {
      await filterSelect.selectOption({ index: 1 })
      await page.waitForTimeout(500)
    }
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  })

  test('HU-11: Recepcionista ve sección de asistencias', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/asistencias')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'ASISTENCIAS' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('REGISTRAR ENTRADA')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('REGISTRAR SALIDA')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('HISTORIAL')).toBeVisible({ timeout: 5000 })
  })

  test('HU-12: Recepcionista consulta dashboard con datos de asistencias', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(1000)

    await expect(page.getByText('Clientes hoy').or(page.getByText('Clientes registrados'))).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Asistencias').first()).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Recepcionista NO ve Rutinas en sidebar', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(500)

    await expect(page.locator('nav a:has-text("Rutinas")')).toHaveCount(0)
    await expect(page.locator('nav a:has-text("Ejercicios")')).toHaveCount(0)
  })
})

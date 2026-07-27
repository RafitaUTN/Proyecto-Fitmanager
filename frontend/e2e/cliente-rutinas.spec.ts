import { test, expect } from '@playwright/test'

test.describe('Cliente - Rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'admin@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('Admin asigna rutina a entrenador', async ({ page }) => {
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    const primerRutina = page.locator('.grid > div').first()
    await primerRutina.click()
    await page.click('text=Asignar Entrenador')
    await expect(page.locator('text=ASIGNAR RUTINA A ENTRENADOR')).toBeVisible()
  })

  test('Admin asigna rutina a cliente', async ({ page }) => {
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    await page.click('text=Asignar Cliente').first()
    await expect(page.locator('text=ASIGNAR RUTINA A CLIENTE')).toBeVisible()
    await page.selectOption('select', { index: 1 })
    await page.click('button:has-text("Asignar")')
    await expect(page.locator('text=Rutina asignada exitosamente')).toBeVisible()
  })

  test('Vista de clientes asignados visible en detalle', async ({ page }) => {
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    const primerRutina = page.locator('.grid > div').first()
    await primerRutina.click()
    await expect(page.locator('text=Clientes asignados')).toBeVisible()
  })
})

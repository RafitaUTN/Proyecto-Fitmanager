import { test, expect } from '@playwright/test'

test.describe('Entrenador - Rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'svargas@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=MIS RUTINAS')
  })

  test('Entrenador ve solo sus rutinas asignadas', async ({ page }) => {
    const cards = page.locator('.grid > div')
    await expect(cards.first()).toBeVisible()
  })

  test('Entrenador NO puede crear rutinas', async ({ page }) => {
    await expect(page.locator('text=Nueva Rutina')).not.toBeVisible()
  })

  test('Entrenador NO puede eliminar rutinas', async ({ page }) => {
    await expect(page.locator('text=Eliminar')).not.toBeVisible()
  })

  test('Entrenador asigna rutina a cliente', async ({ page }) => {
    await page.locator('text=Asignar Cliente').first().click()
    await expect(page.locator('text=ASIGNAR RUTINA A CLIENTE')).toBeVisible()
    await page.selectOption('select', { index: 1 })
    await page.click('button:has-text("Asignar")')
    await expect(page.locator('text=Rutina asignada exitosamente')).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Recepción - RBAC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'admin@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('Recepcionista no ve Rutinas en sidebar', async ({ page }) => {
    await page.click('text=Cerrar sesión')
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'recepcion@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await expect(page.locator('a[href="/dashboard/rutinas"]')).not.toBeVisible()
  })

  test('Recepcionista no ve Ejercicios en sidebar', async ({ page }) => {
    await expect(page.locator('a[href="/dashboard/ejercicios"]')).not.toBeVisible()
  })

  test('Recepcionista obtiene 403 al acceder a ejercicios', async ({ page }) => {
    await page.goto('/dashboard/ejercicios')
    await expect(page.locator('text=No autorizado')).toBeVisible()
  })

  test('Entrenador obtiene 403 al acceder a ejercicios', async ({ page }) => {
    await page.click('text=Cerrar sesión')
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'svargas@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/ejercicios')
    await expect(page.locator('text=No autorizado')).toBeVisible()
  })
})

import { test, expect, type Page } from '@playwright/test'

async function login(page: Page, correo: string) {
  await page.goto('/login')
  await page.fill('input[name="correo"]', correo)
  await page.fill('input[name="password"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

test.describe('Recepción - RBAC', () => {
  test('Recepcionista no ve Rutinas en sidebar', async ({ page }) => {
    await login(page, 're@fitmanager.com')
    await expect(page.locator('a[href="/dashboard/rutinas"]')).toHaveCount(0)
  })

  test('Recepcionista no ve Ejercicios en sidebar', async ({ page }) => {
    await login(page, 're@fitmanager.com')
    await expect(page.locator('a[href="/dashboard/ejercicios"]')).toHaveCount(0)
  })

  test('Recepcionista no puede acceder al catálogo por URL', async ({ page }) => {
    await login(page, 're@fitmanager.com')
    await page.goto('/dashboard/ejercicios')
    await page.waitForURL('**/dashboard')
    await expect(page.getByRole('heading', { name: 'CATÁLOGO DE EJERCICIOS' })).toHaveCount(0)
  })

  test('Entrenador sí puede gestionar ejercicios', async ({ page }) => {
    await login(page, 'entre@fitmanager.com')
    await page.goto('/dashboard/ejercicios')
    await expect(page.getByRole('heading', { name: 'CATÁLOGO DE EJERCICIOS' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nuevo ejercicio' })).toBeVisible()
  })
})

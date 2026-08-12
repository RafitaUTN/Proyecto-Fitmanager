import { test, expect } from '@playwright/test'

test.describe('Cliente - Rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'admin@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    if (await page.getByRole('button', { name: 'Ver', exact: true }).count() === 0) {
      await page.getByRole('button', { name: 'Nueva Rutina' }).click()
      await page.fill('input[name="nombre"]', 'Rutina base asignaciones E2E')
      await page.getByRole('button', { name: '+ Agregar ejercicio' }).click()
      await page.selectOption('select[name="ejercicios.0.id_ejercicio"]', { index: 1 })
      await page.getByRole('button', { name: 'Crear Rutina' }).click()
      await expect(page.getByText('Rutina creada exitosamente')).toBeVisible()
    }
  })

  test('Admin asigna rutina a entrenador', async ({ page }) => {
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    await page.getByRole('button', { name: 'Ver', exact: true }).first().click()
    await page.locator('text=Asignar Entrenador').waitFor()
    await page.click('text=Asignar Entrenador')
    await expect(page.locator('text=ASIGNAR RUTINA A ENTRENADOR')).toBeVisible()
  })

  test('Admin asigna rutina a cliente', async ({ page }) => {
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    await page.getByRole('button', { name: 'Ver', exact: true }).first().click()
    await page.locator('text=Asignar Cliente').waitFor()
    await page.click('text=Asignar Cliente')
    await expect(page.locator('text=ASIGNAR RUTINA A CLIENTE')).toBeVisible()
    await page.locator('.fixed.inset-0.z-50.bg-black\\/60 select').first().selectOption({ index: 1 })
    await page.locator('button:has-text("Asignar")').last().click()
    await expect(page.locator('text=Rutina asignada exitosamente').or(page.getByText('ya tiene esta rutina'))).toBeVisible({ timeout: 10000 })
  })

  test('Vista de clientes asignados visible en detalle', async ({ page }) => {
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
    await page.getByRole('button', { name: 'Ver', exact: true }).first().click()
    await expect(page.locator('text=Clientes asignados')).toBeVisible({ timeout: 10000 })
  })
})

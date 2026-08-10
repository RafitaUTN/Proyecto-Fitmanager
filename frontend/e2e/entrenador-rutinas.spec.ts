import { test, expect } from '@playwright/test'

test.describe('Entrenador - Rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'entre@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/rutinas')
    await page.getByRole('heading', { name: 'RUTINAS' }).waitFor()
    if (await page.getByRole('button', { name: 'Ver Detalle' }).count() === 0) {
      await page.getByRole('button', { name: 'Nueva Rutina' }).click()
      await page.fill('input[name="nombre"]', 'Rutina entrenador E2E')
      await page.getByRole('button', { name: '+ Agregar ejercicio' }).click()
      await page.selectOption('select[name="ejercicios.0.id_ejercicio"]', { index: 1 })
      await page.getByRole('button', { name: 'Crear Rutina' }).click()
      await expect(page.getByText('Rutina creada exitosamente')).toBeVisible()
    }
  })

  test('Entrenador ve solo sus rutinas asignadas', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Ver Detalle' }).first()).toBeVisible()
  })

  test('Entrenador SI puede crear rutinas', async ({ page }) => {
    await expect(page.locator('text=Nueva Rutina')).toBeVisible()
  })

  test('Entrenador NO puede eliminar rutinas', async ({ page }) => {
    await expect(page.locator('text=Eliminar')).not.toBeVisible()
  })

  test('Entrenador asigna rutina a cliente', async ({ page }) => {
    await page.locator('button:has-text("Ver Detalle")').first().click()
    await page.locator('text=Asignar Cliente').waitFor()
    await page.locator('text=Asignar Cliente').first().click()
    await expect(page.locator('text=ASIGNAR RUTINA A CLIENTE')).toBeVisible()
    await page.locator('.fixed.inset-0.z-50.bg-black\\/60 select').first().selectOption({ index: 1 })
    await page.locator('button:has-text("Asignar")').last().click()
    await expect(page.locator('text=Rutina asignada exitosamente').or(page.getByText('ya tiene esta rutina'))).toBeVisible({ timeout: 10000 })
  })
})

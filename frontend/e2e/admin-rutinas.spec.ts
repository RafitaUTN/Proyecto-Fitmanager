import { test, expect } from '@playwright/test'

test.describe('Admin - Rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'admin@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/rutinas')
    await page.waitForSelector('text=RUTINAS')
  })

  test('Admin crea rutina con ejercicios', async ({ page }) => {
    await page.click('text=Nueva Rutina')
    await page.fill('input[name="nombre"]', 'Rutina Test E2E')
    await page.fill('input[name="descripcion"]', 'Descripción E2E')
    await page.click('text=Agregar ejercicio')
    await page.selectOption('select[name="ejercicios.0.id_ejercicio"]', { index: 1 })
    await page.fill('input[name="ejercicios.0.series"]', '3')
    await page.fill('input[name="ejercicios.0.repeticiones"]', '12')
    await page.click('button:has-text("Crear Rutina")')
    await expect(page.locator('text=Rutina creada exitosamente')).toBeVisible()
  })

  test('Admin edita rutina', async ({ page }) => {
    await page.locator('text=Rutina Test E2E').first().click()
    await page.click('text=Editar Rutina')
    await page.fill('input[name="nombre"]', 'Rutina Test E2E Editada')
    await page.click('button:has-text("Guardar Cambios")')
    await expect(page.locator('text=Rutina actualizada')).toBeVisible()
  })

  test('Admin desactiva rutina', async ({ page }) => {
    await page.locator('text=Rutina Test E2E Editada').first().click()
    await page.click('text=Desactivar')
    await expect(page.locator('text=Inactiva')).toBeVisible()
  })

  test('Admin activa rutina', async ({ page }) => {
    await page.locator('text=Rutina Test E2E Editada').first().click()
    await page.click('text=Activar')
    await expect(page.locator('text=Inactiva')).not.toBeVisible()
  })

  test('Admin elimina rutina', async ({ page }) => {
    await page.locator('text=Rutina Test E2E Editada').first().click()
    await page.click('text=Eliminar')
    await page.click('button:has-text("Eliminar")')
    await expect(page.locator('text=Rutina eliminada')).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Admin - Ejercicios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'admin@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/ejercicios')
    await page.waitForSelector('text=EJERCICIOS')
  })

  test('Admin crea ejercicio', async ({ page }) => {
    await page.click('text=Nuevo Ejercicio')
    await page.fill('input[name="nombre"]', 'Ejercicio Test E2E')
    await page.selectOption('select[name="grupo_muscular"]', 'Pecho')
    await page.selectOption('select[name="categoria"]', 'Pecho')
    await page.selectOption('select[name="nivel"]', 'principiante')
    await page.click('button:has-text("Crear Ejercicio")')
    await expect(page.locator('text=Ejercicio creado exitosamente')).toBeVisible()
  })

  test('Admin edita ejercicio', async ({ page }) => {
    await page.locator('text=Ejercicio Test E2E').first().click()
    await page.click('text=Editar')
    await page.fill('input[name="nombre"]', 'Ejercicio Test E2E Editado')
    await page.click('button:has-text("Guardar Cambios")')
    await expect(page.locator('text=Ejercicio actualizado')).toBeVisible()
  })

  test('Admin desactiva ejercicio', async ({ page }) => {
    await page.locator('text=Ejercicio Test E2E Editado').first().click()
    await page.click('text=Desactivar')
    await expect(page.locator('text=Inactivo').first()).toBeVisible()
  })

  test('Admin activa ejercicio', async ({ page }) => {
    await page.locator('text=Ejercicio Test E2E Editado').first().click()
    await page.click('text=Activar')
    await expect(page.locator('text=Activo').first()).toBeVisible()
  })

  test('Admin elimina ejercicio', async ({ page }) => {
    await page.locator('text=Ejercicio Test E2E Editado').first().click()
    await page.click('text=Eliminar')
    await page.click('button:has-text("Eliminar")')
    await expect(page.locator('text=Ejercicio eliminado')).toBeVisible()
  })
})

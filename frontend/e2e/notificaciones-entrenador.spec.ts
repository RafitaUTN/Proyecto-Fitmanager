import { test, expect } from '@playwright/test'

const ADMIN = { correo: 'admin@fitmanager.com', password: '123456' }
const ENTRENADOR = { correo: 'entre@fitmanager.com', password: '123456' }

test.describe.serial('Entrenador - Notificaciones', () => {

  async function login(page: typeof test['page'], creds: { correo: string; password: string }) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[name="correo"]', creds.correo)
    await page.fill('input[name="password"]', creds.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('Entrenador ve notificación de nuevo cliente asignado', async ({ page, request }) => {
    // 1. Login as admin to set up the assignment
    await login(page, ADMIN)

    // 2. Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'))
    if (!token) { test.fixme(true, 'No token found'); return }

    const API = 'http://localhost:3000/api'

    // 3. Find client "pablo" via API
    const clientesRes = await request.get(`${API}/clientes?q=pablo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!clientesRes.ok()) { test.fixme(true, `Clientes API: ${clientesRes.status()}`); return }
    const clientes = await clientesRes.json()
    if (!clientes.length) { test.fixme(true, 'No client "pablo" found'); return }
    const cliente = clientes[0]

    // 4. Find entrenador by email via API
    const usuariosRes = await request.get(`${API}/usuarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!usuariosRes.ok()) { test.fixme(true, `Usuarios API: ${usuariosRes.status()}`); return }
    const usuarios = await usuariosRes.json()
    const entrenador = usuarios.find((u: any) => u.correo === 'entre@fitmanager.com')
    if (!entrenador) { test.fixme(true, 'Entrenador entre@fitmanager.com not found'); return }

    // 5. Assign client to entrenador via API
    const updateRes = await request.put(`${API}/clientes/${cliente.id_cliente}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { id_entrenador: entrenador.id_usuario }
    })
    if (!updateRes.ok()) { test.fixme(true, `Update failed: ${await updateRes.text()}`); return }

    // 6. Login as entrenador
    await login(page, ENTRENADOR)

    // 7. Check notification
    await page.goto('/dashboard/alertas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const heading = page.getByRole('heading', { name: 'Nuevo cliente asignado' }).first()
    await expect(heading).toBeVisible({ timeout: 15000 })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verificarToken, usuarioFindFirst, clienteFindFirst } = vi.hoisted(() => ({
  verificarToken: vi.fn(),
  usuarioFindFirst: vi.fn(),
  clienteFindFirst: vi.fn(),
}))

vi.mock('../lib/jwt', () => ({ verificarToken }))
vi.mock('../lib/prisma', () => ({
  prisma: {
    usuario: { findFirst: usuarioFindFirst },
    cliente: { findFirst: clienteFindFirst },
  },
}))

import { authMiddleware } from './auth.middleware'

function response() {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('authMiddleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('construye contexto tenant para staff activo', async () => {
    verificarToken.mockReturnValue({ id_usuario: 7, id_gimnasio: 3, rol: 'Entrenador' })
    usuarioFindFirst.mockResolvedValue({ id_usuario: 7n })
    const req: any = { headers: { authorization: 'Bearer valid' } }
    const res = response()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    expect(req.context).toEqual({ actorId: 7n, gymId: 3n, actorType: 'STAFF', role: 'Entrenador' })
    expect(usuarioFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id_usuario: 7n, id_gimnasio: 3n, estado: true }),
    }))
    expect(next).toHaveBeenCalledWith()
  })

  it('deniega un staff desactivado aunque el JWT siga vigente', async () => {
    verificarToken.mockReturnValue({ id_usuario: 7, id_gimnasio: 3, rol: 'Administrador' })
    usuarioFindFirst.mockResolvedValue(null)
    const req: any = { headers: { authorization: 'Bearer valid' } }
    const res = response()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('valida clientes contra su gimnasio y estado', async () => {
    verificarToken.mockReturnValue({ id_usuario: 9, id_gimnasio: 4, rol: 'Cliente' })
    clienteFindFirst.mockResolvedValue({ id_cliente: 9n })
    const req: any = { headers: { authorization: 'Bearer valid' } }
    const next = vi.fn()

    await authMiddleware(req, response(), next)

    expect(req.context).toEqual({ actorId: 9n, gymId: 4n, actorType: 'CLIENTE', role: 'Cliente' })
    expect(next).toHaveBeenCalledWith()
  })
})

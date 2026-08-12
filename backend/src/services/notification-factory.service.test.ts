import { beforeEach, describe, expect, it, vi } from 'vitest'

const { notificacionRepository } = vi.hoisted(() => ({
  notificacionRepository: { crear: vi.fn() },
}))

vi.mock('../repositories/notificacion.repository', () => ({ notificacionRepository }))

import { notificationFactory } from './notification-factory.service'

describe('notificationFactory', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('crear', () => {
    it('rechaza sin destinatario', () => {
      expect(() => notificationFactory.crear({
        tipo: 'SISTEMA',
        destino: {},
        titulo: 't',
        mensaje: 'm',
      })).toThrowError(expect.objectContaining({ statusCode: 400 }))
    })

    it('mapea el destino y delega en el repositorio', async () => {
      notificacionRepository.crear.mockResolvedValue({ id_notificacion: 1n })
      const r = await notificationFactory.crear({
        eventKey: 'clave-1',
        tipo: 'MEMBRESIA',
        destino: { id_cliente: 7n, id_gimnasio: 3n, rol_destino: 'Administrador', id_solicitud: 9n },
        titulo: 'Titulo',
        mensaje: 'Mensaje',
        accionUrl: '/ruta',
      })
      expect(notificacionRepository.crear).toHaveBeenCalledWith(expect.objectContaining({
        event_key: 'clave-1',
        id_cliente: 7n,
        id_gimnasio: 3n,
        id_solicitud: 9n,
        id_usuario_destino: undefined,
        rol_destino: 'Administrador',
        accion_url: '/ruta',
        tipo: 'MEMBRESIA',
        titulo: 'Titulo',
        mensaje: 'Mensaje',
      }), undefined)
      expect(r).toEqual({ id_notificacion: 1n })
    })
  })

  describe('crearMultiple', () => {
    it('crea secuencialmente respetando el orden', async () => {
      notificacionRepository.crear
        .mockResolvedValueOnce({ id_notificacion: 1n })
        .mockResolvedValueOnce({ id_notificacion: 2n })

      const r = await notificationFactory.crearMultiple([
        { tipo: 'SISTEMA', destino: { id_cliente: 7n }, titulo: 'a', mensaje: 'a' },
        { tipo: 'SISTEMA', destino: { id_gimnasio: 3n }, titulo: 'b', mensaje: 'b' },
      ])
      expect(notificacionRepository.crear).toHaveBeenCalledTimes(2)
      expect(r.map((n: any) => n.id_notificacion)).toEqual([1n, 2n])
    })
  })
})

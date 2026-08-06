/**
 * Pruebas unitarias de transferencia.service
 *
 * Las transferencias son el único punto del sistema donde mover datos de un
 * gimnasio a otro es legítimo. Es decir, cruzan a propósito la frontera que
 * protege el RNF-12, así que aquí la autorización tiene que ser más estricta,
 * no menos.
 *
 * La autorización es ASIMÉTRICA y no es evidente al leer el código:
 *
 *   - CREAR    la solicita el gimnasio DESTINO (quiere recibir al cliente)
 *   - APROBAR  solo puede el gimnasio ORIGEN   (es quien lo tiene)
 *   - RECHAZAR solo puede el gimnasio ORIGEN
 *   - CANCELAR solo puede el gimnasio DESTINO  (retira su propia solicitud)
 *
 * Confundir esos roles permitiría que un gimnasio se auto-aprobara el traslado
 * de clientes ajenos. Esa es la prueba central de este archivo.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GYM_ORIGEN = 1n
const GYM_DESTINO = 2n
const GYM_AJENO = 3n
const ID_SOLICITUD = 500n
const ID_CLIENTE = 10n
const ID_USUARIO = 7

const tx = {
  cliente: { update: vi.fn() },
  clienteMembresia: { updateMany: vi.fn() },
  solicitudTransferencia: { update: vi.fn(), findUnique: vi.fn() },
  notificacion: { create: vi.fn() },
  solicitudAuditoria: { create: vi.fn() },
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
    cliente: { findUnique: vi.fn() },
    pago: { findMany: vi.fn() },
  },
}))

vi.mock('../repositories/transferencia.repository', () => ({
  transferenciaRepository: {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPendientePorCliente: vi.fn(),
    crear: vi.fn(),
    crearAuditoria: vi.fn(),
    expirarVencidas: vi.fn(),
    expirarMasivamente: vi.fn(),
    contarRecibidas: vi.fn(),
    contarEnviadas: vi.fn(),
  },
}))

vi.mock('./notificacion.service', () => ({
  notificacionService: { crear: vi.fn() },
}))

import { transferenciaService } from './transferencia.service'
import { transferenciaRepository } from '../repositories/transferencia.repository'
import { notificacionService } from './notificacion.service'
import { prisma } from '../lib/prisma'

const cliente = {
  id_cliente: ID_CLIENTE,
  id_gimnasio: GYM_ORIGEN,
  nombre: 'Ana',
  apellido: 'Rojas',
  estado: true,
}

const solicitudPendiente = {
  id: ID_SOLICITUD,
  id_cliente: ID_CLIENTE,
  id_gym_origen: GYM_ORIGEN,
  id_gym_destino: GYM_DESTINO,
  estado: 'PENDIENTE',
  cliente,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.cliente.findUnique).mockResolvedValue(cliente as never)
  vi.mocked(prisma.pago.findMany).mockResolvedValue([] as never)
  vi.mocked(transferenciaRepository.buscarPorId).mockResolvedValue(solicitudPendiente as never)
  vi.mocked(transferenciaRepository.buscarPendientePorCliente).mockResolvedValue(null as never)
  vi.mocked(transferenciaRepository.crear).mockResolvedValue({ id: ID_SOLICITUD } as never)
  vi.mocked(transferenciaRepository.crearAuditoria).mockResolvedValue({} as never)
  vi.mocked(transferenciaRepository.expirarVencidas).mockResolvedValue([] as never)
  vi.mocked(notificacionService.crear).mockResolvedValue(undefined as never)
  tx.solicitudTransferencia.findUnique.mockResolvedValue({ estado: 'APROBADA' })
})

// ===========================================================================
describe('Creación de solicitud', () => {
  it('registra el gimnasio de origen tomándolo del cliente, no del request', async () => {
    await transferenciaService.crear(GYM_DESTINO, { id_cliente: '10' } as never, ID_USUARIO)

    const datos = vi.mocked(transferenciaRepository.crear).mock.calls[0][0] as {
      id_gym_origen: bigint
      id_gym_destino: bigint
    }

    // El origen no puede venir del cliente HTTP: se deduce de dónde está
    // realmente el cliente. Si no, se podrían fabricar transferencias falsas.
    expect(datos.id_gym_origen).toBe(GYM_ORIGEN)
    expect(datos.id_gym_destino).toBe(GYM_DESTINO)
  })

  it('rechaza transferir un cliente que ya está en el gimnasio solicitante', async () => {
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue({
      ...cliente,
      id_gimnasio: GYM_DESTINO,
    } as never)

    await expect(
      transferenciaService.crear(GYM_DESTINO, { id_cliente: '10' } as never, ID_USUARIO),
    ).rejects.toMatchObject({
      message: 'El cliente ya pertenece a este gimnasio',
      statusCode: 400,
    })

    expect(transferenciaRepository.crear).not.toHaveBeenCalled()
  })

  it('impide dos solicitudes pendientes para el mismo cliente', async () => {
    vi.mocked(transferenciaRepository.buscarPendientePorCliente).mockResolvedValue({
      id: 999n,
    } as never)

    await expect(
      transferenciaService.crear(GYM_DESTINO, { id_cliente: '10' } as never, ID_USUARIO),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rechaza un cliente inexistente', async () => {
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null as never)

    await expect(
      transferenciaService.crear(GYM_DESTINO, { id_cliente: '999' } as never, ID_USUARIO),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('notifica a AMBOS gimnasios', async () => {
    await transferenciaService.crear(GYM_DESTINO, { id_cliente: '10' } as never, ID_USUARIO)

    expect(notificacionService.crear).toHaveBeenCalledTimes(2)

    const gimnasiosNotificados = vi
      .mocked(notificacionService.crear)
      .mock.calls.map((c) => (c[0] as { destino: { id_gimnasio: bigint } }).destino.id_gimnasio)

    expect(gimnasiosNotificados).toContain(GYM_ORIGEN)
    expect(gimnasiosNotificados).toContain(GYM_DESTINO)
  })

  it('deja rastro de auditoría con el usuario y la IP', async () => {
    await transferenciaService.crear(
      GYM_DESTINO,
      { id_cliente: '10', motivo: 'Cambio de residencia' } as never,
      ID_USUARIO,
      '190.0.0.1',
    )

    expect(transferenciaRepository.crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'CREADA',
        estado_nuevo: 'PENDIENTE',
        id_usuario: 7n,
        ip: '190.0.0.1',
      }),
    )
  })
})

// ===========================================================================
describe('Autorización asimétrica', () => {
  it('el gimnasio DESTINO no puede aprobar su propia solicitud', async () => {
    // Este es el caso crítico: si pudiera, cualquier gimnasio se llevaría
    // clientes ajenos sin consentimiento del gimnasio que los tiene.
    await expect(
      transferenciaService.aprobar(ID_SOLICITUD, GYM_DESTINO, ID_USUARIO, 'ok'),
    ).rejects.toMatchObject({
      message: 'No tienes permiso para aprobar esta solicitud',
      statusCode: 403,
    })

    expect(tx.cliente.update).not.toHaveBeenCalled()
  })

  it('un gimnasio sin relación con la solicitud tampoco puede aprobarla', async () => {
    await expect(
      transferenciaService.aprobar(ID_SOLICITUD, GYM_AJENO, ID_USUARIO, 'ok'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('el gimnasio ORIGEN sí puede aprobar', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'De acuerdo')

    expect(tx.solicitudTransferencia.update).toHaveBeenCalled()
  })

  it('el gimnasio DESTINO no puede rechazar', async () => {
    await expect(
      transferenciaService.rechazar(ID_SOLICITUD, GYM_DESTINO, ID_USUARIO, 'no'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('el gimnasio ORIGEN no puede cancelar: cancelar es del DESTINO', async () => {
    // Invertido respecto a aprobar/rechazar. Cancelar es retirar la propia
    // solicitud, así que le corresponde a quien la hizo.
    await expect(
      transferenciaService.cancelar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('el gimnasio DESTINO sí puede cancelar', async () => {
    await transferenciaService.cancelar(ID_SOLICITUD, GYM_DESTINO, ID_USUARIO)

    expect(tx.solicitudTransferencia.update).toHaveBeenCalled()
  })

  it('buscar solo permite acceso a los dos gimnasios implicados', async () => {
    await expect(transferenciaService.buscar(ID_SOLICITUD, GYM_AJENO)).rejects.toMatchObject({
      statusCode: 403,
    })

    await expect(transferenciaService.buscar(ID_SOLICITUD, GYM_ORIGEN)).resolves.toBeTruthy()
    await expect(transferenciaService.buscar(ID_SOLICITUD, GYM_DESTINO)).resolves.toBeTruthy()
  })
})

// ===========================================================================
describe('Aprobación: bloqueo por pagos pendientes', () => {
  it('impide aprobar si el cliente tiene deudas', async () => {
    vi.mocked(prisma.pago.findMany).mockResolvedValue([
      { monto: 25000, estado: 'pendiente' },
      { monto: 15000, estado: 'moroso' },
    ] as never)

    const error = await transferenciaService
      .aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')
      .catch((e) => e)

    expect(error.codigo).toBe('PAGOS_PENDIENTES')
    expect(error.statusCode).toBe(400)
    expect(error.data.cantidad).toBe(2)
    expect(error.data.monto_total).toBe(40000)

    // Y sobre todo: el cliente no se movió de gimnasio.
    expect(tx.cliente.update).not.toHaveBeenCalled()
  })

  it('el cliente no cambia de gimnasio si la aprobación falla', async () => {
    vi.mocked(prisma.pago.findMany).mockResolvedValue([{ monto: 1000 }] as never)

    await transferenciaService
      .aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')
      .catch(() => undefined)

    expect(tx.clienteMembresia.updateMany).not.toHaveBeenCalled()
    expect(tx.solicitudTransferencia.update).not.toHaveBeenCalled()
  })

  it('aprueba sin problema cuando no hay deudas', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')

    expect(tx.cliente.update).toHaveBeenCalled()
  })
})

// ===========================================================================
describe('Aprobación: efectos sobre el cliente', () => {
  it('mueve el cliente al gimnasio destino y lo deja activo', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')

    expect(tx.cliente.update).toHaveBeenCalledWith({
      where: { id_cliente: ID_CLIENTE },
      data: { id_gimnasio: GYM_DESTINO, estado: true },
    })
  })

  it('cancela las membresías activas del gimnasio de origen', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')

    // El cliente no puede arrastrar una membresía pagada en otro gimnasio.
    expect(tx.clienteMembresia.updateMany).toHaveBeenCalledWith({
      where: { id_cliente: ID_CLIENTE, estado: 'activo' },
      data: { estado: 'cancelada' },
    })
  })

  it('marca la solicitud como APROBADA con usuario, fecha y observaciones', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'Todo en orden', '10.0.0.1')

    const argumento = tx.solicitudTransferencia.update.mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(argumento.data.estado).toBe('APROBADA')
    expect(argumento.data.id_usuario_respuesta).toBe(7n)
    expect(argumento.data.observaciones).toBe('Todo en orden')
    expect(argumento.data.ip_respuesta).toBe('10.0.0.1')
    expect(argumento.data.fecha_respuesta).toBeInstanceOf(Date)
  })

  it('registra la auditoría con el estado anterior y el nuevo', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')

    expect(tx.solicitudAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accion: 'APROBADA',
        estado_anterior: 'PENDIENTE',
        estado_nuevo: 'APROBADA',
      }),
    })
  })

  it('todos los cambios ocurren dentro de una transacción', async () => {
    await transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok')

    // Si el traslado fallara a medias, el cliente podría quedar desactivado
    // en un gimnasio y ausente del otro.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
describe('Transiciones de estado válidas', () => {
  const estadosNoPendientes = ['APROBADA', 'RECHAZADA', 'CANCELADA']

  it.each(estadosNoPendientes)('no se puede aprobar una solicitud %s', async (estado) => {
    vi.mocked(transferenciaRepository.buscarPorId).mockResolvedValue({
      ...solicitudPendiente,
      estado,
    } as never)

    await expect(
      transferenciaService.aprobar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'ok'),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it.each(estadosNoPendientes)('no se puede rechazar una solicitud %s', async (estado) => {
    vi.mocked(transferenciaRepository.buscarPorId).mockResolvedValue({
      ...solicitudPendiente,
      estado,
    } as never)

    await expect(
      transferenciaService.rechazar(ID_SOLICITUD, GYM_ORIGEN, ID_USUARIO, 'no'),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it.each(estadosNoPendientes)('no se puede cancelar una solicitud %s', async (estado) => {
    vi.mocked(transferenciaRepository.buscarPorId).mockResolvedValue({
      ...solicitudPendiente,
      estado,
    } as never)

    await expect(
      transferenciaService.cancelar(ID_SOLICITUD, GYM_DESTINO, ID_USUARIO),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

// ===========================================================================
describe('Expiración automática a los 30 días', () => {
  it('expira las solicitudes vencidas al listar', async () => {
    vi.mocked(transferenciaRepository.expirarVencidas).mockResolvedValue([
      { id: 800n, id_gym_origen: GYM_ORIGEN },
      { id: 801n, id_gym_origen: GYM_ORIGEN },
    ] as never)
    vi.mocked(transferenciaRepository.expirarMasivamente).mockResolvedValue({} as never)
    vi.mocked(transferenciaRepository.listar).mockResolvedValue([] as never)

    await transferenciaService.listar(GYM_ORIGEN)

    expect(transferenciaRepository.expirarMasivamente).toHaveBeenCalledWith([800n, 801n])
    // Una notificación y una auditoría por cada solicitud expirada.
    expect(notificacionService.crear).toHaveBeenCalledTimes(2)
    expect(transferenciaRepository.crearAuditoria).toHaveBeenCalledTimes(2)
  })

  it('no hace nada extra si no hay vencidas', async () => {
    vi.mocked(transferenciaRepository.listar).mockResolvedValue([] as never)

    await transferenciaService.listar(GYM_ORIGEN)

    expect(transferenciaRepository.expirarMasivamente).not.toHaveBeenCalled()
    expect(notificacionService.crear).not.toHaveBeenCalled()
  })
})

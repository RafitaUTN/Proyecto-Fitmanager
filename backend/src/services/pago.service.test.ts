/**
 * Pruebas unitarias de pago.service
 *
 * Cubre RF-09 ("registrar pagos manuales realizados por los clientes,
 * asociándolos a una membresía, fecha, monto y método de pago") y RF-10
 * (consulta del historial de pagos).
 *
 * El riesgo del módulo es contable: un pago asociado a la membresía
 * equivocada descuadra el historial del cliente y los reportes financieros
 * del RF-15.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n
const OTRO_GIMNASIO = 2n

vi.mock('../repositories/pago.repository', () => ({
  pagoRepository: {
    listarPorGimnasio: vi.fn(),
    crear: vi.fn(),
  },
}))

vi.mock('../repositories/cliente.repository', () => ({
  clienteRepository: { buscarPorId: vi.fn() },
}))

vi.mock('../repositories/cliente-membresia.repository', () => ({
  clienteMembresiaRepository: { buscarPorId: vi.fn() },
}))

import { pagoService } from './pago.service'
import { pagoRepository } from '../repositories/pago.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'

const cliente = { id_cliente: 10n, id_gimnasio: GIMNASIO, nombre: 'Sofia', apellido: 'Cruz' }

const asignacion = {
  id_cliente_membresia: 30n,
  id_cliente: 10n,
  id_membresia: 20n,
  estado: 'activo',
}

const dtoPago = {
  id_cliente: '10',
  id_cliente_membresia: '30',
  monto: 25000,
  metodo_pago: 'efectivo',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(cliente as never)
  vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacion as never)
  vi.mocked(pagoRepository.crear).mockResolvedValue({ id_pago: 50n } as never)
  vi.mocked(pagoRepository.listarPorGimnasio).mockResolvedValue([] as never)
})

// ===========================================================================
describe('RF-09 · Registro de pagos manuales', () => {
  it('registra el pago con estado completado', async () => {
    const resultado = await pagoService.registrar(GIMNASIO, dtoPago as never)

    expect(resultado).toEqual({ id_pago: 50n })

    const datos = vi.mocked(pagoRepository.crear).mock.calls[0][0] as {
      estado: string
      monto: number
      metodo_pago: string
    }
    expect(datos.estado).toBe('completado')
    expect(datos.monto).toBe(25000)
    expect(datos.metodo_pago).toBe('efectivo')
  })

  it('convierte los identificadores de string a BigInt', async () => {
    await pagoService.registrar(GIMNASIO, dtoPago as never)

    const datos = vi.mocked(pagoRepository.crear).mock.calls[0][0] as {
      id_cliente: bigint
      id_cliente_membresia: bigint
    }
    expect(datos.id_cliente).toBe(10n)
    expect(datos.id_cliente_membresia).toBe(30n)
  })

  it('rechaza un pago para un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    await expect(pagoService.registrar(GIMNASIO, dtoPago as never)).rejects.toMatchObject({
      message: 'Cliente no encontrado',
      statusCode: 404,
    })

    expect(pagoRepository.crear).not.toHaveBeenCalled()
  })

  it('rechaza un pago para un cliente inexistente', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(null as never)

    await expect(pagoService.registrar(GIMNASIO, dtoPago as never)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('IMPIDE asociar el pago a la membresía de otro cliente', async () => {
    // Este es el caso importante: la asignación existe y es válida, pero
    // pertenece a un cliente distinto del que paga. Sin esta validación el
    // pago quedaría acreditado en la cuenta equivocada.
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue({
      ...asignacion,
      id_cliente: 99n,
    } as never)

    await expect(pagoService.registrar(GIMNASIO, dtoPago as never)).rejects.toMatchObject({
      message: 'Asignación de membresía no válida',
      statusCode: 404,
    })

    expect(pagoRepository.crear).not.toHaveBeenCalled()
  })

  it('rechaza una asignación de membresía inexistente', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(null as never)

    await expect(pagoService.registrar(GIMNASIO, dtoPago as never)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('valida el cliente antes que la membresía', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(null as never)

    await pagoService.registrar(GIMNASIO, dtoPago as never).catch(() => undefined)

    expect(clienteMembresiaRepository.buscarPorId).not.toHaveBeenCalled()
  })

  it('acepta los distintos métodos de pago', async () => {
    for (const metodo of ['efectivo', 'tarjeta', 'transferencia', 'sinpe']) {
      vi.clearAllMocks()
      vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(cliente as never)
      vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacion as never)
      vi.mocked(pagoRepository.crear).mockResolvedValue({ id_pago: 50n } as never)

      await pagoService.registrar(GIMNASIO, { ...dtoPago, metodo_pago: metodo } as never)

      const datos = vi.mocked(pagoRepository.crear).mock.calls[0][0] as { metodo_pago: string }
      expect(datos.metodo_pago).toBe(metodo)
    }
  })
})

// ===========================================================================
describe('RF-10 · Consulta del historial de pagos', () => {
  it('lista los pagos acotados al gimnasio', async () => {
    await pagoService.listar(GIMNASIO)

    expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(GIMNASIO, undefined)
  })

  it('permite filtrar por cliente', async () => {
    await pagoService.listar(GIMNASIO, 10n)

    expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(GIMNASIO, 10n)
  })
})

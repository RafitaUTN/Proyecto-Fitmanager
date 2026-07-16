import { pagoRepository } from '../repositories/pago.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import type { CrearPagoDto } from '../dtos/pago.dto'

export const pagoService = {
  async listar(idGimnasio: bigint) {
    return pagoRepository.listarPorGimnasio(idGimnasio)
  },

  async registrar(idGimnasio: bigint, dto: CrearPagoDto) {
    const cliente = await clienteRepository.buscarPorId(BigInt(dto.id_cliente))
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }

    const asignacion = await clienteMembresiaRepository.buscarPorId(BigInt(dto.id_cliente_membresia))
    if (!asignacion || asignacion.id_cliente !== BigInt(dto.id_cliente)) {
      throw Object.assign(new Error('Asignación de membresía no válida'), { statusCode: 404 })
    }

    return pagoRepository.crear({
      id_cliente: BigInt(dto.id_cliente),
      id_cliente_membresia: BigInt(dto.id_cliente_membresia),
      monto: dto.monto,
      metodo_pago: dto.metodo_pago,
      estado: 'completado',
    })
  },
}

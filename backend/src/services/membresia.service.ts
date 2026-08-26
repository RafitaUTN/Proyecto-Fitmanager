/**
 * Servicio de negocio del módulo membresia.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'
import { membresiaRepository } from '../repositories/membresia.repository'
import type { CrearMembresiaDto, ActualizarMembresiaDto } from '../dtos/membresia.dto'

export const membresiaService = {
  async listar(idGimnasio: bigint) {
    return membresiaRepository.listarPorGimnasio(idGimnasio)
  },

  async listarPaginado(idGimnasio: bigint, page: number, pageSize: number, search?: string) {
    return membresiaRepository.listarPorGimnasioPaginado(idGimnasio, page, pageSize, search)
  },

  async buscar(id: bigint, idGimnasio: bigint) {
    const membresia = await membresiaRepository.buscarPorId(id)
    if (!membresia || membresia.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Membresía no encontrada'), { statusCode: 404 })
    }
    return membresia
  },

  async crear(idGimnasio: bigint, dto: CrearMembresiaDto) {
    return membresiaRepository.crear({ ...dto, id_gimnasio: idGimnasio })
  },

  async actualizar(id: bigint, dto: ActualizarMembresiaDto, idGimnasio: bigint) {
    await this.buscar(id, idGimnasio)
    return membresiaRepository.actualizar(id, dto)
  },

  async eliminar(id: bigint, idGimnasio: bigint) {
    await this.buscar(id, idGimnasio)
    const asignaciones = await prisma.clienteMembresia.count({ where: { id_membresia: id } })
    if (asignaciones > 0) {
      throw Object.assign(new Error('No se puede eliminar el plan porque tiene membresías asignadas'), {
        statusCode: 409,
      })
    }
    await membresiaRepository.eliminar(id)
  },
}

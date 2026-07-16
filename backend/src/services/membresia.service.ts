import { membresiaRepository } from '../repositories/membresia.repository'
import type { CrearMembresiaDto, ActualizarMembresiaDto } from '../dtos/membresia.dto'

export const membresiaService = {
  async listar(idGimnasio: bigint) {
    return membresiaRepository.listarPorGimnasio(idGimnasio)
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
}

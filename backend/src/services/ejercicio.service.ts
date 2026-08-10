import { ejercicioRepository } from '../repositories/ejercicio.repository'
import type { CrearEjercicioDto, ActualizarEjercicioDto, CatalogoEjerciciosDto } from '../dtos/ejercicio.dto'

export const ejercicioService = {
  async listar(idGimnasio: bigint) {
    return ejercicioRepository.listar(idGimnasio)
  },

  catalogo(idGimnasio: bigint, filtros: CatalogoEjerciciosDto) {
    return ejercicioRepository.catalogo(idGimnasio, filtros)
  },

  async obtener(id: bigint, idGimnasio: bigint) {
    const ejercicio = await ejercicioRepository.detalle(id, idGimnasio)
    if (!ejercicio) throw Object.assign(new Error('Ejercicio no encontrado'), { statusCode: 404 })
    return ejercicio
  },

  async crear(idGimnasio: bigint, dto: CrearEjercicioDto) {
    return ejercicioRepository.crear({
      id_gimnasio: idGimnasio,
      nombre: dto.nombre,
      grupo_muscular: dto.grupo_muscular,
      descripcion: dto.descripcion,
      nivel: dto.nivel,
      categoria: dto.categoria,
      imagen_url: dto.imagen_url,
      animacion_url: dto.animacion_url,
      tipo_media: dto.tipo_media,
      instrucciones: dto.instrucciones,
      equipo: dto.equipo,
      musculos_secundarios: dto.musculos_secundarios,
    })
  },

  async actualizar(id: bigint, idGimnasio: bigint, dto: ActualizarEjercicioDto) {
    const existente = await ejercicioRepository.buscarPorId(id)
    if (!existente) {
      throw Object.assign(new Error('Ejercicio no encontrado'), { statusCode: 404 })
    }
    if (existente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Ejercicio no encontrado'), { statusCode: 404 })
    }
    return ejercicioRepository.actualizar(id, dto)
  },

  async eliminar(id: bigint, idGimnasio: bigint) {
    const existente = await ejercicioRepository.buscarPorId(id)
    if (!existente) {
      throw Object.assign(new Error('Ejercicio no encontrado'), { statusCode: 404 })
    }
    if (existente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Ejercicio no encontrado'), { statusCode: 404 })
    }
    const enUso = await ejercicioRepository.estaEnUso(id)
    if (enUso) {
      throw Object.assign(new Error('No se puede eliminar un ejercicio que está siendo usado en rutinas'), { statusCode: 409 })
    }
    return ejercicioRepository.eliminar(id)
  },
}

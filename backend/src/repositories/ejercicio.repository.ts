import { prisma } from '../lib/prisma'
import type { CatalogoEjerciciosDto } from '../dtos/ejercicio.dto'

function catalogWhere(idGimnasio: bigint, filtros: CatalogoEjerciciosDto) {
  return {
    id_gimnasio: idGimnasio,
    ...(filtros.estado === 'todos' ? {} : { estado: filtros.estado === 'activo' }),
    ...(filtros.grupo_muscular ? { grupo_muscular: filtros.grupo_muscular } : {}),
    ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
    ...(filtros.nivel ? { nivel: filtros.nivel } : {}),
    ...(filtros.buscar ? { OR: [
      { nombre: { contains: filtros.buscar, mode: 'insensitive' as const } },
      { descripcion: { contains: filtros.buscar, mode: 'insensitive' as const } },
      { equipo: { contains: filtros.buscar, mode: 'insensitive' as const } },
    ] } : {}),
  }
}

export const ejercicioRepository = {
  listar(idGimnasio: bigint) {
    return prisma.ejercicio.findMany({
      where: { id_gimnasio: idGimnasio },
      include: { _count: { select: { rutina_ejercicios: true } } },
      orderBy: { nombre: 'asc' },
    })
  },

  async catalogo(idGimnasio: bigint, filtros: CatalogoEjerciciosDto) {
    const where = catalogWhere(idGimnasio, filtros)
    const [data, total] = await Promise.all([
      prisma.ejercicio.findMany({
        where,
        include: { _count: { select: { rutina_ejercicios: true } } },
        orderBy: { nombre: 'asc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      prisma.ejercicio.count({ where }),
    ])
    return { data, total, pagina: filtros.pagina, limite: filtros.limite, totalPaginas: Math.ceil(total / filtros.limite) }
  },

  buscarPorId(id: bigint) {
    return prisma.ejercicio.findUnique({ where: { id_ejercicio: id } })
  },

  detalle(id: bigint, idGimnasio: bigint) {
    return prisma.ejercicio.findFirst({
      where: { id_ejercicio: id, id_gimnasio: idGimnasio },
      include: {
        rutina_ejercicios: {
          select: { rutina: { select: { id_rutina: true, nombre: true, estado: true } } },
          take: 20,
        },
        _count: { select: { rutina_ejercicios: true } },
      },
    })
  },

  listarPorIds(ids: bigint[], idGimnasio: bigint) {
    return prisma.ejercicio.findMany({
      where: { id_ejercicio: { in: ids }, id_gimnasio: idGimnasio },
    })
  },

  crear(data: {
    id_gimnasio: bigint
    nombre: string
    grupo_muscular: string
    descripcion?: string
    nivel?: string
    categoria?: string
    imagen_url?: string
    animacion_url?: string
    tipo_media?: string
    instrucciones?: string
    equipo?: string
    musculos_secundarios?: string[]
  }) {
    return prisma.ejercicio.create({ data })
  },

  actualizar(id: bigint, data: {
    nombre?: string
    grupo_muscular?: string
    descripcion?: string
    nivel?: string
    categoria?: string
    estado?: boolean
    imagen_url?: string
    animacion_url?: string
    tipo_media?: string
    instrucciones?: string
    equipo?: string
    musculos_secundarios?: string[]
  }) {
    return prisma.ejercicio.update({ where: { id_ejercicio: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.ejercicio.delete({ where: { id_ejercicio: id } })
  },

  estaEnUso(id: bigint) {
    return prisma.rutinaEjercicio.findFirst({ where: { id_ejercicio: id } })
  },
}

import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { safeBigInt } from '../lib/bigint'

export const entrenadorController = {
  async disponibles(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      
      const entrenadores = await prisma.usuario.findMany({
        where: {
          id_gimnasio: idGimnasio,
          rol: 'Entrenador',
          estado: true,
        },
        select: {
          id_usuario: true,
          nombre: true,
          apellido: true,
          correo: true,
          capacidad_max: true,
          _count: {
            select: {
              clientes_asignados: {
                where: {
                  estado: true,
                  id_gimnasio: idGimnasio,
                  cliente_membresias: { some: { estado: 'activo' } },
                },
              },
            },
          },
        },
        orderBy: {
          clientes_asignados: { _count: 'asc' },
        },
      })

      const result = entrenadores.map((e) => ({
        id_entrenador: Number(e.id_usuario),
        nombre: `${e.nombre} ${e.apellido}`,
        correo: e.correo,
        capacidad_max: e.capacidad_max,
        clientes_asignados: e._count.clientes_asignados,
        disponible: e._count.clientes_asignados < e.capacidad_max,
        espacios_restantes: e.capacidad_max - e._count.clientes_asignados,
      }))

      res.json(result)
    } catch (error) { next(error) }
  },
}
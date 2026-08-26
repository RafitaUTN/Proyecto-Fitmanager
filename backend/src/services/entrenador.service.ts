/**
 * Servicio de negocio del módulo entrenador.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'

/**
 * Lista entrenadores activos con su capacidad disponible.
 *
 * La disponibilidad se calcula contando únicamente clientes activos del mismo
 * gimnasio que además tengan una membresía activa. Esta regla evita asignar
 * clientes sobre datos históricos o de otros tenants.
 *
 * @param idGimnasio - Gimnasio desde el cual se consulta la disponibilidad.
 * @returns Entrenadores ordenados por menor carga de clientes.
 */
async function listarDisponibles(idGimnasio: bigint) {
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

  return entrenadores.map((entrenador) => ({
    id_entrenador: Number(entrenador.id_usuario),
    nombre: `${entrenador.nombre} ${entrenador.apellido}`,
    correo: entrenador.correo,
    capacidad_max: entrenador.capacidad_max,
    clientes_asignados: entrenador._count.clientes_asignados,
    disponible: entrenador._count.clientes_asignados < entrenador.capacidad_max,
    espacios_restantes: entrenador.capacidad_max - entrenador._count.clientes_asignados,
  }))
}

export const entrenadorService = { listarDisponibles }

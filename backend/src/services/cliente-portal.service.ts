/**
 * Servicio de negocio del módulo cliente-portal.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'
import { obtenerResumenPago } from './payment-balance'

/**
 * Obtiene el perfil visible para un cliente autenticado.
 *
 * No recibe el ID por parámetro HTTP; usa exclusivamente el identificador
 * contenido en el token, por eso el cliente solo puede consultar su propio
 * perfil.
 *
 * @param idCliente - Identificador del cliente autenticado.
 * @returns Perfil del cliente o null si la cuenta no existe o está inactiva.
 */
async function obtenerPerfil(idCliente: bigint) {
  const cliente = await prisma.cliente.findUnique({
    where: { id_cliente: idCliente },
    include: {
      gimnasio: { select: { nombre: true } },
      entrenador: { select: { nombre: true, apellido: true } },
    },
  })

  if (!cliente || cliente.estado === false) return null

  return {
    id_cliente: Number(cliente.id_cliente),
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    correo: cliente.correo,
    telefono: cliente.telefono,
    cedula: cliente.cedula,
    ultimo_acceso: cliente.ultimo_acceso,
    nombre_gimnasio: cliente.gimnasio?.nombre ?? '',
    entrenador: cliente.entrenador,
  }
}

/**
 * Construye el estado de membresía mostrado en el portal del cliente.
 *
 * Combina la membresía activa, el historial y el balance de pago para mostrar
 * progreso, días restantes y saldo pendiente sin exponer consultas de base de
 * datos en la capa del controlador.
 *
 * @param idCliente - Cliente autenticado propietario de la membresía.
 * @returns Información de membresía activa o null si no tiene una vigente.
 */
async function obtenerMembresia(idCliente: bigint) {
  const membresiaActiva = await prisma.clienteMembresia.findFirst({
    where: { id_cliente: idCliente, estado: 'activo' },
    include: {
      membresia: true,
      cliente: { select: { id_gimnasio: true } },
    },
  })

  const membresiasAnteriores = await prisma.clienteMembresia.findMany({
    where: { id_cliente: idCliente, estado: { not: 'activo' } },
    include: { membresia: true },
    orderBy: { fecha_inicio: 'desc' },
    take: 20,
  })

  if (!membresiaActiva) return null

  const inicio = new Date(membresiaActiva.fecha_inicio).getTime()
  const fin = new Date(membresiaActiva.fecha_fin).getTime()
  const ahora = Date.now()
  const total = fin - inicio
  const transcurrido = ahora - inicio
  const progreso = total > 0 ? Math.min(100, Math.round((transcurrido / total) * 100)) : 0
  const diasRestantes = Math.max(0, Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24)))
  const pago = await obtenerResumenPago(
    membresiaActiva.cliente.id_gimnasio,
    membresiaActiva.id_cliente_membresia,
  )

  return {
    id: Number(membresiaActiva.id_cliente_membresia),
    plan: {
      nombre: membresiaActiva.membresia.nombre,
      descripcion: membresiaActiva.membresia.descripcion,
      duracion_dias: membresiaActiva.membresia.duracion_dias,
      precio: Number(membresiaActiva.membresia.precio),
    },
    fecha_inicio: membresiaActiva.fecha_inicio,
    fecha_fin: membresiaActiva.fecha_fin,
    estado: membresiaActiva.estado,
    progreso,
    dias_restantes: diasRestantes,
    pago,
    historial: membresiasAnteriores.map((membresia) => ({
      id: Number(membresia.id_cliente_membresia),
      plan: membresia.membresia.nombre,
      fecha_inicio: membresia.fecha_inicio,
      fecha_fin: membresia.fecha_fin,
      estado: membresia.estado,
    })),
  }
}

/**
 * Lista las rutinas asignadas al cliente autenticado.
 *
 * Devuelve un snapshot de ejercicios por asignación para preservar lo que el
 * entrenador indicó al momento de asignar la rutina, incluso si el catálogo
 * global cambia después.
 *
 * @param idCliente - Cliente autenticado propietario de las asignaciones.
 * @returns Rutinas con ejercicios ordenados por la posición configurada.
 */
async function obtenerRutinas(idCliente: bigint) {
  const asignaciones = await prisma.clienteRutina.findMany({
    where: { id_cliente: idCliente },
    include: {
      rutina: true,
      ejercicios: {
        include: { ejercicio: true },
        orderBy: { orden: 'asc' },
      },
    },
    orderBy: { fecha_asignacion: 'desc' },
  })

  return asignaciones.map((asignacion) => ({
    id: Number(asignacion.id_cliente_rutina),
    id_rutina: Number(asignacion.id_rutina),
    nombre: asignacion.rutina.nombre,
    descripcion: asignacion.rutina.descripcion,
    objetivo: asignacion.rutina.objetivo,
    duracion_minutos: asignacion.rutina.duracion_minutos,
    dificultad: asignacion.rutina.dificultad,
    fecha_asignacion: asignacion.fecha_asignacion,
    estado: asignacion.estado || 'activa',
    ejercicios: asignacion.ejercicios.map((rutinaEjercicio) => ({
      id: Number(rutinaEjercicio.id_ejercicio),
      nombre: rutinaEjercicio.nombre,
      descripcion: rutinaEjercicio.ejercicio?.descripcion ?? null,
      grupo_muscular: rutinaEjercicio.ejercicio?.grupo_muscular ?? null,
      imagen_url: rutinaEjercicio.ejercicio?.imagen_url ?? null,
      animacion_url: rutinaEjercicio.ejercicio?.animacion_url ?? null,
      tipo_media: rutinaEjercicio.ejercicio?.tipo_media ?? null,
      series: rutinaEjercicio.series,
      repeticiones: rutinaEjercicio.repeticiones,
      peso: rutinaEjercicio.peso,
      descanso: rutinaEjercicio.descanso,
      orden: rutinaEjercicio.orden,
      notas: rutinaEjercicio.observaciones,
    })),
  }))
}

export const clientePortalService = {
  obtenerPerfil,
  obtenerMembresia,
  obtenerRutinas,
}

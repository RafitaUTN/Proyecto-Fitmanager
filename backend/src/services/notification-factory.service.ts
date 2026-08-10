import { notificacionRepository, type NotificacionDb } from '../repositories/notificacion.repository'
import type { TipoNotificacion } from '../generated/prisma/enums'

type TipoNotif = 'MEMBRESIA' | 'TRANSFERENCIA' | 'SISTEMA'

export type DestinoNotificacion = {
  id_gimnasio?: bigint
  id_usuario_destino?: bigint
  id_cliente?: bigint
  id_solicitud?: bigint
  rol_destino?: 'Administrador' | 'Recepcionista' | 'Entrenador'
}

export type InputCrearNotificacion = {
  eventKey?: string
  tipo: TipoNotif
  destino: DestinoNotificacion
  titulo: string
  mensaje: string
  accionUrl?: string
}

export const notificationFactory = {
  crear(input: InputCrearNotificacion, db?: NotificacionDb) {
    if (!input.destino.id_cliente && !input.destino.id_gimnasio && !input.destino.id_usuario_destino) {
      throw Object.assign(new Error('La notificación requiere un destinatario'), { statusCode: 400 })
    }
    return notificacionRepository.crear({
      event_key: input.eventKey,
      id_cliente: input.destino.id_cliente,
      id_gimnasio: input.destino.id_gimnasio,
      id_solicitud: input.destino.id_solicitud,
      id_usuario_destino: input.destino.id_usuario_destino,
      rol_destino: input.destino.rol_destino,
      accion_url: input.accionUrl,
      tipo: input.tipo as TipoNotificacion,
      titulo: input.titulo,
      mensaje: input.mensaje,
    }, db)
  },

  crearMultiple(inputs: InputCrearNotificacion[], db?: NotificacionDb) {
    return Promise.all(inputs.map(i => this.crear(i, db)))
  },
}

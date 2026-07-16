import { z } from 'zod'

export const crearPagoSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  id_cliente_membresia: z.coerce.number().int().positive(),
  monto: z.coerce.number().positive().max(9999999.99),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'sinpe']),
})

export type CrearPagoDto = z.infer<typeof crearPagoSchema>

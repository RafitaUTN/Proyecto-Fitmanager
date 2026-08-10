# Reglas de negocio canónicas

## Obligación de pago de membresía

`ClienteMembresia` separa el período de servicio de su obligación financiera:

- `fecha_inicio` y `fecha_fin`: vigencia efectiva del servicio.
- `monto_adeudado`: precio congelado al crear la obligación; no cambia si luego se edita el plan.
- `fecha_pago_habilitada`: primer día calendario en que se admite el cobro.
- `fecha_vencimiento_pago`: último día calendario antes de considerar vencido un saldo.

FitManager administra gimnasios en Costa Rica. Las decisiones de día calendario se evalúan en `America/Costa_Rica`; las columnas de obligación siguen siendo `DATE` y no instantes UTC.

Cuando se asigna o cambia un plan, el backend crea la obligación por el precio vigente. A falta de un ciclo previo documentado, la ventana de pago abre al cierre del período adquirido (`fecha_fin`) y esa misma fecha es el vencimiento. El frontend no puede elegir ni adelantar estas fechas.

Un pago se acepta únicamente si la membresía pertenece al tenant autenticado, está activa, ya inició, la ventana abrió, existe saldo y el monto positivo no supera ese saldo. `payment-balance.ts` es la fuente de verdad para pagos, portal y transferencias. Los pagos confirmados se agregan por obligación; nunca se infiere la deuda del estado aislado de una fila `Pago`.

Una renovación requiere que la obligación vigente esté saldada. La renovación extiende la misma asignación, incrementa `monto_adeudado` por el precio congelado del nuevo período y genera las nuevas fechas de apertura/vencimiento. Por ello, la antigua prueba que permitía dos renovaciones concurrentes con un solo pago dejó de representar una operación válida: ahora exactamente una renovación prospera y la segunda se bloquea hasta saldar la nueva obligación.

## Transferencias entre gimnasios

La aprobación se ejecuta con aislamiento serializable y bloqueos sobre solicitud, cliente, membresías activas y asistencias abiertas.

Antes de mover al cliente se exige:

1. que siga perteneciendo al gimnasio de origen;
2. que todas sus obligaciones activas tengan saldo cero;
3. que no exista una asistencia sin salida;
4. que la solicitud continúe pendiente.

El saldo pendiente produce `PAGOS_PENDIENTES`. Una asistencia abierta produce `TRANSFERENCIA_CON_ASISTENCIA_ABIERTA` y el personal debe registrar la salida; el sistema nunca inventa ni autocierra la hora de salida. Si alguna validación falla, la transacción completa se revierte y la solicitud permanece pendiente.

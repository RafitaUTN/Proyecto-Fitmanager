# Matriz QA de notificaciones y correo

| Evento | Generador | Destinatario esperado | Recibido/persistido por | Correcto | Duplicado |
|---|---|---|---|---|---|
| Cliente creado | Admin/Recepción | Cliente (email activación) | Outbox cliente exacto | Sí, entrega bloqueada | No |
| Entrenador cambiado | Admin | Admin + nuevo entrenador | Rol Admin + usuario específico | Sí | No |
| Membresía asignada | Admin/Recepción | Cliente/Admin según regla | Cliente específico + vista admin E2E | Sí | No |
| Pago parcial | Recepción | Cliente del pago | Cliente específico | Sí | No |
| Pago completado | Recepción | Cliente del pago | Cliente específico | Sí | No |
| Rutina asignada | Admin/Entrenador | Cliente asignado | Cliente específico | Sí | No |
| Transferencia solicitada | Gym destino | Admin origen + Admin destino | Dos destinos por gimnasio/rol | Sí | No |
| Transferencia aprobada | Admin origen | Admin origen + Admin destino | Dos destinos por gimnasio/rol | Sí | No |
| Password cambiado | Cliente | Cliente | Cliente específico | Sí | No |
| Membresía por vencer | Generación admin | Admin/roles según implementación | Cubierto por E2E existente | Sí en caso ejecutado | No |

## Consistencia observada

- Repetir listados/contador tres veces: `8 → 8` registros; no inserta por consulta.
- Marcar una notificación leída: contador `8 → 7`.
- Notificaciones huérfanas al final: `0`.
- Admin A al marcar notificación B: `404`.
- Entrenador A1 recibió `0` eventos de clientes sin relación en la muestra.

## Distribución DB QA

| Tipo | Forma de destino | Observado |
|---|---|---:|
| TRANSFERENCIA | Gimnasio + Administrador | 20 |
| SISTEMA | Gimnasio + Administrador | 34 |
| SISTEMA | Cliente específico | 24 |
| SISTEMA | Usuario específico | 33 |

## Correo

- Activación: destinatario, asunto, HTML/texto y URL QA verificados.
- Recuperación: respuesta anti-enumeración verificada.
- Entrega SMTP real: **BLOCKED** por proveedor QA no configurado.
- Seguridad: `SEC-001`, token utilizable conservado en HTML del outbox fallido.

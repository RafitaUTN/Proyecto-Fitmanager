# Matriz RBAC verificada

Leyenda: `ALLOW` = autorizado y verificado; `DENY` = 403/404 o redirección; `PARTIAL` = inconsistencia UI sin fuga API.

| Operación | Admin | Recepción | Entrenador | Cliente | Resultado |
|---|---|---|---|---|---|
| Dashboard staff | ALLOW | ALLOW | ALLOW | DENY 403 | PASS |
| Usuarios listar/crear/editar/eliminar | ALLOW | DENY 403 | DENY 403 | DENY | PASS |
| Clientes listar | ALLOW | ALLOW | Solo asignados | DENY | PASS |
| Cliente por ID de otro entrenador | ALLOW | ALLOW | DENY 404 | DENY | PASS |
| Cliente por ID de otro gym | DENY 404 | DENY | DENY | DENY | PASS |
| Membresías planes CRUD | ALLOW | Solo lectura/asignación | DENY | Portal propio | PASS |
| Pagos listar/registrar | ALLOW | ALLOW | DENY 403 | Portal propio | PASS |
| Asistencia entrada/salida | ALLOW | ALLOW | DENY | DENY | PASS |
| Asistencia histórica | ALLOW | ALLOW | Clientes asignados | DENY | PASS |
| Ejercicios listar/crear/editar | ALLOW | DENY 403/UI | ALLOW | DENY | PASS |
| Ejercicios eliminar | ALLOW | DENY | DENY UI/API | DENY | PASS |
| Rutinas listar/crear/editar | ALLOW | DENY 403/UI | Propias/asignadas | Portal propio | PASS |
| Rutinas eliminar | ALLOW | DENY | DENY UI/API | DENY | PASS |
| Asignar entrenador a rutina | ALLOW | DENY | DENY | DENY | PASS |
| Asignar cliente a rutina | ALLOW | DENY | Solo relación válida | DENY | PASS |
| Notificaciones staff | ALLOW | Segmentadas | Personalizadas | Ruta distinta | PASS |
| Marcar notificación otro gym | DENY 404 | DENY | DENY | DENY | PASS |
| Transferencias consultar/crear | ALLOW | ALLOW | DENY | DENY | PASS |
| Transferencias aprobar/rechazar | ALLOW origen | DENY | DENY | DENY | PASS |
| Reportes API | ALLOW | DENY 403 | DENY 403 | DENY | PASS |
| `/dashboard/usuarios` directo | ALLOW | REDIRECT | REDIRECT | DENY | PASS |
| `/dashboard/rutinas` directo | ALLOW | REDIRECT | ALLOW | DENY | PASS |
| `/dashboard/ejercicios` directo | ALLOW | REDIRECT | ALLOW | DENY | PASS |
| `/dashboard/reportes` directo | Blanco | Blanco | Blanco | DENY | PARTIAL/FAIL UI |
| Portal `/cliente/me/*` | DENY | DENY | DENY | ALLOW propio | PASS |

No se observó ningún `EXPECTED_DENY + ACTUAL_ALLOW` en API. `REPORT-001` es una ruta ausente, no una autorización backend evadida.

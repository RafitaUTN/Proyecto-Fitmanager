# QA_FUNCTIONAL_REVIEW.md

Ciclo de correcciones funcionales y QA exploratorio.

## Estado inicial

- Rama: `codex/fix/qa-remediation-production-readiness`
- Árbol limpio salvo `OPENCODE_HANDOFF_ANALYSIS.md` (sin seguimiento, ajeno)

## Problemas reportados

| ID | Título | Estado |
|---|---|---|
| FIX-001 | Activación de cliente devuelve "Token CSRF inválido" | RESUELTO (tests: backend 10 nuevos, frontend 3 nuevos) |
| NAV-001 | "Reportes" aparece redundante en el sidebar | RESUELTO (dashboard index es la única superficie de reportes) |
| ATT-001 | Dropdown de check-in lista clientes no elegibles | RESUELTO (endpoint `clientes-elegibles` + hook propio, ver resolución) |
| TRANSFER-UX-001 | Botón "Solicitar transferencia" desapareció | RESUELTO (tests: backend 4 nuevos, frontend 5 nuevos) |
| EXERCISE-UX-001 | Media de ejercicios debe venir de API externa buscable (sin emojis/URLs manuales) | PENDIENTE |

## Hallazgos adicionales

(A completar durante el QA exploratorio)

## Resolución FIX-001 (activación "Token CSRF inválido")

Reproducción confirmada contra el stack en vivo:
1. Navegador con cookie `fitmanager_refresh` obsoleta (máquina compartida / sesión antigua).
2. `POST /api/auth/refresh` falla con 401/403 → el store anula el token CSRF en memoria.
3. `POST /api/auth/setup-password` se envía sin cabecera `X-CSRF-Token` pero con la cookie de refresh aún en el navegador → el middleware CSRF global exigía doble envío y devolvía `403 CSRF_INVALIDO` ANTES de validar el token de acción.

Correcciones:
- `backend/src/middlewares/csrf.middleware.ts` (nuevo): extrae el middleware global y exime únicamente las rutas anónimas de acción por token (`setup-password`, `reset-password`, `forgot-password`) y el registro público (`/api/gimnasios`). Justificación: sin sesión no hay nada que un CSRF pueda "cabalgar"; el POST solo tiene efecto conociendo el token de un solo uso.
- `backend/src/controllers/auth.controller.ts`: en `refresh`, si el token es inválido/expirado (REFRESH_INVALIDO/REFRESH_EXPIRADO/SESION_COMPROMETIDA) se limpian las cookies obsoletas.
- `frontend/src/lib/http-client.ts`: auto-recuperación CSRF — ante `403 CSRF_INVALIDO` re-sincroniza `GET /auth/csrf` y reintenta una sola vez.

Verificación: 5/5 checks del script de reproducción en vivo; suite backend 292 tests (+10), suite frontend 40 tests (+3).

## Resolución NAV-001 (sidebar "Reportes" redundante)

El index `/dashboard` (Administrador) ya embebe `DashboardChartSection` (5 módulos, filtros por período, ExportModal CSV/Excel/PDF), la superficie completa de reportes diseñada en HU-17. El ítem de sidebar "Reportes" abría una página duplicada (`/dashboard/reportes` → `pages/Reportes.tsx`) con los mismos gráficos.

Cambios:
- Eliminado ítem de sidebar `reportes` y ruta `/dashboard/reportes` en `Dashboard.tsx`.
- Eliminados `pages/Reportes.tsx`, `features/reports/ReportsRoute.tsx` y su test.
- `DashboardChartSection` permanece como única superficie de reportes/exportación.
- Referencias restantes (backend audit, Landing marketing) no son código de navegación y se conservan.

## Resolución ATT-001 (dropdown de check-in con clientes no elegibles)

El select de entrada/salida usaba el mismo hook del historial (`useClientesAsistencia` → `GET /clientes`), que lista TODOS los clientes del gimnasio, incluidos inactivos, sin membresía vigente o con una entrada abierta; el backend los rechazaba al registrar la entrada (`404/400`).

Cambios:
- Backend: nuevo `GET /api/asistencias/clientes-elegibles` (Administrador, Recepcionista). `asistencia.repository.listarElegibles` consulta clientes con `estado = true`, membresía `activa` que cubre la fecha actual y sin entrada abierta (`asistencias: none { fecha_hora_salida: null }`), ordenados por nombre. Filtro reutilizable `whereElegibles` exportado.
- Frontend: nuevo hook `useClientesElegibles` (query key `asistencias/clientes-elegibles`); el select de check-in lo usa, mientras el filtro del historial conserva todos los clientes. Invalida la lista tras registrar entrada. Mensaje de aviso cuando no hay elegibles.

Verificación: 296 tests backend (+4: 1 servicio + 3 filtro `whereElegibles`); 37 tests frontend, `tsc -b` y `oxlint` limpios; reproducción en vivo: Admin/Recepcionista reciben 200 con 4 elegibles, entrada a cliente no elegible → 404, dropdown de check-in lista solo elegibles y el filtro del historial todos los clientes.

## Resolución TRANSFER-UX-001 (botón "Solicitar transferencia" desapareció)

Causa raíz (doble bug):
- El parser `tryParseClienteActivoError` hacía `JSON.parse(err.body.error)`, pero `err.body.error` es un string plano → `JSON.parse` siempre lanzaba → la función devolvía `null` → el flujo 409 `CLIENTE_ACTIVO_OTRO_GYM` nunca abría el modal. Además devolvía el body completo en vez de desempaquetar `data`.
- El backend serializa `AppError.data` bajo la clave `data`: `{ error, codigo, data: { cliente, gimnasio, estado } }` (`app.ts`).
- En el historial de git nunca existió un botón standalone: el acceso era solo vía el flujo 409 (roto), por lo que la funcionalidad quedó oculta.

Cambios:
- Backend: nuevo `GET /api/transferencias/buscar-cliente?cedula=` (Administrador, Recepcionista) → 200 `{ cliente, gimnasio: { nombre }, estado: 'Activo'|'Inactivo' }` para clientes de OTRO gimnasio; 400 `CLIENTE_MISMO_GIMNASIO` si pertenece al mismo; 404 `CLIENTE_NO_ENCONTRADO`. `cliente.repository.buscarPorCedulaConGimnasio` (include `gimnasio`), `transferencia.service.buscarCliente`, handler y ruta registrada antes de `GET /:id`.
- Frontend: parser movido a `lib/transferencia-error.ts` (desempaqueta `body.data`, sin `JSON.parse` del mensaje) + tests; nuevo hook `useBuscarClienteTransferencia`; nuevo modal `BuscarClienteTransferenciaModal` (búsqueda por cédula); botón visible "Solicitar transferencia" en el header de `Clientes.tsx` (Admin/Recepcionista) → búsqueda → `TransferRequestModal`.

Verificación: 300 tests backend (+4 `buscarCliente`); 42 tests frontend (+5 parser), `tsc -b` y `oxlint` limpios. En vivo contra Docker: `buscar-cliente?cedula=100000001` → 200 (Pedro Jiménez / PowerFit Gym / Activo), misma cédula de gym propio → 400, cédula inexistente → 404, sin query → 400 `VALIDATION_ERROR`. En el navegador: botón visible, búsqueda abre el modal con datos correctos, submit crea solicitud (gym 13→14, PENDIENTE, luego CANCELADA para limpiar), y el flujo 409 al crear cliente con cédula de otro gimnasio abre el `TransferRequestModal` con la data correcta.

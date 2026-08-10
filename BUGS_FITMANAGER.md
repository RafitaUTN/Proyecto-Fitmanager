# Backlog local de bugs FitManager

Estado de todos los hallazgos: **OPEN / NO CORREGIDO**.

| ID | Área | Rol | Gym | Severidad | Estado | Reproducible |
|---|---|---|---|---|---|---|
| SEC-001 | Activación/email | N/A | A/B | HIGH | OPEN | 100% |
| AUTH-001 | Registro/usuarios | Admin | A/B | HIGH | OPEN | 100% |
| PAY-001 | Pagos | Recepción | A | HIGH | OPEN | 100% |
| TRANSFER-001 | Transferencia | Admin | A→B | HIGH | OPEN | 100% |
| TRANSFER-002 | Transferencia/asistencia | Admin/Recepción | A→B | HIGH | OPEN | 100% |
| REPORT-001 | Frontend/reportes | Admin/Recepción | A | HIGH | OPEN | 100% |
| CONFIG-001 | Build/configuración | DevOps | N/A | MEDIUM | OPEN | 100% |

## SEC-001 — Token de activación persiste en claro en outbox fallido

- Severidad: HIGH.
- Precondición: proveedor de correo no configurado o envío fallido.
- Pasos: crear cliente; consultar `email_outbox`; abrir HTML almacenado; usar el token embebido en `/setup-password`.
- Esperado (`SECURITY-EXPECTED`): la BD conserva hash/referencia, no un secreto utilizable.
- Actual: `token.token_hash` está protegido, pero `email_outbox.html` conserva el enlace con token en claro; fue posible activar la cuenta desde él.
- DB: 49 eventos ACTIVACION `FALLIDO/PROVEEDOR_NO_CONFIGURADO` durante QA.
- Hipótesis: `encolarYEnviar()` persiste HTML renderizado antes de entregar y solo lo vacía al marcar `ENVIADO`.
- Archivos: `backend/src/email/email.service.ts`, `backend/src/services/token.service.ts`.
- Frecuencia: 100% con entrega fallida.
- NO CORREGIDO: Sí.

## AUTH-001 — Política de contraseña fuerte no se aplica a gimnasio/staff

- Severidad: HIGH.
- Rol: registro público y Administrador.
- Pasos: registrar gimnasio con `123456`; crear Recepcionista con `123456`.
- Esperado (`SECURITY-EXPECTED`): política de 12 caracteres, mayúscula, minúscula, número y especial usada por activación/reset.
- Actual: ambos endpoints devuelven 201.
- HTTP: `POST /api/gimnasios`, `POST /api/usuarios`.
- Hipótesis: DTOs locales usan `.min(6)` en vez de `passwordSeguraSchema`.
- Archivos: `backend/src/dtos/gimnasio.dto.ts`, `backend/src/dtos/usuario.dto.ts`, `backend/src/dtos/auth.dto.ts`.
- Frecuencia: 100%.
- NO CORREGIDO: Sí.

## PAY-001 — Pago permitido el mismo día de asignación

- Severidad: HIGH.
- Tenant/rol: Gym A / Recepción.
- Precondición: plan ₡10.000 asignado hoy.
- Pasos: asignar membresía; inmediatamente registrar ₡7.000.
- Esperado (`USER-REQUIREMENT`): rechazar hasta la fecha de cobro permitida; la fecha exacta requiere definición de negocio.
- Actual: 201, saldo parcial ₡3.000; `fecha_pago_habilitada` coincide con `fecha_inicio`.
- HTTP: `POST /api/pagos`.
- DB: pago persistido como `completado`.
- Hipótesis: `obtenerResumen()` expone `fecha_inicio` como habilitación y el service solo compara contra ella.
- Archivos: `backend/src/services/pago.service.ts`, frontend de pagos/membresía.
- Frecuencia: 100%.
- NO CORREGIDO: Sí.

## TRANSFER-001 — Saldo parcial no bloquea transferencia

- Severidad: HIGH.
- Tenant/rol: A→B / Admin A.
- Precondición: plan ₡10.000, pago ₡1.000, saldo ₡9.000.
- Pasos: B solicita; A aprueba.
- Esperado (`USER-REQUIREMENT`): 400 `PAGOS_PENDIENTES`.
- Actual: 200 `APROBADA`; cliente cambia a B.
- DB: la fila Pago está `completado`, aunque el balance de membresía es PARCIAL.
- Hipótesis: aprobación busca filas Pago `pendiente/vencido/moroso`, no saldo agregado de la membresía.
- Archivos: `backend/src/services/transferencia.service.ts`, `backend/src/services/payment-balance.ts`.
- Frecuencia: 100%.
- NO CORREGIDO: Sí.

## TRANSFER-002 — Transferencia deja asistencia abierta en gimnasio origen

- Severidad: HIGH.
- Tenant/rol: A→B / Admin A y Recepción A.
- Precondición: cliente con membresía pagada y check-in abierto.
- Pasos: B solicita; A aprueba; inspeccionar asistencia/cliente.
- Esperado (`INFERRED`): bloquear o cerrar explícitamente dentro de la transacción.
- Actual: aprobación 200 y `fecha_hora_salida = null`; `asistencia.id_gimnasio != cliente.id_gimnasio`.
- DB: 1 asistencia abierta cross-tenant al finalizar.
- Hipótesis: transacción de aprobación cancela membresía/archiva rutina pero omite asistencia.
- Archivos: `backend/src/services/transferencia.service.ts`, repositorio de asistencia.
- Frecuencia: 100%.
- NO CORREGIDO: Sí.

## REPORT-001 — Reportes no tiene ruta en dashboard

- Severidad: HIGH.
- Rol: todos; relevante para Administrador.
- Pasos: abrir `/dashboard/reportes`.
- Esperado (`DOCUMENTED`): renderizar `Reportes` para Administrador y redirigir otros roles.
- Actual: URL permanece y el área principal queda vacía. Las ocho APIs sí responden 200 al Admin y 403 a Recepción.
- Evidencia: `screenshots/qa/reception-direct-reportes.png`.
- Hipótesis: `Reportes.tsx` no fue importado ni registrado en las rutas anidadas de Dashboard.
- Archivos: `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Reportes.tsx`.
- Frecuencia: 100%.
- NO CORREGIDO: Sí.

## CONFIG-001 — Verificación de bundle detecta localhost

- Severidad: MEDIUM.
- Pasos: `npm run build`; `npm run verify:bundle` en frontend con configuración actual.
- Esperado (`CODE-INVARIANT`): bundle productivo sin endpoint local.
- Actual: error `El bundle de producción contiene un endpoint local de la aplicación`.
- Evidencia: `.env` define `VITE_API_URL=http://localhost:3000/api` y queda incorporado al artefacto.
- Archivos: `frontend/.env`, `frontend/scripts/verify-production-bundle.mjs`.
- Frecuencia: 100% en este workspace.
- NO CORREGIDO: Sí.

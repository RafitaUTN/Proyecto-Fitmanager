# FitManager — QA real-world integral

> Auditoría local, no productiva y sin correcciones. Fecha: 2026-08-09 (America/Costa_Rica).

## 1. Resumen ejecutivo

Se ejecutaron **207 verificaciones**: 198 correctas, 8 fallidas y 1 bloqueada por infraestructura externa. Además se procesaron 890 requests de carga moderada sin errores.

| Área | Resultado |
|---|---|
| Multi-tenant / IDOR | PASS en accesos; PARTIAL por asistencia abierta después de transferencia |
| RBAC API | PASS |
| RBAC UI | PARTIAL: Reportes no tiene ruta registrada |
| Pagos | PARTIAL: parciales y concurrencia correctos; regla temporal incorrecta |
| Asistencias | PARTIAL: entrada/salida correctas; transferencia deja entrada abierta |
| Rutinas | PASS |
| Notificaciones | PASS en personalización/deduplicación; riesgo de token en outbox |
| Password cliente | PASS |
| Política password staff | FAIL |
| Transferencias | FAIL en deuda parcial y asistencia abierta |
| Reportes API | PASS; UI FAIL |
| Performance local | ACCEPTABLE |
| API externa de ejercicios | GAP FUNCIONAL; fallback visual PASS |

Bugs raíz: 0 blocker, 0 critical, **6 high**, **1 medium**. Riesgos adicionales: cobertura backend, tamaño de bundle, advertencia `pg` y entrega SMTP no verificable.

## 2. Commit probado

- Rama: `codex/feature/mejoras-fitmanager-ux-negocio`.
- SHA inicial: `f582120` — `docs: documentar evolución funcional y reglas de negocio`.
- Working tree inicial: limpio.
- No se ejecutó `commit`, `push`, PR, merge, tag, release ni deploy.

## 3. Entorno QA

- Frontend QA: `http://localhost:5174`.
- Backend QA: `http://localhost:3001`.
- PostgreSQL 17 aislado: `fitmanager_qa_e2e_20260809` en Docker.
- Servicios temporales: `fitmanager-qa-frontend`, `fitmanager-qa-backend`.
- Email real deshabilitado; se validó el outbox, destinatario, asunto, HTML, texto y URL.
- Producción, Vercel, Neon y bases remotas no fueron utilizados.

## 4. Stack de pruebas

- Vitest backend y frontend.
- Prisma + PostgreSQL real.
- Playwright Chromium (41 casos existentes).
- Harness API/DB local `backend/qa/real-world-audit.ts` (69 escenarios).
- `agent-browser` para exploración visual desktop/mobile.
- Harness de carga Node `backend/qa/load-audit.mjs`.
- Consultas SQL de invariantes y `docker stats`.

## 5. Datos generados

Cada ejecución principal creó por tenant:

- 1 administrador, 2 recepcionistas y 2 entrenadores.
- 12 clientes con nombres/identificadores distinguibles.
- 3 planes: Básica, Premium y Trimestral.
- 10 ejercicios.
- 5 rutinas con 3 ejercicios y snapshot de series/repeticiones/peso/descanso.
- Membresías, pagos, asistencias, notificaciones, sesiones y transferencias.

Los datos se generaron por API/script; no hubo carga manual de archivos.

## 6. Gimnasio A

`FitManager QA San Carlos`: registro, login, staff, clientes, planes, catálogo, rutinas, pagos, asistencias, notificaciones, reportes API y transferencias ejecutados. Los listados no mostraron recursos de B.

## 7. Gimnasio B

`FitManager QA Fortuna`: misma estructura base. Actuó como destino de transferencias y como tenant adversarial en IDOR/búsquedas/listados.

## 8. Roles

- Administrador: CRUD y reportes API correctos.
- Recepción: operaciones permitidas correctas; APIs administrativas denegadas 403.
- Entrenador: solo clientes asignados; recursos administrativos denegados.
- Cliente: solo portal propio; dashboard staff denegado.

Detalle: [QA_RBAC_MATRIX.md](QA_RBAC_MATRIX.md).

## 9. Registro y login

- Registro Gym A/B y auto-sesión: PASS.
- Duplicado de gimnasio: 409, PASS.
- Login de los cuatro actores: PASS.
- Correo inválido/password vacío: 400; credencial incorrecta: 401.
- Fallo: registro y alta de staff aceptan password de seis caracteres, en conflicto con la política fuerte de activación/reset.

## 10. Clientes

- Crear, listar, buscar, asignar entrenador y duplicados: PASS.
- Búsqueda desde A por correo de B: lista vacía.
- Entrenador A1 no obtuvo cliente de A2: 404.
- Campo inesperado fue descartado sin elevar privilegios.

## 11. Membresías

- Planes y asignación: PASS.
- Doble asignación concurrente: exactamente 1×201 y 1×409.
- Membresía futura/cancelada no habilitó asistencia.
- Cero membresías activas cross-tenant después de transferencias.

## 12. Pagos

- Parciales ₡7.000 + ₡3.000: saldo 0 y `COMPLETADO`.
- Montos 0 y negativos: 400; sobrepago: 409.
- Efectivo, SINPE, tarjeta y transferencia persistieron correctamente.
- Dos pagos simultáneos de ₡6.000: uno aceptado, otro 409; total ₡6.000.
- Fallo `PAY-001`: pago aceptado el mismo día de asignación porque `fecha_pago_habilitada = fecha_inicio`.

## 13. Asistencias

- Check-in, listado activo, salida e histórico: PASS.
- Doble salida: 409.
- Doble check-in concurrente: una entrada y un 409.
- Sin membresía, futura o cancelada: 400.
- Fallo derivado de transferencia: una asistencia quedó abierta con `asistencia.id_gimnasio != cliente.id_gimnasio`.

## 14. Ejercicios

- CRUD, filtros, activar/desactivar, detalle y fallback: PASS en Playwright/exploración.
- Una URL deliberadamente inexistente mostró fallback gráfico sin error de página.
- No existe API externa de media, caché o catálogo automatizado.

## 15. Rutinas

- Crear con ejercicios, editar, activar/desactivar, eliminar y reabrir: PASS.
- Asignar entrenador antes de que gestione rutina: PASS.
- Duplicado de asignación: 409.
- Portal cliente recibió snapshot con tres ejercicios.
- El bug conocido “no se pueden asignar ejercicios” no se reprodujo en esta versión.

## 16. Notificaciones

- Consultar/reabrir no insertó duplicados.
- Conteo se redujo en uno al marcar leída.
- Entrenador no recibió eventos de clientes ajenos.
- Admin A no pudo marcar notificación B.
- Destinatarios DB: admin por gimnasio, cliente específico y usuario específico; cero huérfanas.
- Riesgo `SEC-001`: el outbox fallido conserva token de activación en el HTML.

## 17. Portal cliente

- Activación, login unificado, perfil, membresía, rutinas, notificaciones y guards: PASS.
- Cliente no accedió a dashboard/recursos staff (403).

## 18. Password

- Password actual incorrecta: 400.
- Confirmación distinta: 400.
- Nueva igual a anterior: 400.
- Cambio válido: 200.
- El bug conocido de cambio de password no se reprodujo.

## 19. Recuperación

- Correo existente/inexistente devolvió la misma respuesta 200: sin enumeración.
- Token de activación fue de un solo uso.
- Integración PostgreSQL verificó recuperación de un solo uso e invalidación de sesiones.
- Entrega real bloqueada por proveedor QA no configurado.

## 20. Transferencias

- Solicitud, duplicado, aprobación y segunda aprobación: 201/409/200/409.
- Cliente dejó de ser visible en A y pasó a B.
- Entrenador quedó `null`; membresía cancelada; rutina archivada.
- Pagos históricos conservaron gimnasio origen.
- Fallos: saldo parcial no bloquea; asistencia abierta no bloquea ni se cierra.

## 21. RBAC

Las APIs probaron denegación real, no solo ocultamiento. Usuarios, pagos, ejercicios, reportes y dashboard cliente respondieron 403 según rol. El frontend redirigió Usuarios/Rutinas/Ejercicios, pero `reportes` no está registrado y muestra contenido vacío.

## 22. Multi-tenancy

- Cliente, rutina y ejercicio B consultados por A: 404.
- Plan/rutina/asistencia cruzados: 404.
- Búsqueda cruzada: vacía.
- Cero entrenadores asignados a clientes de otro tenant.
- Cero membresías/rutinas **activas** cross-tenant.
- Una asistencia abierta quedó vinculada históricamente a A mientras el cliente pertenece a B: PARTIAL.

## 23. Seguridad

- CSRF ausente en refresh: 403.
- Refresh rotado: token anterior 401.
- Desactivar staff revocó access activo: 401.
- Logout revoca refresh; access JWT corto permanece válido hasta expirar, conforme al diseño actual.
- `npm audit`: 0 vulnerabilidades backend/frontend.
- Fallos: política password inconsistente y token recuperable desde outbox fallido.

## 24. Base de datos

- 13/13 migraciones desde base vacía.
- `prisma migrate status`: up to date.
- `prisma migrate diff --exit-code`: sin drift.
- Cero dobles membresías activas, dobles asistencias abiertas por cliente o notificaciones huérfanas.
- Única violación final: asistencia abierta después de cambio de tenant.

## 25. Casos límite

Probados: duplicados, null, vacío, string enorme, campo inesperado, IDs inexistentes/ajenos, futuro/cancelado, pago cero/negativo/sobrepago, doble asignación, doble salida y token reutilizado.

## 26. Concurrencia

- Membresía activa: PASS.
- Check-in: PASS.
- Pagos: PASS.
- Refresh: PASS en integración.
- Transferencia: bloqueo de segunda decisión PASS.

## 27. Performance

890 requests, 0 errores, p95 máximo 58,97 ms, p99 máximo 75,34 ms. Backend alcanzó ~135% CPU y 221 MiB; PostgreSQL ~61% CPU y 114 MiB. Es una medición local corta, no capacidad productiva.

## 28. API externa de ejercicios

**GAP-FUNCIONAL — MEDIA DE EJERCICIOS DEPENDE DE URLs MANUALES / API NO IMPLEMENTADA.**

No se encontró integración externa configurable ni rate-limit/cache de tercero. Sí existe validación HTTPS/ruta local y fallback cuando la imagen falla.

## 29. Bugs

Resumen en [BUGS_FITMANAGER.md](BUGS_FITMANAGER.md):

| ID | Severidad | Resumen |
|---|---|---|
| SEC-001 | HIGH | Token de activación en claro dentro de outbox fallido |
| AUTH-001 | HIGH | Password débil aceptada en registro/usuarios |
| PAY-001 | HIGH | Pago habilitado desde el día de asignación |
| TRANSFER-001 | HIGH | Saldo parcial no bloquea transferencia |
| TRANSFER-002 | HIGH | Transferencia conserva asistencia abierta |
| REPORT-001 | HIGH | Módulo Reportes sin ruta UI |
| CONFIG-001 | MEDIUM | Bundle productivo contiene endpoint localhost |

## 30. Riesgos

- Backend coverage: 46,12% statements / 34,90% branches.
- Dashboard chunk: 619,22 kB minificado.
- `pg` advierte uso concurrente de `client.query()` deprecado para pg 9.
- SMTP real no verificado en QA.
- El entorno Windows tiene otro PostgreSQL en localhost:5432; ejecutar tests desde Docker evita apuntar al servidor incorrecto.

## 31. Funcionalidades correctas

Registro, login unificado, refresh/CSRF, RBAC API, IDOR, clientes, membresías concurrentes, pagos parciales, cuatro métodos, check-in/out, rutinas, snapshot cliente, notificaciones personalizadas, transferencia histórica, reportes API, migraciones y fallback de media.

## 32. Funcionalidades parciales

Pagos (fecha), transferencias (deuda/asistencia), multi-tenant post-transferencia, seguridad de outbox y política password.

## 33. Funcionalidades rotas

Acceso UI al módulo Reportes; verificación de bundle con configuración actual.

## 34. Recomendaciones de corrección

1. Definir explícitamente la fecha de habilitación de cobro y aplicarla en backend/UI.
2. Calcular deuda desde saldo de `ClienteMembresia`, no desde filas `Pago` con estado pendiente.
3. Bloquear transferencia con asistencia abierta o cerrarla explícitamente en la misma transacción.
4. No persistir tokens de acción dentro del outbox; usar referencia efímera/cifrada o render tardío.
5. Unificar `passwordSeguraSchema` en gimnasio/usuario.
6. Registrar `Reportes` con guard Administrador y navegación correspondiente.
7. Separar `.env` de desarrollo del build productivo/verificador.

## 35. Prioridad y plan propuesto

```text
P0/P1: SEC-001
  ↓
P1: AUTH-001 + PAY-001
  ↓
P1: TRANSFER-001
  ↓
P1: TRANSFER-002
  ↓
P1: REPORT-001
  ↓
P2: CONFIG-001
  ↓
P3: cobertura, chunk y deprecación pg
```

**PLAN_CORRECCION_PROPUESTO; NO IMPLEMENTADO.**

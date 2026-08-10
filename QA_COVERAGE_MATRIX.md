# Matriz de cobertura funcional QA

| Módulo | Admin | Recepción | Entrenador | Cliente | Gym A | Gym B | Cross-tenant | Estado |
|---|---|---|---|---|---|---|---|---|
| Registro | PASS | N/A | N/A | N/A | PASS | PASS | Identidades globales | PARTIAL password |
| Login/sesión | PASS | PASS | PASS | PASS | PASS | PASS | Claims verificados | PASS |
| Usuarios | CRUD | DENY API/UI | DENY API/UI | DENY | PASS | Seed/API | ID ajeno 404 | PARTIAL password |
| Clientes | CRUD | CRUD permitido | Solo asignados | Solo `me` | PASS | PASS | ID/búsqueda PASS | PASS |
| Membresías | CRUD | asignar/renovar | DENY | consulta propia | PASS | PASS | asignación ajena 404 | PASS |
| Pagos | PASS | PASS | DENY | resumen propio | PASS | datos B aislados | IDOR PASS | PARTIAL fecha |
| Asistencias | PASS | PASS | histórico asignado | DENY | PASS | aislamiento | 1 abierta post-transfer | PARTIAL |
| Ejercicios | CRUD | DENY | crear/editar | DENY | PASS | PASS | ID ajeno 404 | PASS/GAP media |
| Rutinas | CRUD | DENY | propias/asignadas | consulta propia | PASS | PASS | ID/asignación 404 | PASS |
| Notificaciones | PASS | segmentadas | personalizadas | propias | PASS | PASS | marcado ajeno 404 | PASS |
| Transferencias | responder | solicitar/cancelar | DENY | historia consistente | PASS | PASS | historia conservada | FAIL casos límite |
| Reportes API | PASS | DENY | DENY | DENY | PASS | carga ambas | queries tenant | PASS API |
| Reportes UI | No accesible | blanco | blanco | N/A | FAIL | N/A | N/A | FAIL |
| Password/recuperación | N/A | N/A | N/A | PASS | PASS | N/A | no enumeración | PASS cliente |

## Resumen cuantitativo

| Suite | Archivos/casos | Resultado |
|---|---:|---|
| Backend unit + integration PostgreSQL | 20 archivos / 57 tests | 57 PASS |
| Frontend unit | 4 archivos / 16 tests | 16 PASS |
| Playwright Chromium existente | 41 tests | 41 PASS |
| Real-world API/DB | 69 escenarios | 66 PASS / 3 FAIL |
| Baseline gates | 8 | 7 PASS / 1 FAIL |
| Exploración/seguridad | 13 | 8 PASS / 4 FAIL / 1 BLOCKED |
| Performance | 3 perfiles / 890 requests | PASS |

## Cobertura de código

| Capa | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Backend | 46,12% | 34,90% | 42,34% | 48,17% |
| Frontend | 87,93% | 70,37% | 88,00% | 91,66% |

## Bugs conocidos solicitados

| Caso | Resultado |
|---|---|
| Pago permitido demasiado pronto | REPRODUCIDO (`PAY-001`) |
| Cambio de contraseña devuelve error | NO REPRODUCIDO; negativos y éxito correctos |
| No asigna ejercicios a rutinas | NO REPRODUCIDO; persistencia y portal correctos |
| Salida de asistencia inconsistente | NO REPRODUCIDO en salida normal; sí aparece tras transferencia (`TRANSFER-002`) |
| Notificaciones no personalizadas | NO REPRODUCIDO en actores probados |

# Remediación integral de FitManager

Fecha: 2026-08-09  
Baseline: `main` @ `5a6570426bdc0cde1a465c3e43490888d8d668ae`  
Rama: `codex/fix/remediacion-integral-fitmanager`

## 1. Resumen ejecutivo

Se cerraron los P0 de aislamiento de datos, invariantes de membresía, transferencias y drift. Se reconstruyó el historial Prisma, se endurecieron sesiones, notificaciones, exportaciones, CI/CD y Docker, y se aplicaron cambios compatibles en Supabase, GitHub y Vercel. El PR #35 pasó CI, CodeQL y preview Vercel; no se recomienda promoverlo directamente a producción sin resolver la estrategia HttpOnly de sesión.

## 2. Alcance

Backend, frontend, PostgreSQL/Prisma, Supabase, autenticación, correo, pruebas, GitHub Actions, protección de ramas, Docker, Vercel, documentación y OpenAPI.

## 3. Baseline

Builds iniciales pasaban, pero solo había 3 unit tests backend, no había unit tests frontend ni coverage, las migraciones no reconstruían el esquema y los audits reportaban vulnerabilidades high/moderate.

## 4. Backlog y trazabilidad

El estado por ID, prioridad, commit y evidencia se conserva en [docs/REMEDIATION_STATUS.md](./docs/REMEDIATION_STATUS.md). No se usaron porcentajes artificiales de avance.

## 5. Plano de datos Supabase

Todas las tablas de aplicación tienen RLS habilitado en modo deny-by-default. Se revocaron grants de `anon`, `authenticated` y `service_role` sobre el plano Data API; el backend continúa por PostgreSQL directo. La operación tuvo precheck, postcheck y rollback SQL.

## 6. Multi-tenant

Cada request resuelve actor, rol y gimnasio activos. Clientes, rutinas, ejercicios, asignaciones, asistencias y notificaciones se consultan por recurso + tenant; los cruces devuelven 404 o conflicto sin revelar existencia.

## 7. Membresías

Existe un índice parcial único por cliente con estado activo y un check de fechas. La renovación bloquea la fila y extiende el contrato dentro de una transacción, evitando dobles membresías incluso con concurrencia.

## 8. Transferencias

La aprobación bloquea la solicitud, cancela membresía activa, limpia entrenador, archiva asignaciones de rutina y notifica a ambos gimnasios en una sola transacción. Solo el gimnasio/rol autorizado puede actuar.

## 9. Historia y asistencias

Pagos y asistencias conservan `id_gimnasio` del hecho. Los reportes filtran directamente ese snapshot. Check-in valida vigencia real, hay una sola entrada abierta y “presentes hoy” excluye entradas antiguas.

## 10. Autenticación staff

Refresh tokens se almacenan hasheados, rotan transaccionalmente y se revocan en logout. Access tokens duran 15 minutos e incluyen `iss`, `aud`, `jti` y tipo.

## 11. Autenticación cliente

Las sesiones cliente usan una tabla separada de refresh persistido, con rotación/revocación equivalente. El middleware comprueba cliente y gimnasio activos en cada request.

## 12. Recuperación de contraseña

Solicitud anti-enumeración, token aleatorio hasheado de un solo uso, expiración a 60 minutos, política unificada de 12 caracteres y revocación de sesiones tras cambiar la contraseña.

## 13. Riesgo de almacenamiento de tokens

La exposición se redujo con access corto, refresh rotado, revocación, CSP y validación continua. Sin embargo, el frontend aún persiste Bearer tokens en `localStorage`; migrar a cookies `HttpOnly`, `Secure`, `SameSite` y defensa CSRF requiere un cambio coordinado de contrato. Se mantiene como riesgo P1 abierto y bloquea un “production-ready” pleno.

## 14. Notificaciones

`event_key` único hace idempotentes las alertas. Todo evento tiene destinatario válido y listado/conteo de entrenador usan las mismas reglas. Las transferencias notifican origen y destino.

## 15. Correo

Los métodos ficticios se sustituyeron por un outbox persistente con estado, hasta 3 intentos, error observable y reenvío administrativo. La recuperación y activación usan el mismo transporte.

## 16. Migraciones Prisma

Las migraciones originales se archivaron en `migrations-legacy`. La ruta activa tiene baseline + 7 cambios incrementales. En PostgreSQL 17 vacío pasan `migrate deploy`, `validate` y `migrate diff --exit-code` sin diferencias.

## 17. Drift y producción

Supabase y la reconstrucción limpia coinciden exactamente: 169 columnas (`8fec360f…`), 86 índices (`584716bc…`) y 60 constraints (`74e4ac75…`). `_prisma_migrations` se reconcilió con checksums locales y rollback explícito.

## 18. Integridad adicional

Se añadieron constraints para entrada abierta, snapshot tenant no nulo, destinatarios de notificación y clave de evento. BigInt se serializa como número solo dentro del rango seguro y como string fuera.

## 19. Seguridad HTTP

CSP usa `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` y `frame-ancestors 'none'`. Rate limiting cubre ambos logins, refresh, recuperación, reset, setup y registro.

## 20. Exportaciones

CSV neutraliza celdas iniciadas por `=`, `+`, `-`, `@`, tab o CR antes de escapar comillas. El flujo XLSX fue probado con la dependencia `uuid` corregida.

## 21. Manejo de errores

Conflictos Prisma `P2002` responden 409 y las actualizaciones de correo hacen precheck. Errores 500 en producción no exponen stack ni detalles internos; `/auth/health` retorna únicamente estado mínimo.

## 22. Observabilidad

Cada request recibe o genera `x-request-id`. Los logs JSON incluyen método, ruta sin query, estado y duración; no incluyen headers, tokens ni cuerpos. Errores comparten el ID de correlación.

## 23. Dependencias

Se aplicaron actualizaciones compatibles y un override seguro de `uuid` para ExcelJS. `npm audit --audit-level=moderate` termina con 0 vulnerabilidades en backend y frontend.

## 24. Pruebas backend

38/38 pruebas en 13 archivos al cierre: unitarias y 15 integraciones con PostgreSQL real. Cobertura crítica: 43.15% statements, 30.89% branches, 36.79% functions y 45.04% lines. Auth supera 89% statements y 85% branches.

## 25. Pruebas frontend

14/14 pruebas para JWT, cliente HTTP, ruta protegida y store de sesión. Cobertura: 80.16% statements, 61.53% branches, 85.71% functions y 82.24% lines.

## 26. E2E

Playwright exige `E2E_DATABASE_URL`, acepta solo PostgreSQL local/aislado con nombre que contenga `e2e` y bloquea baseURL remota. Hay seed dedicado con la misma guarda. La suite histórica completa no se usó como evidencia final porque aún requiere estabilización funcional.

## 27. PR #34

Se revisó sin merge masivo. Sus mocks dependen de APIs anteriores y omiten transacciones vigentes. Se conservaron los escenarios útiles —anti-enumeración, refresh, autorización asimétrica y matriz tenant— reimplementados contra PostgreSQL real.

## 28. CI/CD

CI ejecuta audits, migración desde cero, drift, build, unit/integration/coverage backend, lint/test/coverage/build frontend y smoke del bundle. CodeQL analiza JavaScript/TypeScript. Actions y Vercel CLI están fijados a SHA/versión. Los tres jobs requeridos pasaron en el PR #35.

## 29. GitHub

`main` y `develop` requieren PR, una aprobación, rama actualizada, conversaciones resueltas, historial lineal y checks Backend/Frontend/CodeQL; aplica a administradores. Force-push y borrado están deshabilitados.

## 30. Docker

Backend y frontend de producción construyen correctamente. El backend incluye CLI/config Prisma y ejecuta `migrate deploy` antes de arrancar; seed es opt-in. El frontend recibe `VITE_API_URL` como ARG/ENV y verifica el bundle. Smoke: migraciones sin pendientes, DB conectada y health 200.

## 31. Vercel

Proyectos activos `frontend` y `fitmanager-backend` alineados a Node 22; variables de producción requeridas existen sin exponer valores. El backend no registró errores agrupados en 7 días. El proyecto antiguo `backend` no tuvo logs en 7 días, pero conserva dominios y no se eliminó. Preview queda pendiente de BD/secretos aislados.

## 32. OpenAPI y documentación

El contrato 3.1 está en [docs/openapi.yaml](./docs/openapi.yaml) y pasa Redocly con configuración minimal. README, `.env.example`, memoria AGENTS y estado vivo se actualizaron para migraciones, pruebas, Docker y seguridad actuales.

## 33. Commits

- `021f8f0` backlog
- `10e4085` plano Supabase
- `3adb0ad` contexto tenant
- `0fd03c6` membresía única
- `6c9e9b5` transferencias/historia
- `a5fc9d6` sesiones/recuperación
- `40fe684` notificaciones/correo
- `83ed1cf` baseline/drift
- `b811147` pirámide de pruebas
- `da5e73e` borde HTTP/exportaciones
- `570fd93` CI/Docker/deploy

## 34. Estado final y siguientes pasos

Estado: **PR #35 con checks verdes; no listo aún para promoción directa a producción**.

Orden recomendado:

1. Obtener la aprobación requerida del PR #35; no omitir la protección de rama.
2. Diseñar y probar la migración completa a refresh cookie HttpOnly + access en memoria + CSRF.
3. Aprovisionar PostgreSQL y secretos exclusivos de preview; nunca reutilizar producción.
4. Estabilizar y ejecutar el subconjunto E2E crítico en el entorno aislado.
5. Elevar gradualmente cobertura backend, especialmente rutinas, transferencias y notificaciones.
6. Investigar consumidores/dominios del Vercel `backend` legado antes de archivarlo.
7. Promover primero a staging/preview, ejecutar smoke y conservar el deployment anterior como rollback.

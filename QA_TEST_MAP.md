# FitManager — Mapa local de pruebas QA

> Artefacto local de auditoría. No está destinado a commit, despliegue ni producción.

## Baseline

| Capa | Verificación |
|---|---|
| Git | estado, rama y SHA inicial |
| Backend | build, unitarias, integración PostgreSQL |
| Frontend | build, lint, unitarias, verificación de bundle |
| Prisma | validate, generate, migraciones desde cero |
| E2E | Playwright Chromium sobre frontend/backend/DB QA |

## Cobertura funcional

| Área | Happy path | Negativos | RBAC | Cross-tenant | Concurrencia | DB |
|---|---:|---:|---:|---:|---:|---:|
| Registro/login/sesiones | Sí | Sí | Sí | N/A | refresh | Sí |
| Usuarios | Sí | Sí | Sí | Sí | doble alta | Sí |
| Clientes/activación | Sí | Sí | Sí | Sí | doble alta | Sí |
| Membresías | Sí | Sí | Sí | Sí | asignación/renovación | Sí |
| Pagos | Sí | Sí | Sí | Sí | doble pago | Sí |
| Asistencias | Sí | Sí | Sí | Sí | doble entrada/salida | Sí |
| Ejercicios | Sí | Sí | Sí | Sí | N/A | Sí |
| Rutinas | Sí | Sí | Sí | Sí | doble asignación | Sí |
| Portal cliente | Sí | Sí | Sí | Sí | sesión | Sí |
| Notificaciones | Sí | Sí | Sí | Sí | deduplicación | Sí |
| Transferencias | Sí | Sí | Sí | Sí | doble decisión | Sí |
| Reportes | Sí | fechas inválidas | Sí | Sí | carga | Sí |

## Actores mínimos

- `ADMIN_A`, `RECEPCION_A1/A2`, `TRAINER_A1/A2`, `CLIENT_A1..A12`.
- `ADMIN_B`, `RECEPCION_B1/B2`, `TRAINER_B1/B2`, `CLIENT_B1..B12`.

## Evidencia

- Resultados Playwright: `frontend/playwright-report/` y `frontend/test-results/`.
- Capturas exploratorias: `screenshots/qa/`.
- Estado DB: consultas de invariantes sobre `fitmanager_qa_e2e_20260809`.
- Informes finales: `QA_INTEGRAL_FITMANAGER.md`, `BUGS_FITMANAGER.md`, matrices QA y performance.

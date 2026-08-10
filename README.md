# FitManager SaaS

Plataforma multi-tenant para administrar gimnasios, personal, clientes, membresías, pagos, asistencias, rutinas, transferencias, notificaciones y reportes.

## Arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS 4 |
| Backend | Node.js 22, Express 5, TypeScript |
| Datos | PostgreSQL 17, Prisma 7 con `@prisma/adapter-pg` |
| Seguridad | JWT access en memoria, refresh HttpOnly rotatorio, CSRF, bcrypt, RBAC y aislamiento por gimnasio |
| Pruebas | Vitest, PostgreSQL real y Playwright aislado |

El backend usa capas `controllers → services → repositories`. El middleware resuelve en cada request un contexto autenticado con actor, rol y gimnasio activo; los recursos sensibles se consultan siempre por identificador y tenant.

## Inicio local con Docker

Requisitos: Docker Desktop, Docker Compose y Git.

```bash
git clone <repo>
cd Fitmanager-SaaS
cp .env.example .env
docker compose up -d --build
```

Servicios:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/health`
- pgAdmin: `http://localhost:5050`

Docker aplica `prisma migrate deploy`. Los seeds nunca se ejecutan automáticamente salvo que se defina explícitamente `SEED_ON_STARTUP=true`; no debe activarse en producción.

## Desarrollo sin Docker

```bash
cd backend
npm ci
npm run prisma:generate
npm run dev
```

```bash
cd frontend
npm ci
npm run dev
```

Usa Node.js 22 en local, CI, Docker y Vercel.

## Variables de entorno

La referencia sanitizada está en [.env.example](./.env.example). No confirmes `.env`, `.env.local`, tokens ni credenciales.

| Variable | Ámbito | Obligatoria | Descripción |
|---|---|---:|---|
| `DATABASE_URL` | Backend | Sí | PostgreSQL directo; preview requiere una BD aislada propia |
| `JWT_SECRET` | Backend | Sí | Firma access tokens; mínimo 32 caracteres |
| `JWT_REFRESH_SECRET` | Backend | Sí | Firma refresh tokens; distinto del anterior |
| `FRONTEND_URL` | Backend | Sí | Origen CORS exacto y URL de enlaces de acceso/recuperación |
| `COOKIE_SECURE` | Backend | Producción/preview | `true` para transportar cookies solo por HTTPS |
| `COOKIE_SAME_SITE` | Backend | Producción/preview | `none` si frontend y API son cross-site; `lax` en local |
| `PREVIEW_ORIGIN_SUFFIX` | Backend preview | Preview | Limita CORS a previews del equipo, por ejemplo `-mi-equipo.vercel.app` |
| `VITE_API_URL` | Frontend build | Sí | URL pública terminada en `/api`; se inyecta al compilar |
| `SMTP_*` | Backend/email | Según proveedor | Transporte SMTP; valores sensibles solo en el gestor del entorno |
| `EMAIL_DELIVERY_ENABLED` | Backend/email | No | Debe ser `false` en Preview para impedir entregas externas |
| `E2E_DATABASE_URL` | Pruebas | Solo E2E | Debe ser local/aislada y su nombre contener `e2e` |
| `TEST_DATABASE_URL` | Pruebas | Integración | PostgreSQL local aislado |
| `SEED_ON_STARTUP` | Docker local | No | `false` por defecto; nunca habilitar en producción |

Producción y preview deben tener variables separadas. No se permite que previews o E2E usen la base de producción.

## Migraciones

```bash
cd backend
npm run test:migrations     # base vacía: deploy + validate + diff
npx prisma migrate deploy   # staging/producción
npx prisma validate
```

`prisma db push` no forma parte del arranque ni del despliegue. Las migraciones antiguas se conservan en `backend/prisma/migrations-legacy`; la ruta activa contiene un baseline reproducible y migraciones incrementales.

## Pruebas y quality gates

```bash
cd backend
npm test
npm run test:integration    # requiere TEST_DATABASE_URL
npm run test:coverage       # requiere TEST_DATABASE_URL
npm audit --audit-level=moderate
```

```bash
cd frontend
npm run lint
npm run test:coverage
VITE_API_URL=https://api.example.com/api npm run build
npm run verify:bundle
npm audit --audit-level=moderate
```

Playwright requiere `E2E_DATABASE_URL`; su configuración bloquea hosts no locales y bases cuyo nombre no incluya `e2e`. El seed dedicado se ejecuta con `npm run seed:e2e` desde `backend`.

CI exige build, tests, integración PostgreSQL, cobertura, auditoría de dependencias, migración desde cero, smoke del bundle y CodeQL. `main` y `develop` requieren PR, aprobación y checks verdes.

## Producción

```bash
VITE_API_URL=https://api.example.com/api \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

El backend migra antes de iniciar; el frontend falla el build si falta `VITE_API_URL` y verifica que el bundle no contenga endpoints locales de la aplicación. El deploy Vercel se ejecuta solo después de CI verde.

## Contrato y operación

- OpenAPI: [docs/openapi.yaml](./docs/openapi.yaml)
- Estado de remediación: [docs/REMEDIATION_STATUS.md](./docs/REMEDIATION_STATUS.md)
- Informe integral: [REMEDIACION_FITMANAGER.md](./REMEDIACION_FITMANAGER.md)

La API serializa IDs como número mientras estén dentro del rango seguro de JavaScript y como string fuera de él. Los consumidores deben aceptar ambos formatos.

## Seguridad operacional

- No ejecutar seeds, resets, `db push` ni E2E contra producción.
- No compartir refresh tokens ni secretos en logs.
- Rotar secretos si se sospecha exposición y revocar sesiones afectadas.
- Aplicar primero migraciones compatibles, verificar health y conservar un deployment previo como rollback.
- El proyecto Vercel antiguo `backend` no debe eliminarse hasta verificar dominios, tráfico histórico, variables exclusivas e integraciones externas.

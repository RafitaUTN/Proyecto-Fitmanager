# FitManager SaaS

FitManager es una plataforma SaaS multi-tenant para la administración de gimnasios. Permite gestionar personal, clientes, membresías, pagos completos y parciales, asistencias, rutinas, transferencias entre gimnasios, notificaciones y reportes administrativos.

## Sistema desplegado

| Servicio | URL |
|---|---|
| Frontend producción | https://fitmanager-saas.vercel.app |
| API producción | https://fitmanager-backend-nine.vercel.app/api |
| Health check API | https://fitmanager-backend-nine.vercel.app/api/health |

## Stack tecnológico

| Capa | Tecnología y versión |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS 4 |
| Backend | Node.js 22, Express 5, TypeScript |
| ORM | Prisma 7 con `@prisma/adapter-pg` |
| Base de datos | PostgreSQL 17 |
| Seguridad | JWT, refresh token HttpOnly, CSRF, bcrypt, RBAC y aislamiento multi-tenant por gimnasio |
| Estado/datos frontend | TanStack Query, Zustand, React Hook Form, Zod |
| UI | Tailwind CSS, Lucide React, Framer Motion |
| Pruebas | Vitest, Playwright, pruebas de integración con PostgreSQL real |
| CI/CD | GitHub Actions, CodeQL, Vercel |

## Arquitectura del sistema

El backend está organizado por capas:

```text
backend/src
  controllers/   Request/response HTTP
  services/      Reglas de negocio
  repositories/  Acceso a datos con Prisma
  dtos/          Validaciones Zod
  routes/        Definición de endpoints
  middlewares/   Autenticación, roles y CSRF
```

El frontend separa páginas, componentes reutilizables, hooks de datos y utilidades:

```text
frontend/src
  pages/       Vistas principales
  components/  Componentes UI
  hooks/       Consultas y mutaciones HTTP
  store/       Estado global de sesión
  lib/         Cliente HTTP, eventos, utilidades y seguridad
```

## Ejecución local con Docker

Requisitos:

- Docker Desktop
- Docker Compose
- Git

Pasos:

```bash
git clone https://github.com/RafitaUTN/Proyecto-Fitmanager.git
cd Proyecto-Fitmanager
cp .env.example .env
docker compose up -d --build
```

Servicios locales:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Health API | http://localhost:3000/api/health |
| pgAdmin | http://localhost:5050 |

Credenciales pgAdmin local:

| Usuario | Contraseña |
|---|---|
| `admin@fitmanager.com` | `admin123` |

## Ejecución local sin Docker

Backend:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:seed
npm run dev
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Variables de entorno

La referencia sanitizada está en [.env.example](./.env.example). No se deben subir archivos `.env`, tokens, cadenas de conexión reales ni credenciales privadas.

| Variable | Ámbito | Descripción |
|---|---|---|
| `DATABASE_URL` | Backend | Conexión PostgreSQL usada por Prisma |
| `JWT_SECRET` | Backend | Firma de access tokens; mínimo 32 caracteres |
| `JWT_REFRESH_SECRET` | Backend | Firma de refresh tokens; debe ser distinto al access secret |
| `FRONTEND_URL` | Backend | Origen permitido para CORS y enlaces de correo |
| `COOKIE_SECURE` | Backend | `true` en producción para cookies HTTPS |
| `COOKIE_SAME_SITE` | Backend | Política SameSite de cookies |
| `VITE_API_URL` | Frontend | URL pública de la API terminada en `/api` |
| `SMTP_*` | Backend | Configuración opcional para envío de correos |
| `SEED_ON_STARTUP` | Docker | Ejecuta seed al arrancar solo si se define explícitamente |

## Migraciones y seed de base de datos

Aplicar migraciones versionadas:

```bash
cd backend
npx prisma migrate deploy
```

Validar migraciones desde una base limpia:

```bash
cd backend
npm run test:migrations
```

Ejecutar datos de prueba locales:

```bash
cd backend
npm run prisma:seed
```

En producción no se usa `prisma db push`; solo se aplican migraciones versionadas con `prisma migrate deploy`.

## Credenciales de prueba

Estas credenciales corresponden al seed local/demostración:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@fitmanager.com` | `123456` |
| Entrenador | `svargas@fitmanager.com` | `123456` |
| Entrenador | `dmora@fitmanager.com` | `123456` |

En el entorno E2E también existen:

| Rol | Correo | Contraseña |
|---|---|---|
| Entrenador E2E | `entre@fitmanager.com` | `123456` |
| Recepcionista E2E | `re@fitmanager.com` | `123456` |

## Pruebas y calidad

Backend:

```bash
cd backend
npm run build
npm test
npm run test:integration
npm run test:migrations
npm audit --audit-level=moderate
```

Frontend:

```bash
cd frontend
npm run lint
npm test
VITE_API_URL=https://fitmanager-backend-nine.vercel.app/api npm run build
npm run verify:bundle
npm audit --audit-level=moderate
```

Playwright requiere una base aislada mediante `E2E_DATABASE_URL`; nunca debe ejecutarse contra producción.

## Seguridad operacional

- No subir secretos ni archivos `.env`.
- No ejecutar seeds, resets, `db push` ni pruebas E2E contra producción.
- Mantener `main` estable con PRs y checks verdes.
- Usar bases separadas para local, E2E, preview y producción.
- Verificar `/api/health` después de migraciones o despliegues.

# FitManager SaaS

Plataforma SaaS para administración de gimnasios. Gestión de clientes, membresías, pagos, transferencias entre sucursales y centro de notificaciones.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, TypeScript 6, TailwindCSS 4, Shadcn |
| Backend | Node 22, Express 5, TypeScript |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| BD | PostgreSQL 17 |
| Auth | JWT + bcrypt + refresh tokens |

## Requisitos

- Docker Desktop
- Docker Compose
- Git
- Node.js 22 (para desarrollo fuera de Docker)

## Instalación Rápida (Docker)

```bash
git clone <repo>
cd Fitmanager-SaaS

# Crear archivos de entorno
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Levantar todo
docker compose up -d --build
```

## Accesos

| Servicio | URL | Credenciales |
|----------|-----|-------------|
| Frontend | http://localhost:5173 | — |
| Backend API | http://localhost:3000 | — |
| PgAdmin | http://localhost:5050 | admin@fitmanager.com / admin123 |

## Usuarios de Prueba

Consulta [SEED_USERS.md](./SEED_USERS.md) para ver todos los usuarios disponibles.

Credencial principal del seed de auditoría:
- **Correo:** `admin@powerfit.com`
- **Contraseña:** `123456`

## Variables de Entorno

El proyecto usa un archivo `.env` raíz como única fuente de verdad para Docker Compose.

| Variable | Descripción | Ejemplo |
|----------|------------|---------|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://fitmanager:fitmanager_secret@postgres:5432/fitmanager` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `dev_jwt_secret_key_2026` |
| `JWT_REFRESH_SECRET` | Secreto para refrescar tokens | `dev_refresh_secret_key_2026` |
| `VITE_API_URL` | URL de la API para el frontend | `http://localhost:3000/api` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `fitmanager` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `fitmanager_secret` |
| `POSTGRES_DB` | Nombre de la base de datos | `fitmanager` |

## Comandos Útiles

### Docker (desde la raíz)

```bash
npm run docker:up              # Iniciar o reconstruir servicios
npm run docker:down            # Detener servicios
npm run docker:restart         # Reiniciar servicios
npm run docker:logs            # Ver logs de todos los servicios
npm run docker:logs:backend    # Logs solo del backend
npm run docker:logs:frontend   # Logs solo del frontend
npm run docker:ps              # Estado de contenedores
npm run docker:reset           # Reset total (borra datos y arranca de nuevo)
npm run health                 # Health check del backend
npm run health:auth            # Health check de autenticación
```

### Backend (`cd backend`)

```bash
npm run dev                    # Iniciar en modo desarrollo
npm run dev:clean              # Resetear BD, ejecutar seed y limpiar sesiones
npm run auth:reset             # Cerrar todas las sesiones (elimina refresh tokens)
npm run health                 # Health check del backend
npm run health:auth            # Health check de autenticación
npm run seed:users             # Ejecutar seed de usuarios
npm run build                  # Compilar TypeScript
npm run start                  # Iniciar en producción
```

### Prisma

```bash
cd backend
npx prisma db push             # Sincronizar schema con BD
npx prisma generate            # Generar cliente Prisma
npx prisma db seed             # Sembrar datos de prueba
npx prisma validate            # Validar schema
npx tsx prisma/reset-auth.ts   # Limpiar todas las sesiones
```

## Solución de Problemas

### Error de autenticación después de reiniciar Docker

1. El frontend detecta automáticamente tokens expirados y limpia la sesión.
2. Si persiste, abre las DevTools del navegador → Application → Local Storage y elimina `token`, `refreshToken`, `usuario`.
3. Inicia sesión nuevamente con las credenciales de [SEED_USERS.md](./SEED_USERS.md).

### "Variable de entorno requerida" al iniciar el backend

Asegúrate de que `backend/.env` exista con:

```
DATABASE_URL=postgresql://fitmanager:fitmanager_secret@localhost:5432/fitmanager
JWT_SECRET=dev_jwt_secret_key_2026
JWT_REFRESH_SECRET=dev_refresh_secret_key_2026
```

Si usas Docker, asegúrate de que `.env` (en la raíz) contenga las mismas variables.

### "Credenciales inválidas" con credenciales correctas

Puede ser que el seed haya cambiado. Consulta [SEED_USERS.md](./SEED_USERS.md) para ver los usuarios activos. Si migraste del seed original al de auditoría, las credenciales `admin@fitmanager.com` ya no existen.

### Puerto 3000 o 5173 en uso

Detén los servicios que estén usando esos puertos o cambia las variables `PORT` y `VITE_API_URL` en los archivos `.env`.

## Migraciones y Seeds

```bash
# Aplicar schema a BD limpia
cd backend
npx prisma db push

# Sembrar datos
npx prisma db seed

# Resetear autenticación (sin perder datos)
npx tsx prisma/reset-auth.ts
```

## Estructura del Proyecto

```
backend/
  src/
    config/      — Variables de entorno y configuración
    controllers/ — Manejadores de rutas Express
    services/    — Lógica de negocio
    repositories/ — Acceso a base de datos (Prisma)
    routes/      — Definición de rutas
    middlewares/  — Autenticación y autorización
    dtos/        — Schemas de validación Zod
    lib/         — Utilidades (Prisma, JWT, errores)
  prisma/
    schema.prisma — Modelo de datos
    seed.ts       — Seed original
    reset-auth.ts — Script para limpiar sesiones

frontend/
  src/
    pages/       — Componentes de página
    components/  — Componentes reutilizables
    store/       — Estados globales (Zustand)
    lib/         — Utilidades (API, JWT)
    hooks/       — Custom hooks (TanStack Query)
```

## Roadmap

### Pendiente — Sprint 3
- HU-10: Consulta historial pagos
- HU-11: Registro/validación asistencia
- HU-12: Historial asistencia
- HU-13: Gestión rutinas

### Pendiente — Sprint 4
- HU-14: Portal cliente
- HU-15: Reportes administrativos
- HU-16: Exportación reportes
- HU-17: Dashboard indicadores
- HU-18: Separación datos multi-tenant

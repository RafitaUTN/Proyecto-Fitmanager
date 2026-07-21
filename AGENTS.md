# FitManager — Memoria del Proyecto

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript 6 + TailwindCSS v4 + Shadcn |
| Backend | Node 22 + Express + TypeScript |
| ORM | Prisma v7 (driver `@prisma/adapter-pg`) |
| BD | PostgreSQL 17 |
| Auth | JWT + bcrypt |
| Frontend libs | React Router, TanStack Query, Zustand, React Hook Form, Zod |

## Arquitectura

Backend en capas con separación multi-tenant (cada gimnasio ve solo sus datos):

```
src/
  controllers/   - Manejan request/response
  services/      - Lógica de negocio
  repositories/  - Acceso a BD vía Prisma
  routes/        - Definición de rutas Express
  dtos/          - Schemas Zod de validación
  middlewares/   - Auth middleware (JWT)
  lib/           - Prisma client, JWT utils, env
  config/        - Configuración de entorno
  types/         - Declaraciones de tipos globales
```

Base de datos: `prisma/schema.prisma` con 12 modelos.
Seed: `prisma/seed.ts` — datos de prueba (gimnasio, admin, clientes, membresías, ejercicios).

## Estado Actual

### Sprint 1 — Completo ✅

| HU | Descripción | Archivos clave |
|----|-------------|----------------|
| HU-01 | Registro de gimnasio + admin | `gimnasio.controller.ts`, `gimnasio.service.ts`, `RegistroGimnasio.tsx` |
| HU-02 | Login JWT + refresh token | `auth.controller.ts`, `auth.service.ts`, `Login.tsx`, `auth.store.ts` |
| HU-03 | CRUD usuarios + roles | `usuario.controller.ts`, `Usuarios.tsx` |
| HU-04 | CRUD clientes | `cliente.controller.ts`, `Clientes.tsx` |

### Sprint 2 — Completo ✅

| HU | Descripción | Archivos clave |
|----|-------------|----------------|
| HU-05 | CRUD planes membresía | `membresia.controller.ts`, `Membresias.tsx` |
| HU-06 | Asignar/renovar/cancelar membresías | `cliente-membresia.controller.ts`, `AsignarMembresia.tsx` |
| HU-07 | Consultar estado membresía | `EstadoMembresia.tsx`, endpoint `/:id/estado` |
| HU-08 | Alertas de vencimiento | `notificacion.controller.ts`, `Alertas.tsx` |
| HU-09 | Pagos manuales | `pago.controller.ts`, `Pagos.tsx` |

### Sprint 3 — Pendiente
- HU-10: Consulta historial pagos
- HU-11: Registro/validación asistencia
- HU-12: Historial asistencia
- HU-13: Gestión rutinas

### Sprint 4 — Pendiente
- HU-14: Portal cliente
- HU-15: Reportes administrativos
- HU-16: Exportación reportes
- HU-17: Dashboard indicadores
- HU-18: Separación datos multi-tenant

## Decisiones Técnicas

- **BigInt**: Se agregó `toJSON()` global en `src/types/bigint.d.ts` para serialización correcta en JSON.
- **Seed idempotente**: `prisma/seed.ts` verifica si ya hay datos antes de insertar.
- **Docker compose**: Usa `prisma db push` en vez de `migrate dev` para evitar conflictos de migraciones. Directorio `prisma/` montado como volumen para persistir migraciones.
- **Auto-login**: El endpoint `POST /api/gimnasios` retorna token JWT para login automático post-registro.
- **Roles**: `Administrador`, `Recepcionista`, `Entrenador` — validados por Zod y comparados en middleware.

## Endpoints Activos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/gimnasios` | No | Registrar gimnasio (retorna token) |
| POST | `/api/auth/login` | No | Iniciar sesión |
| POST | `/api/auth/logout` | Sí | Cerrar sesión |
| GET | `/api/usuarios` | Sí | Listar usuarios del gimnasio |
| POST | `/api/usuarios` | Sí | Crear usuario |
| PUT | `/api/usuarios/:id` | Sí | Actualizar usuario |
| GET | `/api/clientes` | Sí | Listar clientes (filtro por `?cedula=`) |
| POST | `/api/clientes` | Sí | Crear cliente |
| PUT | `/api/clientes/:id` | Sí | Actualizar cliente |
| GET | `/api/membresias` | Sí | Listar planes |
| POST | `/api/membresias` | Sí | Crear plan |
| PUT | `/api/membresias/:id` | Sí | Actualizar plan |
| GET | `/api/clientes-membresias` | Sí | Listar asignaciones (`?id_cliente=`) |
| POST | `/api/clientes-membresias` | Sí | Asignar membresía |
| POST | `/api/clientes-membresias/:id/renovar` | Sí | Renovar |
| POST | `/api/clientes-membresias/:id/cancelar` | Sí | Cancelar |
| GET | `/api/clientes-membresias/:id/estado` | Sí | Consultar estado |
| GET | `/api/notificaciones` | Sí | Listar notificaciones |
| GET | `/api/notificaciones/contar` | Sí | Contar no leídas |
| POST | `/api/notificaciones/generar` | Sí | Generar alertas |
| PUT | `/api/notificaciones/:id/leer` | Sí | Marcar como leída |
| GET | `/api/pagos` | Sí | Listar pagos |
| POST | `/api/pagos` | Sí | Registrar pago |

## Datos de Prueba

- Admin: `admin@fitmanager.com` / `123456`
- Entrenadores: `svargas@fitmanager.com`, `dmora@fitmanager.com` / `123456`
- Clientes seed: Juan Pérez, María González, Luis Solís
- Planes seed: Básica (₡15/30d), Premium (₡35/30d), Trimestral (₡90/90d)

## Docker

```bash
docker compose up -d --build
```

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Frontend | http://localhost:5173 | — |
| Backend | http://localhost:3000 | — |
| PostgreSQL | localhost:5432 | fitmanager / fitmanager_secret |
| pgAdmin | http://localhost:5050 | admin@fitmanager.com / admin123 |

## Git Workflow

- `main` → `develop` → `feature/HU-XX-descripcion`
- Commits en español con Conventional Commits
- PR a develop con squash merge
- Branch eliminada post-merge

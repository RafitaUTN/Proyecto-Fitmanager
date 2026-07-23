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

## Instalación

```bash
git clone <repo>
cd Proyecto-Fitmanager

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up -d --build
```

## Verificar contenedores

```bash
docker compose ps
```

## Accesos

| Servicio | URL | Credenciales |
|----------|-----|-------------|
| Frontend | http://localhost:5173 | — |
| Backend API | http://localhost:3000 | — |
| PgAdmin | http://localhost:5050 | admin@fitmanager.com / admin123 |

## Comandos útiles

```bash
docker compose up -d          # Iniciar servicios
docker compose down           # Detener servicios
docker compose logs -f        # Ver logs en tiempo real
docker compose restart        # Reiniciar servicios
docker compose exec backend sh   # Shell del backend
docker compose exec frontend sh  # Shell del frontend
```

## Compilación

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build

# TypeScript
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

## Migraciones Prisma

```bash
# Aplicar migraciones
cd backend
npx prisma db push

# Generar cliente Prisma
npx prisma generate

# Sembrar datos de prueba
npx prisma db seed

# Validar schema
npx prisma validate
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

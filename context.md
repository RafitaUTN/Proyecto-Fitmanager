# FitManager - Contexto del Proyecto

Estamos desarrollando FitManager, un sistema SaaS (Software as a Service) para la administración de gimnasios pequeños y medianos.
El proyecto pertenece a un curso universitario (Proyecto Integrador III) y tiene una duración de aproximadamente cuatro meses.
El objetivo es construir un MVP completamente funcional utilizando metodologías ágiles (Scrum).
El proyecto debe mantenerse con buenas prácticas de arquitectura, seguridad, documentación y control de versiones.

## Prototipo Figma
URL de un prototipo que tenemos en figma https://www.figma.com/make/nINORECcwiR3P6YllTIY3I/FitManager-Web-Prototype?t=ab0n0AhkWhFIzesk-1

**Credenciales:** 
- Email: rafadiazlopez666@gmail.com 
- Contraseña: maniako4.20

**Nota:** No necesariamente tiene que tener lo mismo. En la carpeta del proyecto un directorio llamado database en solo un prototipo de la BD no significa que sea igual es solo un prototipo, tu estas en libertad de modificar esos parametros.

---

## Objetivo del MVP

El MVP debe permitir:
- Autenticación 
- Administración de gimnasios 
- Administración de usuarios 
- Clientes 
- Membresías 
- Pagos 
- Asistencia 
- Rutinas 
- Reportes básicos 

Todo bajo arquitectura multiempresa (multi-tenant).
Cada gimnasio solamente podrá visualizar su propia información.

---

## Stack Tecnológico

### Frontend
- React 
- Vite 
- TypeScript 
- TailwindCSS 
- Shadcn/UI 
- React Router 
- React Hook Form 
- Zod 
- TanStack Query 
- Zustand 

### Backend
- Node.js 22 LTS 
- Express 
- TypeScript 
- Prisma ORM 

### Base de datos
- PostgreSQL 17 

### Autenticación
- JWT 
- Refresh Tokens 
- bcrypt 

### Documentación
- Swagger/OpenAPI 

### DevOps
- Docker 
- Docker Compose 

### Repositorio
- Git 
- GitHub 

---

## Arquitectura

Deseo utilizar una arquitectura limpia.

### Separación en capas:
- Controllers 
- Services 
- Repositories 
- Middlewares 
- Validators 
- Routes 
- DTOs 
- Prisma 

No mezclar lógica de negocio dentro de controllers.

---

## Estándares

Siempre seguir:
- Clean Code 
- SOLID 
- DRY 
- KISS 
- REST API Best Practices 
- Conventional Commits 
- Git Flow simplificado 

---

## Seguridad

Aplicar desde el inicio:
- Helmet 
- Rate Limit 
- CORS 
- JWT 
- Refresh Tokens 
- bcrypt 
- Validaciones Zod 
- Sanitización 
- Variables de entorno 

Nunca dejar secretos hardcodeados.

---

## Docker

Durante el desarrollo todo funcionará mediante Docker Compose.

### Servicios:
- Frontend 
- Backend 
- Postgres 
- pgadmin (opcional) 

No utilizar servicios cloud todavía.
Todo debe funcionar localmente.

---

## Producción

Cuando el MVP esté terminado se desplegará:

### Frontend
- Vercel 

### Backend
- Render / Railway o correspondiente

### Base de datos
- Supabase PostgreSQL 

### Storage
- Supabase Storage 

---

## Trabajo con GitHub

Este proyecto será desarrollado por dos personas.
Siempre utilizar:
```
main
  ↓
develop
  ↓
feature/HU-XX-nombre
```

### Ejemplo
- feature/HU-01-login
- feature/HU-05-clientes

Nunca trabajar directamente sobre main.
Y NUNCA subir código completamente, si no poco a poco.

---

## Historias de Usuario

Cada Historia de Usuario debe generar:
- Una rama 
- Uno o varios commits 
- Un Pull Request 
- Revisión 
- Merge a develop 

---

## Commits

Usar Conventional Commits.

### Ejemplos
```
feat(auth): implement login
feat(client): create CRUD
fix(payment): validate amount
docs(swagger): update auth endpoints
refactor(users): improve service layer
test(auth): add login tests
```

*En español preferiblemente*

---

## Pull Request

Cada Pull Request debe incluir:

### Resumen
- Historia de Usuario
- Cambios realizados

### Checklist
- Código probado 
- Lint correcto 
- Build correcto 
- Documentación actualizada 

---

## Forma de trabajar

No quiero que generes cientos de archivos de una vez.
Trabajaremos incrementalmente.

Para cada Historia de Usuario quiero seguir este flujo:
1. Analizar la historia 
2. Diseñar la solución 
3. Explicar la arquitectura 
4. Generar únicamente los archivos necesarios 
5. Explicar los cambios 
6. Ejecutar pruebas 
7. Generar commits 
8. Actualizar documentación 
9. Generar Pull Request 

Nunca avanzar a la siguiente HU sin terminar completamente la actual.

---

## Explicaciones

Quiero que siempre expliques:
- Por qué haces cada cambio 
- Ventajas 
- Posibles mejoras 
- Riesgos 
- Impacto en el resto del proyecto 

No hagas cambios "mágicos".

---

## Si encuentras un problema

No inventes soluciones.

Primero:
- Analiza 
- Explica el problema 
- Propone varias alternativas 
- Recomienda la mejor 
- Espera aprobación si el cambio afecta la arquitectura 

---

## Calidad

Todo el código debe ser de calidad profesional.
Debe parecer un proyecto real para producción.
Evita duplicación de código.
Mantén nombres claros.
Documenta únicamente cuando aporte valor.

---

## Objetivo inmediato

Vamos a implementar únicamente las Historias de Usuario correspondientes a Sprint 1 y Sprint 2 definidas en el Product Backlog del proyecto.
No desarrolles funcionalidades fuera de esos sprints.
Mantén siempre la arquitectura preparada para el crecimiento del SaaS.

---

## Nota
Trabajaremos por fases

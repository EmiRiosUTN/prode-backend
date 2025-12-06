# MundialPro Backend

Sistema multi-tenant de prodes (predicción de resultados deportivos) para empresas.

## Stack Tecnológico

- **Backend:** NestJS + TypeScript
- **Base de Datos:** PostgreSQL 16 (Docker en VPS)
- **ORM:** Prisma
- **Autenticación:** JWT
- **Caché:** Redis
- **Containerización:** Docker

## Características

- ✅ Arquitectura multi-tenant
- ✅ Sistema de prodes configurable por empresa
- ✅ Rankings individuales y por áreas
- ✅ Predicciones de partidos con múltiples variables
- ✅ Sistema de puntuación flexible

## Setup Local
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de la BD compartida (consultar al equipo)

# Generar Prisma Client
npx prisma generate

# Iniciar servidor de desarrollo
npm run start:dev
```

## Base de Datos

**Base de datos compartida en VPS** - No es necesario ejecutar migraciones ni seed localmente.

### Ver datos
```bash
npx prisma studio
```

### Solo para administradores: Crear nueva migración
```bash
npx prisma migrate dev --name descripcion_del_cambio
```

## Estructura del Proyecto
```
backend/
├── prisma/
│   ├── schema.prisma       # Modelo de datos
│   ├── migrations/         # Migraciones SQL
│   └── seed.ts            # Datos iniciales (ya cargados en VPS)
├── src/
│   ├── modules/           # Módulos de negocio
│   ├── common/            # Utilidades compartidas
│   └── main.ts
└── .env                   # Variables de entorno (no commitear)
```

## Credenciales

Solicitar al equipo:
- DATABASE_URL (conexión a PostgreSQL en VPS)
- REDIS_HOST y REDIS_PASSWORD
- JWT_SECRET

## Licencia

Privado
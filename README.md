# MundialPro Backend

Sistema multi-tenant de prodes (predicción de resultados deportivos) para empresas.

## Stack Tecnológico

- **Backend:** NestJS + TypeScript
- **Base de Datos:** PostgreSQL 16
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
# Editar .env con tus credenciales de BD

# Ejecutar migraciones (crea las tablas)
npx prisma migrate dev

# Cargar datos iniciales (solo primera vez)
npm run prisma:seed

# Iniciar servidor de desarrollo
npm run start:dev
```

## Base de Datos

### Ver datos
```bash
npx prisma studio
```

### Crear nueva migración
```bash
npx prisma migrate dev --name descripcion_del_cambio
```

## Estructura del Proyecto
```
backend/
├── prisma/
│   ├── schema.prisma       # Modelo de datos
│   ├── migrations/         # Migraciones SQL
│   └── seed.ts            # Datos iniciales
├── src/
│   ├── modules/           # Módulos de negocio
│   ├── common/            # Utilidades compartidas
│   └── main.ts
└── .env                   # Variables de entorno (no commitear)
```

## Licencia

Privado
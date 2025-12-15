# Documentación Completa del Backend - MundialPro

## Índice
1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Base de Datos](#base-de-datos)
4. [Autenticación y Autorización](#autenticación-y-autorización)
5. [API Endpoints](#api-endpoints)
6. [Módulos Implementados](#módulos-implementados)
7. [Guía de Uso](#guía-de-uso)

---

## Visión General

MundialPro es un sistema multi-tenant de prodes (predicción de resultados deportivos) para empresas. El backend está construido con **NestJS + TypeScript + PostgreSQL + Prisma**.

### Estado Actual
✅ **Completado hasta Módulo 5** (62.5% del proyecto total)

### Stack Tecnológico
- **Framework**: NestJS 10.x
- **Lenguaje**: TypeScript 5.x
- **Base de Datos**: PostgreSQL 16
- **ORM**: Prisma 5.x
- **Autenticación**: JWT (JSON Web Tokens)
- **Caché**: Redis (para rankings)
- **Validación**: class-validator, class-transformer

---

## Arquitectura

### Multi-Tenancy
El sistema implementa **multi-tenancy a nivel de aplicación** mediante:
- **Tenant Middleware**: Extrae el `companyId` del subdominio o header
- **Tenant Decorator**: `@CurrentTenant()` inyecta el tenant en los controladores
- **Filtrado Automático**: Todas las queries filtran por `company_id`

### Estructura de Módulos

```
src/
├── modules/
│   ├── auth/              # Autenticación (login, register)
│   ├── admin-global/      # Gestión global (empresas, competiciones, partidos)
│   ├── company/           # Gestión de empresa (áreas, empleados, prodes)
│   ├── employee/          # Empleados (prodes, predicciones)
│   └── ranking/           # Rankings (pendiente)
├── common/
│   ├── decorators/        # @CurrentUser, @CurrentTenant, @Roles
│   ├── guards/            # JwtAuthGuard, RolesGuard
│   ├── filters/           # Exception filters
│   └── interceptors/      # Response interceptor
├── config/                # Configuración (database, jwt)
└── prisma/                # Prisma service
```

---

## Base de Datos

### Diagrama de Entidades

```
┌─────────────┐
│    User     │
├─────────────┤
│ id          │──┐
│ email       │  │
│ password    │  │
│ role        │  │
└─────────────┘  │
                 │
       ┌─────────┴──────────┐
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│  Employee   │      │   Company   │
├─────────────┤      ├─────────────┤
│ id          │      │ id          │
│ user_id     │──┐   │ name        │
│ company_id  │──┼──▶│ slug        │
│ area_id     │  │   │ admin_id    │
└─────────────┘  │   └─────────────┘
                 │          │
                 │          │
                 ▼          ▼
          ┌─────────────┐  ┌─────────────┐
          │CompanyArea  │  │    Prode    │
          ├─────────────┤  ├─────────────┤
          │ id          │  │ id          │
          │ company_id  │  │ company_id  │
          │ name        │  │ competition │
          └─────────────┘  │ mode        │
                           └─────────────┘
```

### Modelos Principales

#### User (Usuarios del Sistema)
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  role          UserRole // admin_global | empresa_admin | empleado
  is_active     Boolean  @default(true)
}

enum UserRole {
  admin_global   // Administrador del sistema
  empresa_admin  // Administrador de empresa
  empleado       // Empleado
}
```

#### Company (Empresas)
```prisma
model Company {
  id                      String
  name                    String
  slug                    String   @unique
  corporate_domain        String?  // ej: "acme.com"
  require_corporate_email Boolean  @default(false)
  logo_url                String?
  primary_color           String   @default("#1976d2")
  secondary_color         String   @default("#424242")
  is_active               Boolean  @default(true)
  admin_user_id           String
}
```

#### CompanyArea (Áreas de Empresa)
```prisma
model CompanyArea {
  id          String
  company_id  String
  name        String  // ej: "Sistemas", "Marketing"
  description String?
  is_active   Boolean @default(true)
}
```

#### Competition (Competiciones Deportivas)
```prisma
model Competition {
  id         String
  name       String  // ej: "Copa Mundial 2026"
  slug       String  @unique
  start_date DateTime
  end_date   DateTime
  sport_type String  @default("futbol")
  is_active  Boolean @default(true)
}
```

#### Match (Partidos)
```prisma
model Match {
  id             String
  competition_id String
  team_a_id      String
  team_b_id      String
  match_date     DateTime
  stage          String?  // ej: "Fase de Grupos"
  location       String?
  status         MatchStatus  // scheduled | in_progress | finished
}
```

#### Prode (Prodes de Empresa)
```prisma
model Prode {
  id                 String
  company_id         String
  competition_id     String
  name               String
  description        String?
  participation_mode ParticipationMode  // general | by_area | both
  is_active          Boolean @default(true)
}

enum ParticipationMode {
  general   // Todos los empleados compiten juntos
  by_area   // Solo empleados de la misma área
  both      // Ambos rankings disponibles
}
```

#### ProdeVariableConfig (Configuración de Puntos)
```prisma
model ProdeVariableConfig {
  id                     String
  prode_id               String
  prediction_variable_id String
  points                 Int  // Puntos que otorga esta variable
  is_active              Boolean
}
```

#### Prediction (Predicciones de Empleados)
```prisma
model Prediction {
  id                            String
  prode_participant_id          String
  match_id                      String
  predicted_goals_team_a        Int?
  predicted_goals_team_b        Int?
  predicted_yellow_cards_team_a Int?
  predicted_yellow_cards_team_b Int?
  predicted_red_cards_team_a    Int?
  predicted_red_cards_team_b    Int?
  locked_at                     DateTime?  // Se bloquea 1h antes del partido
}
```

---

## Autenticación y Autorización

### Flujo de Autenticación

1. **Login**: `POST /api/auth/login`
   - Valida email/password
   - Retorna JWT token + datos del usuario
   - Token expira en 7 días

2. **Register** (Solo Empleados): `POST /api/auth/register`
   - Requiere header `Host: {slug}.localhost:3000`
   - Valida dominio corporativo si está configurado
   - Crea User + Employee
   - Retorna JWT token

### Roles y Permisos

| Rol | Acceso |
|-----|--------|
| `admin_global` | Gestión de empresas, competiciones, partidos, resultados |
| `empresa_admin` | Configuración de empresa, áreas, empleados, prodes |
| `empleado` | Ver prodes, hacer predicciones, ver rankings |

### Guards Implementados

```typescript
// Proteger endpoint con autenticación
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) { ... }

// Proteger endpoint con rol específico
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_GLOBAL)
@Post('companies')
createCompany() { ... }

// Obtener tenant actual
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('config')
getConfig(@CurrentTenant() tenant: Company) { ... }
```

---

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### 1. Autenticación (`/auth`)

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@mundialpro.com",
  "password": "Admin123!MundialPro"
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "admin@mundialpro.com",
      "role": "admin_global",
      "employee": null
    }
  }
}
```

#### Registro de Empleado
```http
POST /api/auth/register
Host: acme.localhost:3000
Content-Type: application/json

{
  "email": "juan.perez@acme.com",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+54 9 11 1234-5678",
  "companyAreaId": "uuid-area"
}

Response 201:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "user": { ... }
  }
}
```

---

### 2. Admin Global (`/admin`)

**Requiere**: `Authorization: Bearer <token>` + Rol `admin_global`

#### Empresas

```http
# Listar empresas
GET /api/admin/companies

# Crear empresa
POST /api/admin/companies
{
  "name": "Acme Corporation",
  "slug": "acme",
  "corporateDomain": "acme.com",
  "requireCorporateEmail": true,
  "adminEmail": "admin@acme.com",
  "adminPassword": "Admin123!"
}

# Actualizar empresa
PUT /api/admin/companies/:id
{
  "name": "Acme Corp SA",
  "primaryColor": "#FF5722"
}

# Eliminar empresa
DELETE /api/admin/companies/:id
```

#### Competiciones

```http
# Listar competiciones
GET /api/admin/competitions

# Crear competición
POST /api/admin/competitions
{
  "name": "Copa Mundial 2026",
  "slug": "mundial-2026",
  "startDate": "2026-06-01T00:00:00.000Z",
  "endDate": "2026-07-15T23:59:59.000Z",
  "sportType": "futbol"
}

# Actualizar competición
PUT /api/admin/competitions/:id

# Eliminar competición
DELETE /api/admin/competitions/:id
```

#### Equipos

```http
# Listar equipos
GET /api/admin/teams

# Crear equipo
POST /api/admin/teams
{
  "name": "Argentina",
  "code": "ARG",
  "flagUrl": "https://flagcdn.com/w160/ar.png"
}
```

#### Partidos

```http
# Listar partidos
GET /api/admin/matches?competitionId=uuid

# Crear partido
POST /api/admin/matches
{
  "competitionId": "uuid",
  "teamAId": "uuid-argentina",
  "teamBId": "uuid-brasil",
  "matchDate": "2026-06-15T21:00:00.000Z",
  "stage": "Fase de Grupos",
  "location": "Buenos Aires"
}

# Actualizar partido
PUT /api/admin/matches/:id

# Cargar resultado
PUT /api/admin/matches/:id/result
{
  "goalsTeamA": 2,
  "goalsTeamB": 1,
  "yellowCardsTeamA": 3,
  "yellowCardsTeamB": 2,
  "redCardsTeamA": 0,
  "redCardsTeamB": 1
}

# Agregar goleador
POST /api/admin/matches/:id/scorers
{
  "playerFullName": "Lionel Messi",
  "teamId": "uuid-argentina",
  "goalsCount": 2
}
```

---

### 3. Company (`/company`)

**Requiere**: `Authorization: Bearer <token>` + Rol `empresa_admin`

#### Configuración

```http
# Obtener configuración
GET /api/company/config

# Actualizar configuración
PUT /api/company/config
{
  "logoUrl": "https://...",
  "primaryColor": "#2196F3",
  "secondaryColor": "#FF5722"
}
```

#### Áreas

```http
# Listar áreas
GET /api/company/areas

# Crear área
POST /api/company/areas
{
  "name": "Sistemas",
  "description": "Área de tecnología"
}

# Actualizar área
PUT /api/company/areas/:id

# Eliminar área (soft delete)
DELETE /api/company/areas/:id
```

#### Empleados

```http
# Listar empleados
GET /api/company/employees

# Ver detalle de empleado
GET /api/company/employees/:id

# Bloquear empleado
PUT /api/company/employees/:id/block

# Desbloquear empleado
PUT /api/company/employees/:id/unblock
```

#### Prodes

```http
# Listar prodes
GET /api/company/prodes

# Crear prode
POST /api/company/prodes
{
  "competitionId": "uuid",
  "name": "Prode Mundial 2026",
  "description": "Prode general de la empresa",
  "participationMode": "general",
  "variableConfigs": [
    {
      "predictionVariableId": "uuid-exact-result",
      "points": 3
    },
    {
      "predictionVariableId": "uuid-partial-result",
      "points": 1
    }
  ],
  "rankingConfig": {
    "showIndividualGeneral": true,
    "showIndividualByArea": false,
    "showAreaRanking": false
  }
}

# Actualizar prode
PUT /api/company/prodes/:id

# Eliminar prode
DELETE /api/company/prodes/:id
```

---

### 4. Employee (`/prodes`, `/predictions`)

**Requiere**: `Authorization: Bearer <token>` + Rol `empleado`

#### Prodes

```http
# Listar mis prodes (donde participo)
GET /api/prodes

# Listar prodes disponibles
GET /api/prodes/available

# Ver detalle de prode
GET /api/prodes/:id

# Unirse a prode
POST /api/prodes/:id/join
```

#### Predicciones

```http
# Listar partidos de un prode
GET /api/prodes/:id/matches

# Ver mis predicciones
GET /api/predictions/my?prodeId=uuid

# Crear/actualizar predicción
POST /api/predictions
{
  "prodeId": "uuid",
  "matchId": "uuid",
  "predictedGoalsTeamA": 2,
  "predictedGoalsTeamB": 1,
  "predictedYellowCardsTeamA": 3,
  "predictedYellowCardsTeamB": 2,
  "predictedRedCardsTeamA": 0,
  "predictedRedCardsTeamB": 0
}
```

---

### 5. Rankings (`/prodes/:id/rankings`)

**Requiere**: `Authorization: Bearer <token>` + Rol `empleado`

```http
# Ranking individual general
GET /api/prodes/:id/rankings/general

# Ranking de mi área
GET /api/prodes/:id/rankings/my-area

# Ranking entre áreas
GET /api/prodes/:id/rankings/areas
```

---

## Módulos Implementados

### ✅ Módulo 1: Configuración Base
- Prisma Service
- Config Module (database, JWT)
- Tenant Middleware
- Decoradores personalizados
- Guards (JWT, Roles, Tenant)
- Exception Filters
- Response Interceptor

### ✅ Módulo 2: Autenticación
- Login (admin_global, empresa_admin, empleado)
- Registro de empleados
- JWT Strategy
- Password hashing (bcrypt)
- Validación de dominio corporativo

### ✅ Módulo 3: Admin Global
- CRUD de Empresas
- CRUD de Competiciones
- CRUD de Equipos
- CRUD de Partidos
- Carga de Resultados
- Gestión de Goleadores

### ✅ Módulo 4: Company
- Configuración de empresa (branding)
- CRUD de Áreas
- Gestión de Empleados
- CRUD de Prodes con configuración

### ✅ Módulo 5: Employee
- Listar prodes disponibles
- Unirse a prodes
- Crear/actualizar predicciones
- Ver mis predicciones

### ⏳ Módulo 6: Rankings (Pendiente)
- Ranking individual general
- Ranking por área
- Ranking entre áreas
- Caché con Redis

---

## Guía de Uso

### Setup Local

```bash
# 1. Clonar repositorio
cd d:\Trabajo\Prode\prode-backend\prode-backend

# 2. Instalar dependencias
npm install

# 3. Configurar .env
DATABASE_URL="postgresql://user:password@host:5432/db"
JWT_SECRET="your-secret-key"
REDIS_HOST="localhost"
REDIS_PASSWORD=""

# 4. Generar Prisma Client
npx prisma generate

# 5. Iniciar servidor
npm run start:dev
```

### Testing con Postman

1. **Login como Admin Global**
```http
POST http://localhost:3000/api/auth/login
{
  "email": "admin@mundialpro.com",
  "password": "Admin123!MundialPro"
}
```

2. **Guardar el token** en variable de entorno `{{adminToken}}`

3. **Crear una empresa**
```http
POST http://localhost:3000/api/admin/companies
Authorization: Bearer {{adminToken}}
{
  "name": "Mi Empresa",
  "slug": "miempresa",
  "adminEmail": "admin@miempresa.com",
  "adminPassword": "Admin123!"
}
```

4. **Login como Admin de Empresa**
```http
POST http://localhost:3000/api/auth/login
{
  "email": "admin@miempresa.com",
  "password": "Admin123!"
}
```

5. **Crear áreas**
```http
POST http://localhost:3000/api/company/areas
Authorization: Bearer {{companyToken}}
{
  "name": "Sistemas"
}
```

6. **Registrar empleado**
```http
POST http://localhost:3000/api/auth/register
Host: miempresa.localhost:3000
{
  "email": "juan@miempresa.com",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "companyAreaId": "uuid-area"
}
```

---

## Errores Comunes

### 401 Unauthorized
- **Causa**: Token inválido o expirado
- **Solución**: Hacer login nuevamente

### 403 Forbidden
- **Causa**: Usuario no tiene el rol requerido
- **Solución**: Verificar que el usuario tenga el rol correcto

### 400 Bad Request
- **Causa**: Datos de entrada inválidos
- **Solución**: Revisar el DTO y las validaciones

### 409 Conflict
- **Causa**: Recurso duplicado (email, slug, etc.)
- **Solución**: Usar valores únicos

---

## Próximos Pasos

1. **Implementar Módulo 6: Rankings**
   - Cálculo de puntos
   - Caché con Redis
   - Rankings en tiempo real

2. **Features Avanzadas**
   - Bloqueo automático de predicciones
   - Cálculo automático de puntos
   - Fuzzy matching de goleadores

3. **Testing**
   - Tests unitarios
   - Tests E2E
   - Cobertura > 80%

4. **Documentación**
   - Swagger/OpenAPI
   - Postman Collection
   - Guía de deployment

# Guía de Testing - MundialPro API

## Configuración Inicial

### 1. Iniciar el Servidor

```bash
cd d:\Trabajo\Prode\prode-back\backend
npm run start:dev
```

El servidor estará corriendo en: `http://localhost:3000`

### 2. Herramientas Recomendadas

- **Postman** (recomendado): https://www.postman.com/downloads/
- **Thunder Client** (extensión VS Code)
- **cURL** (línea de comandos)

---

## Endpoints Disponibles

### Base URL
```
http://localhost:3000/api
```

---

## 1. AUTENTICACIÓN

### 1.1 Login - Admin Global

**Endpoint:** `POST /api/auth/login`

**Body (JSON):**
```json
{
  "email": "admin@mundialpro.com",
  "password": "Admin123!MundialPro"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-del-usuario",
      "email": "admin@mundialpro.com",
      "role": "admin_global",
      "employee": null
    }
  }
}
```

**⚠️ IMPORTANTE:** Guarda el `accessToken` para usarlo en las siguientes peticiones.

---

### 1.2 Login - Admin de Empresa

**Endpoint:** `POST /api/auth/login`

**Body (JSON):**
```json
{
  "email": "admin@acme.com",
  "password": "Company123!"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-del-usuario",
      "email": "admin@acme.com",
      "role": "empresa_admin",
      "employee": {
        "id": "uuid-empleado",
        "firstName": "Admin",
        "lastName": "Acme",
        "company": {
          "id": "uuid-company",
          "name": "Acme Corporation",
          "slug": "acme"
        },
        "area": {
          "id": "uuid-area",
          "name": "Administración"
        }
      }
    }
  }
}
```

---

### 1.3 Registro de Empleado

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Host: acme.localhost:3000
```

**Body (JSON):**
```json
{
  "email": "juan.perez@acme.com",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+54 9 11 1234-5678",
  "companyAreaId": "uuid-del-area"
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-nuevo-usuario",
      "email": "juan.perez@acme.com",
      "role": "empleado",
      "employee": {
        "id": "uuid-empleado",
        "firstName": "Juan",
        "lastName": "Pérez",
        "company": {...},
        "area": {...}
      }
    }
  }
}
```

---

## 2. ADMIN GLOBAL - EMPRESAS

**⚠️ Requiere:** Token de Admin Global en header `Authorization: Bearer <token>`

### 2.1 Listar Empresas

**Endpoint:** `GET /api/admin/companies`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corporation",
      "slug": "acme",
      "corporateDomain": "acme.com",
      "requireCorporateEmail": true,
      "logoUrl": "https://...",
      "primaryColor": "#1976d2",
      "secondaryColor": "#424242",
      "isActive": true,
      "adminUser": {
        "id": "uuid",
        "email": "admin@acme.com",
        "role": "empresa_admin"
      },
      "_count": {
        "employees": 15,
        "prodes": 3
      },
      "createdAt": "2025-12-05T...",
      "updatedAt": "2025-12-05T..."
    }
  ]
}
```

---

### 2.2 Obtener Empresa por ID

**Endpoint:** `GET /api/admin/companies/:id`

**Headers:**
```
Authorization: Bearer <token-admin-global>
```

---

### 2.3 Crear Empresa

**Endpoint:** `POST /api/admin/companies`

**Headers:**
```
Authorization: Bearer <token-admin-global>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Tech Solutions SA",
  "slug": "techsolutions",
  "corporateDomain": "techsolutions.com",
  "requireCorporateEmail": true,
  "logoUrl": "https://techsolutions.com/logo.png",
  "primaryColor": "#2196F3",
  "secondaryColor": "#FF5722",
  "adminEmail": "admin@techsolutions.com",
  "adminPassword": "TechAdmin123!"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-nueva-empresa",
    "name": "Tech Solutions SA",
    "slug": "techsolutions",
    "adminUser": {
      "id": "uuid-admin",
      "email": "admin@techsolutions.com",
      "role": "empresa_admin"
    },
    ...
  }
}
```

---

### 2.4 Actualizar Empresa

**Endpoint:** `PUT /api/admin/companies/:id`

**Headers:**
```
Authorization: Bearer <token-admin-global>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Tech Solutions Argentina SA",
  "primaryColor": "#00BCD4",
  "isActive": true
}
```

---

### 2.5 Eliminar Empresa

**Endpoint:** `DELETE /api/admin/companies/:id`

**Headers:**
```
Authorization: Bearer <token-admin-global>
```

**⚠️ Nota:** Solo se puede eliminar si no tiene empleados ni prodes.

---

## 3. ADMIN GLOBAL - COMPETICIONES

**⚠️ Requiere:** Token de Admin Global

### 3.1 Listar Competiciones

**Endpoint:** `GET /api/admin/competitions`

**Headers:**
```
Authorization: Bearer <token-admin-global>
```

---

### 3.2 Crear Competición

**Endpoint:** `POST /api/admin/competitions`

**Headers:**
```
Authorization: Bearer <token-admin-global>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Copa América 2025",
  "slug": "copa-america-2025",
  "startDate": "2025-06-01T00:00:00.000Z",
  "endDate": "2025-07-15T23:59:59.000Z",
  "sportType": "futbol",
  "isActive": true
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-competicion",
    "name": "Copa América 2025",
    "slug": "copa-america-2025",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-07-15T23:59:59.000Z",
    "sportType": "futbol",
    "isActive": true,
    "createdAt": "2025-12-05T...",
    "updatedAt": "2025-12-05T..."
  }
}
```

---

### 3.3 Actualizar Competición

**Endpoint:** `PUT /api/admin/competitions/:id`

**Body (JSON):**
```json
{
  "name": "Copa América Argentina 2025",
  "isActive": true
}
```

---

## 4. ADMIN GLOBAL - PARTIDOS

**⚠️ Requiere:** Token de Admin Global

### 4.1 Listar Partidos

**Endpoint:** `GET /api/admin/matches`

**Query Parameters (opcionales):**
- `competitionId`: Filtrar por competición

**Ejemplo:**
```
GET /api/admin/matches?competitionId=uuid-competicion
```

---

### 4.2 Crear Partido

**Endpoint:** `POST /api/admin/matches`

**Headers:**
```
Authorization: Bearer <token-admin-global>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "competitionId": "uuid-competicion",
  "teamAId": "uuid-argentina",
  "teamBId": "uuid-brasil",
  "matchDate": "2025-06-15T21:00:00.000Z",
  "stage": "Fase de Grupos",
  "location": "Estadio Monumental, Buenos Aires"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-partido",
    "competitionId": "uuid-competicion",
    "teamAId": "uuid-argentina",
    "teamBId": "uuid-brasil",
    "matchDate": "2025-06-15T21:00:00.000Z",
    "stage": "Fase de Grupos",
    "location": "Estadio Monumental, Buenos Aires",
    "status": "scheduled",
    "competition": {...},
    "teamA": {
      "id": "uuid-argentina",
      "name": "Argentina",
      "code": "ARG",
      "flagUrl": "..."
    },
    "teamB": {
      "id": "uuid-brasil",
      "name": "Brasil",
      "code": "BRA",
      "flagUrl": "..."
    }
  }
}
```

---

### 4.3 Actualizar Partido

**Endpoint:** `PUT /api/admin/matches/:id`

**Body (JSON):**
```json
{
  "matchDate": "2025-06-15T22:00:00.000Z",
  "location": "Estadio River Plate, Buenos Aires"
}
```

---

### 4.4 Cargar Resultado del Partido

**Endpoint:** `PUT /api/admin/matches/:id/result`

**Headers:**
```
Authorization: Bearer <token-admin-global>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "goalsTeamA": 2,
  "goalsTeamB": 1,
  "yellowCardsTeamA": 3,
  "yellowCardsTeamB": 2,
  "redCardsTeamA": 0,
  "redCardsTeamB": 1
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-resultado",
    "matchId": "uuid-partido",
    "goalsTeamA": 2,
    "goalsTeamB": 1,
    "yellowCardsTeamA": 3,
    "yellowCardsTeamB": 2,
    "redCardsTeamA": 0,
    "redCardsTeamB": 1,
    "finalizedAt": "2025-06-15T23:30:00.000Z",
    "updatedAt": "2025-06-15T23:30:00.000Z"
  }
}
```

---

### 4.5 Agregar Goleador

**Endpoint:** `POST /api/admin/matches/:id/scorers`

**Headers:**
```
Authorization: Bearer <token-admin-global>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "playerFullName": "Lionel Messi",
  "teamId": "uuid-argentina",
  "goalsCount": 2
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-goleador",
    "matchResultId": "uuid-resultado",
    "playerFullName": "Lionel Messi",
    "teamId": "uuid-argentina",
    "goalsCount": 2,
    "team": {
      "id": "uuid-argentina",
      "name": "Argentina",
      "code": "ARG"
    },
    "createdAt": "2025-06-15T23:35:00.000Z"
  }
}
```

---

## Flujo de Testing Completo

### Paso 1: Login como Admin Global
```bash
POST /api/auth/login
{
  "email": "admin@mundialpro.com",
  "password": "Admin123!MundialPro"
}
```
➡️ Guardar el `accessToken`

---

### Paso 2: Crear una Empresa
```bash
POST /api/admin/companies
Authorization: Bearer <token>
{
  "name": "Mi Empresa Test",
  "slug": "miempresa",
  "adminEmail": "admin@miempresa.com",
  "adminPassword": "Admin123!"
}
```

---

### Paso 3: Crear una Competición
```bash
POST /api/admin/competitions
Authorization: Bearer <token>
{
  "name": "Mundial 2026",
  "slug": "mundial-2026",
  "startDate": "2026-06-01T00:00:00.000Z",
  "endDate": "2026-07-15T23:59:59.000Z"
}
```

---

### Paso 4: Crear un Partido
```bash
POST /api/admin/matches
Authorization: Bearer <token>
{
  "competitionId": "<uuid-competicion>",
  "teamAId": "<uuid-equipo-a>",
  "teamBId": "<uuid-equipo-b>",
  "matchDate": "2026-06-10T21:00:00.000Z",
  "stage": "Fase de Grupos"
}
```

---

### Paso 5: Cargar Resultado
```bash
PUT /api/admin/matches/<uuid-partido>/result
Authorization: Bearer <token>
{
  "goalsTeamA": 3,
  "goalsTeamB": 1,
  "yellowCardsTeamA": 2,
  "yellowCardsTeamB": 3,
  "redCardsTeamA": 0,
  "redCardsTeamB": 0
}
```

---

### Paso 6: Agregar Goleadores
```bash
POST /api/admin/matches/<uuid-partido>/scorers
Authorization: Bearer <token>
{
  "playerFullName": "Lionel Messi",
  "teamId": "<uuid-equipo-a>",
  "goalsCount": 2
}
```

---

## Errores Comunes

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid token or user not found"
}
```
**Solución:** Verificar que el token JWT esté en el header `Authorization: Bearer <token>`

---

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "error": "Forbidden",
  "message": "User role \"empleado\" is not authorized. Required roles: admin_global"
}
```
**Solución:** El endpoint requiere un rol específico (ej: admin_global)

---

### 400 Bad Request
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ]
}
```
**Solución:** Revisar los datos enviados según las validaciones del DTO

---

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "error": "Not Found",
  "message": "Company with ID \"uuid-invalido\" not found"
}
```
**Solución:** Verificar que el ID del recurso exista

---

### 409 Conflict
```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "Company with slug \"acme\" already exists"
}
```
**Solución:** El slug o email ya está en uso

---

## Colección de Postman

### Importar Variables de Entorno

Crear un environment en Postman con:

```json
{
  "baseUrl": "http://localhost:3000/api",
  "adminToken": "",
  "companyToken": "",
  "employeeToken": ""
}
```

Luego usar `{{baseUrl}}` y `{{adminToken}}` en las peticiones.

---

## Próximos Endpoints (Pendientes)

### Company Module (Fase 4)
- `GET /api/company/config`
- `PUT /api/company/config`
- `GET /api/company/areas`
- `POST /api/company/areas`
- `GET /api/company/employees`
- `GET /api/company/prodes`
- `POST /api/company/prodes`

### Employee Module (Fase 5)
- `GET /api/prodes`
- `GET /api/prodes/:id`
- `POST /api/prodes/:id/join`
- `GET /api/prodes/:id/matches`
- `POST /api/predictions`
- `GET /api/predictions/my`

### Rankings (Fase 6)
- `GET /api/prodes/:id/rankings/general`
- `GET /api/prodes/:id/rankings/my-area`
- `GET /api/prodes/:id/rankings/areas`

---

## Notas Importantes

1. **Multi-Tenant:** Para endpoints de empresa/empleado, usar subdominios:
   - `acme.localhost:3000` en desarrollo
   - `acme.mundialpro.com` en producción

2. **Prefijo API:** Todos los endpoints tienen el prefijo `/api`

3. **Formato de Respuesta:** Todas las respuestas exitosas tienen:
   ```json
   {
     "success": true,
     "data": {...}
   }
   ```

4. **Tokens JWT:** Expiran en 7 días por defecto

5. **Base de Datos:** Los datos de seed ya están cargados (admin global, empresa Acme, equipos, etc.)

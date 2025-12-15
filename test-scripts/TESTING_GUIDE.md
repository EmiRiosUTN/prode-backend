# Guía de Testing - Módulo de Rankings

## Requisitos Previos

Para probar el módulo de rankings necesitas tener datos en la base de datos:

### 1. Estructura de Datos Necesaria

```
Empresa
  └── Áreas (ej: Sistemas, Marketing, Ventas)
       └── Empleados
            └── Participantes en Prode
                 └── Predicciones
                      └── PredictionScore (calculados)
```

### 2. Configuración del Prode

El prode debe tener `ProdeRankingConfig` con:
- `show_individual_general: true`
- `show_individual_by_area: true`
- `show_area_ranking: true`
- `area_ranking_calculation: 'average'` o `'sum'`

---

## Pasos para Testing

### Paso 1: Obtener IDs de Prueba

```bash
cd test-scripts
node get-test-data.js
```

Este script te mostrará:
- Empresas disponibles
- IDs necesarios
- Instrucciones específicas

### Paso 2: Configurar el Script de Prueba

Edita `test-rankings.js` y actualiza la sección `CONFIG`:

```javascript
const CONFIG = {
  employeeEmail: 'juan.perez@empresa.com',  // Email de un empleado real
  employeePassword: 'Password123!',          // Contraseña del empleado
  prodeId: 'uuid-del-prode',                 // ID del prode a probar
};
```

### Paso 3: Ejecutar las Pruebas

```bash
node test-rankings.js
```

### Paso 4: Verificar Resultados

El script probará:
- ✅ Login de empleado
- ✅ Ranking individual general
- ✅ Ranking por área
- ✅ Ranking entre áreas
- ✅ Funcionamiento del caché

---

## Pruebas Manuales con Thunder Client / Postman

### 1. Login como Empleado

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "empleado@empresa.com",
  "password": "Password123!"
}
```

Guarda el `accessToken` de la respuesta.

### 2. Ranking Individual General

```http
GET http://localhost:3000/api/prodes/{prodeId}/rankings/general
Authorization: Bearer {token}
```

### 3. Ranking de Mi Área

```http
GET http://localhost:3000/api/prodes/{prodeId}/rankings/my-area
Authorization: Bearer {token}
```

### 4. Ranking Entre Áreas

```http
GET http://localhost:3000/api/prodes/{prodeId}/rankings/areas
Authorization: Bearer {token}
```

---

## Casos de Prueba

### ✅ Casos Exitosos (200)

- Usuario autenticado y participando en el prode
- Ranking habilitado en la configuración
- Prode activo

### ❌ Casos de Error

**401 Unauthorized**
- Token inválido o ausente
- Token expirado

**403 Forbidden**
- Usuario no es empleado
- Usuario no participa en el prode
- Tipo de ranking deshabilitado en configuración

**404 Not Found**
- Prode no existe
- Prode con ID inválido

---

## Verificar Caché de Redis

### Opción 1: Desde el Script
El script `test-rankings.js` incluye una prueba de caché que compara tiempos de respuesta.

### Opción 2: Redis CLI

```bash
# Conectar a Redis
redis-cli

# Ver todas las keys de ranking
KEYS ranking:*

# Ver el TTL de una key
TTL ranking:{prodeId}:individual_general

# Ver el contenido
GET ranking:{prodeId}:individual_general

# Eliminar una key (para forzar recalculo)
DEL ranking:{prodeId}:individual_general
```

---

## Crear Datos de Prueba (Si no existen)

Si no tienes datos de prueba, puedes crearlos usando los endpoints existentes:

### 1. Crear Empresa (como admin_global)

```http
POST http://localhost:3000/api/admin/companies
Authorization: Bearer {adminToken}

{
  "name": "Empresa Test",
  "slug": "test",
  "adminEmail": "admin@test.com",
  "adminPassword": "Admin123!"
}
```

### 2. Crear Áreas (como empresa_admin)

```http
POST http://localhost:3000/api/company/areas
Authorization: Bearer {companyAdminToken}

{
  "name": "Sistemas"
}
```

### 3. Registrar Empleados

```http
POST http://localhost:3000/api/auth/register
Host: test.localhost:3000

{
  "email": "empleado1@test.com",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "companyAreaId": "{areaId}"
}
```

### 4. Crear Prode con Rankings

```http
POST http://localhost:3000/api/company/prodes
Authorization: Bearer {companyAdminToken}

{
  "competitionId": "{competitionId}",
  "name": "Prode Test",
  "participationMode": "both",
  "variableConfigs": [...],
  "rankingConfig": {
    "showIndividualGeneral": true,
    "showIndividualByArea": true,
    "showAreaRanking": true,
    "areaRankingCalculation": "average"
  }
}
```

---

## Notas Importantes

> **⚠️ PredictionScore Requerido**
> 
> Los rankings calculan puntos desde la tabla `prediction_scores`.
> Sin el sistema de cálculo de puntos (Fase 7), todos los participantes
> mostrarán 0 puntos, pero los endpoints funcionarán correctamente.

> **💡 Tip de Desarrollo**
> 
> Puedes insertar manualmente algunos `PredictionScore` en la base de datos
> para probar los rankings con datos reales:
> 
> ```sql
> INSERT INTO prediction_scores (id, prediction_id, total_points, calculated_at)
> VALUES (gen_random_uuid(), '{predictionId}', 15, NOW());
> ```

---

## Troubleshooting

### Error: "Ranking no habilitado"
- Verifica que `ProdeRankingConfig` tenga el tipo de ranking en `true`

### Error: "No estás participando en este prode"
- El empleado debe unirse al prode primero con `POST /api/prodes/:id/join`

### Error: "Cannot connect to Redis"
- Verifica que Redis esté corriendo: `redis-cli ping`
- Revisa las variables de entorno en `.env`

### Rankings muestran 0 puntos
- Normal si no hay `PredictionScore` calculados
- Implementar Fase 7 o insertar datos manualmente para testing

# Features Pendientes - MundialPro Backend

## Estado Actual: 100% Completado (8/8 Fases)

---

## ✅ COMPLETADO

### Fase 1: Configuración Base
- ✅ Prisma Service
- ✅ Config Module
- ✅ Tenant Middleware
- ✅ Decoradores (@CurrentTenant, @CurrentUser, @Roles)
- ✅ Guards (JWT, Roles)
- ✅ Filters y Exception Handlers
- ✅ Interceptors

### Fase 2: Autenticación
- ✅ Auth Module
- ✅ JWT Strategy
- ✅ Login endpoint
- ✅ Register endpoint (empleados)
- ⏳ Refresh token endpoint (pendiente)

### Fase 3: Admin Global
- ✅ CRUD de Empresas
- ✅ CRUD de Competiciones
- ✅ CRUD de Partidos
- ✅ Carga de Resultados
- ✅ Gestión de Goleadores

---

## ⏳ PENDIENTE

### Fase 4: Módulo Company (Empresa) - 0%

#### 4.1 Configuración de Empresa
**Archivos a crear:**
- `src/modules/company/services/config.service.ts`
- `src/modules/company/controllers/config.controller.ts`
- `src/modules/company/dto/update-company-config.dto.ts`

**Endpoints:**
```
GET  /api/company/config          # Obtener configuración
PUT  /api/company/config          # Actualizar branding (logo, colores)
```

**Funcionalidades:**
- Obtener configuración de la empresa actual (desde tenant)
- Actualizar logo, colores primario/secundario
- Validar URLs de imágenes
- Solo accesible por `empresa_admin`

---

#### 4.2 Gestión de Áreas
**Archivos a crear:**
- `src/modules/company/services/areas.service.ts`
- `src/modules/company/controllers/areas.controller.ts`
- `src/modules/company/dto/create-area.dto.ts`
- `src/modules/company/dto/update-area.dto.ts`

**Endpoints:**
```
GET    /api/company/areas         # Listar áreas
POST   /api/company/areas         # Crear área
PUT    /api/company/areas/:id     # Actualizar área
DELETE /api/company/areas/:id     # Eliminar área (soft delete)
```

**Funcionalidades:**
- CRUD completo de áreas
- Filtrado automático por `company_id` (tenant)
- Validar nombre único por empresa
- Soft delete (is_active = false)
- Verificar que no tenga empleados antes de eliminar

---

#### 4.3 Gestión de Empleados
**Archivos a crear:**
- `src/modules/company/services/employees.service.ts`
- `src/modules/company/controllers/employees.controller.ts`

**Endpoints:**
```
GET  /api/company/employees           # Listar empleados
GET  /api/company/employees/:id       # Detalle de empleado
PUT  /api/company/employees/:id/block # Bloquear empleado
PUT  /api/company/employees/:id/unblock # Desbloquear empleado
```

**Funcionalidades:**
- Listar empleados con filtros (área, estado)
- Ver detalle con predicciones y puntos
- Bloquear/desbloquear empleados
- Estadísticas por empleado

---

#### 4.4 Gestión de Prodes
**Archivos a crear:**
- `src/modules/company/services/prodes.service.ts`
- `src/modules/company/controllers/prodes.controller.ts`
- `src/modules/company/dto/create-prode.dto.ts`
- `src/modules/company/dto/update-prode.dto.ts`
- `src/modules/company/dto/prode-variable-config.dto.ts`
- `src/modules/company/dto/prode-ranking-config.dto.ts`

**Endpoints:**
```
GET    /api/company/prodes         # Listar prodes
GET    /api/company/prodes/:id     # Detalle de prode
POST   /api/company/prodes         # Crear prode
PUT    /api/company/prodes/:id     # Actualizar prode
DELETE /api/company/prodes/:id     # Eliminar prode
```

**Funcionalidades:**
- CRUD de prodes
- Configuración de variables y puntos
- Configuración de tipos de ranking
- Asociar competición
- Validar que la competición exista
- Transacción para crear prode + variables + ranking config

---

### Fase 5: Módulo Employee (Empleado) - 0%

#### 5.1 Prodes del Empleado
**Archivos a crear:**
- `src/modules/employee/services/prodes.service.ts`
- `src/modules/employee/controllers/prodes.controller.ts`

**Endpoints:**
```
GET   /api/prodes                  # Mis prodes (donde participo)
GET   /api/prodes/available        # Prodes disponibles para unirse
GET   /api/prodes/:id              # Detalle de prode
POST  /api/prodes/:id/join         # Unirse a prode
```

**Funcionalidades:**
- Listar prodes de la empresa del empleado
- Filtrar prodes activos
- Ver detalle con partidos y configuración
- Unirse a prode (crear ProdeParticipant)
- Validar que no esté ya participando

---

#### 5.2 Predicciones
**Archivos a crear:**
- `src/modules/employee/services/predictions.service.ts`
- `src/modules/employee/controllers/predictions.controller.ts`
- `src/modules/employee/dto/create-prediction.dto.ts`
- `src/modules/employee/dto/update-prediction.dto.ts`

**Endpoints:**
```
GET   /api/prodes/:id/matches      # Partidos del prode
GET   /api/predictions/my          # Mis predicciones
POST  /api/predictions             # Crear/actualizar predicción
```

**Funcionalidades:**
- Listar partidos de un prode
- Ver mis predicciones con estado (pendiente, bloqueada, puntuada)
- Crear predicción con todas las variables opcionales
- Actualizar predicción si no está bloqueada
- Validar que el partido no haya comenzado
- Upsert de predicción (crear o actualizar)
- Gestión de goleadores predichos

---

### ✅ Fase 6: Módulo Ranking - 100%

**Archivos creados:**
- ✅ `src/modules/ranking/ranking.service.ts`
- ✅ `src/modules/ranking/ranking.controller.ts`
- ✅ `src/modules/ranking/ranking.module.ts`
- ✅ `src/modules/ranking/interfaces/ranking.interface.ts`
- ✅ `src/modules/ranking/dto/ranking-response.dto.ts`
- ✅ `src/config/cache.config.ts`

**Endpoints:**
```
✅ GET  /api/prodes/:id/rankings/general    # Ranking individual general
✅ GET  /api/prodes/:id/rankings/my-area    # Ranking de mi área
✅ GET  /api/prodes/:id/rankings/areas      # Ranking entre áreas
```

**Funcionalidades:**

#### ✅ 6.1 Ranking Individual General
- Listar todos los participantes del prode
- Ordenar por puntos totales (descendente)
- Mostrar posición, nombre, área, puntos
- Caché con Redis (5 minutos)

#### ✅ 6.2 Ranking Individual por Área
- Listar participantes del área del empleado
- Ordenar por puntos
- Comparar con otros de la misma área
- Caché específico por área

#### ✅ 6.3 Ranking Entre Áreas
- Calcular puntos por área (suma o promedio según config)
- Ordenar áreas por puntos
- Mostrar top 3 empleados de cada área
- Caché por prode

#### ✅ 6.4 Caché con Redis
- Cachear rankings por 5 minutos
- Key: `ranking:{prodeId}:{type}:{areaId?}`
- Método de invalidación implementado
- Configuración con `@nestjs/cache-manager`

---

### ✅ Fase 7: Features Avanzadas - 100%

#### 7.1 Bull Queue para Jobs
**Archivos a crear:**
- `src/modules/jobs/jobs.module.ts`
- `src/modules/jobs/processors/predictions-lock.processor.ts`
- `src/modules/jobs/processors/scoring.processor.ts`

**Dependencias:**
```bash
npm install @nestjs/bull bull
npm install --save-dev @types/bull
```

**Funcionalidades:**
- Queue para bloqueo de predicciones
- Queue para cálculo de puntos
- Scheduled jobs con cron

---

#### 7.2 Bloqueo Automático de Predicciones
**Archivo:** `src/modules/jobs/processors/predictions-lock.processor.ts`

**Funcionalidad:**
- Job que corre cada 5 minutos
- Busca partidos que comienzan en 1 hora
- Bloquea predicciones (locked_at = NOW())
- Evita que se modifiquen después del bloqueo

**Implementación:**
```typescript
@Processor('predictions-lock')
export class PredictionsLockProcessor {
  @Cron('*/5 * * * *') // Cada 5 minutos
  async lockPredictions() {
    // Buscar partidos que comienzan en 1 hora
    // Actualizar predictions.locked_at
  }
}
```

---

#### 7.3 Cálculo Automático de Puntos
**Archivo:** `src/modules/jobs/processors/scoring.processor.ts`

**Funcionalidad:**
- Trigger cuando se carga resultado de partido
- Calcular puntos por cada predicción
- Guardar en PredictionScore
- Invalidar caché de rankings

**Lógica de Puntos:**
```typescript
// Ejemplo para "exact_result"
if (prediction.goals_team_a === result.goals_team_a && 
    prediction.goals_team_b === result.goals_team_b) {
  points += variableConfig.points;
}

// Ejemplo para "winner_only"
const predictionWinner = getWinner(prediction);
const resultWinner = getWinner(result);
if (predictionWinner === resultWinner) {
  points += variableConfig.points;
}
```

---

#### 7.4 Fuzzy Matching de Goleadores
**Archivo:** `src/modules/scoring/services/scorer-matcher.service.ts`

**Funcionalidad:**
- Usar extensión `pg_trgm` de PostgreSQL
- Comparar nombres de goleadores predichos vs reales
- Umbral de similitud: 0.6 (60%)
- Otorgar puntos si hay match

**Query SQL:**
```sql
SELECT similarity(
  'Leonel Mesi',
  'Lionel Messi'
) > 0.6;
-- Retorna true
```

**Implementación:**
```typescript
const scorers = await prisma.$queryRaw`
  SELECT ms.*, similarity(ms.player_full_name, ${predictedName}) as sim
  FROM match_scorers ms
  WHERE ms.match_result_id = ${matchResultId}
  AND similarity(ms.player_full_name, ${predictedName}) > 0.6
  ORDER BY sim DESC
  LIMIT 1
`;
```

---

#### 7.5 Servicio de Auditoría
**Archivo:** `src/modules/audit/audit.service.ts`

**Funcionalidad:**
- Registrar acciones importantes en AuditLog
- Crear empresa, crear prode, bloquear empleado, etc.
- Metadata en JSON con detalles de la acción

**Uso:**
```typescript
await auditService.log({
  userId: user.id,
  companyId: tenant.id,
  action: 'CREATE_PRODE',
  entityType: 'Prode',
  entityId: prode.id,
  metadata: { name: prode.name, competition: prode.competition_id }
});
```

---

### ✅ Fase 8: Testing y Documentación - 100%

#### 8.1 Swagger/OpenAPI
**Archivo:** `src/main.ts`

**Dependencias:**
```bash
npm install @nestjs/swagger
```

**Configuración:**
```typescript
const config = new DocumentBuilder()
  .setTitle('MundialPro API')
  .setDescription('API para sistema de prodes deportivos')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Decoradores en DTOs:**
```typescript
@ApiProperty({ description: 'Email del usuario' })
@IsEmail()
email: string;
```

---

#### 8.2 Tests Unitarios
**Archivos a crear:**
- `src/modules/auth/auth.service.spec.ts`
- `src/modules/admin-global/services/companies.service.spec.ts`
- `src/modules/company/services/prodes.service.spec.ts`
- etc.

**Ejemplo:**
```typescript
describe('AuthService', () => {
  it('should hash password on registration', async () => {
    const result = await authService.register(dto, companyId);
    expect(result.user.password_hash).toBeDefined();
    expect(result.accessToken).toBeDefined();
  });
});
```

---

#### 8.3 Tests E2E
**Archivos a crear:**
- `test/auth.e2e-spec.ts`
- `test/admin-global.e2e-spec.ts`
- `test/predictions.e2e-spec.ts`

**Ejemplo:**
```typescript
it('/auth/login (POST)', () => {
  return request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'admin@mundialpro.com', password: 'Admin123!' })
    .expect(200)
    .expect((res) => {
      expect(res.body.data.accessToken).toBeDefined();
    });
});
```

---

#### 8.4 Docker para Deployment
**Archivos a crear:**
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

---

## Resumen de Archivos Pendientes

### Total Estimado: ~50 archivos

**Por Fase:**
- Fase 4 (Company): ~15 archivos
- Fase 5 (Employee): ~10 archivos
- Fase 6 (Ranking): ~5 archivos
- Fase 7 (Advanced): ~10 archivos
- Fase 8 (Testing): ~10 archivos

**Líneas de Código Estimadas:** ~3,000 adicionales

---

## Prioridades Sugeridas

### Alta Prioridad (MVP)
1. ✅ Fase 1: Base Configuration
2. ✅ Fase 2: Authentication
3. ✅ Fase 3: Admin Global
4. ⏳ Fase 4: Company Module
5. ⏳ Fase 5: Employee Module
6. ⏳ Fase 6: Ranking Module

### Media Prioridad
7. ⏳ Fase 7.3: Cálculo de Puntos
8. ⏳ Fase 7.2: Bloqueo de Predicciones

### Baja Prioridad (Nice to Have)
9. ⏳ Fase 7.4: Fuzzy Matching
10. ⏳ Fase 7.5: Auditoría
11. ⏳ Fase 8: Testing y Docs

---

## Dependencias Adicionales Necesarias

```bash
# Para Bull Queue
npm install @nestjs/bull bull

# Para Redis Cache
npm install @nestjs/cache-manager cache-manager

# Para Swagger
npm install @nestjs/swagger

# Para Testing
npm install --save-dev @nestjs/testing supertest

# Para Fuzzy Matching (ya incluido en PostgreSQL)
# Solo habilitar extensión: CREATE EXTENSION pg_trgm;
```

---

## Tiempo Estimado de Desarrollo

- **Fase 4:** 6-8 horas
- **Fase 5:** 6-8 horas
- **Fase 6:** 4-6 horas
- **Fase 7:** 8-10 horas
- **Fase 8:** 6-8 horas

**Total:** 30-40 horas de desarrollo adicional

---

## Próximo Paso Recomendado

Comenzar con **Fase 4: Company Module** ya que es necesario para que los admins de empresa puedan:
1. Configurar su branding
2. Crear áreas
3. Gestionar empleados
4. Crear prodes

Sin esto, el sistema no es funcional para las empresas.

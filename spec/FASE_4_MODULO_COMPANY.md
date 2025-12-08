# 📘 MundialPro Backend - Fase 4: Módulo Company

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
3. [Objetivos de la Fase 4](#objetivos-de-la-fase-4)
4. [Arquitectura del Módulo](#arquitectura-del-módulo)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)
6. [Reglas de Negocio](#reglas-de-negocio)
7. [Testing](#testing)
8. [Checklist de Implementación](#checklist-de-implementación)

---

## 🎯 Resumen Ejecutivo

**Fase:** 4 de 8  
**Módulo:** Company (Empresa)  
**Prioridad:** Alta (MVP)  
**Tiempo estimado:** 8-12 horas  
**Complejidad:** Media

### Objetivo
Implementar el módulo que permite a los administradores de empresas gestionar:
- ✅ Configuración de su empresa (branding)
- ✅ Áreas/departamentos
- ✅ Empleados
- ✅ Prodes (competiciones internas)

---

## 📊 Estado Actual del Proyecto

### ✅ Completado (Fases 1-3)

**Fase 1: Configuración Base**
- Prisma Service
- Config Module
- Tenant Middleware
- Decoradores (@CurrentTenant, @CurrentUser, @Roles)
- Guards (JWT, Roles)
- Filters y Exception Handlers

**Fase 2: Autenticación**
- Login endpoint
- Register endpoint (empleados)
- JWT Strategy

**Fase 3: Admin Global**
- CRUD de Empresas
- CRUD de Competiciones
- CRUD de Partidos
- Carga de Resultados
- Gestión de Goleadores

### 📈 Progreso: 37.5% → 50% (objetivo al finalizar Fase 4)

---

## 🎯 Objetivos de la Fase 4

Implementar **4 sub-módulos** dentro del módulo Company:

### 4.1 Configuración de Empresa
Permitir al admin de empresa actualizar branding (logo, colores).

### 4.2 Gestión de Áreas
CRUD completo de departamentos/áreas de la empresa.

### 4.3 Gestión de Empleados
Listar, ver detalles, bloquear/desbloquear empleados.

### 4.4 Gestión de Prodes
Crear y configurar prodes (competiciones internas) con variables de predicción y rankings.

---

## 🏗️ Arquitectura del Módulo

### Estructura de Carpetas

```
src/modules/company/
├── company.module.ts
├── controllers/
│   ├── config.controller.ts
│   ├── areas.controller.ts
│   ├── employees.controller.ts
│   └── prodes.controller.ts
├── services/
│   ├── config.service.ts
│   ├── areas.service.ts
│   ├── employees.service.ts
│   └── prodes.service.ts
└── dto/
    ├── update-company-config.dto.ts
    ├── create-area.dto.ts
    ├── update-area.dto.ts
    ├── create-prode.dto.ts
    ├── update-prode.dto.ts
    ├── prode-variable-config.dto.ts
    └── prode-ranking-config.dto.ts
```

### Endpoints

```
BASE: /api/company (requiere tenant + role: empresa_admin)

GET    /api/company/config              # Obtener configuración
PUT    /api/company/config              # Actualizar branding

GET    /api/company/areas               # Listar áreas
POST   /api/company/areas               # Crear área
PUT    /api/company/areas/:id           # Actualizar área
DELETE /api/company/areas/:id           # Eliminar área (soft delete)

GET    /api/company/employees           # Listar empleados
GET    /api/company/employees/:id       # Detalle de empleado
PUT    /api/company/employees/:id/block # Bloquear empleado
PUT    /api/company/employees/:id/unblock # Desbloquear empleado

GET    /api/company/prodes              # Listar prodes
GET    /api/company/prodes/:id          # Detalle de prode
POST   /api/company/prodes              # Crear prode
PUT    /api/company/prodes/:id          # Actualizar prode
DELETE /api/company/prodes/:id          # Eliminar prode
```

---

## 🔨 Implementación Paso a Paso

### PASO 1: Crear el Módulo Base

**Archivo:** `src/modules/company/company.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { 
  ConfigController, 
  AreasController, 
  EmployeesController, 
  ProdesController 
} from './controllers';
import { 
  ConfigService, 
  AreasService, 
  EmployeesService, 
  ProdesService 
} from './services';

@Module({
  controllers: [
    ConfigController,
    AreasController,
    EmployeesController,
    ProdesController,
  ],
  providers: [
    ConfigService,
    AreasService,
    EmployeesService,
    ProdesService,
  ],
  exports: [
    ConfigService,
    AreasService,
    EmployeesService,
    ProdesService,
  ],
})
export class CompanyModule {}
```

**Importante:** Agregar al `app.module.ts`:

```typescript
// src/app.module.ts
import { CompanyModule } from './modules/company/company.module';

@Module({
  imports: [
    // ... otros imports
    CompanyModule,  // <-- Agregar aquí
  ],
})
export class AppModule {}
```

---

### PASO 2: Sub-módulo 4.1 - Configuración de Empresa

#### 2.1 Crear DTO

**Archivo:** `src/modules/company/dto/update-company-config.dto.ts`

```typescript
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateCompanyConfigDto {
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;
}
```

#### 2.2 Crear Service

**Archivo:** `src/modules/company/services/config.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateCompanyConfigDto } from '../dto/update-company-config.dto';

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        corporate_domain: true,
        require_corporate_email: true,
        logo_url: true,
        primary_color: true,
        secondary_color: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    return company;
  }

  async updateConfig(companyId: string, updateDto: UpdateCompanyConfigDto) {
    // Verificar que la empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    // Actualizar configuración
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        logo_url: updateDto.logoUrl,
        primary_color: updateDto.primaryColor,
        secondary_color: updateDto.secondaryColor,
      },
      select: {
        id: true,
        name: true,
        logo_url: true,
        primary_color: true,
        secondary_color: true,
        updated_at: true,
      },
    });
  }
}
```

#### 2.3 Crear Controller

**Archivo:** `src/modules/company/controllers/config.controller.ts`

```typescript
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '../services/config.service';
import { UpdateCompanyConfigDto } from '../dto/update-company-config.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentTenant } from '../../../common/decorators';

@Controller('company/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig(@CurrentTenant() tenant: { id: string }) {
    return this.configService.getConfig(tenant.id);
  }

  @Put()
  updateConfig(
    @CurrentTenant() tenant: { id: string },
    @Body() updateDto: UpdateCompanyConfigDto,
  ) {
    return this.configService.updateConfig(tenant.id, updateDto);
  }
}
```

---

### PASO 3: Sub-módulo 4.2 - Gestión de Áreas

#### 3.1 Crear DTOs

**Archivo:** `src/modules/company/dto/create-area.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
```

**Archivo:** `src/modules/company/dto/update-area.dto.ts`

```typescript
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateAreaDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

#### 3.2 Crear Service

**Archivo:** `src/modules/company/services/areas.service.ts`

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAreaDto } from '../dto/create-area.dto';
import { UpdateAreaDto } from '../dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.companyArea.findMany({
      where: { 
        company_id: companyId,
        is_active: true,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const area = await this.prisma.companyArea.findFirst({
      where: {
        id,
        company_id: companyId,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!area) {
      throw new NotFoundException(`Area with ID "${id}" not found`);
    }

    return area;
  }

  async create(companyId: string, createAreaDto: CreateAreaDto) {
    // Verificar que no exista un área con el mismo nombre
    const existingArea = await this.prisma.companyArea.findFirst({
      where: {
        company_id: companyId,
        name: createAreaDto.name,
      },
    });

    if (existingArea) {
      throw new ConflictException(
        `Area with name "${createAreaDto.name}" already exists in this company`
      );
    }

    // Crear área
    return this.prisma.companyArea.create({
      data: {
        company_id: companyId,
        name: createAreaDto.name,
        description: createAreaDto.description,
      },
    });
  }

  async update(companyId: string, id: string, updateAreaDto: UpdateAreaDto) {
    // Verificar que el área existe y pertenece a la empresa
    const area = await this.findOne(companyId, id);

    // Si se está cambiando el nombre, verificar que no exista otro con ese nombre
    if (updateAreaDto.name && updateAreaDto.name !== area.name) {
      const existingArea = await this.prisma.companyArea.findFirst({
        where: {
          company_id: companyId,
          name: updateAreaDto.name,
          id: { not: id },
        },
      });

      if (existingArea) {
        throw new ConflictException(
          `Area with name "${updateAreaDto.name}" already exists in this company`
        );
      }
    }

    // Actualizar área
    return this.prisma.companyArea.update({
      where: { id },
      data: {
        name: updateAreaDto.name,
        description: updateAreaDto.description,
        is_active: updateAreaDto.isActive,
      },
    });
  }

  async remove(companyId: string, id: string) {
    // Verificar que el área existe y pertenece a la empresa
    const area = await this.findOne(companyId, id);

    // Verificar que no tenga empleados
    const employeesCount = await this.prisma.employee.count({
      where: {
        company_area_id: id,
      },
    });

    if (employeesCount > 0) {
      throw new BadRequestException(
        `Cannot delete area with ${employeesCount} employee(s). Please reassign employees first.`
      );
    }

    // Soft delete
    return this.prisma.companyArea.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
```

#### 3.3 Crear Controller

**Archivo:** `src/modules/company/controllers/areas.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AreasService } from '../services/areas.service';
import { CreateAreaDto } from '../dto/create-area.dto';
import { UpdateAreaDto } from '../dto/update-area.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentTenant } from '../../../common/decorators';

@Controller('company/areas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  findAll(@CurrentTenant() tenant: { id: string }) {
    return this.areasService.findAll(tenant.id);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.areasService.findOne(tenant.id, id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: { id: string },
    @Body() createAreaDto: CreateAreaDto,
  ) {
    return this.areasService.create(tenant.id, createAreaDto);
  }

  @Put(':id')
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() updateAreaDto: UpdateAreaDto,
  ) {
    return this.areasService.update(tenant.id, id, updateAreaDto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.areasService.remove(tenant.id, id);
  }
}
```

---

### PASO 4: Sub-módulo 4.3 - Gestión de Empleados

#### 4.1 Crear Service

**Archivo:** `src/modules/company/services/employees.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, areaId?: string) {
    return this.prisma.employee.findMany({
      where: {
        company_id: companyId,
        ...(areaId && { company_area_id: areaId }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
        company_area: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            prode_participants: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        company_id: companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true,
            created_at: true,
          },
        },
        company_area: true,
        prode_participants: {
          include: {
            prode: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    return employee;
  }

  async block(companyId: string, id: string) {
    // Verificar que el empleado existe y pertenece a la empresa
    await this.findOne(companyId, id);

    return this.prisma.employee.update({
      where: { id },
      data: { is_blocked: true },
    });
  }

  async unblock(companyId: string, id: string) {
    // Verificar que el empleado existe y pertenece a la empresa
    await this.findOne(companyId, id);

    return this.prisma.employee.update({
      where: { id },
      data: { is_blocked: false },
    });
  }
}
```

#### 4.2 Crear Controller

**Archivo:** `src/modules/company/controllers/employees.controller.ts`

```typescript
import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from '../services/employees.service';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentTenant } from '../../../common/decorators';

@Controller('company/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(
    @CurrentTenant() tenant: { id: string },
    @Query('areaId') areaId?: string,
  ) {
    return this.employeesService.findAll(tenant.id, areaId);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.employeesService.findOne(tenant.id, id);
  }

  @Put(':id/block')
  block(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.employeesService.block(tenant.id, id);
  }

  @Put(':id/unblock')
  unblock(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.employeesService.unblock(tenant.id, id);
  }
}
```

---

### PASO 5: Sub-módulo 4.4 - Gestión de Prodes

#### 5.1 Crear DTOs

**Archivo:** `src/modules/company/dto/prode-variable-config.dto.ts`

```typescript
import { IsUUID, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

export class ProdeVariableConfigDto {
  @IsUUID()
  predictionVariableId: string;

  @IsInt()
  @Min(0)
  points: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

**Archivo:** `src/modules/company/dto/prode-ranking-config.dto.ts`

```typescript
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum AreaRankingCalculation {
  AVERAGE = 'average',
  SUM = 'sum',
}

export class ProdeRankingConfigDto {
  @IsBoolean()
  @IsOptional()
  showIndividualGeneral?: boolean;

  @IsBoolean()
  @IsOptional()
  showIndividualByArea?: boolean;

  @IsBoolean()
  @IsOptional()
  showAreaRanking?: boolean;

  @IsEnum(AreaRankingCalculation)
  @IsOptional()
  areaRankingCalculation?: AreaRankingCalculation;
}
```

**Archivo:** `src/modules/company/dto/create-prode.dto.ts`

```typescript
import { 
  IsString, 
  IsNotEmpty, 
  IsUUID, 
  IsEnum, 
  IsOptional, 
  ValidateNested,
  IsArray,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProdeVariableConfigDto } from './prode-variable-config.dto';
import { ProdeRankingConfigDto } from './prode-ranking-config.dto';

export enum ParticipationMode {
  GENERAL = 'general',
  BY_AREA = 'by_area',
  BOTH = 'both',
}

export class CreateProdeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  competitionId: string;

  @IsEnum(ParticipationMode)
  @IsNotEmpty()
  participationMode: ParticipationMode;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProdeVariableConfigDto)
  variableConfigs: ProdeVariableConfigDto[];

  @ValidateNested()
  @Type(() => ProdeRankingConfigDto)
  @IsOptional()
  rankingConfig?: ProdeRankingConfigDto;
}
```

**Archivo:** `src/modules/company/dto/update-prode.dto.ts`

```typescript
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateProdeDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

#### 5.2 Crear Service

**Archivo:** `src/modules/company/services/prodes.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProdeDto } from '../dto/create-prode.dto';
import { UpdateProdeDto } from '../dto/update-prode.dto';

@Injectable()
export class ProdesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.prode.findMany({
      where: { company_id: companyId },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            slug: true,
            start_date: true,
            end_date: true,
          },
        },
        prode_variable_configs: {
          where: { is_active: true },
          include: {
            prediction_variable: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        prode_ranking_config: true,
        _count: {
          select: {
            prode_participants: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const prode = await this.prisma.prode.findFirst({
      where: {
        id,
        company_id: companyId,
      },
      include: {
        competition: {
          include: {
            matches: {
              include: {
                team_a: true,
                team_b: true,
              },
              orderBy: {
                match_date: 'asc',
              },
            },
          },
        },
        prode_variable_configs: {
          where: { is_active: true },
          include: {
            prediction_variable: true,
          },
        },
        prode_ranking_config: true,
        prode_participants: {
          include: {
            employee: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                company_area: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!prode) {
      throw new NotFoundException(`Prode with ID "${id}" not found`);
    }

    return prode;
  }

  async create(companyId: string, createProdeDto: CreateProdeDto) {
    // Verificar que la competición existe
    const competition = await this.prisma.competition.findUnique({
      where: { id: createProdeDto.competitionId },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID "${createProdeDto.competitionId}" not found`
      );
    }

    // Verificar que las variables de predicción existan
    const variableIds = createProdeDto.variableConfigs.map(
      (v) => v.predictionVariableId
    );

    const variables = await this.prisma.predictionVariable.findMany({
      where: { id: { in: variableIds } },
    });

    if (variables.length !== variableIds.length) {
      throw new BadRequestException('One or more prediction variables not found');
    }

    // Crear prode en una transacción
    return this.prisma.$transaction(async (tx) => {
      // Crear prode
      const prode = await tx.prode.create({
        data: {
          company_id: companyId,
          competition_id: createProdeDto.competitionId,
          name: createProdeDto.name,
          description: createProdeDto.description,
          participation_mode: createProdeDto.participationMode,
        },
      });

      // Crear configuración de variables
      await tx.prodeVariableConfig.createMany({
        data: createProdeDto.variableConfigs.map((config) => ({
          prode_id: prode.id,
          prediction_variable_id: config.predictionVariableId,
          points: config.points,
          is_active: config.isActive ?? true,
        })),
      });

      // Crear configuración de ranking
      await tx.prodeRankingConfig.create({
        data: {
          prode_id: prode.id,
          show_individual_general:
            createProdeDto.rankingConfig?.showIndividualGeneral ?? true,
          show_individual_by_area:
            createProdeDto.rankingConfig?.showIndividualByArea ?? false,
          show_area_ranking:
            createProdeDto.rankingConfig?.showAreaRanking ?? false,
          area_ranking_calculation:
            createProdeDto.rankingConfig?.areaRankingCalculation ?? 'average',
        },
      });

      // Retornar prode completo
      return tx.prode.findUnique({
        where: { id: prode.id },
        include: {
          competition: true,
          prode_variable_configs: {
            include: {
              prediction_variable: true,
            },
          },
          prode_ranking_config: true,
        },
      });
    });
  }

  async update(companyId: string, id: string, updateProdeDto: UpdateProdeDto) {
    // Verificar que el prode existe y pertenece a la empresa
    await this.findOne(companyId, id);

    return this.prisma.prode.update({
      where: { id },
      data: {
        name: updateProdeDto.name,
        description: updateProdeDto.description,
        is_active: updateProdeDto.isActive,
      },
    });
  }

  async remove(companyId: string, id: string) {
    // Verificar que el prode existe y pertenece a la empresa
    const prode = await this.findOne(companyId, id);

    // Verificar que no tenga participantes
    if (prode.prode_participants.length > 0) {
      throw new BadRequestException(
        `Cannot delete prode with ${prode.prode_participants.length} participant(s)`
      );
    }

    // Eliminar prode (cascade eliminará configs)
    return this.prisma.prode.delete({
      where: { id },
    });
  }
}
```

#### 5.3 Crear Controller

**Archivo:** `src/modules/company/controllers/prodes.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProdesService } from '../services/prodes.service';
import { CreateProdeDto } from '../dto/create-prode.dto';
import { UpdateProdeDto } from '../dto/update-prode.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentTenant } from '../../../common/decorators';

@Controller('company/prodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class ProdesController {
  constructor(private readonly prodesService: ProdesService) {}

  @Get()
  findAll(@CurrentTenant() tenant: { id: string }) {
    return this.prodesService.findAll(tenant.id);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.prodesService.findOne(tenant.id, id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: { id: string },
    @Body() createProdeDto: CreateProdeDto,
  ) {
    return this.prodesService.create(tenant.id, createProdeDto);
  }

  @Put(':id')
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() updateProdeDto: UpdateProdeDto,
  ) {
    return this.prodesService.update(tenant.id, id, updateProdeDto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    return this.prodesService.remove(tenant.id, id);
  }
}
```

---

### PASO 6: Crear archivos index para exports

**Archivo:** `src/modules/company/controllers/index.ts`

```typescript
export * from './config.controller';
export * from './areas.controller';
export * from './employees.controller';
export * from './prodes.controller';
```

**Archivo:** `src/modules/company/services/index.ts`

```typescript
export * from './config.service';
export * from './areas.service';
export * from './employees.service';
export * from './prodes.service';
```

**Archivo:** `src/modules/company/dto/index.ts`

```typescript
export * from './update-company-config.dto';
export * from './create-area.dto';
export * from './update-area.dto';
export * from './create-prode.dto';
export * from './update-prode.dto';
export * from './prode-variable-config.dto';
export * from './prode-ranking-config.dto';
```

---

## 📋 Reglas de Negocio

### Configuración de Empresa
- ✅ Solo el `empresa_admin` puede actualizar la configuración
- ✅ El nombre de la empresa NO se puede cambiar desde este endpoint
- ✅ Los colores deben ser en formato hexadecimal (#RRGGBB)
- ✅ El logo debe ser una URL válida

### Áreas
- ✅ El nombre de área debe ser único por empresa
- ✅ No se puede eliminar un área si tiene empleados asignados
- ✅ El delete es soft (is_active = false)
- ✅ Solo se listan áreas activas por defecto

### Empleados
- ✅ Solo se pueden listar empleados de la propia empresa (filtrado por tenant)
- ✅ Se puede filtrar por área
- ✅ Bloquear un empleado NO lo elimina, solo impide que acceda
- ✅ Un empleado bloqueado no puede hacer predicciones

### Prodes
- ✅ Un prode debe estar asociado a una competición existente
- ✅ Debe tener al menos 1 variable de predicción configurada
- ✅ Los puntos por variable deben ser >= 0
- ✅ El `participationMode` determina si los rankings son generales, por área, o ambos
- ✅ No se puede eliminar un prode con participantes
- ✅ La configuración de ranking se crea automáticamente con valores por defecto

---

## 🧪 Testing

### Test Manual con Postman/Thunder Client

#### 1. Configuración de Empresa

```http
# Obtener configuración
GET http://localhost:3000/api/company/config
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Actualizar branding
PUT http://localhost:3000/api/company/config
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
Content-Type: application/json

{
  "logoUrl": "https://acme.com/new-logo.png",
  "primaryColor": "#FF5722",
  "secondaryColor": "#2196F3"
}
```

#### 2. Áreas

```http
# Listar áreas
GET http://localhost:3000/api/company/areas
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Crear área
POST http://localhost:3000/api/company/areas
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
Content-Type: application/json

{
  "name": "Desarrollo",
  "description": "Equipo de desarrollo de software"
}

# Actualizar área
PUT http://localhost:3000/api/company/areas/:id
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
Content-Type: application/json

{
  "name": "Desarrollo de Software",
  "description": "Equipo de ingeniería y desarrollo"
}

# Eliminar área
DELETE http://localhost:3000/api/company/areas/:id
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
```

#### 3. Empleados

```http
# Listar empleados
GET http://localhost:3000/api/company/employees
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Filtrar por área
GET http://localhost:3000/api/company/employees?areaId=uuid-del-area
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Ver detalle de empleado
GET http://localhost:3000/api/company/employees/:id
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Bloquear empleado
PUT http://localhost:3000/api/company/employees/:id/block
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Desbloquear empleado
PUT http://localhost:3000/api/company/employees/:id/unblock
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
```

#### 4. Prodes

```http
# Listar prodes
GET http://localhost:3000/api/company/prodes
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>

# Crear prode
POST http://localhost:3000/api/company/prodes
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
Content-Type: application/json

{
  "name": "Prode Copa América 2025",
  "description": "Competencia interna para la Copa América",
  "competitionId": "uuid-de-competicion",
  "participationMode": "both",
  "variableConfigs": [
    {
      "predictionVariableId": "uuid-resultado-exacto",
      "points": 3
    },
    {
      "predictionVariableId": "uuid-ganador",
      "points": 1
    }
  ],
  "rankingConfig": {
    "showIndividualGeneral": true,
    "showIndividualByArea": true,
    "showAreaRanking": true,
    "areaRankingCalculation": "average"
  }
}

# Actualizar prode
PUT http://localhost:3000/api/company/prodes/:id
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
Content-Type: application/json

{
  "name": "Prode Copa América 2025 - Actualizado",
  "isActive": true
}

# Eliminar prode
DELETE http://localhost:3000/api/company/prodes/:id
Host: acme.localhost:3000
Authorization: Bearer <token-admin-empresa>
```

### Casos de Test Importantes

1. **Verificar multi-tenancy**: Un admin de empresa A no puede ver/editar datos de empresa B
2. **Verificar validaciones**: Nombres duplicados, áreas con empleados, etc.
3. **Verificar transacciones**: Si falla crear variable config, no se crea el prode
4. **Verificar soft delete**: Áreas eliminadas no aparecen en listados
5. **Verificar permisos**: Solo `empresa_admin` puede acceder

---

## ✅ Checklist de Implementación

### Configuración Inicial
- [ ] Crear carpeta `src/modules/company`
- [ ] Crear `company.module.ts`
- [ ] Agregar `CompanyModule` a `app.module.ts`
- [ ] Crear subcarpetas: `controllers/`, `services/`, `dto/`

### Sub-módulo 4.1: Configuración
- [ ] Crear `dto/update-company-config.dto.ts`
- [ ] Crear `services/config.service.ts`
- [ ] Crear `controllers/config.controller.ts`
- [ ] Testear GET `/api/company/config`
- [ ] Testear PUT `/api/company/config`

### Sub-módulo 4.2: Áreas
- [ ] Crear `dto/create-area.dto.ts`
- [ ] Crear `dto/update-area.dto.ts`
- [ ] Crear `services/areas.service.ts`
- [ ] Crear `controllers/areas.controller.ts`
- [ ] Testear GET `/api/company/areas`
- [ ] Testear POST `/api/company/areas`
- [ ] Testear PUT `/api/company/areas/:id`
- [ ] Testear DELETE `/api/company/areas/:id`
- [ ] Verificar validación de nombres duplicados
- [ ] Verificar no se puede eliminar área con empleados

### Sub-módulo 4.3: Empleados
- [ ] Crear `services/employees.service.ts`
- [ ] Crear `controllers/employees.controller.ts`
- [ ] Testear GET `/api/company/employees`
- [ ] Testear GET `/api/company/employees?areaId=...`
- [ ] Testear GET `/api/company/employees/:id`
- [ ] Testear PUT `/api/company/employees/:id/block`
- [ ] Testear PUT `/api/company/employees/:id/unblock`

### Sub-módulo 4.4: Prodes
- [ ] Crear `dto/prode-variable-config.dto.ts`
- [ ] Crear `dto/prode-ranking-config.dto.ts`
- [ ] Crear `dto/create-prode.dto.ts`
- [ ] Crear `dto/update-prode.dto.ts`
- [ ] Crear `services/prodes.service.ts`
- [ ] Crear `controllers/prodes.controller.ts`
- [ ] Testear GET `/api/company/prodes`
- [ ] Testear POST `/api/company/prodes`
- [ ] Testear GET `/api/company/prodes/:id`
- [ ] Testear PUT `/api/company/prodes/:id`
- [ ] Testear DELETE `/api/company/prodes/:id`
- [ ] Verificar transacción al crear prode
- [ ] Verificar no se puede eliminar prode con participantes

### Archivos Index
- [ ] Crear `controllers/index.ts`
- [ ] Crear `services/index.ts`
- [ ] Crear `dto/index.ts`

### Testing General
- [ ] Verificar multi-tenancy (subdominios)
- [ ] Verificar permisos (solo empresa_admin)
- [ ] Verificar manejo de errores
- [ ] Verificar validaciones de DTOs
- [ ] Crear tests E2E (opcional pero recomendado)

### Documentación
- [ ] Actualizar `PENDING_FEATURES.md` (marcar Fase 4 como completada)
- [ ] Agregar endpoints a colección de Postman
- [ ] Documentar casos de uso
- [ ] Agregar ejemplos de requests/responses

---

## 🎯 Resultado Esperado

Al finalizar la Fase 4, deberías tener:

**✅ 12 nuevos endpoints funcionando:**
- 2 de configuración
- 4 de áreas
- 4 de empleados  
- 2 de prodes (GET y POST principales)

**✅ 4 servicios completos:**
- ConfigService
- AreasService
- EmployeesService
- ProdesService

**✅ 4 controllers:**
- ConfigController
- AreasController
- EmployeesController
- ProdesController

**✅ 7 DTOs:**
- UpdateCompanyConfigDto
- CreateAreaDto, UpdateAreaDto
- CreateProdeDto, UpdateProdeDto
- ProdeVariableConfigDto
- ProdeRankingConfigDto

**✅ Progreso: 37.5% → 50%**

---

## 🚀 Siguientes Fases

Después de completar la Fase 4:

**Fase 5: Módulo Employee (Empleado)**
- Endpoints para empleados ver y unirse a prodes
- Sistema de predicciones
- Vista de partidos

**Fase 6: Módulo Rankings**
- Ranking individual general
- Ranking por área
- Ranking entre áreas
- Sistema de caché con Redis

**Fase 7: Funcionalidades Avanzadas**
- Cálculo automático de puntos
- Bloqueo de predicciones
- Fuzzy matching de goleadores
- Sistema de auditoría

---

## 📚 Recursos Útiles

- **NestJS Docs:** https://docs.nestjs.com
- **Prisma Docs:** https://www.prisma.io/docs
- **Class Validator:** https://github.com/typestack/class-validator
- **Tu Schema Prisma:** `prisma/schema.prisma`

---

## 💡 Tips Importantes

1. **Usa transacciones** para operaciones que afectan múltiples tablas (crear prode)
2. **Valida ownership** siempre verificando que los datos pertenezcan a la empresa del tenant
3. **Soft delete** para datos importantes (áreas, prodes si es necesario)
4. **Include counts** en los listados para mostrar relaciones (`_count`)
5. **Testea con subdominios** en desarrollo usando `empresa.localhost:3000`

---

## 🎉 ¡Listo para Empezar!

Con esta documentación tienes todo lo necesario para implementar la Fase 4 del proyecto.

**Orden sugerido de implementación:**
1. Setup del módulo base
2. Configuración (más simple, para familiarizarte)
3. Áreas (CRUD completo con validaciones)
4. Empleados (solo lectura, más simple)
5. Prodes (más complejo, con transacciones)

**Tiempo estimado por sub-módulo:**
- Configuración: 1-2 horas
- Áreas: 2-3 horas
- Empleados: 2 horas
- Prodes: 4-5 horas
- Testing y ajustes: 2 horas

**Total: 8-12 horas de desarrollo**

¡Éxito con la implementación! 🚀

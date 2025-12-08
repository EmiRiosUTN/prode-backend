import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from '../services/employees.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('company/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) { }

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

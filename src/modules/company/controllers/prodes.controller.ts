import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProdesService } from '../services/prodes.service';
import { CreateProdeDto } from '../dto/create-prode.dto';
import { UpdateProdeDto } from '../dto/update-prode.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('company/prodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class ProdesController {
    constructor(private readonly prodesService: ProdesService) { }

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

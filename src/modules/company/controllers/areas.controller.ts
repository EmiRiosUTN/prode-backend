import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AreasService } from '../services/areas.service';
import { CreateAreaDto } from '../dto/create-area.dto';
import { UpdateAreaDto } from '../dto/update-area.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('company/areas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class AreasController {
    constructor(private readonly areasService: AreasService) { }

    @Get()
    findAll(@CurrentTenant() tenant: { id: string }) {
        return this.areasService.findAll(tenant.id, true);
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

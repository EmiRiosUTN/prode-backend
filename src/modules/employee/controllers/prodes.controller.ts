import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ProdesService } from '../services/prodes.service';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';

@Controller('employee/prodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empleado')
export class ProdesController {
    constructor(private readonly prodesService: ProdesService) { }

    @Get()
    findMyProdes(@CurrentUser() user: { id: string; employee: { id: string } }) {
        return this.prodesService.findMyProdes(user.employee.id);
    }

    @Get('available')
    findAvailableProdes(
        @CurrentTenant() tenant: { id: string },
        @CurrentUser() user: { id: string; employee: { id: string } },
    ) {
        return this.prodesService.findAvailableProdes(tenant.id, user.employee.id);
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
        @CurrentTenant() tenant: { id: string },
        @CurrentUser() user: { id: string; employee: { id: string } },
    ) {
        return this.prodesService.findOne(id, tenant.id, user.employee.id);
    }

    @Post(':id/join')
    joinProde(
        @Param('id') id: string,
        @CurrentTenant() tenant: { id: string },
        @CurrentUser() user: { id: string; employee: { id: string } },
    ) {
        return this.prodesService.joinProde(id, tenant.id, user.employee.id);
    }
}
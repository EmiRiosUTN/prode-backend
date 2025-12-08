import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '../services/config.service';
import { UpdateCompanyConfigDto } from '../dto/update-company-config.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('company/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empresa_admin')
export class ConfigController {
    constructor(private readonly configService: ConfigService) { }

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

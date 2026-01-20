import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ConfigService } from '../services/config.service';
import { UpdateCompanyConfigDto } from '../dto/update-company-config.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('company')
export class ConfigController {
    constructor(private readonly configService: ConfigService) { }

    // Public endpoint for registration page
    @Get('public/config')
    async getPublicConfig(@CurrentTenant() tenant: { id: string; name: string; slug: string }) {
        return this.configService.getPublicConfig(tenant.id);
    }

    @Get('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('empresa_admin')
    async getConfig(
        @CurrentTenant() tenant: { id: string; name: string; slug: string },
        @Req() req: any  // Usar 'any' para evitar el error de TypeScript
    ) {
        // LOGS DE DEBUG
        console.log('==========================================');
        console.log('GET /company/config - DEBUG');
        console.log('==========================================');
        console.log('Request hostname:', req.hostname);
        console.log('Request path:', req.path);
        console.log('Request headers.host:', req.headers.host);
        console.log('Tenant from @CurrentTenant:', tenant);
        console.log('Tenant from req.tenant:', req.tenant);
        console.log('==========================================');

        // Usar req.tenant directamente si @CurrentTenant no funciona
        const tenantToUse = tenant || req.tenant;

        if (!tenantToUse) {
            throw new Error('Tenant is undefined - middleware not working');
        }

        return this.configService.getConfig(tenantToUse.id);
    }

    @Put('config')
    async updateConfig(
        @CurrentTenant() tenant: { id: string; name: string; slug: string },
        @Body() updateDto: UpdateCompanyConfigDto,
        @Req() req: any  // Usar 'any' para evitar el error de TypeScript
    ) {
        // LOGS DE DEBUG
        console.log('==========================================');
        console.log('PUT /company/config - DEBUG');
        console.log('==========================================');
        console.log('Request hostname:', req.hostname);
        console.log('Tenant from @CurrentTenant:', tenant);
        console.log('Tenant from req.tenant:', req.tenant);
        console.log('==========================================');

        // Usar req.tenant directamente si @CurrentTenant no funciona
        const tenantToUse = tenant || req.tenant;

        if (!tenantToUse) {
            throw new Error('Tenant is undefined - middleware not working');
        }

        return this.configService.updateConfig(tenantToUse.id, updateDto);
    }
}
import { Controller, Get, NotFoundException } from '@nestjs/common';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AreasService } from '../services/areas.service';

@Controller('company/public')
export class PublicCompanyController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly areasService: AreasService,
    ) { }

    @Get('config')
    async getConfig(@CurrentTenant() tenant: { id: string }) {
        if (!tenant || !tenant.id) {
            throw new NotFoundException('Tenant not found');
        }

        const company = await this.prisma.company.findUnique({
            where: { id: tenant.id },
            select: {
                name: true,
                slug: true,
                logo_url: true,
                primary_color: true,
                secondary_color: true,
                corporate_domain: true,
                require_corporate_email: true,
            },
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        const areas = await this.areasService.findAll(tenant.id);

        return {
            ...company,
            areas: areas.map(area => ({
                id: area.id,
                name: area.name,
                description: area.description,
            })),
        };
    }
}

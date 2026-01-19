import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateCompanyConfigDto } from '../dto/update-company-config.dto';

@Injectable()
export class ConfigService {
    constructor(private readonly prisma: PrismaService) { }

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

    async getPublicConfig(companyId: string) {
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
                company_areas: {
                    where: { is_active: true },
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!company) {
            throw new NotFoundException(`Company with ID "${companyId}" not found`);
        }

        // Rename company_areas to areas for frontend compatibility
        return {
            ...company,
            areas: company.company_areas,
        };
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

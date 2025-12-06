import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from '../dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompaniesService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.company.findMany({
            include: {
                admin_user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
                _count: {
                    select: {
                        employees: true,
                        prodes: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                admin_user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
                company_areas: {
                    where: { is_active: true },
                },
                _count: {
                    select: {
                        employees: true,
                        prodes: true,
                    },
                },
            },
        });

        if (!company) {
            throw new NotFoundException(`Company with ID "${id}" not found`);
        }

        return company;
    }

    async create(createCompanyDto: CreateCompanyDto) {
        const { adminEmail, adminPassword, slug, ...companyData } = createCompanyDto;

        // Check if slug is already taken
        const existingCompany = await this.prisma.company.findUnique({
            where: { slug },
        });

        if (existingCompany) {
            throw new ConflictException(`Company with slug "${slug}" already exists`);
        }

        // Check if admin email is already taken
        const existingUser = await this.prisma.user.findUnique({
            where: { email: adminEmail },
        });

        if (existingUser) {
            throw new ConflictException(`User with email "${adminEmail}" already exists`);
        }

        // Hash admin password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        // Create company and admin user in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create admin user
            const adminUser = await tx.user.create({
                data: {
                    email: adminEmail,
                    password_hash: passwordHash,
                    role: 'empresa_admin',
                },
            });

            // Create company
            const company = await tx.company.create({
                data: {
                    ...companyData,
                    slug,
                    admin_user_id: adminUser.id,
                },
                include: {
                    admin_user: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

            return company;
        });

        return result;
    }

    async update(id: string, updateCompanyDto: UpdateCompanyDto) {
        // Check if company exists
        const company = await this.prisma.company.findUnique({
            where: { id },
        });

        if (!company) {
            throw new NotFoundException(`Company with ID "${id}" not found`);
        }

        // Update company
        return this.prisma.company.update({
            where: { id },
            data: {
                name: updateCompanyDto.name,
                corporate_domain: updateCompanyDto.corporateDomain,
                require_corporate_email: updateCompanyDto.requireCorporateEmail,
                logo_url: updateCompanyDto.logoUrl,
                primary_color: updateCompanyDto.primaryColor,
                secondary_color: updateCompanyDto.secondaryColor,
                is_active: updateCompanyDto.isActive,
            },
            include: {
                admin_user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }

    async remove(id: string) {
        // Check if company exists
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        employees: true,
                        prodes: true,
                    },
                },
            },
        });

        if (!company) {
            throw new NotFoundException(`Company with ID "${id}" not found`);
        }

        // Check if company has employees or prodes
        if (company._count.employees > 0 || company._count.prodes > 0) {
            throw new BadRequestException(
                'Cannot delete company with existing employees or prodes. Deactivate it instead.',
            );
        }

        // Delete company (cascade will delete admin user)
        await this.prisma.company.delete({
            where: { id },
        });

        return { message: 'Company deleted successfully' };
    }
}

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from '../dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../../email/email.service';

@Injectable()
export class CompaniesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService
    ) { }

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
        const { adminEmail, adminPassword, slug, ...dtoData } = createCompanyDto;

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

        // Create company, admin user, and employee in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create admin user with email verification
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiresAt = new Date();
            tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24); // 24 hours

            const adminUser = await tx.user.create({
                data: {
                    email: adminEmail,
                    password_hash: passwordHash,
                    role: 'empresa_admin',
                    email_verified: false,
                    verification_token: verificationToken,
                    token_expires_at: tokenExpiresAt,
                },
            });

            // Create company
            const company = await tx.company.create({
                data: {
                    name: dtoData.name,
                    slug,
                    corporate_domain: dtoData.corporateDomain,
                    require_corporate_email: dtoData.requireCorporateEmail ?? false,
                    logo_url: dtoData.logoUrl,
                    primary_color: dtoData.primaryColor ?? '#1976d2',
                    secondary_color: dtoData.secondaryColor ?? '#424242',
                    admin_user_id: adminUser.id,
                },
            });

            // Create default area for the company
            const defaultArea = await tx.companyArea.create({
                data: {
                    company_id: company.id,
                    name: 'Administración',
                    description: 'Área de administración',
                },
            });

            // Create employee record for admin user
            await tx.employee.create({
                data: {
                    user_id: adminUser.id,
                    company_id: company.id,
                    company_area_id: defaultArea.id,
                    first_name: dtoData.adminFirstName || 'Admin',
                    last_name: dtoData.adminLastName || company.name,
                    phone: '',
                },
            });

            // Return company with admin user info
            return tx.company.findUnique({
                where: { id: company.id },
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
        });

        if (!result) {
            throw new Error('Failed to create company');
        }

        // Send verification email to new admin
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

        // Update user with verification token
        await this.prisma.user.update({
            where: { id: result.admin_user.id },
            data: {
                verification_token: verificationToken,
                token_expires_at: tokenExpiresAt,
            },
        });

        // Send verification email
        try {
            await this.emailService.sendVerificationEmail(
                adminEmail,
                verificationToken,
                result.name,
                result.slug
            );
        } catch (error) {
            console.error('Failed to send verification email to company admin:', error);
        }

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

        // MAPEO CORREGIDO DE CAMPOS
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
        if (company._count.employees > 0) {
            throw new BadRequestException(
                `Cannot delete company with ${company._count.employees} employee(s). Please remove employees first.`
            );
        }

        if (company._count.prodes > 0) {
            throw new BadRequestException(
                `Cannot delete company with ${company._count.prodes} prode(s). Please remove prodes first.`
            );
        }

        return this.prisma.company.delete({
            where: { id },
        });
    }
}
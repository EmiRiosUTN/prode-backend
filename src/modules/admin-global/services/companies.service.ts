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
        const { adminEmail, adminPassword, slug, sendVerificationEmail, ...dtoData } = createCompanyDto;

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

            // Send verification email if not strictly false (default to true)
            const sendEmail = sendVerificationEmail !== false;

            const adminUser = await tx.user.create({
                data: {
                    email: adminEmail,
                    password_hash: passwordHash,
                    role: 'empresa_admin',
                    email_verified: !sendEmail, // If we don't send email, auto-verify so they can login
                    verification_token: sendEmail ? verificationToken : null,
                    token_expires_at: sendEmail ? tokenExpiresAt : null,
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

        // Send verification email if not strictly false (default to true)
        const sendEmail = sendVerificationEmail !== false;
        
        if (sendEmail) {
            // Update user with verification token
            await this.prisma.user.update({
                where: { id: result.admin_user.id },
                data: {
                    verification_token: verificationToken,
                    token_expires_at: tokenExpiresAt,
                },
            });

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
                employees: {
                    select: { user_id: true }
                }
            },
        });

        if (!company) {
            throw new NotFoundException(`Company with ID "${id}" not found`);
        }

        // Si la empresa ESTÁ ACTIVA -> Hacemos SOFT DELETE (baja lógica)
        if (company.is_active) {
            await this.prisma.$transaction(async (tx) => {
                await tx.company.update({ where: { id }, data: { is_active: false } });
                await tx.companyArea.updateMany({ where: { company_id: id }, data: { is_active: false } });
                await tx.prode.updateMany({ where: { company_id: id }, data: { is_active: false } });
                await tx.employee.updateMany({ where: { company_id: id }, data: { is_blocked: true } });

                const userIdsToDeactivate = company.employees.map(e => e.user_id);
                if (company.admin_user_id && !userIdsToDeactivate.includes(company.admin_user_id)) {
                    userIdsToDeactivate.push(company.admin_user_id);
                }

                if (userIdsToDeactivate.length > 0) {
                    await tx.user.updateMany({
                        where: { id: { in: userIdsToDeactivate } },
                        data: { is_active: false }
                    });
                }
            });
            return { success: true, message: `La empresa desactivada de manera segura (Soft Delete).` };
        } 
        
        // Si la empresa YA ESTABA INACTIVA -> Hacemos HARD DELETE (borrado físico total)
        else {
            await this.prisma.$transaction(async (tx) => {
                // 1. Identificar a los usuarios exclusivos de esta empresa para borrarlos físicamente
                const userIds = company.employees.map(e => e.user_id);
                if (company.admin_user_id && !userIds.includes(company.admin_user_id)) {
                    userIds.push(company.admin_user_id);
                }

                // En un caso real hiper estricto, validaríamos que no estén en otras empresas.
                // Aquí procedemos a borrar a la empresa. Por "Cascate Delete" de Prisma:
                // Se borran: Employees, Prodes, ProdeParticipants, CompanyAreas.
                await tx.company.delete({
                    where: { id }
                });

                // Finalmente borramos físicamente a los Users (liberando sus emails)
                // Se hace al final porque Company dependía del admin_user_id (foreign key) y Employee dependía de user_id.
                if (userIds.length > 0) {
                    await tx.user.deleteMany({
                        where: { id: { in: userIds } }
                    });
                }
            });
            return { success: true, message: `La empresa y sus usuarios han sido eliminados de la base de datos de manera definitiva (Hard Delete).` };
        }
    }
}
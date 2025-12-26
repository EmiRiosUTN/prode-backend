import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto, tenant?: { id: string; slug: string; name: string }) {
        const { email, password } = loginDto;

        // Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                employee: {
                    include: {
                        company: true,
                        company_area: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.is_active) {
            throw new UnauthorizedException('User account is inactive');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (user.employee && user.employee.is_blocked) {
            throw new UnauthorizedException('La cuenta está bloqueada');
        }

        // Tenant validation logic
        if (tenant) {
            // Special case: admin subdomain
            if (tenant.slug === 'admin') {
                // Only admin_global users can log in from admin subdomain
                if (user.role !== 'admin_global') {
                    throw new UnauthorizedException('Acceso denegado. Solo administradores globales pueden acceder desde este portal.');
                }
                // Allow admin_global to proceed
            } else {
                // Regular company subdomain
                if (!user.employee) {
                    // User is not an employee (likely admin_global)
                    if (user.role === 'admin_global') {
                        // Admin global cannot log in from company subdomains
                        throw new UnauthorizedException('Acceso denegado. Los administradores globales deben iniciar sesión desde admin.dominio.com');
                    } else {
                        throw new UnauthorizedException(`Acceso denegado. Este usuario no pertenece a esta compañía.`);
                    }
                } else {
                    // User is an employee, check if they belong to this company
                    if (user.employee.company_id !== tenant.id) {
                        throw new UnauthorizedException(`Acceso denegado. Por favor, inicie sesión en el portal de su compañía.`);
                    }
                }
            }
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            companyId: user.employee?.company_id,
            employeeId: user.employee?.id,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                employee: user.employee ? {
                    id: user.employee.id,
                    firstName: user.employee.first_name,
                    lastName: user.employee.last_name,
                    company: {
                        id: user.employee.company.id,
                        name: user.employee.company.name,
                        slug: user.employee.company.slug,
                        primary_color: user.employee.company.primary_color,
                        secondary_color: user.employee.company.secondary_color,
                    },
                    area: {
                        id: user.employee.company_area.id,
                        name: user.employee.company_area.name,
                    },
                } : null,
            },
        };
    }

    async register(registerDto: RegisterDto, companyId: string) {
        const { email, password, firstName, lastName, phone, companyAreaId } = registerDto;

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('Ya existe un usuario con este email.');
        }

        // Verify company exists and is active
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company || !company.is_active) {
            throw new BadRequestException('Compañía desactivada o inexistente.');
        }

        // Verify company area exists and belongs to company
        const companyArea = await this.prisma.companyArea.findFirst({
            where: {
                id: companyAreaId,
                company_id: companyId,
                is_active: true,
            },
        });

        if (!companyArea) {
            throw new BadRequestException('Area de la compañía no encontrada o inactiva');
        }

        if (company.require_corporate_email && company.corporate_domain) {
            const emailDomain = email.split('@')[1];
            if (emailDomain !== company.corporate_domain) {
                throw new BadRequestException(
                    `Email debe ser del dominio corporativo: @${company.corporate_domain}`,
                );
            }
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user and employee in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password_hash: passwordHash,
                    role: 'empleado',
                },
            });

            const employee = await tx.employee.create({
                data: {
                    user_id: user.id,
                    company_id: companyId,
                    company_area_id: companyAreaId,
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                },
                include: {
                    company: true,
                    company_area: true,
                },
            });

            return { user, employee };
        });

        // Generate JWT token
        const payload = {
            sub: result.user.id,
            email: result.user.email,
            role: result.user.role,
            companyId: result.employee.company_id,
            employeeId: result.employee.id,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
                employee: {
                    id: result.employee.id,
                    firstName: result.employee.first_name,
                    lastName: result.employee.last_name,
                    company: {
                        id: result.employee.company.id,
                        name: result.employee.company.name,
                        slug: result.employee.company.slug,
                        primary_color: result.employee.company.primary_color,
                        secondary_color: result.employee.company.secondary_color,
                    },
                    area: {
                        id: result.employee.company_area.id,
                        name: result.employee.company_area.name,
                    },
                },
            },
        };
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                employee: {
                    include: {
                        company: true,
                        company_area: true,
                    },
                },
            },
        });

        if (!user || !user.is_active) {
            return null;
        }

        if (user.employee && user.employee.is_blocked) {
            return null;
        }

        return user;
    }
}

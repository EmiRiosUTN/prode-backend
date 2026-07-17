import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ChangePasswordDto, LoginDto, RegisterDto, VerifyEmailDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
    ) { }

    async login(loginDto: LoginDto, tenantId?: string) {
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

        // Validate Tenant Access
        if (tenantId && tenantId !== 'admin') {
            // Global admins can access any tenant (optional, usually they use admin portal)
            if (user.role !== 'admin_global') {
                const userCompanyId = user.employee?.company_id;
                if (!userCompanyId || userCompanyId !== tenantId) {
                    throw new UnauthorizedException('No tienes acceso al portal de esta empresa.');
                }
            }
        }

        if (!user.is_active) {
            throw new UnauthorizedException('User account is inactive');
        }

        // Check email verification
        if (!user.email_verified) {
            throw new UnauthorizedException('Please verify your email before logging in');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if employee is blocked
        if (user.employee && user.employee.is_blocked) {
            throw new UnauthorizedException('Employee account is blocked');
        }

        // VERIFY TENANT ACCESS
        // If login is performed on a specific tenant subdodmain, ensure the user belongs to it.
        // We need to inject the request or pass the tenant context to this method.
        // Since we don't have the request here, we'll need to modify the controller to pass it.
        // For now, let's look at how to implement this securely.

        // Generate JWT token
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
                        logo_url: user.employee.company.logo_url,
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

    async register(registerDto: RegisterDto, companyId: string, originUrl: string) {
        const { email, password, firstName, lastName, phone, companyAreaId, extraData } = registerDto;

        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Verify company exists and is active
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                company_areas: {
                    where: { is_active: true },
                    orderBy: { created_at: 'asc' },
                    take: 1,
                },
            },
        });

        if (!company || !company.is_active) {
            throw new BadRequestException('Company not found or inactive');
        }

        // Resolve company area: use provided ID or auto-assign first active area
        let resolvedAreaId: string;
        if (companyAreaId) {
            // Verify company area exists and belongs to company
            const companyArea = await this.prisma.companyArea.findFirst({
                where: {
                    id: companyAreaId,
                    company_id: companyId,
                    is_active: true,
                },
            });

            if (!companyArea) {
                throw new BadRequestException('Company area not found or inactive');
            }
            resolvedAreaId = companyAreaId;
        } else {
            // Auto-assign first active area (for companies that hide the area field)
            if (!company.company_areas || company.company_areas.length === 0) {
                throw new BadRequestException('No active company areas found');
            }
            resolvedAreaId = company.company_areas[0].id;
        }

        // Validate corporate email if required
        if (company.require_corporate_email && company.corporate_domain) {
            const emailDomain = email.split('@')[1];
            if (emailDomain !== company.corporate_domain) {
                throw new BadRequestException(
                    `Email must be from corporate domain: @${company.corporate_domain}`,
                );
            }
        }

        // Validate custom required fields against registration_fields config
        if (company.registration_fields) {
            const fields = company.registration_fields as Array<{
                key: string;
                label: string;
                visible: boolean;
                required: boolean;
                isCustom: boolean;
            }>;

            for (const field of fields) {
                if (field.isCustom && field.required && field.visible) {
                    if (!extraData || !extraData[field.key] || extraData[field.key].trim() === '') {
                        throw new BadRequestException(`El campo "${field.label}" es obligatorio`);
                    }
                }
            }
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24); // 24 hours

        // Create user and employee in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password_hash: passwordHash,
                    role: 'empleado',
                    email_verified: !company.require_email_confirmation,
                    verification_token: company.require_email_confirmation ? verificationToken : null,
                    token_expires_at: company.require_email_confirmation ? tokenExpiresAt : null,
                },
            });

            const employee = await tx.employee.create({
                data: {
                    user_id: user.id,
                    company_id: companyId,
                    company_area_id: resolvedAreaId,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone || null,
                    extra_data: extraData ? (extraData as any) : undefined,
                },
                include: {
                    company: true,
                    company_area: true,
                },
            });

            return { user, employee };
        });

        // Send verification email
        if (company.require_email_confirmation) {
            try {
                await this.emailService.sendVerificationEmail(
                    email,
                    verificationToken,
                    company.name,
                    originUrl
                );
            } catch (error) {
                // Log error but don't fail registration
                console.error('Failed to send verification email:', error);
            }

            return {
                message: 'Registro exitoso. Por favor revisa tu email para verificar tu cuenta.',
                email: result.user.email,
            };
        }

        return {
            message: 'Registro exitoso. Ya puedes iniciar sesión.',
            email: result.user.email,
        };
    }

    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
        const { token } = verifyEmailDto;

        const user = await this.prisma.user.findUnique({
            where: { verification_token: token },
        });

        if (!user) {
            throw new BadRequestException('Invalid verification token');
        }

        if (user.email_verified) {
            throw new BadRequestException('Email already verified');
        }

        if (user.token_expires_at && user.token_expires_at < new Date()) {
            throw new BadRequestException('Verification token has expired');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                email_verified: true,
                verification_token: null,
                token_expires_at: null,
            },
        });

        return {
            message: 'Email verified successfully. You can now log in.',
        };
    }

    async resendVerification(resendDto: ResendVerificationDto, originUrl: string) {
        const { email } = resendDto;

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                employee: {
                    include: {
                        company: true,
                    },
                },
            },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.email_verified) {
            throw new BadRequestException('Email already verified');
        }

        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verification_token: verificationToken,
                token_expires_at: tokenExpiresAt,
            },
        });

        // Send email
        await this.emailService.sendVerificationEmail(
            email,
            verificationToken,
            user.employee?.company?.name || 'Prode App',
            originUrl
        );

        return {
            message: 'Verification email sent. Please check your inbox.',
        };
    }

    async forgotPassword(dto: ForgotPasswordDto, originUrl: string, tenantId?: string) {
        const { email } = dto;

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                employee: {
                    include: { company: true }
                }
            }
        });

        if (!user) {
            throw new BadRequestException('El correo proporcionado no se encuentra registrado en el sistema.');
        }

        if (!user.is_active) {
            throw new BadRequestException('Esta cuenta se encuentra desactivada, comunícate con un administrador.');
        }

        if (user.role === 'empleado' && (!user.employee || user.employee.is_blocked)) {
            throw new BadRequestException('Tu cuenta de empleado está bloqueada o incompleta.');
        }

        if (tenantId && tenantId !== 'admin' && user.role !== 'admin_global') {
            if (user.employee?.company_id !== tenantId) {
                throw new BadRequestException('Este correo no pertenece a los registros de esta empresa.');
            }
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1); // 1 hour expiry

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verification_token: resetToken,
                token_expires_at: tokenExpiresAt,
            },
        });

        // Send reset email
        await this.emailService.sendPasswordResetEmail(
            email,
            resetToken,
            originUrl
        );

        return { message: '¡Correo encontrado! Las instrucciones para restablecer han sido enviadas a la bandeja de entrada.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const { token, newPassword } = dto;

        const user = await this.prisma.user.findUnique({
            where: { verification_token: token },
        });

        if (!user) {
            throw new BadRequestException('El token es inválido o expiró.');
        }

        if (user.token_expires_at && user.token_expires_at < new Date()) {
            throw new BadRequestException('El token ha expirado. Por favor, solicita uno nuevo.');
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update user
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: passwordHash,
                verification_token: null,
                token_expires_at: null,
                email_verified: true, // Si logró resetear la clave asume que la cuenta está verificada
            },
        });

        return { message: 'Tu contraseña ha sido restablecida exitosamente.' };
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const { currentPassword, newPassword } = dto;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                employee: true,
            },
        });

        if (!user || !user.is_active) {
            throw new UnauthorizedException('Usuario no autorizado');
        }

        if (user.employee?.is_blocked) {
            throw new UnauthorizedException('Tu cuenta de empleado esta bloqueada');
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('La contrasena actual es incorrecta');
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (isSamePassword) {
            throw new BadRequestException('La nueva contrasena debe ser distinta a la actual');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: passwordHash,
                verification_token: null,
                token_expires_at: null,
                email_verified: true,
            },
        });

        return { message: 'Tu contrasena fue actualizada correctamente.' };
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

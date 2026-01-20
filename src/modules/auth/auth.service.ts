import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto, VerifyEmailDto, ResendVerificationDto } from './dto';

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
        });

        if (!company || !company.is_active) {
            throw new BadRequestException('Company not found or inactive');
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
            throw new BadRequestException('Company area not found or inactive');
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
                    email_verified: false,
                    verification_token: verificationToken,
                    token_expires_at: tokenExpiresAt,
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

        // Send verification email
        try {
            await this.emailService.sendVerificationEmail(
                email,
                verificationToken,
                company.name,
                company.slug
            );
        } catch (error) {
            // Log error but don't fail registration
            console.error('Failed to send verification email:', error);
        }

        // Return success message without token
        return {
            message: 'Registro exitoso. Por favor revisa tu email para verificar tu cuenta.',
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

    async resendVerification(resendDto: ResendVerificationDto) {
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
            user.employee?.company?.slug || 'admin'
        );

        return {
            message: 'Verification email sent. Please check your inbox.',
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

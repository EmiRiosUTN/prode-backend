import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, VerifyEmailDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { CurrentTenant } from '../../common/decorators';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @CurrentTenant() tenant?: { id: string },
    ) {
        return this.authService.login(loginDto, tenant?.id);
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() registerDto: RegisterDto,
        @CurrentTenant() tenant: { id: string },
        @Req() req: Request
    ) {
        const originUrl = req.headers.origin || req.headers.referer || 'http://localhost:3000';
        return this.authService.register(registerDto, tenant.id, originUrl);
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
        return this.authService.verifyEmail(verifyEmailDto);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() resendDto: ResendVerificationDto, @Req() req: Request) {
        const originUrl = req.headers.origin || req.headers.referer || 'http://localhost:3000';
        return this.authService.resendVerification(resendDto, originUrl);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(
        @Body() forgotPasswordDto: ForgotPasswordDto, 
        @CurrentTenant() tenant: { id: string } | undefined,
        @Req() req: Request
    ) {
        const originUrl = req.headers.origin || req.headers.referer || 'http://localhost:3000';
        return this.authService.forgotPassword(forgotPasswordDto, originUrl, tenant?.id);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }
}

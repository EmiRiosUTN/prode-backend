import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentTenant, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { AuthService } from './auth.service';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    LoginDto,
    RegisterDto,
    ResendVerificationDto,
    ResetPasswordDto,
    VerifyEmailDto,
} from './dto';

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

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(userId, changePasswordDto);
    }
}

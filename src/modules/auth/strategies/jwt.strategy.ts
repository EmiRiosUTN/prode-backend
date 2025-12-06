import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret') || 'mundialpro-jwt-secret-super-seguro-2024',
        });
    }

    async validate(payload: any) {
        const user = await this.authService.validateUser(payload.sub);

        if (!user) {
            throw new UnauthorizedException('Invalid token or user not found');
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.employee?.company_id,
            employeeId: user.employee?.id,
        };
    }
}

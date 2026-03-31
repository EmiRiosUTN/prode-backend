import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @IsNotEmpty({ message: 'El token es requerido' })
    @IsString()
    token: string;

    @IsNotEmpty({ message: 'La contraseña es requerida' })
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    newPassword: string;
}

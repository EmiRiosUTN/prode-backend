import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsNotEmpty({ message: 'La contrasena actual es requerida' })
    @IsString()
    currentPassword!: string;

    @IsNotEmpty({ message: 'La nueva contrasena es requerida' })
    @IsString()
    @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
        message: 'La contrasena debe contener al menos una mayuscula, una minuscula, un numero y un caracter especial'
    })
    newPassword!: string;
}

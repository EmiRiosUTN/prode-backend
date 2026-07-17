import { IsEmail, IsString, MinLength, IsNotEmpty, IsUUID, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
        message: 'La contrasena debe contener al menos una mayuscula, una minuscula, un numero y un caracter especial'
    })
    password!: string;

    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsUUID()
    @IsOptional()
    companyAreaId?: string;

    @IsOptional()
    extraData?: Record<string, string>;
}

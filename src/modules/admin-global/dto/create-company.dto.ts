import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, IsUrl } from 'class-validator';

export class CreateCompanyDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    slug: string;

    @IsString()
    @IsOptional()
    corporateDomain?: string;

    @IsBoolean()
    @IsOptional()
    requireCorporateEmail?: boolean;

    @IsUrl()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    primaryColor?: string;

    @IsString()
    @IsOptional()
    secondaryColor?: string;

    @IsEmail()
    @IsNotEmpty()
    adminEmail: string;

    @IsString()
    @IsNotEmpty()
    adminPassword: string;
}

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, IsUrl, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrationFieldConfig {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsString()
    @IsNotEmpty()
    label: string;

    @IsBoolean()
    visible: boolean;

    @IsBoolean()
    required: boolean;

    @IsBoolean()
    isCustom: boolean;
}

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

    @IsBoolean()
    @IsOptional()
    requireEmailConfirmation?: boolean;

    @IsUrl()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    primaryColor?: string;

    @IsString()
    @IsOptional()
    secondaryColor?: string;

    @IsBoolean()
    @IsOptional()
    aiEnabled?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RegistrationFieldConfig)
    @IsOptional()
    registrationFields?: RegistrationFieldConfig[];

    @IsEmail()
    @IsNotEmpty()
    adminEmail: string;

    @IsString()
    @IsNotEmpty()
    adminPassword: string;

    @IsString()
    @IsOptional()
    adminFirstName?: string;

    @IsString()
    @IsOptional()
    adminLastName?: string;

    @IsBoolean()
    @IsOptional()
    sendVerificationEmail?: boolean;
}

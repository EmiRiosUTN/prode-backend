import { IsString, IsOptional, IsBoolean, IsUrl, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RegistrationFieldConfig } from './create-company.dto';

export class UpdateCompanyDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsString()
    @IsOptional()
    corporateDomain?: string;

    @IsBoolean()
    @IsOptional()
    requireCorporateEmail?: boolean;

    @IsBoolean()
    @IsOptional()
    requireEmailConfirmation?: boolean;

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

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RegistrationFieldConfig)
    @IsOptional()
    registrationFields?: RegistrationFieldConfig[];
}

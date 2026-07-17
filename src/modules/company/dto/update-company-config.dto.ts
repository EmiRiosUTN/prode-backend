import { IsOptional, IsString, IsUrl, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RegistrationFieldConfig } from '../../admin-global/dto/create-company.dto';

export class UpdateCompanyConfigDto {
    @IsUrl()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    primaryColor?: string;

    @IsString()
    @IsOptional()
    secondaryColor?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RegistrationFieldConfig)
    @IsOptional()
    registrationFields?: RegistrationFieldConfig[];
}

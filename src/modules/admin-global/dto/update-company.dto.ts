import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class UpdateCompanyDto {
    @IsString()
    @IsOptional()
    name?: string;

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

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

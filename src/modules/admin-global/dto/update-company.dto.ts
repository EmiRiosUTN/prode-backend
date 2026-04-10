import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

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
}

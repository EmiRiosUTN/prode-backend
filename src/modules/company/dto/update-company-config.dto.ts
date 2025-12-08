import { IsOptional, IsString, IsUrl } from 'class-validator';

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
}

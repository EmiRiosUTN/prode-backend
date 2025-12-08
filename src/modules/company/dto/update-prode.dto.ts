import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateProdeDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    description?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

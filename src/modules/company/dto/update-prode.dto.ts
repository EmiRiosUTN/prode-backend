import { IsString, IsBoolean, IsOptional, MaxLength, IsInt } from 'class-validator';

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

    // Rewards configuration
    @IsOptional()
    @IsInt()
    winnerCount?: number;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    individualPrize?: string;

    @IsBoolean()
    @IsOptional()
    rewardAreaWinner?: boolean;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    areaPrize?: string;
}

import { IsString, IsBoolean, IsOptional, MaxLength, IsInt, IsEnum, ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipationMode } from './create-prode.dto';
import { ProdeVariableConfigDto } from './prode-variable-config.dto';
import { AreaRankingCalculation, ProdeRankingConfigDto } from './prode-ranking-config.dto';

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

    @IsEnum(ParticipationMode)
    @IsOptional()
    participationMode?: ParticipationMode;

    @IsBoolean()
    @IsOptional()
    showAreaRanking?: boolean;

    @IsEnum(AreaRankingCalculation)
    @IsOptional()
    areaRankingCalculation?: AreaRankingCalculation;

    @IsArray()
    @ArrayMinSize(1)
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ProdeVariableConfigDto)
    variableConfigs?: ProdeVariableConfigDto[];
}

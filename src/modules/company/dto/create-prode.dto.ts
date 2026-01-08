import {
    IsString,
    IsNotEmpty,
    IsUUID,
    IsEnum,
    IsOptional,
    ValidateNested,
    IsArray,
    ArrayMinSize,
    MaxLength,
    IsBoolean,
    IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProdeVariableConfigDto } from './prode-variable-config.dto';
import { ProdeRankingConfigDto, AreaRankingCalculation } from './prode-ranking-config.dto';

export enum ParticipationMode {
    GENERAL = 'general',
    BY_AREA = 'by_area',
    BOTH = 'both',
}

export class CreateProdeDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    description?: string;

    @IsUUID()
    @IsNotEmpty()
    competitionId: string;

    @IsEnum(ParticipationMode)
    @IsNotEmpty()
    participationMode: ParticipationMode;

    @IsUUID()
    @IsOptional()
    companyAreaId?: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ProdeVariableConfigDto)
    variableConfigs: ProdeVariableConfigDto[];

    @ValidateNested()
    @Type(() => ProdeRankingConfigDto)
    @IsOptional()
    rankingConfig?: ProdeRankingConfigDto;

    @IsBoolean()
    @IsOptional()
    showAreaRanking?: boolean;

    @IsEnum(AreaRankingCalculation)
    @IsOptional()
    areaRankingCalculation?: AreaRankingCalculation;

    // Rewards configuration
    @IsOptional()
    @IsInt()
    winnerCount?: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    individualPrize?: string;

    @IsOptional()
    @IsBoolean()
    rewardAreaWinner?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    areaPrize?: string;
}

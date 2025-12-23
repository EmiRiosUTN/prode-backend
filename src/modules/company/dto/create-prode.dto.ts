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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProdeVariableConfigDto } from './prode-variable-config.dto';
import { ProdeRankingConfigDto } from './prode-ranking-config.dto';

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
}

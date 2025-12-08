import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum AreaRankingCalculation {
    AVERAGE = 'average',
    SUM = 'sum',
}

export class ProdeRankingConfigDto {
    @IsBoolean()
    @IsOptional()
    showIndividualGeneral?: boolean;

    @IsBoolean()
    @IsOptional()
    showIndividualByArea?: boolean;

    @IsBoolean()
    @IsOptional()
    showAreaRanking?: boolean;

    @IsEnum(AreaRankingCalculation)
    @IsOptional()
    areaRankingCalculation?: AreaRankingCalculation;
}

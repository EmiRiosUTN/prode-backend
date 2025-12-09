import { IsUUID, IsInt, Min, Max, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PredictionScorerDto } from './prediction-scorer.dto';

export class CreatePredictionDto {
    @IsUUID()
    prodeId: string;

    @IsUUID()
    matchId: string;

    // Variables opcionales de predicción
    @IsInt()
    @Min(0)
    @Max(20)
    @IsOptional()
    homeScore?: number;

    @IsInt()
    @Min(0)
    @Max(20)
    @IsOptional()
    awayScore?: number;

    @IsUUID()
    @IsOptional()
    winnerId?: string; // ID del equipo ganador (null si empate)

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PredictionScorerDto)
    @IsOptional()
    scorers?: PredictionScorerDto[];
}
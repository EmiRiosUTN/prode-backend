import { IsUUID, IsInt, Min, Max, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


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

    @IsInt()
    @Min(0)
    @Max(20)
    @IsOptional()
    homeYellowCards?: number;

    @IsInt()
    @Min(0)
    @Max(20)
    @IsOptional()
    awayYellowCards?: number;

    @IsInt()
    @Min(0)
    @Max(5)
    @IsOptional()
    homeRedCards?: number;

    @IsInt()
    @Min(0)
    @Max(5)
    @IsOptional()
    awayRedCards?: number;

    @IsUUID()
    @IsOptional()
    winnerId?: string; // ID del equipo ganador (null si empate)

}
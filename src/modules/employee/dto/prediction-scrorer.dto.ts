import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class PredictionScorerDto {
    @IsUUID()
    playerId: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    minute?: number;
}
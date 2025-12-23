import { IsUUID, IsOptional, IsInt, Min, IsString } from 'class-validator';

export class PredictionScorerDto {
    @IsString()
    playerFullName: string;

    @IsUUID()
    teamId: string;

    @IsInt()
    @Min(1)
    goals: number;
}
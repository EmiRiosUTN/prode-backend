import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateMatchResultDto {
    @IsInt()
    @Min(0)
    @IsNotEmpty()
    goalsTeamA: number;

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    goalsTeamB: number;

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    yellowCardsTeamA: number;

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    yellowCardsTeamB: number;

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    redCardsTeamA: number;

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    redCardsTeamB: number;
}

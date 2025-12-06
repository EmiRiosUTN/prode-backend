import { IsString, IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class AddMatchScorerDto {
    @IsString()
    @IsNotEmpty()
    playerFullName: string;

    @IsUUID()
    @IsNotEmpty()
    teamId: string;

    @IsInt()
    @Min(1)
    @IsNotEmpty()
    goalsCount: number;
}

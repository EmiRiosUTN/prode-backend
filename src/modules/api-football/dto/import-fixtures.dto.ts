import { IsString, IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class ImportFixturesDto {
    @IsUUID()
    @IsNotEmpty()
    competitionId: string;

    @IsInt()
    @Min(1)
    apiFootballLeagueId: number;

    @IsInt()
    @Min(1900)
    apiFootballSeason: number;
}

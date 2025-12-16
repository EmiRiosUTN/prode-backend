import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum MatchStatus {
    SCHEDULED = 'scheduled',
    IN_PROGRESS = 'in_progress',
    FINISHED = 'finished',
}

export class CreateMatchDto {
    @IsUUID()
    @IsNotEmpty()
    competitionId: string;

    @IsString()
    @IsNotEmpty()
    teamA: string; // Team name instead of ID

    @IsString()
    @IsNotEmpty()
    teamB: string; // Team name instead of ID

    @IsString()
    @IsNotEmpty()
    matchDate: string;

    @IsString()
    @IsNotEmpty()
    stage: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsEnum(MatchStatus)
    @IsOptional()
    status?: MatchStatus;
}

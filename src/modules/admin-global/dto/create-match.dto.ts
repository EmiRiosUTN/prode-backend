import { IsString, IsNotEmpty, IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateMatchDto {
    @IsUUID()
    @IsNotEmpty()
    competitionId: string;

    @IsUUID()
    @IsNotEmpty()
    teamAId: string;

    @IsUUID()
    @IsNotEmpty()
    teamBId: string;

    @IsDateString()
    @IsNotEmpty()
    matchDate: string;

    @IsString()
    @IsOptional()
    stage?: string;

    @IsString()
    @IsOptional()
    location?: string;
}

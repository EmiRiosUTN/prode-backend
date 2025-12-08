import { IsUUID, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

export class ProdeVariableConfigDto {
    @IsUUID()
    predictionVariableId: string;

    @IsInt()
    @Min(0)
    points: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

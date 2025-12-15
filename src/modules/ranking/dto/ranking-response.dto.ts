import { ApiProperty } from '@nestjs/swagger';
import { IndividualRankingEntry, AreaRankingEntry, RankingMetadata } from '../interfaces/ranking.interface';

export class IndividualRankingEntryDto implements IndividualRankingEntry {
    @ApiProperty({ description: 'Posición en el ranking', example: 1 })
    position: number;

    @ApiProperty({ description: 'ID del empleado' })
    employeeId: string;

    @ApiProperty({ description: 'Nombre completo del empleado', example: 'Juan Pérez' })
    employeeName: string;

    @ApiProperty({ description: 'Nombre del área', example: 'Sistemas' })
    areaName: string;

    @ApiProperty({ description: 'Puntos totales acumulados', example: 45 })
    totalPoints: number;

    @ApiProperty({ description: 'Cantidad de predicciones realizadas', example: 12 })
    predictionsCount: number;
}

export class TopEmployeeDto {
    @ApiProperty({ description: 'ID del empleado' })
    employeeId: string;

    @ApiProperty({ description: 'Nombre completo del empleado', example: 'Juan Pérez' })
    employeeName: string;

    @ApiProperty({ description: 'Puntos totales', example: 45 })
    totalPoints: number;
}

export class AreaRankingEntryDto implements AreaRankingEntry {
    @ApiProperty({ description: 'Posición en el ranking', example: 1 })
    position: number;

    @ApiProperty({ description: 'ID del área' })
    areaId: string;

    @ApiProperty({ description: 'Nombre del área', example: 'Sistemas' })
    areaName: string;

    @ApiProperty({ description: 'Puntos totales del área', example: 450 })
    totalPoints: number;

    @ApiProperty({ description: 'Cantidad de participantes del área', example: 10 })
    participantsCount: number;

    @ApiProperty({ description: 'Top 3 empleados del área', type: [TopEmployeeDto] })
    topEmployees: TopEmployeeDto[];
}

export class RankingMetadataDto implements RankingMetadata {
    @ApiProperty({ description: 'ID del prode' })
    prodeId: string;

    @ApiProperty({ description: 'Nombre del prode', example: 'Prode Mundial 2026' })
    prodeName: string;

    @ApiProperty({ description: 'Total de participantes', example: 50 })
    totalParticipants: number;

    @ApiProperty({ description: 'Fecha de última actualización' })
    lastUpdated: Date;

    @ApiProperty({ description: 'Indica si el resultado proviene de caché', example: true })
    isCached: boolean;
}

export class IndividualRankingResponseDto {
    @ApiProperty({ description: 'Metadata del ranking', type: RankingMetadataDto })
    metadata: RankingMetadataDto;

    @ApiProperty({ description: 'Entradas del ranking', type: [IndividualRankingEntryDto] })
    ranking: IndividualRankingEntryDto[];
}

export class AreaRankingResponseDto {
    @ApiProperty({ description: 'Metadata del ranking', type: RankingMetadataDto })
    metadata: RankingMetadataDto;

    @ApiProperty({ description: 'Entradas del ranking de áreas', type: [AreaRankingEntryDto] })
    ranking: AreaRankingEntryDto[];
}

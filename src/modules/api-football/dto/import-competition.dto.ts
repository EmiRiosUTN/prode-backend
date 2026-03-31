import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class ImportCompetitionDto {
    @IsInt()
    @Min(1)
    apiFootballLeagueId: number;

    @IsInt()
    @Min(1900)
    apiFootballSeason: number;

    /**
     * Override del nombre de la competencia. Si no se provee,
     * se usa el nombre que devuelve la API (ej: "World Cup").
     */
    @IsString()
    @IsOptional()
    competitionName?: string;

    /**
     * Slug personalizado. Si no se provee, se genera automáticamente
     * a partir del nombre + temporada (ej: "world-cup-2026").
     */
    @IsString()
    @IsOptional()
    slug?: string;
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface ScorerMatch {
    id: string;
    player_full_name: string;
    goals_count: number;
    similarity: number;
}

@Injectable()
export class ScorerMatcherService {
    private readonly logger = new Logger(ScorerMatcherService.name);
    private readonly SIMILARITY_THRESHOLD = 0.6; // 60% de similitud mínima

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Busca un goleador real que coincida con el nombre predicho
     * Usa fuzzy matching con pg_trgm de PostgreSQL
     */
    async findMatch(
        predictedName: string,
        actualScorers: Array<{ id: string; player_full_name: string; goals_count: number; team_id: string }>,
        teamId: string,
    ): Promise<ScorerMatch | null> {
        if (actualScorers.length === 0) {
            return null;
        }

        try {
            // Filtrar por equipo primero
            const teamScorers = actualScorers.filter(s => s.team_id === teamId);

            if (teamScorers.length === 0) {
                return null;
            }

            // Usar pg_trgm para encontrar el mejor match
            const scorerIds = teamScorers.map(s => s.id);

            const results = await this.prisma.$queryRaw<ScorerMatch[]>`
        SELECT 
          id,
          player_full_name,
          goals_count,
          similarity(player_full_name, ${predictedName}) as similarity
        FROM match_scorers
        WHERE id = ANY(${scorerIds}::uuid[])
        AND similarity(player_full_name, ${predictedName}) > ${this.SIMILARITY_THRESHOLD}
        ORDER BY similarity DESC
        LIMIT 1
      `;

            if (results.length > 0) {
                const match = results[0];
                this.logger.debug(
                    `Fuzzy match found: "${predictedName}" → "${match.player_full_name}" (similarity: ${match.similarity.toFixed(2)})`,
                );
                return match;
            }

            // Si no hay match con fuzzy, intentar match exacto (case-insensitive)
            const exactMatch = teamScorers.find(
                s => s.player_full_name.toLowerCase() === predictedName.toLowerCase()
            );

            if (exactMatch) {
                this.logger.debug(`Exact match found: "${predictedName}" → "${exactMatch.player_full_name}"`);
                return {
                    ...exactMatch,
                    similarity: 1.0,
                };
            }

            return null;
        } catch (error) {
            this.logger.error(`Error in fuzzy matching for "${predictedName}":`, error);

            // Fallback a match exacto si hay error con pg_trgm
            const exactMatch = actualScorers.find(
                s => s.player_full_name.toLowerCase() === predictedName.toLowerCase() && s.team_id === teamId
            );

            if (exactMatch) {
                return {
                    ...exactMatch,
                    similarity: 1.0,
                };
            }

            return null;
        }
    }

    /**
     * Verifica si la extensión pg_trgm está disponible
     */
    async checkExtension(): Promise<boolean> {
        try {
            const result = await this.prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'
      `;

            const isAvailable = result.length > 0;

            if (!isAvailable) {
                this.logger.warn(
                    'pg_trgm extension is not installed. Fuzzy matching will fall back to exact matching. ' +
                    'To enable fuzzy matching, run: CREATE EXTENSION IF NOT EXISTS pg_trgm;'
                );
            }

            return isAvailable;
        } catch (error) {
            this.logger.error('Error checking pg_trgm extension:', error);
            return false;
        }
    }
}

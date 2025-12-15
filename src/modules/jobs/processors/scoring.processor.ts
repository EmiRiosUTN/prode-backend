import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ScoringService } from '../services/scoring.service';
import { RankingService } from '../../ranking/ranking.service';

@Processor('scoring')
export class ScoringProcessor {
    private readonly logger = new Logger(ScoringProcessor.name);

    constructor(
        private readonly scoringService: ScoringService,
        private readonly rankingService: RankingService,
    ) { }

    @Process('calculate-scores')
    async handleScoreCalculation(job: Job<{ matchId: string; prodeId?: string }>): Promise<void> {
        const { matchId, prodeId } = job.data;
        this.logger.log(`Processing score calculation for match ${matchId}`);

        try {
            // Calcular puntos para el partido
            await this.scoringService.calculatePointsForMatch(matchId);

            // Si se proporciona prodeId, invalidar caché de rankings
            if (prodeId) {
                this.logger.log(`Invalidating ranking cache for prode ${prodeId}`);
                await this.rankingService.invalidateCache(prodeId);
            }

            this.logger.log(`Successfully calculated scores for match ${matchId}`);
        } catch (error) {
            this.logger.error(`Error calculating scores for match ${matchId}:`, error);
            throw error;
        }
    }
}

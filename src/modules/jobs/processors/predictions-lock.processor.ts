import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PredictionsLockProcessor {
    private readonly logger = new Logger(PredictionsLockProcessor.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Cron job que se ejecuta cada 5 minutos
     * Bloquea predicciones de partidos que comienzan en 1 hora
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async lockPredictions(): Promise<void> {
        this.logger.log('Running predictions lock job');

        try {
            const now = new Date();
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

            // Buscar partidos que comienzan entre 55 y 65 minutos desde ahora
            // Esto asegura que capturemos los partidos en la ventana correcta
            const matches = await this.prisma.match.findMany({
                where: {
                    match_date: {
                        gte: fiveMinutesFromNow,
                        lte: oneHourFromNow,
                    },
                    status: 'scheduled',
                },
            });

            if (matches.length === 0) {
                this.logger.debug('No matches to lock predictions for');
                return;
            }

            this.logger.log(`Found ${matches.length} matches starting in ~1 hour`);

            // Bloquear predicciones para cada partido
            for (const match of matches) {
                const result = await this.prisma.prediction.updateMany({
                    where: {
                        match_id: match.id,
                        locked_at: null, // Solo bloquear las que aún no están bloqueadas
                    },
                    data: {
                        locked_at: now,
                    },
                });

                if (result.count > 0) {
                    this.logger.log(
                        `Locked ${result.count} predictions for match ${match.id} (${match.team_a_id} vs ${match.team_b_id})`,
                    );
                }
            }

            this.logger.log('Predictions lock job completed successfully');
        } catch (error) {
            this.logger.error('Error in predictions lock job:', error);
            throw error;
        }
    }

    /**
     * Método manual para testing
     * Puede ser llamado desde un endpoint de admin
     */
    async manualLock(): Promise<{ matchesFound: number; predictionsLocked: number }> {
        this.logger.log('Manual predictions lock triggered');

        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        const matches = await this.prisma.match.findMany({
            where: {
                match_date: {
                    gte: fiveMinutesFromNow,
                    lte: oneHourFromNow,
                },
                status: 'scheduled',
            },
        });

        let totalLocked = 0;

        for (const match of matches) {
            const result = await this.prisma.prediction.updateMany({
                where: {
                    match_id: match.id,
                    locked_at: null,
                },
                data: {
                    locked_at: now,
                },
            });

            totalLocked += result.count;
        }

        return {
            matchesFound: matches.length,
            predictionsLocked: totalLocked,
        };
    }
}

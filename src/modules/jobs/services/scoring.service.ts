import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScorerMatcherService } from './scorer-matcher.service';
import type { Match, MatchResult, Prediction, ProdeParticipant, PredictionVariable } from '@prisma/client';

interface PredictionWithRelations extends Prediction {
    prode_participant: ProdeParticipant & {
        prode: {
            prode_variable_configs: Array<{
                prediction_variable: PredictionVariable;
                points: number;
                is_active: boolean;
            }>;
        };
    };
    predicted_scorers: Array<{
        id: string;
        player_full_name: string;
        predicted_goals: number;
        team_id: string;
    }>;
}

interface MatchWithResult extends Match {
    match_result: MatchResult & {
        match_scorers: Array<{
            id: string;
            player_full_name: string;
            goals_count: number;
            team_id: string;
        }>;
    };
}

@Injectable()
export class ScoringService {
    private readonly logger = new Logger(ScoringService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly scorerMatcher: ScorerMatcherService,
    ) { }

    /**
     * Calcula puntos para todas las predicciones de un partido
     */
    async calculatePointsForMatch(matchId: string): Promise<void> {
        this.logger.log(`Calculating points for match ${matchId}`);

        // Obtener el partido con su resultado
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: {
                match_result: {
                    include: {
                        match_scorers: true,
                    },
                },
            },
        }) as MatchWithResult | null;

        if (!match || !match.match_result) {
            this.logger.warn(`Match ${matchId} has no result yet`);
            return;
        }

        // Obtener todas las predicciones del partido
        const predictions = await this.prisma.prediction.findMany({
            where: { match_id: matchId },
            include: {
                prode_participant: {
                    include: {
                        prode: {
                            include: {
                                prode_variable_configs: {
                                    where: { is_active: true },
                                    include: {
                                        prediction_variable: true,
                                    },
                                },
                            },
                        },
                    },
                },
                predicted_scorers: true,
            },
        }) as PredictionWithRelations[];

        this.logger.log(`Found ${predictions.length} predictions to score`);

        // Calcular puntos para cada predicción
        for (const prediction of predictions) {
            await this.calculatePointsForPrediction(prediction, match);
        }

        this.logger.log(`Finished calculating points for match ${matchId}`);
    }

    /**
     * Calcula puntos para una predicción específica
     */
    private async calculatePointsForPrediction(
        prediction: PredictionWithRelations,
        match: MatchWithResult,
    ): Promise<void> {
        const result = match.match_result;
        const variableConfigs = prediction.prode_participant.prode.prode_variable_configs;

        let totalPoints = 0;
        const pointsBreakdown: Record<string, number> = {};

        // Calcular puntos por cada variable configurada
        for (const config of variableConfigs) {
            const variable = config.prediction_variable;
            const points = await this.calculateVariablePoints(prediction, result, variable, config.points);

            if (points > 0) {
                totalPoints += points;
                pointsBreakdown[variable.code] = points;
                this.logger.debug(
                    `Prediction ${prediction.id}: ${variable.code} = ${points} points`,
                );
            }
        }

        // Guardar o actualizar PredictionScore
        await this.prisma.predictionScore.upsert({
            where: { prediction_id: prediction.id },
            create: {
                prediction_id: prediction.id,
                total_points: totalPoints,
                details: pointsBreakdown,
            },
            update: {
                total_points: totalPoints,
                details: pointsBreakdown,
                calculated_at: new Date(),
            },
        });

        this.logger.log(
            `Prediction ${prediction.id}: Total points = ${totalPoints}`,
        );
    }

    /**
     * Calcula puntos para una variable específica
     */
    private async calculateVariablePoints(
        prediction: PredictionWithRelations,
        result: MatchResult & { match_scorers: any[] },
        variable: PredictionVariable,
        configuredPoints: number,
    ): Promise<number> {
        switch (variable.code) {
            case 'exact_result':
                return this.calculateExactResult(prediction, result, configuredPoints);

            case 'partial_result':
            case 'winner_only':
                return this.calculatePartialResult(prediction, result, configuredPoints);

            case 'goal_difference':
                return this.calculateGoalDifference(prediction, result, configuredPoints);

            case 'yellow_cards':
            case 'yellow_cards_exact':
                return this.calculateYellowCards(prediction, result, configuredPoints);

            case 'red_cards':
            case 'red_cards_exact':
                return this.calculateRedCards(prediction, result, configuredPoints);

            case 'scorers':
            case 'goal_scorers':
                return await this.calculateScorers(prediction, result, configuredPoints);

            default:
                this.logger.warn(`Unknown variable code: ${variable.code}`);
                return 0;
        }
    }

    /**
     * Resultado exacto: goles de ambos equipos correctos
     */
    private calculateExactResult(
        prediction: PredictionWithRelations,
        result: MatchResult,
        points: number,
    ): number {
        if (
            prediction.predicted_goals_team_a === result.goals_team_a &&
            prediction.predicted_goals_team_b === result.goals_team_b
        ) {
            return points;
        }
        return 0;
    }

    /**
     * Resultado parcial: solo acertar el ganador o empate
     */
    private calculatePartialResult(
        prediction: PredictionWithRelations,
        result: MatchResult,
        points: number,
    ): number {
        const predWinner = this.getWinner(
            prediction.predicted_goals_team_a,
            prediction.predicted_goals_team_b,
        );
        const resultWinner = this.getWinner(result.goals_team_a, result.goals_team_b);

        if (predWinner === resultWinner) {
            return points;
        }
        return 0;
    }

    /**
     * Diferencia de goles correcta
     */
    private calculateGoalDifference(
        prediction: PredictionWithRelations,
        result: MatchResult,
        points: number,
    ): number {
        const predDiff =
            (prediction.predicted_goals_team_a || 0) -
            (prediction.predicted_goals_team_b || 0);
        const resultDiff = result.goals_team_a - result.goals_team_b;

        if (predDiff === resultDiff) {
            return points;
        }
        return 0;
    }

    /**
     * Tarjetas amarillas exactas
     */
    private calculateYellowCards(
        prediction: PredictionWithRelations,
        result: MatchResult,
        points: number,
    ): number {
        if (
            prediction.predicted_yellow_cards_team_a === result.yellow_cards_team_a &&
            prediction.predicted_yellow_cards_team_b === result.yellow_cards_team_b
        ) {
            return points;
        }
        return 0;
    }

    /**
     * Tarjetas rojas exactas
     */
    private calculateRedCards(
        prediction: PredictionWithRelations,
        result: MatchResult,
        points: number,
    ): number {
        if (
            prediction.predicted_red_cards_team_a === result.red_cards_team_a &&
            prediction.predicted_red_cards_team_b === result.red_cards_team_b
        ) {
            return points;
        }
        return 0;
    }

    /**
     * Goleadores: compara nombres predichos con reales usando fuzzy matching
     */
    private async calculateScorers(
        prediction: PredictionWithRelations,
        result: MatchResult & { match_scorers: any[] },
        pointsPerScorer: number,
    ): Promise<number> {
        let totalPoints = 0;

        for (const predictedScorer of prediction.predicted_scorers) {
            // Usar fuzzy matching para encontrar el goleador
            const match = await this.scorerMatcher.findMatch(
                predictedScorer.player_full_name,
                result.match_scorers,
                predictedScorer.team_id,
            );

            if (match) {
                // Otorgar puntos por cada gol acertado
                const goalsMatched = Math.min(
                    predictedScorer.predicted_goals,
                    match.goals_count,
                );
                totalPoints += goalsMatched * pointsPerScorer;

                this.logger.debug(
                    `Scorer match: "${predictedScorer.player_full_name}" → "${match.player_full_name}" ` +
                    `(similarity: ${match.similarity.toFixed(2)}, goals: ${goalsMatched})`,
                );
            }
        }

        return totalPoints;
    }

    /**
     * Determina el ganador de un partido
     */
    private getWinner(goalsA: number | null, goalsB: number | null): 'A' | 'B' | 'DRAW' {
        if (goalsA === null || goalsB === null) return 'DRAW';
        if (goalsA > goalsB) return 'A';
        if (goalsB > goalsA) return 'B';
        return 'DRAW';
    }
}
